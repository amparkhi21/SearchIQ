import { getOpenSearchClient } from '../src/config/opensearch.js';
import { env } from '../src/config/env.js';

const client = getOpenSearchClient();

let passed = 0;
let failed = 0;

function pass(message) {
  passed += 1;
  console.log(`  PASS  ${message}`);
}

function fail(message, error) {
  failed += 1;
  console.log(`  FAIL  ${message}${error ? `: ${error.message}` : ''}`);
}

async function main() {
  console.log(`Testing OpenSearch index ${env.search.indexName}`);
  console.log('');

  try {
    const health = await client.cluster.health();
    const status = health.body?.status ?? health.status;
    if (status === 'red') throw new Error('OpenSearch cluster is red');
    pass('OpenSearch cluster is reachable');
  } catch (error) {
    fail('OpenSearch cluster is reachable', error);
  }

  let exists = false;
  try {
    const response = await client.indices.exists({ index: env.search.indexName });
    exists = Boolean(response.body ?? response);
    if (!exists) throw new Error('Product index does not exist; run npm run search:reindex first');
    pass('product index exists');
  } catch (error) {
    fail('product index exists', error);
  }

  if (exists) {
    try {
      const countResponse = await client.count({ index: env.search.indexName });
      const count = Number(countResponse.body?.count ?? 0);
      if (count < 200) throw new Error(`Expected at least 200 products, found ${count}`);
      pass(`index contains ${count} products`);
    } catch (error) {
      fail('index contains at least 200 seeded products', error);
    }

    try {
      const response = await client.search({
        index: env.search.indexName,
        size: 1,
        body: { query: { match_all: {} } },
      });
      const hit = response.body?.hits?.hits?.[0];
      if (!hit) throw new Error('No product documents found');
      const doc = hit._source;
      if (!Array.isArray(doc.embedding)) throw new Error('Embedding is missing');
      if (doc.embedding.length !== env.search.embeddingDimensions) {
        throw new Error(`Expected embedding length ${env.search.embeddingDimensions}, got ${doc.embedding.length}`);
      }
      for (const field of ['productId', 'sku', 'name', 'searchableText', 'finalPrice', 'inStock']) {
        if (!(field in doc)) throw new Error(`Missing required field: ${field}`);
      }
      pass(`sample document has ${env.search.embeddingDimensions}-dimensional embedding and required fields`);
    } catch (error) {
      fail('sample document has a valid search document shape', error);
    }
  }

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
