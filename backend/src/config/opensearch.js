import { Client } from '@opensearch-project/opensearch';
import { env } from './env.js';
import logger from './logger.js';
import { maskUri } from '../utils/maskUri.js';

let client = null;

export function getOpenSearchClient() {
  if (!client) {
    const { node, username, password } = env.opensearch;

    client = new Client({
      node,
      auth: username && password ? { username, password } : undefined,
      requestTimeout: 5000,
      maxRetries: 2,
      ssl: { rejectUnauthorized: env.isProduction },
    });
  }
  return client;
}

export async function connectOpenSearch() {
  const osClient = getOpenSearchClient();
  const { body } = await osClient.cluster.health();

  if (body.status === 'red') {
    throw new Error('OpenSearch cluster status is red');
  }

  logger.info(
    `OpenSearch connected: ${maskUri(env.opensearch.node)} (cluster: ${body.cluster_name}, status: ${body.status})`,
  );
  return osClient;
}

export async function disconnectOpenSearch() {
  if (!client) return;
  await client.close();
  client = null;
  logger.info('OpenSearch connection closed');
}
