import { env } from '../src/config/env.js';

const baseUrl = `http://localhost:${env.port}/api/v1`;
let passed = 0;
let failed = 0;

function pass(message) {
  passed += 1;
  console.log(`  PASS  ${message}`);
}

function fail(message, error) {
  failed += 1;
  console.log(`  FAIL  ${message}${error ? `: ${error.message}` : ''}`);
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { accept: 'application/json', ...(init.headers ?? {}) },
  });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

async function main() {
  console.log(`Testing semantic search at ${baseUrl}`);
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
    const { response, body } = await request('/search/semantic?q=comfortable%20footwear%20for%20college');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (!results.length) throw new Error('Expected semantic results');
    if (body?.data?.mode !== 'semantic') throw new Error('Expected semantic mode');
    pass('semantic endpoint returns results');
  } catch (error) {
    fail('semantic endpoint returns results', error);
  }

  try {
    const { response, body } = await request('/search/semantic?q=running%20shoes');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (!results.length) throw new Error('Expected running shoe results');
    if (results.some((item) => typeof item.semanticScore !== 'number')) throw new Error('Semantic score missing');
    if (body?.data?.embeddingDimensions !== 384) throw new Error('Expected 384-dimensional embeddings');
    pass('semantic scores and embedding metadata are returned');
  } catch (error) {
    fail('semantic scores and embedding metadata are returned', error);
  }

  try {
    const { response, body } = await request('/search/semantic?q=shoes&category=footwear');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (!results.length || !results.every((item) => item.category?.slug === 'footwear' || item.category?.name === 'Footwear')) {
      throw new Error('Category filter leaked or removed all matching results');
    }
    pass('category filter works with semantic search');
  } catch (error) {
    fail('category filter works with semantic search', error);
  }

  try {
    const { response, body } = await request('/search/semantic?q=shoes&maxPrice=2500&inStock=true');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (results.some((item) => Number(item.finalPrice) > 2500 || item.inStock !== true)) {
      throw new Error('Price/stock filters leaked a product');
    }
    pass('price and stock filters work with semantic search');
  } catch (error) {
    fail('price and stock filters work with semantic search', error);
  }

  try {
    const { response, body } = await request('/search/semantic?q=running%20shoes&page=2&limit=5');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if ((body?.data?.results ?? []).length > 5) throw new Error('Page size exceeded limit');
    if (body?.meta?.page !== 2 || body?.meta?.limit !== 5) throw new Error('Pagination metadata incorrect');
    pass('semantic pagination works');
  } catch (error) {
    fail('semantic pagination works', error);
  }

  try {
    const { response } = await request('/search/semantic');
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('missing query is rejected');
  } catch (error) {
    fail('missing query is rejected', error);
  }

  try {
    const { response } = await request('/search/semantic?q=shoes&minPrice=2500&maxPrice=1000');
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('invalid price range returns 400');
  } catch (error) {
    fail('invalid price range returns 400', error);
  }

  try {
    const { response } = await request('/search/semantic?q=shoes&page=0');
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('invalid page returns 400');
  } catch (error) {
    fail('invalid page returns 400', error);
  }

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
