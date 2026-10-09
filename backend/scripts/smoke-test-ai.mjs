import 'dotenv/config';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:5000/api/v1';
const email = process.env.ADMIN_EMAIL ?? 'admin@searchiq.com';
const password = process.env.ADMIN_PASSWORD ?? 'Admin@12345';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

console.log(`Testing ${BASE}`);
console.log('\nSetup');

const health = await request('/health');
check('API is healthy', health.response.status === 200);

const login = await request('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});
const token = login.body?.data?.accessToken;
check('admin can log in', login.response.status === 200 && Boolean(token));

if (token) {
  console.log('\nAI integration');

  const model = await request('/ai/model', {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(
    'Node can reach AI service',
    model.response.status === 200 &&
      model.body?.data?.model &&
      model.body?.data?.dimensions === 384,
    JSON.stringify(model.body),
  );

  const analysis = await request('/ai/analyze-query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      query: 'comfortable black shoes for college under ₹2500',
      vocabulary: {
        categories: ['Footwear', 'Clothing', 'Electronics'],
        brands: ['Nike', 'Adidas', 'Campus'],
      },
    }),
  });

  const data = analysis.body?.data;
  check(
    'AI analyzes a natural-language query',
    analysis.response.status === 200 &&
      data?.cleanQuery &&
      data?.embedding?.length === 384,
    JSON.stringify(analysis.body),
  );
  check(
    'AI parser extracts max price',
    data?.hardFilters?.maxPrice === 2500,
    JSON.stringify(data?.hardFilters),
  );
  check(
    'AI parser keeps color as a soft signal',
    Array.isArray(data?.softSignals?.colors) &&
      data.softSignals.colors.includes('black'),
    JSON.stringify(data?.softSignals),
  );

  const diag = await request('/ai/diagnostics', {
    headers: { Authorization: `Bearer ${token}` },
  });
  check('AI diagnostics endpoint works', diag.response.status === 200);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
