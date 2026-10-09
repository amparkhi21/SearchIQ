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
  console.log(`Testing search analytics at ${baseUrl}`);
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

  const email = env.admin.email || 'admin@searchiq.com';
  const password = env.admin.password || 'Admin@12345';
  let token;
  try {
    const { response, body } = await request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (response.status !== 200 || !body?.data?.accessToken) throw new Error(`Admin login failed with ${response.status}`);
    token = body.data.accessToken;
    pass('admin can log in');
  } catch (error) {
    fail('admin can log in', error);
    process.exitCode = 1;
    return;
  }

  const headers = { authorization: `Bearer ${token}` };
  try {
    const { response, body } = await request('/admin/analytics/search?days=7&limit=10', { headers });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const data = body?.data;
    if (!data?.summary || !Array.isArray(data.topQueries) || !Array.isArray(data.zeroResultQueries) || !Array.isArray(data.modeUsage) || !Array.isArray(data.daily)) {
      throw new Error('Analytics response shape is incomplete');
    }
    if (data.windowDays !== 7) throw new Error('windowDays mismatch');
    pass('admin can fetch search analytics');
  } catch (error) { fail('admin can fetch search analytics', error); }

  try {
    const { response } = await request('/admin/analytics/search?days=0', { headers });
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('invalid analytics window is rejected');
  } catch (error) { fail('invalid analytics window is rejected', error); }

  try {
    const { response } = await request('/admin/analytics/search?limit=1000', { headers });
    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    pass('analytics limit is bounded');
  } catch (error) { fail('analytics limit is bounded', error); }

  const anon = await request('/admin/analytics/search');
  if (anon.response.status === 401) pass('search analytics requires authentication');
  else fail('search analytics requires authentication', new Error(`Expected 401, got ${anon.response.status}`));

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
