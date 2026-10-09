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

async function main() {
  console.log(`Testing search suggestions/history at ${baseUrl}`);
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
    const { response, body } = await request('/search/suggestions?q=run&limit=10');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!Array.isArray(body?.data?.suggestions) || body.data.suggestions.length === 0) throw new Error('Expected suggestions');
    if (!body.data.suggestions.every((item) => ['product', 'brand', 'category'].includes(item.type))) throw new Error('Invalid suggestion type');
    pass('autocomplete returns product/brand/category suggestions');
  } catch (error) { fail('autocomplete returns product/brand/category suggestions', error); }

  try {
    const first = await request('/search/suggestions?q=nike');
    const second = await request('/search/suggestions?q=nike');
    if (first.response.status !== 200 || second.response.status !== 200) throw new Error('Suggestion requests failed');
    if (second.body?.data?.cached !== true) throw new Error('Expected cached suggestion response');
    pass('repeated suggestions use Redis cache when available');
  } catch (error) { fail('repeated suggestions use Redis cache when available', error); }

  const email = `searchiq-recent-${Date.now()}@example.com`;
  const password = 'Recent@123';
  let token = null;

  try {
    const { response, body } = await request('/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Search History Test', email, password }),
    });
    if (response.status !== 201 || !body?.data?.accessToken) throw new Error(`Registration failed with ${response.status}`);
    token = body.data.accessToken;
    pass('test user can register for recent-search history');
  } catch (error) { fail('test user can register for recent-search history', error); }

  if (token) {
    try {
      const headers = { authorization: `Bearer ${token}` };
      const search = await request('/search/query?q=black%20shoes', { headers });
      if (search.response.status !== 200) throw new Error(`Search failed with ${search.response.status}`);
      const recent = await request('/search/recent?limit=10', { headers });
      if (recent.response.status !== 200) throw new Error(`Recent history returned ${recent.response.status}`);
      if (!recent.body?.data?.searches?.some((item) => item.query.toLowerCase() === 'black shoes')) throw new Error('Expected black shoes in recent history');
      pass('authenticated search is saved to recent history');

      const cleared = await request('/search/recent', { method: 'DELETE', headers });
      if (cleared.response.status !== 200) throw new Error(`Clear returned ${cleared.response.status}`);
      const after = await request('/search/recent', { headers });
      if (after.response.status !== 200 || (after.body?.data?.searches ?? []).length !== 0) throw new Error('Recent history was not cleared');
      pass('authenticated user can clear recent search history');
    } catch (error) {
      fail('authenticated recent-search history flow works', error);
    }

    try {
      const anonymous = await request('/search/recent');
      if (anonymous.response.status !== 401) throw new Error(`Expected 401, got ${anonymous.response.status}`);
      pass('recent searches require authentication');
    } catch (error) { fail('recent searches require authentication', error); }
  }

  try {
    const { response } = await request('/search/suggestions');
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('missing suggestion query is rejected');
  } catch (error) { fail('missing suggestion query is rejected', error); }

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
