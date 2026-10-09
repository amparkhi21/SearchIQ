import { connectMongo, disconnectMongo } from '../config/db.js';
import { connectOpenSearch, disconnectOpenSearch } from '../config/opensearch.js';
import { env } from '../config/env.js';
import logger, { closeLogger } from '../config/logger.js';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import { reindexProducts } from '../services/indexing.service.js';

async function main() {
  const recreate = process.argv.includes('--recreate');
  logger.info(`Starting product search reindex (${recreate ? 'recreate' : 'upsert'} mode)`);

  await connectMongo();
  await connectOpenSearch();

  // AI is an external/internal service, so this command verifies it via indexing.service.
  const result = await reindexProducts({
    recreate,
    batchSize: env.search.bulkBatchSize,
    embedBatchSize: env.search.embedBatchSize,
  });

  logger.info(
    `Search reindex finished: ${result.indexed} indexed, ${result.failed} failed, ${result.total} total in ${result.index}`,
  );

  if (result.failed > 0) {
    logger.error('Reindex completed with failures', { errors: result.errors.slice(0, 20) });
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    logger.error('Search reindex failed', { error: error.message, stack: error.stack });
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([disconnectMongo(), disconnectOpenSearch()]);
    await closeLogger();
  });
