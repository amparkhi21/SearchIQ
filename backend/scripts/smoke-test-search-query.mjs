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

async function expectSearch(query, predicate, label) {
  const { response, body } = await request(`/search/query?q=${encodeURIComponent(query)}&limit=10`);
  const results = body?.data?.results ?? [];
  if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  if (!results.length) throw new Error('Expected relevant catalog results');
  if (!results.some(predicate)) throw new Error('No result matched the expected product intent');
  pass(label);
  return results;
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
    const { response, body } = await request('/search/query?q=running%20shoes');
    const results = body?.data?.results ?? [];
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!results.length) throw new Error('Expected indexed Footwear products after a supported reindex');
    if (results.some((product) => product.category?.slug !== 'footwear')) {
      throw new Error('Natural-language category inference returned a product outside Footwear');
    }
    pass('inferred Footwear filter matches reindexed products');
  } catch (error) {
    fail('inferred Footwear filter matches reindexed products', error);
  }

  try {
    const results = await expectSearch(
      'comfortable black shoes for college under 2500',
      (product) => product.category?.slug === 'footwear' && Number(product.finalPrice) <= 2500,
      'natural language keeps footwear intent and enforces its price ceiling',
    );
    if (results.some((product) => product.category?.slug !== 'footwear' || Number(product.finalPrice) > 2500)) {
      throw new Error('Category or maximum price constraint leaked results');
    }
  } catch (error) {
    fail('natural language keeps footwear intent and enforces its price ceiling', error);
  }

  try {
    await expectSearch(
      'wireless earbuds with good bass',
      (product) => /earbud|headphone/i.test(product.name),
      'semantic wording retrieves earbuds or headphones',
    );
  } catch (error) {
    fail('semantic wording retrieves earbuds or headphones', error);
  }

  try {
    const results = await expectSearch(
      'laptop for coding under 60000',
      (product) => /laptop/i.test(product.name) && Number(product.finalPrice) <= 60000,
      'coding laptop intent respects the maximum price',
    );
    if (results.some((product) => Number(product.finalPrice) > 60000)) {
      throw new Error('Maximum price constraint leaked results');
    }
  } catch (error) {
    fail('coding laptop intent respects the maximum price', error);
  }

  try {
    await expectSearch(
      'shoes for daily walking',
      (product) => product.category?.slug === 'footwear',
      'synonymous daily-walking query retrieves footwear',
    );
  } catch (error) {
    fail('synonymous daily-walking query retrieves footwear', error);
  }

  try {
    await expectSearch(
      'runing shose',
      (product) => product.category?.slug === 'footwear' || /shoe/i.test(product.name),
      'misspelled query can still retrieve relevant shoes',
    );
  } catch (error) {
    fail('misspelled query can still retrieve relevant shoes', error);
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
