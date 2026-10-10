// Image-only update: writes the curated images (manifest + overrides) onto EXISTING products by SKU.
// It only $sets `images`; prices, stock, ratings, reviews, orders, brands and categories are never touched,
// nothing is inserted or deleted, and products without a manifest entry keep their current images.
//
//   npm run images:apply -- --dry-run     show what would change
//   npm run images:apply                  update MongoDB, then OpenSearch (images field only), then clear search cache
//   npm run images:apply -- --skip-index  update MongoDB only
import { connectMongo, disconnectMongo } from '../config/db.js';
import { env } from '../config/env.js';
import { connectOpenSearch, disconnectOpenSearch } from '../config/opensearch.js';
import { connectRedis, disconnectRedis, getRedisClient } from '../config/redis.js';
import logger, { closeLogger } from '../config/logger.js';
import Product from '../models/Product.js';
import { updateProductSearchFacts } from '../services/indexing.service.js';
import { loadImageAssignments } from './data/imageManifest.js';

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_INDEX = process.argv.includes('--skip-index');
const SEARCH_CACHE_PREFIX = 'search:result:v1:';

async function clearSearchCache() {
  try {
    await connectRedis();
    const redis = getRedisClient();
    let cursor = '0';
    let removed = 0;
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `${SEARCH_CACHE_PREFIX}*`, 'COUNT', 200);
      cursor = next;
      if (keys.length > 0) removed += await redis.del(...keys);
    } while (cursor !== '0');
    logger.info(`Cleared ${removed} cached search results`);
  } catch (error) {
    logger.warn(`Could not clear the search cache (it expires on its own): ${error.message}`);
  }
}

async function applyImages() {
  const assignments = loadImageAssignments();
  if (assignments.size === 0) {
    throw new Error('No images in the manifest yet. Run "npm run images:resolve" first.');
  }

  await connectMongo();
  const products = await Product.find({ sku: { $in: [...assignments.keys()] } }).select('_id sku name images');
  const bySku = new Map(products.map((product) => [product.sku, product]));

  const operations = [];
  const changedIds = [];
  const skipped = { missing: [], nameMismatch: [], unchanged: 0 };

  for (const [sku, { image, name }] of assignments) {
    const product = bySku.get(sku);
    if (!product) { skipped.missing.push(sku); continue; }
    // Guard against a catalog edit shifting SKUs: never put one product's photo on another product.
    if (name && name !== product.name) { skipped.nameMismatch.push(`${sku} (db "${product.name}" vs manifest "${name}")`); continue; }
    const current = product.images?.[0];
    if (product.images?.length === 1 && current?.url === image.url) { skipped.unchanged += 1; continue; }
    operations.push({ updateOne: { filter: { sku }, update: { $set: { images: [image] } } } });
    changedIds.push(product._id.toString());
  }

  logger.info(
    `${assignments.size} curated images: ${operations.length} to update, ${skipped.unchanged} already current, ` +
      `${skipped.missing.length} SKUs not in database, ${skipped.nameMismatch.length} name mismatches`,
  );
  skipped.missing.slice(0, 10).forEach((sku) => logger.warn(`  not in database: ${sku}`));
  skipped.nameMismatch.slice(0, 10).forEach((line) => logger.warn(`  skipped: ${line}`));

  if (DRY_RUN || operations.length === 0) {
    logger.info(DRY_RUN ? 'Dry run: nothing was written' : 'Nothing to update');
    return;
  }

  const result = await Product.bulkWrite(operations, { ordered: false });
  logger.info(`MongoDB: ${result.modifiedCount} products updated (images only)`);

  if (env.search.mongoOnly) {
    logger.info('SEARCH_MODE=mongo: no OpenSearch index to update (search reads images from MongoDB)');
    await clearSearchCache();
    return;
  }
  if (SKIP_INDEX) {
    logger.info('Skipped OpenSearch. Run "npm run search:reindex" later so search results show the new images.');
    return;
  }

  await connectOpenSearch();
  const fresh = await Product.find({ _id: { $in: changedIds } }).select('images');
  let indexed = 0;
  const notIndexed = [];
  for (const product of fresh) {
    const images = product.toJSON().images ?? [];
    const ok = await updateProductSearchFacts(product._id, { images }, { refresh: false });
    if (ok) indexed += 1; else notIndexed.push(product._id.toString());
  }
  logger.info(`OpenSearch: ${indexed} documents updated (images field only)`);
  if (notIndexed.length > 0) {
    logger.warn(`${notIndexed.length} products are not in the search index yet; run "npm run search:reindex" to add them`);
  }
  await clearSearchCache();
}

let exitCode = 0;
try {
  await applyImages();
} catch (error) {
  logger.error(`Image update failed: ${error.message}`);
  exitCode = 1;
} finally {
  await Promise.allSettled([disconnectMongo(), disconnectOpenSearch(), disconnectRedis(), closeLogger()]);
  process.exitCode = exitCode;
}
