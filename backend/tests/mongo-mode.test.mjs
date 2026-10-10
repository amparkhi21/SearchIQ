// Boots the REAL server (src/index.js) in SEARCH_MODE=mongo with no OpenSearch and no AI service, then checks the
// HTTP API. MongoDB and Redis are faked (tests/stub-mongo.mjs, tests/fake-redis.mjs) so no external services are needed.
// Run:  npm run test:mongo-mode
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { startFakeRedis } from './fake-redis.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  ok  ${name}`); } catch (error) { failed += 1; console.error(`  FAIL ${name}\n       ${error.message}`); }
};

function boot(extraEnv, { preloadStub = true } = {}) {
  const output = [];
  const child = spawn(process.execPath, [...(preloadStub ? ['--import', './tests/stub-mongo.mjs'] : []), 'src/index.js'], {
    cwd: ROOT,
    env: {
      PATH: process.env.PATH, LOG_TO_FILE: 'false', LOG_LEVEL: 'info', STARTUP_RETRIES: '2', STARTUP_RETRY_DELAY_MS: '200',
      OPENSEARCH_NODE: 'http://127.0.0.1:1', AI_SERVICE_URL: 'http://127.0.0.1:1', ...extraEnv,
    },
  });
  child.stdout.on('data', (d) => output.push(String(d)));
  child.stderr.on('data', (d) => output.push(String(d)));
  const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
  return { child, exited, logs: () => output.join('') };
}

async function waitForServer(port, proc, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try { await fetch(`http://127.0.0.1:${port}/api/v1/health`); return true; } catch { await sleep(150); }
    if (proc.child.exitCode !== null) return false;
  }
  return false;
}

const { server: redisServer, port: redisPort } = await startFakeRedis();
const port = await freePort();
const base = `http://127.0.0.1:${port}/api/v1`;
const get = async (path) => { const response = await fetch(`${base}${path}`); return { status: response.status, body: await response.json().catch(() => null) }; };

console.log('SEARCH_MODE=mongo (no OpenSearch, no AI service):');
const prod = boot({
  SEARCH_MODE: 'mongo', PORT: String(port), REDIS_URL: `redis://127.0.0.1:${redisPort}`, NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), CORS_ORIGINS: 'https://example.vercel.app',
  // AI_INTERNAL_KEY deliberately left at its dev default: it must not be required in mongo mode
});

await test('server starts and listens without OpenSearch / AI service', async () => {
  assert.ok(await waitForServer(port, prod), `server did not start.\n${prod.logs()}`);
  assert.match(prod.logs(), /Server listening on port/);
  assert.doesNotMatch(prod.logs(), /OpenSearch not ready/);
});

await test('health is 200; OpenSearch and AI are "disabled", not "down"', async () => {
  const { status, body } = await get('/health');
  assert.equal(status, 200);
  assert.equal(body.data.services.mongodb.status, 'up');
  assert.equal(body.data.services.redis.status, 'up');
  assert.equal(body.data.services.opensearch.status, 'disabled');
  assert.equal(body.data.services.ai.status, 'disabled');
  assert.equal(body.data.searchMode, 'mongo');
  assert.equal(body.data.status, 'ok');
});

await test('GET /search/query returns the same response shape as the OpenSearch path', async () => {
  const { status, body } = await get('/search/query?q=nike');
  assert.equal(status, 200);
  const { results, mode, query, cached } = body.data;
  assert.equal(mode, 'keyword'); assert.equal(query, 'nike'); assert.equal(cached, false);
  assert.deepEqual(results.map((r) => r.name), ['Nike Running Shoes', 'Nike Casual Sneakers']); // inactive product hidden, popular first
  const first = results[0];
  for (const key of ['id', 'sku', 'name', 'slug', 'price', 'finalPrice', 'discountPercent', 'ratingAvg', 'ratingCount', 'stock', 'inStock', 'stockStatus', 'images', 'tags', 'category', 'brand', 'createdAt']) {
    assert.ok(key in first, `missing field ${key}`);
  }
  assert.equal(first.images[0].url, 'https://img.test/a.jpg');
  assert.deepEqual(Object.keys(first.category).sort(), ['id', 'name', 'slug']);
  assert.deepEqual(Object.keys(first.brand).sort(), ['id', 'name', 'slug']);
  assert.deepEqual(body.meta, { total: 2, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false });
});

await test('repeat search is served from the Redis cache', async () => {
  const { body } = await get('/search/query?q=nike');
  assert.equal(body.data.cached, true);
});

