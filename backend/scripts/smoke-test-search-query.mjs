import { env } from '../src/config/env.js';

const baseUrl = `http://localhost:${env.port}/api/v1`;
let passed = 0;
let failed = 0;

function pass(message) { passed += 1; console.log(`  PASS  ${message}`); }
function fail(message, error) { failed += 1; console.log(`  FAIL  ${message}${error ? `: ${error.message}` : ''}`); }

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { accept: 'application/json' } });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function main() {
  console.log(`Testing unified search at ${baseUrl}`);
  console.log('');

  try {
    const { response } = await request('/health');
    if (!response.ok) throw new Error(`API health returned ${response.status}`);
    pass('API is healthy');
  } catch (error) {
    fail('API is healthy', error);
    process.exitCode = 1;
    return;
  }

  try {
    const first = await request('/search/query?q=comfortable%20black%20shoes%20for%20college%20under%202500');
    if (first.response.status !== 200) throw new Error(`Expected 200, got ${first.response.status}`);
    if (first.body?.data?.mode !== 'hybrid') throw new Error('Expected hybrid as the default mode');
    if (!(first.body?.data?.results ?? []).length) throw new Error('Expected hybrid results');
    pass('default unified search uses hybrid mode');
  } catch (error) {
    fail('default unified search uses hybrid mode', error);
  }

  try {
    const { response, body } = await request('/search/query?q=running%20shoes&mode=bm25');
    if (response.status !== 200 || body?.data?.mode !== 'bm25') throw new Error(`Expected BM25 mode, got ${response.status}`);
    if (!(body?.data?.results ?? []).length) throw new Error('Expected BM25 results');
    pass('unified endpoint supports BM25 mode');
  } catch (error) {
    fail('unified endpoint supports BM25 mode', error);
  }

  try {
    const { response, body } = await request('/search/query?q=comfortable%20footwear%20for%20college&mode=semantic');
    if (response.status !== 200 || body?.data?.mode !== 'semantic') throw new Error(`Expected semantic mode, got ${response.status}`);
    if (!(body?.data?.results ?? []).length) throw new Error('Expected semantic results');
    pass('unified endpoint supports semantic mode');
  } catch (error) {
    fail('unified endpoint supports semantic mode', error);
  }

  try {
    const first = await request('/search/query?q=running%20shoes');
    const second = await request('/search/query?q=running%20shoes');
    if (first.response.status !== 200 || second.response.status !== 200) throw new Error('Expected both requests to succeed');
    if (second.body?.data?.cached !== true) throw new Error('Expected the second identical request to be cached');
    pass('identical unified searches use the Redis cache when available');
  } catch (error) {
    fail('identical unified searches use the Redis cache when available', error);
  }

  try {
    const { response, body } = await request('/search/query?q=shoes&category=footwear&maxPrice=2500&inStock=true');
    const results = body?.data?.results ?? [];
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (results.some((item) => item.inStock !== true || Number(item.finalPrice) > 2500)) throw new Error('Search filters leaked results');
    pass('unified search preserves category, price and stock filters');
  } catch (error) {
    fail('unified search preserves category, price and stock filters', error);
  }

  try {
    const { response, body } = await request('/search/query?q=shoes&page=2&limit=5');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (body?.meta?.page !== 2 || body?.meta?.limit !== 5) throw new Error('Pagination metadata incorrect');
    if ((body?.data?.results ?? []).length > 5) throw new Error('Page size exceeded limit');
    pass('unified search pagination works');
  } catch (error) {
    fail('unified search pagination works', error);
  }

  try {
    const { response } = await request('/search/query?q=shoes&mode=invalid');
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('invalid search mode is rejected');
  } catch (error) {
    fail('invalid search mode is rejected', error);
  }

  try {
    const { response } = await request('/search/query?q=shoes&minPrice=2500&maxPrice=1000');
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('invalid price range is rejected');
  } catch (error) {
    fail('invalid price range is rejected', error);
  }

  try {
    const { response, body } = await request('/search/query?q=zzzz-searchiq-no-match-token');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!Array.isArray(body?.data?.results)) throw new Error('Expected results array');
    pass('no-match unified search returns a valid empty/list response');
  } catch (error) {
    fail('no-match unified search returns a valid empty/list response', error);
  }

  try {
    const { response, body } = await request('/search/query?q=running%20shoes&sort=price_asc');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    for (let i = 1; i < results.length; i += 1) {
      if (Number(results[i - 1].finalPrice) > Number(results[i].finalPrice)) throw new Error('price_asc ordering incorrect');
    }
    pass('explicit sorting works in unified search');
  } catch (error) {
    fail('explicit sorting works in unified search', error);
  }

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
