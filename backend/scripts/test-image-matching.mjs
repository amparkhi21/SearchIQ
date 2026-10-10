// Offline tests for product image matching (no network, MongoDB or OpenSearch needed):  npm run test:images
import assert from 'node:assert/strict';
import { entryToImage } from '../src/seed/data/imageManifest.js';
import { buildImageUrl, deriveImageQuery, rankPhotos, scorePhoto } from '../src/seed/data/imageMatching.js';
import { productLines } from '../src/seed/data/products.data.js';
import { BudgetExhausted, resolveImages } from '../src/seed/imageResolver.js';

let passed = 0;
const test = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  ok  ${name}`); }
  catch (error) { console.error(`  FAIL ${name}\n       ${error.message}`); process.exitCode = 1; }
};

const line = (type, category = 'Footwear') => ({ type, category });
const photo = (id, alt, tags = []) => ({
  id, alt_description: alt, tags: tags.map((title) => ({ title })),
  urls: { raw: `https://images.unsplash.com/photo-${id}?ixid=abc` },
  user: { name: 'Ann', links: { html: 'https://unsplash.com/@ann' } }, links: { html: `https://unsplash.com/photos/${id}` },
});

await test('every one of the catalog products maps to a product-type query', () => {
  let count = 0;
  for (const l of productLines) for (const [brand, name] of l.items) {
    const d = deriveImageQuery(`${brand} ${name}`, l);
    assert.equal(d.level, 'type', `${brand} ${name} fell back to category`);
    count += 1;
  }
  assert.equal(count, 275);
});

await test('product types map to the right kind of photo query', () => {
  const q = (name, l) => deriveImageQuery(name, l).query;
  assert.equal(q('Nike Cushioned Running Shoes for Men', line('Running Shoes')), 'running shoes');
  assert.equal(q('HP 15 Laptop Intel Core i5', line('Laptops & Computer Accessories', 'Electronics')), 'laptop');
  assert.equal(q('Logitech Wireless Mouse', line('Laptops & Computer Accessories', 'Electronics')), 'computer mouse');
  assert.equal(q('Wildcraft Laptop Backpack (25 L)', line('Bags & Luggage', 'Bags & Luggage')), 'backpack');
  assert.equal(q('Van Heusen Men\'s Slim Fit Formal Shirt', line("Men's Shirts", 'Clothing')), 'men shirt');
  assert.equal(q('Hot Wheels Die-cast Cars (Pack of 5)', line('Toys & Board Games', 'Toys & Games')), 'toy cars');
  assert.equal(q('Roadster Men\'s Hooded Sweatshirt', line('Activewear & Winterwear', 'Clothing')), 'hoodie');
  assert.equal(q('Amul Butter (500 g)', line('Grocery & Staples', 'Grocery')), 'butter');
});

await test('photos of a different product type are rejected', () => {
  const derived = deriveImageQuery('Puma Classic Casual Sneakers', line('Casual Sneakers'));
  assert.equal(scorePhoto(photo('w1', 'black wristwatch on a table'), derived), -1);
  assert.ok(scorePhoto(photo('s1', 'white sneakers on a wooden floor'), derived) > 0);
});

await test('shoe matching requires the specific type and respects catalog color', () => {
  const formal = deriveImageQuery('Formal Oxford Shoes', line('Formal Shoes'), { color: 'Black' });
  assert.equal(formal.query, 'black leather formal shoes');
  assert.equal(scorePhoto(photo('running', 'black running shoes'), formal), -1);
  assert.equal(scorePhoto(photo('red-formal', 'red leather formal oxford shoes'), formal), -1);
  assert.ok(scorePhoto(photo('black-formal', 'black leather formal oxford shoes'), formal) > 0);

  const sandals = deriveImageQuery('Block Heel Sandals', line('Sandals'), { color: 'Black' });
  assert.equal(sandals.query, 'black block heel sandals');
  assert.ok(scorePhoto(photo('heels', 'black block heel sandals'), sandals) > 0);
});