await test('sorting and pagination work', async () => {
  const sorted = await get('/search/query?q=nike&sort=price_asc');
  assert.deepEqual(sorted.body.data.results.map((r) => r.name), ['Nike Casual Sneakers', 'Nike Running Shoes']);
  const page2 = await get('/search/query?q=nike&limit=1&page=2');
  assert.deepEqual(page2.body.data.results.map((r) => r.name), ['Nike Casual Sneakers']);
  assert.equal(page2.body.meta.totalPages, 2); assert.equal(page2.body.meta.hasPrevPage, true); assert.equal(page2.body.meta.hasNextPage, false);
});

await test('category, brand, price and stock filters work', async () => {
  assert.equal((await get('/search/query?q=nike&category=footwear')).body.meta.total, 2);
  assert.equal((await get('/search/query?q=nike&brand=sony')).body.meta.total, 0);
  assert.equal((await get('/search/query?q=nike&minPrice=4500')).body.meta.total, 1);
  assert.equal((await get('/search/query?q=nike&inStock=true')).body.meta.total, 2);
  assert.equal((await get('/search/query?q=nike&category=nope')).status, 404);
});

await test('multi-word, no-match and missing-query cases', async () => {
  assert.equal((await get('/search/query?q=running%20shoes')).body.data.results.length, 1);
  const none = await get('/search/query?q=zzzzzz');
  assert.equal(none.status, 200); assert.deepEqual(none.body.data.results, []); assert.equal(none.body.meta.total, 0);
  assert.equal((await get('/search/query')).status, 400);
});

await test('requesting hybrid/semantic mode on the unified endpoint falls back to keyword search', async () => {
  const { status, body } = await get('/search/query?q=nike&mode=hybrid');
  assert.equal(status, 200); assert.equal(body.data.mode, 'keyword');
});

await test('dedicated semantic/hybrid endpoints return a clear 503, not a hang', async () => {
  for (const path of ['/search/semantic?q=nike', '/search/hybrid?q=nike']) {
    const { status, body } = await get(path);
    assert.equal(status, 503, path); assert.match(body.message, /MongoDB-only mode/);
  }
});

await test('GET /search (keyword endpoint) and suggestions work', async () => {
  const keyword = await get('/search?q=sony');
  assert.equal(keyword.status, 200); assert.equal(keyword.body.data.results[0].name, 'Sony Headphones');
  const { status, body } = await get('/search/suggestions?q=ni');
  assert.equal(status, 200);
  const types = body.data.suggestions.map((s) => `${s.type}:${s.text}`);
  assert.ok(types.includes('brand:Nike'), types.join());
  assert.ok(types.includes('product:Nike Running Shoes'), types.join());
  assert.ok(!types.some((t) => t.includes('Hidden')), 'inactive product leaked into suggestions');
});

await test('catalog listing (GET /products) still works', async () => {
  const { status, body } = await get('/products?sort=price_desc');
  assert.equal(status, 200);
  assert.deepEqual(body.data.products.map((p) => p.name).slice(0, 2), ['Sony Headphones', 'Nike Running Shoes']);
});

await test('similar-product recommendations work without embeddings', async () => {
  const { status, body } = await get('/recommendations/similar/000000000000000000000101?limit=3');
  assert.equal(status, 200);
  const names = body.data.map ? body.data.map((p) => p.name) : (body.data.products ?? body.data.results ?? []).map((p) => p.name);
  assert.deepEqual(names, ['Nike Casual Sneakers']); // same category, itself and inactive items excluded
});

prod.child.kill('SIGTERM');
await prod.exited;

console.log('\nDefault mode (SEARCH_MODE unset) is unchanged:');
await test('without OpenSearch the server still retries it and refuses to start', async () => {
  const proc = boot({ PORT: String(await freePort()), REDIS_URL: `redis://127.0.0.1:${redisPort}`, NODE_ENV: 'development' });
  const code = await Promise.race([proc.exited, sleep(20000).then(() => 'timeout')]);
  if (code === 'timeout') proc.child.kill('SIGKILL');
  assert.notEqual(code, 'timeout'); assert.notEqual(code, 0);
  assert.match(proc.logs(), /OpenSearch not ready \(attempt 1\/2\)/);
  assert.doesNotMatch(proc.logs(), /Server listening/);
});

await test('invalid SEARCH_MODE is rejected at startup', async () => {
  const proc = boot({ SEARCH_MODE: 'bogus', NODE_ENV: 'development' });
  assert.equal(await proc.exited, 1);
  assert.match(proc.logs(), /SEARCH_MODE/);
});

redisServer.close();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
