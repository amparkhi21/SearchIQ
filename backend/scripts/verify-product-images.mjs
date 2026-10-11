// Reports on product image quality.   npm run images:verify [-- --network] [-- --db]
//   (default)  offline: manifest coverage, duplicates, malformed URLs, name/SKU consistency, match levels
//   --network  also sends a HEAD request for every distinct image URL (valid 2xx + image/* content type)
//   --db       also inspects the products stored in MongoDB (missing / duplicated / malformed images)
// Exit code is 1 when any hard problem is found.
import { buildCatalog } from '../src/seed/data/catalog.builder.js';
import { loadImageAssignments } from '../src/seed/data/imageManifest.js';

const useNetwork = process.argv.includes('--network');
const useDb = process.argv.includes('--db');
const useOpenSearch = process.argv.includes('--opensearch');
const problems = [];
const problem = (text) => problems.push(text);
const normalizedUrl = (value) => {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
};

const catalog = buildCatalog();
const assignments = loadImageAssignments();
const skus = new Set(catalog.products.map((p) => p.sku));

console.log(`Catalog products: ${catalog.products.length}   curated images: ${assignments.size}`);

const coverage = new Map();
for (const product of catalog.products) {
  const row = coverage.get(product.categoryName) ?? { total: 0, assigned: 0 };
  row.total += 1;
  if (assignments.has(product.sku)) row.assigned += 1;
  coverage.set(product.categoryName, row);
}
console.log('Image coverage by category:', [...coverage.entries()]
  .map(([name, row]) => `${name} ${row.assigned}/${row.total}`).join(' | '));

const levels = {};
const urlOwners = new Map();
for (const [sku, { image, level, name }] of assignments) {
  levels[level] = (levels[level] || 0) + 1;
  if (!skus.has(sku)) problem(`manifest SKU not in catalog: ${sku}`);
  const product = catalog.products.find((p) => p.sku === sku);
  if (product && name && name !== product.name) problem(`name mismatch for ${sku}: "${name}" vs "${product.name}"`);
  const key = normalizedUrl(image.url); // same photo regardless of crop parameters
  if (!urlOwners.has(key)) urlOwners.set(key, []);
  urlOwners.get(key).push(sku);
}
for (const [url, owners] of urlOwners) if (owners.length > 1) problem(`photo reused by ${owners.join(', ')}: ${url}`);

const fallbackOnly = catalog.products.filter((p) => !assignments.has(p.sku));
console.log('Match levels:', JSON.stringify(levels), `(exact = hand-verified override, type = relevant illustrative photo)`);
console.log(`Without a curated image (category fallback or UI placeholder): ${fallbackOnly.length}`);
if (fallbackOnly.length > 0 && fallbackOnly.length <= 20) fallbackOnly.forEach((p) => console.log(`   ${p.sku}  ${p.name}`));

if (useNetwork) {
  const urls = [...new Set([...assignments.values()].map(({ image }) => image.url))];
  console.log(`Checking ${urls.length} image URLs over the network...`);
  let ok = 0;
  const queue = [...urls];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (queue.length > 0) {
        const url = queue.shift();
        try {
          const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
          const type = response.headers.get('content-type') || '';
          if (response.ok && type.startsWith('image/')) ok += 1;
          else problem(`bad image response ${response.status} ${type}: ${url}`);
        } catch (error) {
          problem(`unreachable (${error.message}): ${url}`);
        }
      }
    }),
  );
  console.log(`Reachable images: ${ok}/${urls.length}`);
}