await test('ranking is deterministic and skips used photos', () => {
  const derived = deriveImageQuery('Cosco Volleyball', line('Sports Equipment', 'Sports & Fitness'));
  const photos = [photo('b', 'volleyball on sand'), photo('a', 'volleyball on sand'), photo('c', 'a dog')];
  assert.deepEqual(rankPhotos(photos, derived).map((r) => r.photo.id), ['a', 'b']);
  assert.deepEqual(rankPhotos(photos, derived, (p) => p.id !== 'a').map((r) => r.photo.id), ['b']);
});

await test('image URLs are sized, cropped and fit the 500 character schema limit', () => {
  const url = buildImageUrl('https://images.unsplash.com/photo-1?ixid=abc&ixlib=rb-4.0.3');
  assert.ok(url.includes('w=800') && url.includes('fit=crop') && url.length <= 500);
});

await test('malformed manifest entries are ignored', () => {
  assert.equal(entryToImage({ url: 'javascript:alert(1)' }), null);
  assert.equal(entryToImage({ url: '' }), null);
  assert.equal(entryToImage(null), null);
  assert.equal(entryToImage({ url: `https://x.test/${'a'.repeat(600)}` }), null);
  assert.equal(entryToImage({ url: 'https://x.test/a.jpg', alt: 'A' }).url, 'https://x.test/a.jpg');
});

const shoes = line('Running Shoes');
const products = ['Nike A', 'Adidas B', 'Puma C'].map((name, i) => ({ sku: `FTW-${i}`, name: `${name} Running Shoes`, line: shoes }));
const pool = ['r1', 'r2', 'r3', 'r4'].map((id) => photo(id, 'person running shoes outdoors'));
const mockSearch = async (_query, page) => (page === 1 ? pool : []);
const run = (extra = {}) => {
  const manifest = { entries: {} };
  return resolveImages({ products, manifest, searchPhotos: mockSearch, verify: async () => true, ...extra }).then((r) => ({ r, manifest }));
};

await test('resolver gives each product a distinct photo, identically on every run', async () => {
  const first = await run();
  const second = await run();
  const ids = Object.values(first.manifest.entries).map((e) => e.photoId);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
  assert.equal(first.r.unresolved.length, 0);
  assert.deepEqual(ids, Object.values(second.manifest.entries).map((e) => e.photoId));
  assert.ok(first.manifest.entries['FTW-0'].alt.includes('illustrative'));
});

await test('resolver skips finished products and photos that fail verification', async () => {
  const manifest = { entries: { 'FTW-0': { photoId: 'r1', url: 'https://x.test/1' } } };
  let searches = 0;
  const result = await resolveImages({
    products, manifest, force: false,
    searchPhotos: async (q, p) => { searches += 1; return mockSearch(q, p); },
    verify: async (url) => !url.includes('photo-r2'), // r2 is "broken"
  });
  assert.equal(result.resolved, 2);
  assert.equal(manifest.entries['FTW-0'].photoId, 'r1');
  assert.ok(!Object.values(manifest.entries).some((e) => e.photoId === 'r2'));
  assert.ok(searches >= 1);
});

await test('shortage of relevant photos leaves products unresolved instead of mismatching', async () => {
  const { r, manifest } = await run({ searchPhotos: async (_q, p) => (p === 1 ? [pool[0], photo('x', 'a watch')] : []) });
  assert.equal(Object.keys(manifest.entries).length, 1);
  assert.equal(r.unresolved.length, 2);
});

await test('an exhausted API budget stops cleanly and keeps progress', async () => {
  const { r, manifest } = await run({ searchPhotos: async () => { throw new BudgetExhausted('limit'); } });
  assert.equal(Object.keys(manifest.entries).length, 0);
  assert.equal(r.unresolved.length, 3);
  assert.equal(r.stoppedEarly, 'limit');
});

console.log(`\n${passed} tests passed${process.exitCode ? ', some FAILED' : ''}`);
