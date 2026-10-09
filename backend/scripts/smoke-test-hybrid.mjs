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
    // Non-JSON response.
  }
  return { response, body };
}

async function main() {
  console.log(`Testing hybrid search at ${baseUrl}`);
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
    const { response, body } = await request('/search/hybrid?q=comfortable%20black%20shoes%20for%20college%20under%202500');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (!results.length) throw new Error('Expected hybrid search results');
    if (body?.data?.mode !== 'hybrid') throw new Error('Expected hybrid mode');
    pass('hybrid endpoint returns results');
  } catch (error) {
    fail('hybrid endpoint returns results', error);
  }

  try {
    const { response, body } = await request('/search/hybrid?q=comfortable%20black%20shoes%20for%20college%20under%202500');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const data = body?.data ?? {};
    const results = data.results ?? [];
    if (data.embeddingDimensions !== 384) throw new Error('Expected 384-dimensional embedding metadata');
    if (!data.analysis?.cleanQuery) throw new Error('AI cleanQuery missing');
    if (!Array.isArray(data.analysis?.softSignals?.colors) || !data.analysis.softSignals.colors.includes('black')) {
      throw new Error('Expected black to be recognized as a soft signal');
    }
    if (Number(data.analysis?.hardFilters?.maxPrice) !== 2500) throw new Error('Expected AI hard maxPrice=2500');
    if (!results.every((item) => typeof item.hybridScore === 'number')) throw new Error('Hybrid score missing');
    pass('AI query analysis and hybrid score metadata are returned');
  } catch (error) {
    fail('AI query analysis and hybrid score metadata are returned', error);
  }

  try {
    const { response, body } = await request('/search/hybrid?q=running%20shoes');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (!results.length) throw new Error('Expected running shoe results');
    if (!results.some((item) => item.bm25Rank && item.semanticRank)) {
      throw new Error('Expected at least one candidate to appear in both rankings');
    }
    pass('BM25 and vector rankings are fused');
  } catch (error) {
    fail('BM25 and vector rankings are fused', error);
  }

  try {
    const { response, body } = await request('/search/hybrid?q=shoes&category=footwear');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (!results.length || !results.every((item) => item.category?.slug === 'footwear' || item.category?.name === 'Footwear')) {
      throw new Error('Category filter leaked or removed all matching results');
    }
    pass('category filter works with hybrid search');
  } catch (error) {
    fail('category filter works with hybrid search', error);
  }

  try {
    const { response, body } = await request('/search/hybrid?q=shoes&maxPrice=2500&inStock=true');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (results.some((item) => Number(item.finalPrice) > 2500 || item.inStock !== true)) {
      throw new Error('Price/stock filters leaked a product');
    }
    pass('explicit price and stock filters work with hybrid search');
  } catch (error) {
    fail('explicit price and stock filters work with hybrid search', error);
  }

  try {
    const { response, body } = await request('/search/hybrid?q=shoes&page=2&limit=5');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if ((body?.data?.results ?? []).length > 5) throw new Error('Page size exceeded limit');
    if (body?.meta?.page !== 2 || body?.meta?.limit !== 5) throw new Error('Pagination metadata incorrect');
    if (typeof body?.data?.candidateCount !== 'number') throw new Error('candidateCount missing');
    pass('hybrid pagination works');
  } catch (error) {
    fail('hybrid pagination works', error);
  }

  try {
    const { response, body } = await request('/search/hybrid?q=waterproof%20travel%20bag%20for%20office');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const results = body?.data?.results ?? [];
    if (!results.length) throw new Error('Expected semantic/hybrid results for natural-language query');
    if (!results.some((item) => typeof item.hybridScore === 'number')) throw new Error('Hybrid score missing');
    pass('natural-language intent query returns hybrid-ranked results');
  } catch (error) {
    fail('natural-language intent query returns hybrid-ranked results', error);
  }

  try {
    const { response } = await request('/search/hybrid');
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('missing query is rejected');
  } catch (error) {
    fail('missing query is rejected', error);
  }

  try {
    const { response } = await request('/search/hybrid?q=shoes&minPrice=2500&maxPrice=1000');
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('invalid price range returns 400');
  } catch (error) {
    fail('invalid price range returns 400', error);
  }

  try {
    const { response, body } = await request('/search/hybrid?q=running%20shoes');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const weights = body?.data?.weights;
    if (Number(weights?.bm25) <= 0 || Number(weights?.vector) <= 0) throw new Error('Hybrid weights missing');
    if (Math.abs((Number(weights.bm25) + Number(weights.vector)) - 1) > 0.001) {
      throw new Error('Hybrid weights should sum to 1');
    }
    pass('hybrid weights are exposed and valid');
  } catch (error) {
    fail('hybrid weights are exposed and valid', error);
  }

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