if (useDb) {
  const { connectMongo, disconnectMongo } = await import('../src/config/db.js');
  const { default: Product } = await import('../src/models/Product.js');
  try {
    await connectMongo();
    const products = await Product.find({ isActive: true }).select('sku name images').lean();
    const owners = new Map();
    let missing = 0;
    let malformed = 0;
    let assignmentMismatch = 0;
    for (const product of products) {
      const expected = assignments.get(product.sku)?.image?.url;
      const first = product.images?.[0]?.url;
      if (!first) {
        missing += 1;
        if (expected) {
          assignmentMismatch += 1;
          problem(`MongoDB image missing for assigned SKU ${product.sku} (${product.name})`);
        }
        continue;
      }
      const key = normalizedUrl(first);
      if (!key || !/^https?:\/\//i.test(first)) {
        malformed += 1;
        problem(`MongoDB image URL malformed for ${product.sku}: ${first}`);
        continue;
      }
      if (!owners.has(key)) owners.set(key, []);
      owners.get(key).push(product.sku);
      if (expected && normalizedUrl(expected) !== key) {
        assignmentMismatch += 1;
        problem(`MongoDB image differs from manifest for ${product.sku}: ${first}`);
      }
    }
    const duplicateOwners = [...owners.values()].filter((skus) => skus.length > 1);
    for (const skus of duplicateOwners) problem(`MongoDB image shared by ${skus.join(', ')}`);
    console.log(`MongoDB: ${products.length} active products, ${missing} without an image, ${malformed} malformed, ${duplicateOwners.length} duplicate URLs, ${assignmentMismatch} manifest mismatches`);
  } finally {
    await disconnectMongo();
  }
}

if (useOpenSearch) {
  const { connectOpenSearch, disconnectOpenSearch } = await import('../src/config/opensearch.js');
  const { getOpenSearchClient } = await import('../src/config/opensearch.js');
  const { PRODUCT_INDEX } = await import('../src/services/indexing.service.js');
  let disconnectMongo;
  let Product;
  if (useDb) {
    ({ connectMongo, disconnectMongo } = await import('../src/config/db.js'));
    ({ default: Product } = await import('../src/models/Product.js'));
    await connectMongo();
  }
  await connectOpenSearch();
  try {
    const client = getOpenSearchClient();
    const response = await client.search({
      index: PRODUCT_INDEX,
      body: { size: 10000, query: { match_all: {} }, _source: ['productId', 'sku', 'name', 'images'] },
    });
    const body = response?.body ?? response;
    const docs = body?.hits?.hits ?? [];
    let missing = 0;
    let malformed = 0;
    let mismatches = 0;
    const indexedOwners = new Map();
    for (const product of docs.map((hit) => hit._source ?? {})) {
      const expected = assignments.get(product.sku)?.image?.url;
      const actual = product.images?.[0]?.url;
      if (expected && normalizedUrl(expected) !== normalizedUrl(actual ?? '')) {
        mismatches += 1;
        problem(`OpenSearch image differs from manifest for ${product.sku}`);
      }
      if (!actual) missing += 1;
      else {
        const key = normalizedUrl(actual);
        if (!key || !/^https?:\/\//i.test(actual)) malformed += 1;
        else {
          if (!indexedOwners.has(key)) indexedOwners.set(key, []);
          indexedOwners.get(key).push(product.sku);
        }
      }
    }
    const duplicateOwners = [...indexedOwners.values()].filter((skus) => skus.length > 1);
    for (const skus of duplicateOwners) problem(`OpenSearch image shared by ${skus.join(', ')}`);
    console.log(`OpenSearch: ${docs.length} indexed products, ${missing} without an image, ${malformed} malformed, ${duplicateOwners.length} duplicate URLs, ${mismatches} manifest mismatches`);

    if (useDb) {
      const mongoProducts = await Product.find({ isActive: true }).select('sku images').lean();
      const indexed = new Map(docs.map((hit) => [hit._source?.sku, hit._source?.images?.[0]?.url]));
      for (const product of mongoProducts) {
        const mongoUrl = product.images?.[0]?.url;
        const indexedUrl = indexed.get(product.sku);
        if (!indexed.has(product.sku)) {
          problem(`OpenSearch document missing for MongoDB product ${product.sku}`);
        } else if (normalizedUrl(mongoUrl ?? '') !== normalizedUrl(indexedUrl ?? '')) {
          problem(`MongoDB/OpenSearch image mismatch for ${product.sku}`);
        }
      }
    }
  } finally {
    await disconnectOpenSearch();
    if (disconnectMongo) await disconnectMongo();
  }
}

if (problems.length > 0) {
  console.log(`\n${problems.length} problem(s):`);
  problems.slice(0, 50).forEach((text) => console.log(`  - ${text}`));
  process.exit(1);
}
console.log('\nNo problems found.');
process.exit(0);
