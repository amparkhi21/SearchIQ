// Finds a relevant, unique, reachable photo for every catalog product and records it in
// data/product-images.manifest.json (keyed by SKU). It never touches MongoDB or OpenSearch.
//
//   npm run images:resolve                    resolve products that have no manifest entry yet
//   npm run images:resolve -- --force         re-resolve everything
//   npm run images:resolve -- --max-requests=40
//
// Needs UNSPLASH_ACCESS_KEY in backend/.env. The free "Demo" key allows 50 API requests per hour and
// this catalog needs ~150 searches, so the command stops cleanly when the budget is used and can simply
// be re-run later: finished products are skipped.
import { env } from '../config/env.js';
import { buildCatalog } from './data/catalog.builder.js';
import { productLines } from './data/products.data.js';
import { BudgetExhausted, loadManifest, resolveImages, saveManifest, verifyImageUrl } from './imageResolver.js';

const args = process.argv.slice(2);
const force = args.includes('--force');
const maxRequests = Number(args.find((arg) => arg.startsWith('--max-requests='))?.split('=')[1] ?? 45);

if (!env.unsplash.accessKey) {
  console.error('Set UNSPLASH_ACCESS_KEY in backend/.env first (free key: https://unsplash.com/developers).');
  process.exit(1);
}

// Same order as buildCatalog(), so products[i] is catalog.products[i]
const catalog = buildCatalog();
let cursor = 0;
const products = [];
for (const line of productLines) {
  for (let i = 0; i < line.items.length; i += 1, cursor += 1) {
    products.push({
      sku: catalog.products[cursor].sku,
      name: catalog.products[cursor].name,
      line,
      color: line.colors?.[i % line.colors.length],
    });
  }
}

let requests = 0;
async function searchPhotos(query, page) {
  if (requests >= maxRequests) throw new BudgetExhausted(`reached --max-requests=${maxRequests}`);
  requests += 1;
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '30');
  url.searchParams.set('page', String(page));
  url.searchParams.set('content_filter', 'high');

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${env.unsplash.accessKey}`, 'Accept-Version': 'v1' },
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 403 || response.status === 429) throw new BudgetExhausted('Unsplash rate limit reached');
  if (!response.ok) throw new Error(`Unsplash search failed (${response.status}) for "${query}"`);
  const body = await response.json();
  return Array.isArray(body.results) ? body.results : [];
}

const manifest = loadManifest();
const result = await resolveImages({
  products,
  manifest,
  searchPhotos,
  verify: verifyImageUrl,
  force,
  onGroup: ({ query, remaining }) => {
    saveManifest(manifest); // persist after every query so an interruption loses nothing
    console.log(`  ${remaining === 0 ? 'ok     ' : 'PARTIAL'} ${query}`);
  },
});
saveManifest(manifest);

console.log(`\nResolved ${result.resolved} products this run (${requests} API requests).`);
console.log(`Manifest now has ${Object.keys(manifest.entries).length} of ${products.length} products.`);
if (result.stoppedEarly) console.log(`Stopped early: ${result.stoppedEarly}. Re-run later to continue.`);
if (result.unresolved.length > 0) {
  console.log(`\nStill without a verified image (${result.unresolved.length}):`);
  result.unresolved.slice(0, 40).forEach((p) => console.log(`  ${p.sku}  ${p.name}`));
}
process.exit(0);
