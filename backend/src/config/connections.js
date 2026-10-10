import { env } from './env.js';
import logger from './logger.js';
import { withRetry } from '../utils/retry.js';
import { connectMongo, disconnectMongo } from './db.js';
import { connectRedis, disconnectRedis } from './redis.js';
import { connectOpenSearch, disconnectOpenSearch } from './opensearch.js';

async function connectWithRetry(name, connectFn) {
  const { retries, retryDelayMs } = env.startup;

  await withRetry(connectFn, {
    retries,
    delayMs: retryDelayMs,
    onRetry: (err, attempt) =>
      logger.warn(
        `${name} not ready (attempt ${attempt}/${retries}): ${err.message}. Retrying in ${retryDelayMs}ms...`,
      ),
  });
}

/** Connect to MongoDB, Redis and OpenSearch in parallel, waiting for each to become ready. */
export async function connectAll() {
  const tasks = [
    connectWithRetry('MongoDB', connectMongo),
    connectWithRetry('Redis', connectRedis),
  ];

  if (env.search.mongoOnly) {
    logger.info('SEARCH_MODE=mongo: using MongoDB keyword search; OpenSearch and the AI service are not required');
  } else {
    tasks.push(connectWithRetry('OpenSearch', connectOpenSearch));
  }

  await Promise.all(tasks);
  logger.info('All backing services connected');
}

/** Close every connection; a failure in one does not prevent closing the others. */
export async function disconnectAll() {
  const names = ['MongoDB', 'Redis'];
  const closers = [disconnectMongo(), disconnectRedis()];
  if (!env.search.mongoOnly) {
    names.push('OpenSearch');
    closers.push(disconnectOpenSearch());
  }
  const results = await Promise.allSettled(closers);

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn(`Failed to close ${names[index]} connection`, {
        error: result.reason?.message,
      });
    }
  });
}
