// Offline image identity and duplicate-search regression tests.
import assert from 'node:assert/strict';
import { buildCatalog } from '../src/seed/data/catalog.builder.js';
import { loadImageAssignments, loadImageRecords } from '../src/seed/data/imageManifest.js';
import { toSearchDocument, buildBulkIndexBody } from '../src/services/indexing.service.js';
import { fuseHybridCandidates, uniqueSearchHits, toSearchResult } from '../src/services/search.service.js';
import { planDuplicateIndexCleanup } from '../src/seed/searchIndexRepair.js';
import { planProductImageUpdates } from '../src/seed/imageApplyPlan.js';
import { productImages, normalizeProductImageUrl } from '../../frontend/src/utils/product.js';
import { isUsableImageUrl, shouldShowProductImageFallback } from '../../frontend/src/utils/product.js';

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ok  ${name}`); }
  catch (error) { console.error(`  FAIL ${name}\n       ${error.message}`); process.exitCode = 1; }
};

const catalog = buildCatalog();
const records = loadImageRecords();
const assignments = loadImageAssignments();
const catalogBySku = new Map(catalog.products.map((product) => [product.sku, product]));

test('catalog contains stable unique SKU identities across categories', () => {
  assert.equal(catalog.products.length, 275);
  assert.equal(new Set(catalog.products.map((product) => product.sku)).size, catalog.products.length);
  assert.ok(new Set(catalog.products.map((product) => product.categoryName)).size > 1);
});

test('only explicitly verified exact product mappings can reach a product record', () => {
  for (const [sku, assignment] of assignments) {
    assert.ok(assignment.verified, `${sku} is not marked verified`);
    assert.equal(assignment.level, 'exact');
    assert.equal(assignment.name, catalogBySku.get(sku)?.name, `${sku} product name changed`);
  }
  for (const product of catalog.products) {
    if (!assignments.has(product.sku)) {
      assert.deepEqual(product.images, []);
      continue;
    }
    assert.equal(product.images.length, 1);
    assert.equal(product.images[0].url, assignments.get(product.sku).image.url);
    assert.equal(product.images[0].alt, product.name);
  }
});

test('legacy product-type/category stock photos are audit-only, never assignments', () => {
  for (const [sku, record] of records) {
    if (record.level !== 'exact' || record.verified !== true) assert.ok(!assignments.has(sku));
  }
});

test('verified image assignments are keyed to their SKU and exact product name', () => {
  for (const [sku, assignment] of assignments) {
    assert.ok(catalogBySku.has(sku), `unknown SKU ${sku}`);
    assert.equal(assignment.name, catalogBySku.get(sku).name);
    assert.ok(assignment.image.url.startsWith('https://'));
  }
});

test('different products never share one verified image URL', () => {
  const owners = new Map();
  for (const [sku, assignment] of assignments) {
    const url = new URL(assignment.image.url);
    url.search = '';
    const key = url.toString();
    assert.ok(!owners.has(key), `${sku} shares a verified image with ${owners.get(key)}`);
    owners.set(key, sku);
  }
});

test('missing products have no unrelated URL and use the frontend fallback path', () => {
  const missing = catalog.products.find((product) => !assignments.has(product.sku));
  assert.ok(missing);
  assert.deepEqual(productImages({ ...missing, images: [] }), []);
  assert.equal(shouldShowProductImageFallback('', false), true);
  assert.equal(isUsableImageUrl('javascript:alert(1)'), false);
});

test('existing image URLs are preserved even when their descriptions are marked generic', () => {
  const images = productImages({
    name: 'Example Product',
    images: [
      { url: 'https://images.unsplash.com/photo-1', alt: 'Example Product - general Beauty photo' },
      { url: 'https://cdn.example.com/example-product.jpg', alt: 'Example Product front view' },
    ],
  });
  assert.deepEqual(images.map((image) => image.url), [
    'https://images.unsplash.com/photo-1',
    'https://cdn.example.com/example-product.jpg',
  ]);
  assert.equal(productImages({ name: 'Example Product', images: [], imageUrl: '/uploads/example.jpg' })[0].url, 'http://localhost:5000/uploads/example.jpg');
  assert.equal(productImages({ name: 'Example Product', images: [{ url: 'javascript:bad()' }], thumbnail: '/uploads/fallback.jpg' })[0].url, 'http://localhost:5000/uploads/fallback.jpg');
  assert.equal(productImages({ name: 'Example Product', image: 'https://cdn.example.com/example.jpg' })[0].url, 'https://cdn.example.com/example.jpg');
});

test('broken remote image loads select the same UI fallback state', () => {
  assert.equal(isUsableImageUrl('https://cdn.example.test/item.jpg'), true);
  assert.equal(shouldShowProductImageFallback('https://cdn.example.test/item.jpg', false), false);
  assert.equal(shouldShowProductImageFallback('https://cdn.example.test/missing.jpg', true), true);
  assert.equal(isUsableImageUrl('/uploads/product.jpg'), true);
  assert.equal(normalizeProductImageUrl('/uploads/product.jpg'), 'http://localhost:5000/uploads/product.jpg');
  assert.equal(isUsableImageUrl('not-a-url'), false);
});

test('type and category matching never masquerades as exact identity', () => {
  const categoryCandidates = [...records.values()].filter((record) => record.level === 'type' || record.level === 'category');
  assert.ok(categoryCandidates.length > 0);
  assert.equal(categoryCandidates.filter((record) => record.verified === true).length, 0);
});

test('OpenSearch document generation carries the product-owned image unchanged', () => {
  const source = { ...catalog.products[0], _id: 'product-1', category: { name: 'Footwear', slug: 'footwear' }, brand: { name: 'Nike', slug: 'nike' } };
  const image = { url: 'https://cdn.example.test/nike-item.jpg', alt: source.name };
  const document = toSearchDocument({ ...source, images: [image] }, { text: source.name, embedding: Array(384).fill(0.1), embeddingVersion: 'test' });
  assert.equal(document.images[0].url, image.url);
  assert.equal(document.images[0].alt, image.alt);
  assert.equal(document.productId, 'product-1');
});

test('search API serialization preserves the Product schema image array', () => {
  const images = [{ url: 'https://cdn.example.test/item.jpg', alt: 'Item front' }];
  const serialized = toSearchResult({ _source: { productId: 'p1', sku: 'SKU-1', images } });
  assert.equal(serialized.images[0].url, images[0].url);
  assert.equal(serialized.images[0].alt, images[0].alt);
});

test('image apply updates only exact matches and preserves products without a mapping', () => {
  const products = [
    { _id: '1', sku: 'SKU-1', name: 'Product One', images: [{ url: 'https://old.example/one.jpg' }] },
    { _id: '2', sku: 'SKU-2', name: 'Product Two', images: [{ url: 'https://old.example/two.jpg' }] },
    { _id: '3', sku: 'SKU-3', name: 'Catalog Name', images: [{ url: 'https://old.example/three.jpg' }] },
  ];
  const assignments = new Map([
    ['SKU-1', { name: 'Product One', verified: true, image: { url: 'https://exact.example/one.jpg' } }],
    ['SKU-3', { name: 'Different Product', verified: true, image: { url: 'https://wrong.example/three.jpg' } }],
  ]);
  const plan = planProductImageUpdates(products, assignments);
  assert.equal(plan.operations.length, 1);
  assert.deepEqual(plan.operations[0].updateOne.update.$set.images, [{ url: 'https://exact.example/one.jpg' }]);
  assert.equal(plan.preservedCount, 2);
  assert.deepEqual(products[1].images, [{ url: 'https://old.example/two.jpg' }]);
  assert.deepEqual(products[2].images, [{ url: 'https://old.example/three.jpg' }]);
  assert.equal(plan.skipped.nameMismatch.length, 1);
});

test('bulk reindex uses stable product IDs, making repeat indexing an upsert', () => {
  const docs = [{ productId: 'p1', sku: 'SKU-1' }, { productId: 'p2', sku: 'SKU-2' }];
  const first = buildBulkIndexBody(docs);
  const second = buildBulkIndexBody(docs);
  assert.deepEqual(first, second);
  assert.deepEqual([first[0].index._id, first[2].index._id], ['p1', 'p2']);
});

test('RRF deduplicates repeated product IDs across branches', () => {
  const hits = [
    { _id: 'p1', _source: { productId: 'p1', sku: 'SKU-1', name: 'Lakme Kajal' }, _score: 9 },
    { _id: 'legacy-p1', _source: { productId: 'p1', sku: 'SKU-1', name: 'Lakme Kajal' }, _score: 8 },
  ];
  const fused = fuseHybridCandidates(hits, hits, { bm25Weight: 0.55, vectorWeight: 0.45, rrfK: 60 });
  assert.equal(fused.length, 1);
  assert.equal(fused[0].source.name, 'Lakme Kajal');
});

test('RRF deduplicates different index IDs with the same SKU but preserves distinct variants', () => {
  const bm25 = [
    { _id: 'old', _source: { productId: 'old', sku: 'ABC-001', name: 'Laptop' }, _score: 9 },
    { _id: 'variant', _source: { productId: 'variant', sku: 'ABC-002', name: 'Laptop (16 GB)' }, _score: 8 },
  ];
  const vector = [{ _id: 'new', _source: { productId: 'new', sku: 'abc-001', name: 'Laptop' }, _score: 1 }];
  const fused = fuseHybridCandidates(bm25, vector, { bm25Weight: 0.55, vectorWeight: 0.45, rrfK: 60 });
  assert.deepEqual(new Set(fused.map((item) => item.source.sku.toUpperCase())), new Set(['ABC-001', 'ABC-002']));
});

test('search-hit pagination receives unique SKU results', () => {
  const hits = [
    { _id: 'a-old', _source: { sku: 'A', productId: '1', name: 'stale' } },
    { _id: '1', _source: { sku: 'A', productId: '1', name: 'canonical' } },
    { _id: 'b', _source: { sku: 'B', productId: '2' } },
  ];
  const unique = uniqueSearchHits(hits);
  assert.deepEqual(unique.slice(0, 2).map((hit) => hit._source.sku), ['A', 'B']);
  assert.equal(unique[0]._source.name, 'canonical');
});

test('duplicate index repair removes stale copies matching the current Mongo identity', () => {
  const current = { _id: 'p1', sku: 'SKU-1', name: 'Product One', brand: { name: 'Brand' }, category: { slug: 'beauty' } };
  const hits = [
    { _id: 'p1', _source: { productId: 'p1', sku: 'SKU-1', name: 'Product One', brandName: 'Brand', categorySlug: 'beauty' } },
    { _id: 'legacy', _source: { productId: 'legacy', sku: 'SKU-1', name: 'Product One', brandName: 'Brand', categorySlug: 'beauty' } },
  ];
  const plan = planDuplicateIndexCleanup(hits, [current]);
  assert.deepEqual(plan.deletions.map((hit) => hit._id), ['legacy']);
  assert.equal(plan.ambiguous.length, 0);
});

test('duplicate repair preserves distinct variants and ambiguous product IDs', () => {
  const variants = [
    { _id: 'v1', _source: { productId: 'v1', sku: 'SKU-1' } },
    { _id: 'v2', _source: { productId: 'v2', sku: 'SKU-2' } },
  ];
  const variantPlan = planDuplicateIndexCleanup(variants, [{ _id: 'v1', sku: 'SKU-1' }, { _id: 'v2', sku: 'SKU-2' }]);
  assert.equal(variantPlan.deletions.length, 0);

  const ambiguousPlan = planDuplicateIndexCleanup([
    { _id: 'p1', _source: { productId: 'p1', sku: 'SKU-1', name: 'Product One', brandName: 'Brand', categorySlug: 'beauty' } },
    { _id: 'old-id', _source: { productId: 'old-id', sku: 'SKU-1', name: 'Different Product', brandName: 'Brand', categorySlug: 'beauty' } },
  ], [{ _id: 'p1', sku: 'SKU-1', name: 'Product One', brand: { name: 'Brand' }, category: { slug: 'beauty' } }]);
  assert.equal(ambiguousPlan.deletions.length, 0);
  assert.equal(ambiguousPlan.ambiguous.length, 1);
});

console.log(`\n${passed} tests passed${process.exitCode ? ', some FAILED' : ''}`);
