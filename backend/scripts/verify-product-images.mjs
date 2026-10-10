// Reports on product image quality.   npm run images:verify [-- --network] [-- --db]
//   (default)  offline: manifest coverage, duplicates, malformed URLs, name/SKU consistency, match levels
//   --network  also sends a HEAD request for every distinct image URL (valid 2xx + image/* content type)
//   --db       also inspects the products stored in MongoDB (missing / duplicated / malformed images)
// Exit code is 1 when any hard problem is found.
import { buildCatalog } from '../src/seed/data/catalog.builder.js';
import { loadImageAssignments } from '../src/seed/data/imageManifest.js';

const useNetwork = process.argv.includes('--network');
const useDb = process.argv.includes('--db');
const problems = [];
const problem = (text) => problems.push(text);

const catalog = buildCatalog();
const assignments = loadImageAssignments();
const skus = new Set(catalog.products.map((p) => p.sku));

console.log(`Catalog products: ${catalog.products.length}   curated images: ${assignments.size}`);

const levels = {};
const urlOwners = new Map();
for (const [sku, { image, level, name }] of assignments) {
  levels[level] = (levels[level] || 0) + 1;
  if (!skus.has(sku)) problem(`manifest SKU not in catalog: ${sku}`);
  const product = catalog.products.find((p) => p.sku === sku);
  if (product && name && name !== product.name) problem(`name mismatch for ${sku}: "${name}" vs "${product.name}"`);
  const key = image.url.split('?')[0]; // same photo regardless of crop parameters
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
  await connectMongo();
  const products = await Product.find({ isActive: true }).select('sku name images').lean();
  const seen = new Map();
  let missing = 0;
  for (const product of products) {
    const first = product.images?.[0]?.url;
    if (!first || !/^https?:\/\//i.test(first)) { missing += 1; continue; }
    const key = first.split('?')[0];
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  const duplicated = [...seen.values()].filter((n) => n > 1).length;
  console.log(`MongoDB: ${products.length} active products, ${missing} without a usable first image, ${duplicated} photos shared by several products`);
  if (duplicated > 0) problem(`${duplicated} photos are used by more than one product in MongoDB`);
  await disconnectMongo();
}

if (problems.length > 0) {
  console.log(`\n${problems.length} problem(s):`);
  problems.slice(0, 50).forEach((text) => console.log(`  - ${text}`));
  process.exit(1);
}
console.log('\nNo problems found.');
process.exit(0);
