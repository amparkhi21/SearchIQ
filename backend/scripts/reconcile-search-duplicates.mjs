// Inspect and optionally remove only duplicate OpenSearch copies proven against MongoDB.
// Run without --apply first; ambiguous records are never deleted.
import { connectMongo, disconnectMongo } from '../src/config/db.js';
import { connectOpenSearch, disconnectOpenSearch, getOpenSearchClient } from '../src/config/opensearch.js';
import logger, { closeLogger } from '../src/config/logger.js';
import Product from '../src/models/Product.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { PRODUCT_INDEX } from '../src/services/indexing.service.js';
import { planDuplicateIndexCleanup } from '../src/seed/searchIndexRepair.js';
import { invalidateCatalogSearchCache } from '../src/services/search-cache.service.js';

const apply = process.argv.includes('--apply');
const useCatalogApi = process.argv.includes('--catalog-api');
let exitCode = 0;

async function readCatalogFromApi() {
  const baseUrl = process.env.SEARCHIQ_CATALOG_API_URL || 'http://127.0.0.1:5000/api/v1/products';
  const products = [];
  let total = Infinity;
  for (let page = 1; products.length < total; page += 1) {
    const url = new URL(baseUrl);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', '100');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Catalog API returned HTTP ${response.status} for page ${page}`);
    const payload = await response.json();
    const pageProducts = payload?.data?.products;
    if (!Array.isArray(pageProducts)) throw new Error('Catalog API response did not contain data.products');
    products.push(...pageProducts.map((product) => ({
      _id: product.id,
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      category: product.category,
    })));
    total = Number(payload?.meta?.total ?? products.length);
    if (pageProducts.length === 0 && products.length < total) throw new Error('Catalog API pagination ended before all products were read');
  }
  if (products.length !== total) throw new Error(`Catalog API returned ${products.length} products; expected ${total}`);
  return products;
}

try {
  if (!useCatalogApi) await connectMongo();
  await connectOpenSearch();
  const client = getOpenSearchClient();
  const [mongoProducts, response] = await Promise.all([
    useCatalogApi
      ? readCatalogFromApi()
      : Product.find({})
        .select('_id sku name category brand')
        .populate('category', 'slug')
        .populate('brand', 'name')
        .lean(),
    client.search({
      index: PRODUCT_INDEX,
      body: { size: 10000, query: { match_all: {} }, _source: ['productId', 'sku', 'name', 'brandName', 'categorySlug'] },
    }),
  ]);
  const body = response?.body ?? response;
  const hits = body?.hits?.hits ?? [];
  const indexedTotal = Number(body?.hits?.total?.value ?? hits.length);
  if (hits.length < indexedTotal) {
    throw new Error(`Index audit returned ${hits.length} of ${indexedTotal} documents; refusing incomplete reconciliation`);
  }

  const { deletions, ambiguous } = planDuplicateIndexCleanup(hits, mongoProducts);
  console.log(`MongoDB products: ${mongoProducts.length}; OpenSearch documents: ${indexedTotal}`);
  console.log(`Verified duplicate index copies: ${deletions.length}; ambiguous duplicate groups: ${ambiguous.length}`);
  for (const hit of deletions) {
    console.log(`  ${apply ? 'DELETE' : 'DRY RUN'} doc=${hit._id} productId=${hit._source?.productId} sku=${hit._source?.sku} name=${hit._source?.name}`);
  }
  for (const group of ambiguous) {
    console.log(`  KEEP sku=${group.sku} reason=${group.reason} docs=${group.documentIds.join(',')}`);
  }

  if (apply && deletions.length) {
    for (const hit of deletions) await client.delete({ index: PRODUCT_INDEX, id: hit._id, refresh: false });
    await client.indices.refresh({ index: PRODUCT_INDEX });
    await connectRedis();
    await invalidateCatalogSearchCache();
    console.log(`Removed ${deletions.length} confirmed stale copies and invalidated search cache.`);
  } else if (!apply) {
    console.log('Dry run only. Add --apply to delete the listed confirmed stale copies.');
  }
  if (ambiguous.length) exitCode = 1;
} catch (error) {
  logger.error(`Search index duplicate reconciliation failed: ${error.message}`);
  exitCode = 1;
} finally {
  await Promise.allSettled([useCatalogApi ? Promise.resolve() : disconnectMongo(), disconnectOpenSearch(), disconnectRedis(), closeLogger()]);
  process.exitCode = exitCode;
}
