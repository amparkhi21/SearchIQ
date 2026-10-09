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
    headers: {
      accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error body.
  }
  return { response, body };
}

async function main() {
  console.log(`Testing BM25 search at ${baseUrl}`);
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
    const { response, body } = await request('/search?q=running%20shoes');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (results.length === 0) throw new Error('Expected running shoes results');
    pass('search endpoint returns running shoes');
  } catch (error) {
    fail('search endpoint returns running shoes', error);
  }

  try {
    const { response, body } = await request('/search?q=nike');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (!results.length || !results.every((item) => String(item.brand?.name ?? '').toLowerCase().includes('nike'))) {
      throw new Error('Expected Nike products in every result');
    }
    pass('brand search returns Nike products');
  } catch (error) {
    fail('brand search returns Nike products', error);
  }

  try {
    const { response, body } = await request('/search?q=black%20shoes');
    if (response.status !== 200 || !body?.data?.results?.length) throw new Error(`Expected successful multi-word search, got ${response.status}`);
    pass('multi-word query works');
  } catch (error) {
    fail('multi-word query works', error);
  }

  try {
    const { response, body } = await request('/search?q=zzzz-nonexistent-searchiq-token');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if ((body?.data?.results ?? []).length !== 0) throw new Error('Expected no results');
    pass('no-match query returns 200 with empty results');
  } catch (error) {
    fail('no-match query returns 200 with empty results', error);
  }

  try {
    const { response, body } = await request('/search?q=shoes&category=footwear');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (!results.length || !results.every((item) => item.category?.slug === 'footwear' || item.category?.name === 'Footwear')) {
      throw new Error('Category filter did not restrict results');
    }
    pass('category filter works with search');
  } catch (error) {
    fail('category filter works with search', error);
  }

  try {
    const { response, body } = await request('/search?q=shoes&maxPrice=2500');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (results.some((item) => Number(item.finalPrice) > 2500)) throw new Error('Price filter leaked a product');
    pass('price filter works with search');
  } catch (error) {
    fail('price filter works with search', error);
  }

  try {
    const { response, body } = await request('/search?q=shoes&inStock=true');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (results.some((item) => item.inStock !== true)) throw new Error('Stock filter leaked an out-of-stock product');
    pass('stock filter works with search');
  } catch (error) {
    fail('stock filter works with search', error);
  }

  try {
    const { response, body } = await request('/search?q=shoes&page=1&limit=5');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if ((body?.data?.results ?? []).length > 5) throw new Error('Page size exceeded limit');
    if (body?.meta?.page !== 1 || body?.meta?.limit !== 5) throw new Error('Pagination metadata incorrect');
    pass('pagination works');
  } catch (error) {
    fail('pagination works', error);
  }

  try {
    const { response } = await request('/search?q=shoes&minPrice=2500&maxPrice=1000');
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('invalid price range returns 400');
  } catch (error) {
    fail('invalid price range returns 400', error);
  }

  try {
    const { response } = await request('/search?q=shoes&page=0');
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('invalid page returns 400');
  } catch (error) {
    fail('invalid page returns 400', error);
  }

  try {
    const { response, body } = await request('/search?q=running%20shoes&sort=price_asc');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    for (let i = 1; i < results.length; i += 1) {
      if (Number(results[i - 1].finalPrice) > Number(results[i].finalPrice)) throw new Error('price_asc ordering incorrect');
    }
    pass('explicit sorting works');
  } catch (error) {
    fail('explicit sorting works', error);
  }

  try {
    const { response, body } = await request('/search?q=running%20shoes');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (results.some((item) => typeof item.relevanceScore !== 'number')) throw new Error('Relevance score missing');
    pass('BM25 relevance scores are returned');
  } catch (error) {
    fail('BM25 relevance scores are returned', error);
  }

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
