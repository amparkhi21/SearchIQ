// Offline image inventory. Automatic stock-photo retrieval is disabled because
// it cannot establish that a photo depicts the exact brand/model/packaging.
// Add only manually verified exact-product assets to product-images.overrides.json.
import { buildCatalog } from './data/catalog.builder.js';
import { loadImageAssignments, loadImageRecords } from './data/imageManifest.js';

const catalog = buildCatalog();
const assignments = loadImageAssignments();
const records = loadImageRecords();
const missing = catalog.products.filter((product) => {
  const assignment = assignments.get(product.sku);
  return !assignment?.verified || assignment.name !== product.name;
});

console.log(`Catalog products: ${catalog.products.length}`);
console.log(`Verified exact product images: ${catalog.products.length - missing.length}`);
console.log(`Missing exact product images: ${missing.length}`);
console.log(`Unverified legacy stock-photo candidates (not used): ${[...records.values()].filter((entry) => entry.verified !== true).length}`);
if (missing.length) {
  console.log('\nAdd verified exact-product URLs to product-images.overrides.json. No external image API is required or called.');
  for (const product of missing) {
    console.log(`  ${product.sku} | ${product.brandName} | ${product.name} | ${product.categoryName}`);
  }
}
