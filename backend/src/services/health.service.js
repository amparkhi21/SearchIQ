import mongoose from 'mongoose';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { getRedisClient } from '../config/redis.js';
import { getOpenSearchClient } from '../config/opensearch.js';
import { OVERALL_STATUS, SERVICE_STATUS } from '../constants.js';
import * as aiService from './ai.service.js';

/** Rejects if `promise` does not settle within `ms`. */
async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} check timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Runs a single service check and converts the outcome into a status object. */
async function runCheck(name, checkFn) {
  const startedAt = performance.now();
  try {
    const details = await withTimeout(checkFn(), env.healthCheckTimeoutMs, name);
    return {
      status: SERVICE_STATUS.UP,
      latencyMs: Math.round(performance.now() - startedAt),
      ...details,
    };
  } catch (err) {
    logger.warn(`Health check failed for ${name}`, { error: err.message });
    return {
      status: SERVICE_STATUS.DOWN,
      latencyMs: Math.round(performance.now() - startedAt),
      // Do not leak internal error details in production
      error: env.isProduction ? 'Service unavailable' : err.message,
    };
  }
}

async function checkMongo() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is not connected');
  }
  await mongoose.connection.db.admin().ping();
  return { database: mongoose.connection.name };
}

async function checkRedis() {
  const client = getRedisClient();
  const pong = await client.ping();
  if (pong !== 'PONG') {
    throw new Error(`Unexpected PING response: ${pong}`);
  }
  const info = await client.info('server');
  const version = /redis_version:([^\r\n]+)/.exec(info)?.[1];
  return { version };
}

async function checkOpenSearch() {
  const client = getOpenSearchClient();
  const [{ body: info }, { body: health }] = await Promise.all([
    client.info(),
    client.cluster.health(),
  ]);

  if (health.status === 'red') {
    throw new Error('OpenSearch cluster status is red');
  }

  return {
    version: info.version?.number,
    cluster: health.cluster_name,
    clusterStatus: health.status,
    nodes: health.number_of_nodes,
  };
}


async function checkAiService() {
  const response = await aiService.healthCheck();
  const model = response.data?.data?.model ?? response.data?.data ?? {};
  return {
    model: model.model ?? model.model_name ?? undefined,
    dimensions: model.dimensions ?? undefined,
    embeddingVersion: model.embeddingVersion ?? undefined,
  };
}

/** Full health report including every backing service. */
export async function getHealth() {
  // In SEARCH_MODE=mongo OpenSearch and the AI service are not used, so they are reported as
  // "disabled" instead of being probed (and never make the API unhealthy).
  const disabled = () => ({ status: SERVICE_STATUS.DISABLED, reason: 'SEARCH_MODE=mongo' });
  const [mongodb, redis, opensearch, ai] = await Promise.all([
    runCheck('MongoDB', checkMongo),
    runCheck('Redis', checkRedis),
    env.search.mongoOnly ? disabled() : runCheck('OpenSearch', checkOpenSearch),
    env.search.mongoOnly ? disabled() : runCheck('AI service', checkAiService),
  ]);

  const services = { mongodb, redis, opensearch, ai };
  // AI is intentionally non-critical: the API remains healthy and can fall back
  // to non-AI functionality if the Python service is unavailable.
  const criticalServices = { mongodb, redis, opensearch };
  const isOk = (s) => s.status === SERVICE_STATUS.UP || s.status === SERVICE_STATUS.DISABLED;
  const healthy = Object.values(criticalServices).every(isOk);
  const fullyOperational = Object.values(services).every(isOk);

  return {
    healthy,
    data: {
      status: fullyOperational ? OVERALL_STATUS.OK : OVERALL_STATUS.DEGRADED,
      application: env.appName,
      version: env.appVersion,
      environment: env.nodeEnv,
      searchMode: env.search.mode,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      services,
    },
  };
}

/** Lightweight liveness report: only confirms the process is running. */
export function getLiveness() {
  return {
    status: 'alive',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
