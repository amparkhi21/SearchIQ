// End-to-end smoke test for the Phase 3 product catalog.
// Run with the API and the seed data in place:   npm run test:catalog
// Needs ADMIN_EMAIL / ADMIN_PASSWORD in backend/.env (the same admin created by `npm run seed:admin`).
import 'dotenv/config';

const BASE = (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}/api/v1`).replace(/\/$/, '');
const STAMP = Date.now();
const UNIQUE = `smoketest${STAMP}`;

let passed = 0;
const failures = [];

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    // non-JSON response
  }
  return { status: response.status, body: json };
}

const query = (params) => `?${new URLSearchParams(params).toString()}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectStatus(res, expected) {
  assert(res.status === expected, `expected HTTP ${expected} but got ${res.status} (${res.body?.message ?? 'no message'})`);
}

const sortedBy = (items, pick, direction) =>
  items.every((item, i) => i === 0 || (direction === 'asc' ? pick(items[i - 1]) <= pick(item) : pick(items[i - 1]) >= pick(item)));

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failures.push(name);
    console.log(`  FAIL  ${name}\n          -> ${err.message}`);
  }
}

const section = (title) => console.log(`\n${title}`);

const created = { products: [], brands: [], categories: [] };
const ctx = {};

async function main() {
  console.log(`Testing ${BASE}`);

  section('Setup');
  await check('API is healthy', async () => {
    const res = await call('GET', '/health');
    expectStatus(res, 200);
  });

  await check('admin can log in', async () => {
    assert(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, 'ADMIN_EMAIL / ADMIN_PASSWORD missing in backend/.env');
    const res = await call('POST', '/auth/login', { body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    expectStatus(res, 200);
    ctx.admin = res.body.data.accessToken;
    assert(res.body.data.user.role === 'admin', 'logged-in user is not an admin (run: npm run seed:admin)');
  });

  await check('normal user can register', async () => {
    const res = await call('POST', '/auth/register', {
      body: { name: 'Smoke Tester', email: `smoke.${STAMP}@example.com`, password: 'Smoke@1234' },
    });
    expectStatus(res, 201);
    ctx.user = res.body.data.accessToken;
    assert(res.body.data.user.role === 'user', 'new user should have role "user"');
  });

  if (!ctx.admin || !ctx.user) {
    console.log('\nCannot continue without admin and user tokens.');
    return;
  }

  // ------------------------------------------------------------------
  section('Public: categories and brands');
  await check('GET /categories lists the seeded categories with product counts', async () => {
    const res = await call('GET', '/categories');
    expectStatus(res, 200);
    const { categories } = res.body.data;
    const slugs = categories.map((c) => c.slug);
    for (const slug of ['grocery', 'clothing', 'footwear', 'electronics', 'beauty', 'home-and-kitchen']) {
      assert(slugs.includes(slug), `category "${slug}" missing (run: npm run seed:catalog)`);
    }
    assert(categories.length >= 10, `expected at least 10 categories, got ${categories.length}`);
    assert(categories.every((c) => typeof c.productCount === 'number'), 'productCount missing');
    ctx.footwear = categories.find((c) => c.slug === 'footwear');
    assert(ctx.footwear.productCount > 0, 'footwear has no products');
  });

  await check('GET /categories/:slug returns the category', async () => {
    const res = await call('GET', '/categories/footwear');
    expectStatus(res, 200);
    assert(res.body.data.category.slug === 'footwear', 'wrong category');
    assert(Array.isArray(res.body.data.category.children), 'children missing');
  });

  await check('GET /categories/:id works with an id too', async () => {
    const res = await call('GET', `/categories/${ctx.footwear.id}`);
    expectStatus(res, 200);
  });

  await check('unknown category returns 404', async () => {
    expectStatus(await call('GET', '/categories/does-not-exist'), 404);
  });

  await check('GET /brands lists brands', async () => {
    const res = await call('GET', '/brands');
    expectStatus(res, 200);
    assert(res.body.data.brands.length >= 20, `expected at least 20 brands, got ${res.body.data.brands.length}`);
  });

  await check('GET /brands/nike returns the brand', async () => {
    const res = await call('GET', '/brands/nike');
    expectStatus(res, 200);
    assert(res.body.data.brand.slug === 'nike', 'wrong brand');
    assert(res.body.data.brand.productCount > 0, 'nike has no products');
  });

  // ------------------------------------------------------------------
  section('Public: product listing, pagination, filters, sorting, search');
  await check('GET /products returns seeded products (at least 200)', async () => {
    const res = await call('GET', `/products${query({ limit: 10 })}`);
    expectStatus(res, 200);
    assert(res.body.data.products.length === 10, 'expected 10 products');
    assert(res.body.meta.total >= 200, `expected at least 200 products, total is ${res.body.meta.total}`);
    const p = res.body.data.products[0];
    for (const field of ['id', 'name', 'slug', 'sku', 'price', 'discountPercent', 'finalPrice', 'stock', 'inStock', 'images', 'ratingAvg', 'ratingCount', 'createdAt', 'updatedAt']) {
      assert(field in p, `product field "${field}" missing`);
    }
    assert(p.category?.slug && p.brand?.slug, 'category/brand are not populated');
    ctx.total = res.body.meta.total;
    ctx.sample = p;
  });

  await check('pagination: pages do not overlap and meta is correct', async () => {
    const p1 = await call('GET', `/products${query({ limit: 20, page: 1 })}`);
    const p2 = await call('GET', `/products${query({ limit: 20, page: 2 })}`);
    expectStatus(p1, 200);
    expectStatus(p2, 200);
    const ids1 = new Set(p1.body.data.products.map((p) => p.id));
    assert(p2.body.data.products.every((p) => !ids1.has(p.id)), 'page 2 repeats products from page 1');
    assert(p1.body.meta.totalPages === Math.ceil(p1.body.meta.total / 20), 'totalPages is wrong');
    assert(p1.body.meta.hasNextPage === true && p1.body.meta.hasPrevPage === false, 'page 1 flags are wrong');
    assert(p2.body.meta.page === 2 && p2.body.meta.hasPrevPage === true, 'page 2 flags are wrong');
  });

  await check('pagination: last page holds the remainder, pages beyond it are empty', async () => {
    const limit = 20;
    const lastPage = Math.ceil(ctx.total / limit);
    const last = await call('GET', `/products${query({ limit, page: lastPage })}`);
    expectStatus(last, 200);
    assert(last.body.data.products.length === ctx.total - (lastPage - 1) * limit, 'last page has the wrong size');
    assert(last.body.meta.hasNextPage === false, 'last page should not have a next page');
    const beyond = await call('GET', `/products${query({ limit, page: lastPage + 5 })}`);
    expectStatus(beyond, 200);
    assert(beyond.body.data.products.length === 0, 'page beyond the end should be empty');
  });

  await check('limit above 100 is rejected (400)', async () => {
    expectStatus(await call('GET', `/products${query({ limit: 101 })}`), 400);
  });

  await check('filter by category (slug)', async () => {
    const res = await call('GET', `/products${query({ category: 'footwear', limit: 100 })}`);
    expectStatus(res, 200);
    assert(res.body.data.products.length > 0, 'no footwear products');
    assert(res.body.data.products.every((p) => p.category.slug === 'footwear'), 'a product from another category was returned');
  });

  await check('filter by brand (slug)', async () => {
    const res = await call('GET', `/products${query({ brand: 'nike', limit: 100 })}`);
    expectStatus(res, 200);
    assert(res.body.data.products.length > 0, 'no nike products');
    assert(res.body.data.products.every((p) => p.brand.slug === 'nike'), 'a product from another brand was returned');
  });

  await check('filter by several brands (comma separated)', async () => {
    const res = await call('GET', `/products${query({ brand: 'nike,adidas', limit: 100 })}`);
    expectStatus(res, 200);
    const brands = new Set(res.body.data.products.map((p) => p.brand.slug));
    assert(brands.has('nike') && brands.has('adidas') && brands.size === 2, `unexpected brands: ${[...brands]}`);
  });

  await check('price filter uses the final (discounted) price', async () => {
    const res = await call('GET', `/products${query({ minPrice: 1000, maxPrice: 2500, limit: 100 })}`);
    expectStatus(res, 200);
    assert(res.body.data.products.length > 0, 'no products in range');
    assert(res.body.data.products.every((p) => p.finalPrice >= 1000 && p.finalPrice <= 2500), 'a product is outside the price range');
  });

  await check('minPrice greater than maxPrice is rejected (400)', async () => {
    const res = await call('GET', `/products${query({ minPrice: 5000, maxPrice: 100 })}`);
    expectStatus(res, 400);
  });

  await check('rating, inStock and minDiscount filters', async () => {
    const rated = await call('GET', `/products${query({ rating: 4.5, limit: 100 })}`);
    expectStatus(rated, 200);
    assert(rated.body.data.products.every((p) => p.ratingAvg >= 4.5), 'rating filter failed');
    const stocked = await call('GET', `/products${query({ inStock: 'true', limit: 100 })}`);
    expectStatus(stocked, 200);
    assert(stocked.body.data.products.every((p) => p.inStock === true && p.stock > 0), 'inStock filter failed');
    const soldOut = await call('GET', `/products${query({ inStock: 'false', limit: 100 })}`);
    expectStatus(soldOut, 200);
    assert(soldOut.body.data.products.every((p) => p.inStock === false), 'inStock=false filter failed');
    const deals = await call('GET', `/products${query({ minDiscount: 30, limit: 100 })}`);
    expectStatus(deals, 200);
    assert(deals.body.data.products.every((p) => p.discountPercent >= 30), 'minDiscount filter failed');
  });

  await check('sorting: price_asc, price_desc, rating, popular, discount', async () => {
    const asc = await call('GET', `/products${query({ sort: 'price_asc', limit: 50 })}`);
    const desc = await call('GET', `/products${query({ sort: 'price_desc', limit: 50 })}`);
    const rating = await call('GET', `/products${query({ sort: 'rating', limit: 50 })}`);
    const popular = await call('GET', `/products${query({ sort: 'popular', limit: 50 })}`);
    const discount = await call('GET', `/products${query({ sort: 'discount', limit: 50 })}`);
    [asc, desc, rating, popular, discount].forEach((r) => expectStatus(r, 200));
    assert(sortedBy(asc.body.data.products, (p) => p.finalPrice, 'asc'), 'price_asc is not ascending');
    assert(sortedBy(desc.body.data.products, (p) => p.finalPrice, 'desc'), 'price_desc is not descending');
    assert(sortedBy(rating.body.data.products, (p) => p.ratingAvg, 'desc'), 'rating sort is wrong');
    assert(sortedBy(popular.body.data.products, (p) => p.soldCount, 'desc'), 'popular sort is wrong');
    assert(sortedBy(discount.body.data.products, (p) => p.discountPercent, 'desc'), 'discount sort is wrong');
  });

  await check('invalid sort value is rejected (400)', async () => {
    expectStatus(await call('GET', `/products${query({ sort: 'banana' })}`), 400);
  });

  await check('search: "running shoes" only returns running shoes', async () => {
    const res = await call('GET', `/products${query({ q: 'running shoes', limit: 100 })}`);
    expectStatus(res, 200);
    assert(res.body.meta.total > 0, 'no results for "running shoes"');
    assert(
      res.body.data.products.every((p) => /\brunning/i.test(JSON.stringify(p)) && /\bshoe/i.test(JSON.stringify(p))),
      'a result does not match both words',
    );
  });

  await check('search by brand name: "nike"', async () => {
    const res = await call('GET', `/products${query({ q: 'nike', limit: 100 })}`);
    expectStatus(res, 200);
    assert(res.body.meta.total > 0, 'no results for "nike"');
    assert(res.body.data.products.every((p) => p.brand.slug === 'nike' || /nike/i.test(p.name)), 'non-Nike result returned');
  });

  await check('search with no matches returns an empty list (200)', async () => {
    const res = await call('GET', `/products${query({ q: 'zzzqqqxxx' })}`);
    expectStatus(res, 200);
    assert(res.body.meta.total === 0 && res.body.data.products.length === 0, 'expected no results');
  });

  await check('combined: "black shoes" in footwear, under 2500, in stock', async () => {
    const res = await call('GET', `/products${query({ q: 'black shoes', category: 'footwear', maxPrice: 2500, inStock: 'true', sort: 'price_asc', limit: 50 })}`);
    expectStatus(res, 200);
    assert(res.body.meta.total > 0, 'no results for the combined query');
    assert(res.body.data.products.every((p) => p.category.slug === 'footwear' && p.finalPrice <= 2500 && p.inStock), 'a result breaks a filter');
    assert(res.body.data.products.every((p) => /black/i.test(JSON.stringify(p))), 'a result is not black');
  });

  await check('unknown category in a filter returns 404 with a clear message', async () => {
    const res = await call('GET', `/products${query({ category: 'no-such-category' })}`);
    expectStatus(res, 404);
    assert(/not found/i.test(res.body.message), 'message should explain what was not found');
  });

  await check('GET /products/:id and /products/:slug return the same product', async () => {
    const byId = await call('GET', `/products/${ctx.sample.id}`);
    const bySlug = await call('GET', `/products/${ctx.sample.slug}`);
    expectStatus(byId, 200);
    expectStatus(bySlug, 200);
    assert(byId.body.data.product.id === bySlug.body.data.product.id, 'id and slug returned different products');
  });

  await check('unknown product returns 404', async () => {
    expectStatus(await call('GET', '/products/000000000000000000000000'), 404);
    expectStatus(await call('GET', '/products/this-product-does-not-exist'), 404);
  });

  // ------------------------------------------------------------------
  section('Authorization: only admins can change the catalog');
  const productBody = (overrides = {}) => ({
    name: `${UNIQUE} Test Shoes`,
    description: 'A product created by the automated smoke test.',
    category: ctx.footwear.id,
    brand: ctx.sample.brand.id,
    sku: `SMOKE-${STAMP}`,
    price: 2000,
    discountPercent: 25,
    stock: 10,
    images: [{ url: 'https://placehold.co/800x800/png?text=Smoke', alt: 'test' }],
    tags: ['smoke', 'test'],
    attributes: { color: 'black', gender: 'unisex' },
    ...overrides,
  });

  const writes = [
    ['POST', '/categories', { name: 'Hacker Category' }],
    ['PUT', `/categories/${ctx.footwear.id}`, { description: 'hacked description' }],
    ['DELETE', `/categories/${ctx.footwear.id}`],
    ['POST', '/brands', { name: 'Hacker Brand' }],
    ['PUT', '/brands/000000000000000000000000', { description: 'x' }],
    ['DELETE', '/brands/000000000000000000000000'],
    ['POST', '/products', productBody()],
    ['PUT', `/products/${ctx.sample.id}`, { price: 1 }],
    ['DELETE', `/products/${ctx.sample.id}`],
  ];

  await check('anonymous visitors get 401 on every write endpoint', async () => {
    for (const [method, path, body] of writes) {
      const res = await call(method, path, { body });
      assert(res.status === 401, `${method} ${path} returned ${res.status}, expected 401`);
    }
  });

  await check('normal users get 403 on every write endpoint', async () => {
    for (const [method, path, body] of writes) {
      const res = await call(method, path, { token: ctx.user, body });
      assert(res.status === 403, `${method} ${path} returned ${res.status}, expected 403`);
    }
  });

  await check('the product was not changed by the rejected requests', async () => {
    const res = await call('GET', `/products/${ctx.sample.id}`);
    assert(res.body.data.product.price === ctx.sample.price, 'price changed even though the request was rejected');
  });

  // ------------------------------------------------------------------
  section('Admin: categories');
  await check('create category (201) with generated slug', async () => {
    const res = await call('POST', '/categories', { token: ctx.admin, body: { name: `Smoke Category ${STAMP}`, description: 'temporary' } });
    expectStatus(res, 201);
    ctx.category = res.body.data.category;
    created.categories.push(ctx.category.id);
    assert(ctx.category.slug === `smoke-category-${STAMP}`, `unexpected slug ${ctx.category.slug}`);
  });

  await check('duplicate category name returns 409', async () => {
    const res = await call('POST', '/categories', { token: ctx.admin, body: { name: `Smoke Category ${STAMP}` } });
    expectStatus(res, 409);
  });

  await check('invalid category returns 400 with field errors', async () => {
    const res = await call('POST', '/categories', { token: ctx.admin, body: { name: 'x', sortOrder: -5 } });
    expectStatus(res, 400);
    assert(Array.isArray(res.body.errors) && res.body.errors.length >= 1, 'field errors missing');
  });

  await check('update category (PUT) and empty update is rejected', async () => {
    const ok = await call('PUT', `/categories/${ctx.category.id}`, { token: ctx.admin, body: { description: 'updated description' } });
    expectStatus(ok, 200);
    assert(ok.body.data.category.description === 'updated description', 'description not updated');
    expectStatus(await call('PUT', `/categories/${ctx.category.id}`, { token: ctx.admin, body: {} }), 400);
  });

  await check('sub-category: create, parent shows children, parent cannot be deleted', async () => {
    const child = await call('POST', '/categories', { token: ctx.admin, body: { name: `Smoke Child ${STAMP}`, parent: ctx.category.id } });
    expectStatus(child, 201);
    created.categories.unshift(child.body.data.category.id);
    const parent = await call('GET', `/categories/${ctx.category.id}`);
    assert(parent.body.data.category.children.some((c) => c.slug === child.body.data.category.slug), 'child missing from parent');
    expectStatus(await call('DELETE', `/categories/${ctx.category.id}`, { token: ctx.admin }), 409);
    expectStatus(await call('DELETE', `/categories/${child.body.data.category.id}`, { token: ctx.admin }), 200);
    created.categories.shift();
  });

  // ------------------------------------------------------------------
  section('Admin: brands');
  await check('create brand (201), duplicate (409), update, get', async () => {
    const res = await call('POST', '/brands', { token: ctx.admin, body: { name: `Smoke Brand ${STAMP}`, website: 'https://example.com' } });
    expectStatus(res, 201);
    ctx.brand = res.body.data.brand;
    created.brands.push(ctx.brand.id);
    expectStatus(await call('POST', '/brands', { token: ctx.admin, body: { name: `Smoke Brand ${STAMP}` } }), 409);
    const upd = await call('PUT', `/brands/${ctx.brand.id}`, { token: ctx.admin, body: { description: 'updated brand' } });
    expectStatus(upd, 200);
    assert(upd.body.data.brand.description === 'updated brand', 'brand not updated');
    expectStatus(await call('GET', `/brands/${ctx.brand.slug}`), 200);
  });

  await check('invalid brand website returns 400', async () => {
    expectStatus(await call('POST', '/brands', { token: ctx.admin, body: { name: 'Bad Site', website: 'not-a-url' } }), 400);
  });

  // ------------------------------------------------------------------
  section('Admin: products');
  await check('create product (201): finalPrice, inStock, slug and populated refs', async () => {
    const res = await call('POST', '/products', { token: ctx.admin, body: productBody({ brand: ctx.brand.id }) });
    expectStatus(res, 201);
    const p = res.body.data.product;
    ctx.product = p;
    created.products.push(p.id);
    assert(p.finalPrice === 1500, `finalPrice should be 1500, got ${p.finalPrice}`);
    assert(p.inStock === true && p.stockStatus === 'in_stock', 'inStock / stockStatus wrong');
    assert(p.slug === `${UNIQUE}-test-shoes`, `unexpected slug ${p.slug}`);
    assert(p.category.slug === 'footwear' && p.brand.slug === ctx.brand.slug, 'category/brand not populated');
    assert(p.sku === `SMOKE-${STAMP}`, 'sku wrong');
  });

  await check('new product is visible in the public list and searchable', async () => {
    const res = await call('GET', `/products${query({ q: UNIQUE })}`);
    expectStatus(res, 200);
    assert(res.body.meta.total === 1, `expected 1 result, got ${res.body.meta.total}`);
  });

  await check('duplicate SKU returns 409', async () => {
    const res = await call('POST', '/products', { token: ctx.admin, body: productBody({ name: `${UNIQUE} Other`, brand: ctx.brand.id }) });
    expectStatus(res, 409);
  });

  await check('invalid product returns 400 with errors for each bad field', async () => {
    const res = await call('POST', '/products', { token: ctx.admin, body: { name: 'A', price: -5, discountPercent: 95, category: 'nope' } });
    expectStatus(res, 400);
    const fields = (res.body.errors ?? []).map((e) => e.field);
    for (const field of ['name', 'description', 'category', 'brand', 'sku', 'price', 'discountPercent']) {
      assert(fields.includes(field), `no error reported for "${field}"`);
    }
  });

  await check('category or brand that does not exist returns 400', async () => {
    const res = await call('POST', '/products', {
      token: ctx.admin,
      body: productBody({ sku: `SMOKE-X-${STAMP}`, category: '000000000000000000000000' }),
    });
    expectStatus(res, 400);
    assert((res.body.errors ?? []).some((e) => e.field === 'category'), 'category error missing');
  });

  await check('update product: price/discount recalculate finalPrice', async () => {
    const res = await call('PUT', `/products/${ctx.product.id}`, { token: ctx.admin, body: { price: 3000, discountPercent: 10 } });
    expectStatus(res, 200);
    assert(res.body.data.product.finalPrice === 2700, `finalPrice should be 2700, got ${res.body.data.product.finalPrice}`);
    assert(res.body.data.product.slug === ctx.product.slug, 'slug should stay stable');
  });

  await check('update product: stock 0 makes it out of stock', async () => {
    const res = await call('PUT', `/products/${ctx.product.id}`, { token: ctx.admin, body: { stock: 0 } });
    expectStatus(res, 200);
    assert(res.body.data.product.inStock === false && res.body.data.product.stockStatus === 'out_of_stock', 'availability not updated');
    const list = await call('GET', `/products${query({ q: UNIQUE, inStock: 'true' })}`);
    assert(list.body.meta.total === 0, 'out-of-stock product still appears with inStock=true');
  });

  await check('update product: attributes are merged, not replaced', async () => {
    const res = await call('PUT', `/products/${ctx.product.id}`, { token: ctx.admin, body: { attributes: { variant: 'Limited' } } });
    expectStatus(res, 200);
    const a = res.body.data.product.attributes;
    assert(a.variant === 'Limited' && a.color === 'black' && a.gender === 'unisex', `attributes were not merged: ${JSON.stringify(a)}`);
  });

  await check('update product: empty body (400) and unknown product (404)', async () => {
    expectStatus(await call('PUT', `/products/${ctx.product.id}`, { token: ctx.admin, body: {} }), 400);
    expectStatus(await call('PUT', '/products/000000000000000000000000', { token: ctx.admin, body: { price: 10 } }), 404);
  });

  await check('hidden (inactive) product: invisible to the public, visible to admins', async () => {
    const res = await call('PUT', `/products/${ctx.product.id}`, { token: ctx.admin, body: { isActive: false } });
    expectStatus(res, 200);
    expectStatus(await call('GET', `/products/${ctx.product.id}`), 404);
    expectStatus(await call('GET', `/products/${ctx.product.id}`, { token: ctx.user }), 404);
    expectStatus(await call('GET', `/products/${ctx.product.id}`, { token: ctx.admin }), 200);
    const publicList = await call('GET', `/products${query({ q: UNIQUE, includeInactive: 'true' })}`);
    assert(publicList.body.meta.total === 0, 'includeInactive must be ignored for non-admins');
    const adminList = await call('GET', `/products${query({ q: UNIQUE, includeInactive: 'true' })}`, { token: ctx.admin });
    assert(adminList.body.meta.total === 1, 'admin should see the hidden product with includeInactive=true');
  });

  await check('cannot delete a brand or category that still has products (409)', async () => {
    expectStatus(await call('DELETE', `/brands/${ctx.brand.id}`, { token: ctx.admin }), 409);
    expectStatus(await call('DELETE', `/categories/${ctx.footwear.id}`, { token: ctx.admin }), 409);
  });

  await check('delete product (200), then it is gone (404)', async () => {
    expectStatus(await call('DELETE', `/products/${ctx.product.id}`, { token: ctx.admin }), 200);
    created.products.pop();
    expectStatus(await call('GET', `/products/${ctx.product.id}`, { token: ctx.admin }), 404);
    expectStatus(await call('DELETE', `/products/${ctx.product.id}`, { token: ctx.admin }), 404);
  });

  await check('delete the test brand and category (200), then they are gone (404)', async () => {
    expectStatus(await call('DELETE', `/brands/${ctx.brand.id}`, { token: ctx.admin }), 200);
    created.brands.pop();
    expectStatus(await call('DELETE', `/categories/${ctx.category.id}`, { token: ctx.admin }), 200);
    created.categories.pop();
    expectStatus(await call('GET', `/brands/${ctx.brand.id}`), 404);
    expectStatus(await call('GET', `/categories/${ctx.category.id}`), 404);
  });
}

try {
  await main();
} catch (err) {
  failures.push(`unexpected error: ${err.message}`);
  console.log(`\nUnexpected error: ${err.message}`);
} finally {
  // Remove anything a failed check left behind
  for (const id of created.products) await call('DELETE', `/products/${id}`, { token: ctx.admin }).catch(() => {});
  for (const id of created.brands) await call('DELETE', `/brands/${id}`, { token: ctx.admin }).catch(() => {});
  for (const id of created.categories) await call('DELETE', `/categories/${id}`, { token: ctx.admin }).catch(() => {});
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  failures.forEach((name) => console.log(`  - ${name}`));
  process.exit(1);
}
console.log('All catalog checks passed.');
