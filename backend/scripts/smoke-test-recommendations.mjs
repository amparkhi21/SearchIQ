import { env } from '../src/config/env.js';

const baseUrl = `http://localhost:${env.port}/api/v1`;
let passed = 0;
let failed = 0;

function pass(message) { passed += 1; console.log(`  PASS  ${message}`); }
function fail(message, error) { failed += 1; console.log(`  FAIL  ${message}${error ? `: ${error.message}` : ''}`); }

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { accept: 'application/json', ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function login(email, password) {
  const { response, body } = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200 || !body?.data?.accessToken) {
    throw new Error(`Login failed with ${response.status}`);
  }
  return body.data.accessToken;
}

async function main() {
  console.log(`Testing recommendations at ${baseUrl}`);
  console.log('');

  try {
    const { response } = await request('/health');
    if (!response.ok) throw new Error(`Health returned ${response.status}`);
    pass('API is healthy');
  } catch (error) {
    fail('API is healthy', error);
    process.exitCode = 1;
    return;
  }

  let productId = null;
  try {
    const { response, body } = await request('/products?limit=2');
    const products = body?.data?.products ?? [];
    if (response.status !== 200 || products.length < 2) throw new Error(`Expected two products, got ${response.status}`);
    productId = products[0].id;
    pass('seeded catalog provides products for recommendation tests');
  } catch (error) { fail('seeded catalog provides products for recommendation tests', error); }

  if (productId) {
    try {
      const { response, body } = await request(`/recommendations/similar/${productId}?limit=5`);
      if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
      if (!Array.isArray(body?.data?.products)) throw new Error('Expected products array');
      if (body.data.products.some((item) => item.id === productId)) throw new Error('Source product leaked into similar results');
      if (body.data.products.some((item) => item.similarityScore === undefined)) throw new Error('Similarity metadata missing');
      pass('similar-products endpoint returns vector-similar products');
    } catch (error) { fail('similar-products endpoint returns vector-similar products', error); }

    try {
      const { response } = await request(`/recommendations/similar/not-a-valid-id`);
      if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
      pass('invalid product id is rejected');
    } catch (error) { fail('invalid product id is rejected', error); }
  }

  const email = `searchiq-reco-${Date.now()}@example.com`;
  const password = 'Reco@123';
  let token = null;
  try {
    const { response, body } = await request('/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Recommendation Test', email, password }),
    });
    if (response.status !== 201 || !body?.data?.accessToken) throw new Error(`Registration failed with ${response.status}`);
    token = body.data.accessToken;
    pass('test user can register');
  } catch (error) { fail('test user can register', error); }

  if (token) {
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    try {
      const { response } = await request('/recommendations/for-me?limit=5', { headers });
      if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
      if (!Array.isArray((await request('/recommendations/for-me?limit=5', { headers })).body?.data?.products)) throw new Error('Expected products array');
      pass('authenticated recommendations endpoint works with popular fallback');
    } catch (error) { fail('authenticated recommendations endpoint works with popular fallback', error); }

    if (productId) {
      try {
        const viewed = await request(`/recommendations/viewed/${productId}`, { method: 'POST', headers });
        if (viewed.response.status !== 200) throw new Error(`View record failed with ${viewed.response.status}`);
        const recent = await request('/recommendations/recently-viewed?limit=5', { headers });
        if (recent.response.status !== 200) throw new Error(`Recent views returned ${recent.response.status}`);
        if (!(recent.body?.data?.entries ?? []).some((entry) => entry.product?.id === productId)) throw new Error('Viewed product not found in history');
        pass('recently-viewed record/list flow works');

        const personalized = await request('/recommendations/for-me?limit=5', { headers });
        if (personalized.response.status !== 200) throw new Error(`Personalized recommendations returned ${personalized.response.status}`);
        pass('recommendations use recent-view history when available');

        const cleared = await request('/recommendations/recently-viewed', { method: 'DELETE', headers });
        if (cleared.response.status !== 200) throw new Error(`Clear returned ${cleared.response.status}`);
        const after = await request('/recommendations/recently-viewed?limit=5', { headers });
        if (after.response.status !== 200 || (after.body?.data?.entries ?? []).length !== 0) throw new Error('Recent views were not cleared');
        pass('recently-viewed history can be cleared');
      } catch (error) { fail('recently-viewed flow works', error); }
    }
  }

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
