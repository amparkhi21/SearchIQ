import Redis from 'ioredis';
import { env } from './env.js';
import logger from './logger.js';
import { maskUri } from '../utils/maskUri.js';

let client = null;

export async function connectRedis() {
  if (client && client.status === 'ready') return client;

  let hasBeenReady = false;
  let lastError = null;

  const instance = new Redis(env.redisUrl, {
    lazyConnect: true,
    connectTimeout: 5000,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    // Fail fast during startup (the startup retry loop handles waiting);
    // once connected, reconnect automatically with a capped backoff.
    retryStrategy: (times) => (hasBeenReady ? Math.min(times * 200, 2000) : null),
  });

  instance.on('error', (err) => {
    lastError = err;
    const log = hasBeenReady ? logger.error : logger.warn;
    log.call(logger, 'Redis error', { error: err.message });
  });
  instance.on('ready', () => {
    hasBeenReady = true;
    logger.info('Redis ready');
  });
  instance.on('reconnecting', () => logger.warn('Redis reconnecting...'));
  instance.on('end', () => logger.warn('Redis connection ended'));

  try {
    await instance.connect();
  } catch (err) {
    instance.disconnect();
    throw lastError ?? err;
  }

  client = instance;
  logger.info(`Redis connected: ${maskUri(env.redisUrl)}`);
  return client;
}

export function getRedisClient() {
  if (!client) {
    throw new Error('Redis client is not initialized');
  }
  return client;
}

export async function disconnectRedis() {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
  client = null;
  logger.info('Redis connection closed');
}
