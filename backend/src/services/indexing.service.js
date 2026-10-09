import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { getOpenSearchClient } from '../config/opensearch.js';
import logger from '../config/logger.js';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import * as aiService from './ai.service.js';

export const PRODUCT_INDEX = env.search.indexName;

const CATEGORY_SELECT = 'name slug';
const BRAND_SELECT = 'name slug logo';

const PRODUCT_POPULATE = [
  { path: 'category', select: CATEGORY_SELECT },
  { path: 'brand', select: BRAND_SELECT },
];

const INDEX_BODY = {
  settings: {
    index: {
      knn: true,
      number_of_shards: 1,
      number_of_replicas: 0,
    },
  },
  mappings: {
    dynamic: false,
    properties: {
      productId: { type: 'keyword' },
      sku: { type: 'keyword' },
      name: {
        type: 'text',
        fields: { keyword: { type: 'keyword', ignore_above: 256 } },
      },
      slug: { type: 'keyword' },
      description: { type: 'text' },
      searchableText: { type: 'text' },
      tags: { type: 'keyword' },
      categoryId: { type: 'keyword' },
      categorySlug: { type: 'keyword' },
      categoryName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      brandId: { type: 'keyword' },
      brandSlug: { type: 'keyword' },
      brandName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      price: { type: 'double' },
      discountPercent: { type: 'double' },
      finalPrice: { type: 'double' },
      ratingAvg: { type: 'double' },
      ratingCount: { type: 'integer' },
      soldCount: { type: 'integer' },
      stock: { type: 'integer' },
      lowStockThreshold: { type: 'integer' },
      inStock: { type: 'boolean' },
      stockStatus: { type: 'keyword' },
      isActive: { type: 'boolean' },
      attributes: {
        type: 'object',
        dynamic: false,
        properties: {
          color: { type: 'keyword' },
          variant: { type: 'keyword' },
          sizes: { type: 'keyword' },
          material: { type: 'keyword' },
          gender: { type: 'keyword' },
          useCase: { type: 'keyword' },
        },
      },
      images: {
        type: 'object',
        dynamic: false,
        properties: {
          url: { type: 'keyword', index: false, doc_values: false },
          alt: { type: 'text', index: false },
          photographerName: { type: 'keyword', index: false },
          photographerUrl: { type: 'keyword', index: false },
          photoUrl: { type: 'keyword', index: false },
        },
      },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
      embeddingVersion: { type: 'keyword' },
      searchableTextVersion: { type: 'keyword' },
      embedding: {
        type: 'knn_vector',
        dimension: env.search.embeddingDimensions,
        method: {
          name: 'hnsw',
          engine: 'lucene',
          space_type: 'cosinesimil',
          parameters: {
            ef_construction: 128,
            m: 16,
          },
        },
      },
    },
  },
};

function responseBody(response) {
  return response?.body ?? response;
}

function objectIdString(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.toString();
}

function array(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function buildSearchableText(product) {
  const attributes = product?.attributes ?? {};
  const useCases = array(attributes.useCase).join(', ');
  const sizes = array(attributes.sizes).join(', ');

  return [
    product?.name,
    product?.description,
    `Brand: ${product?.brand?.name ?? ''}`,
    `Category: ${product?.category?.name ?? ''}`,
    `Tags: ${array(product?.tags).join(', ')}`,
    `Color: ${attributes.color ?? ''}`,
    `Variant: ${attributes.variant ?? ''}`,
    `Material: ${attributes.material ?? ''}`,
    `Gender: ${attributes.gender ?? ''}`,
    `Use case: ${useCases}`,
    `Sizes: ${sizes}`,
  ]
    .filter(Boolean)
    .join('. ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toSearchDocument(product, embeddingResult) {
  const plain = typeof product?.toObject === 'function' ? product.toObject() : product;
  const category = plain?.category ?? {};
  const brand = plain?.brand ?? {};
  const attributes = plain?.attributes ?? {};
  const searchableText = embeddingResult?.text ?? buildSearchableText(plain);

  if (!Array.isArray(embeddingResult?.embedding)) {
    throw new Error(`Missing embedding for product ${objectIdString(plain?._id ?? plain?.id)}`);
  }
  if (embeddingResult.embedding.length !== env.search.embeddingDimensions) {
    throw new Error(
      `Invalid embedding dimension for product ${objectIdString(plain?._id ?? plain?.id)}: ` +
        `expected ${env.search.embeddingDimensions}, got ${embeddingResult.embedding.length}`,
    );
  }

  return {
    productId: objectIdString(plain?._id ?? plain?.id),
    sku: plain?.sku,
    name: plain?.name,
    slug: plain?.slug,
    description: plain?.description,
    searchableText,
    tags: array(plain?.tags),
    categoryId: objectIdString(category?._id ?? category?.id),
    categorySlug: category?.slug,
    categoryName: category?.name,
    brandId: objectIdString(brand?._id ?? brand?.id),
    brandSlug: brand?.slug,
    brandName: brand?.name,
    price: plain?.price,
    discountPercent: plain?.discountPercent ?? 0,
    finalPrice: plain?.finalPrice,
    ratingAvg: plain?.ratingAvg ?? 0,
    ratingCount: plain?.ratingCount ?? 0,
    soldCount: plain?.soldCount ?? 0,
    stock: plain?.stock ?? 0,
    lowStockThreshold: plain?.lowStockThreshold ?? 5,
    inStock: plain?.inStock ?? false,
    stockStatus:
      plain?.stockStatus ??
      (plain?.stock > 0
        ? plain.stock <= (plain?.lowStockThreshold ?? 5)
          ? 'low_stock'
          : 'in_stock'
        : 'out_of_stock'),
    isActive: plain?.isActive ?? true,
    attributes: {
      color: attributes.color,
      variant: attributes.variant,
      sizes: array(attributes.sizes),
      material: attributes.material,
      gender: attributes.gender,
      useCase: array(attributes.useCase),
    },
    images: array(plain?.images).map((image) => ({
      url: image.url,
      alt: image.alt,
      photographerName: image.photographerName,
      photographerUrl: image.photographerUrl,
      photoUrl: image.photoUrl,
    })),
    createdAt: plain?.createdAt,
    updatedAt: plain?.updatedAt,
    embeddingVersion: embeddingResult.embeddingVersion ?? env.search.embeddingVersion,
    searchableTextVersion: env.search.textVersion,
    embedding: embeddingResult.embedding,
  };
}

export async function ensureProductIndex({ recreate = false } = {}) {
  const client = getOpenSearchClient();
  const existsResponse = await client.indices.exists({ index: PRODUCT_INDEX });
  const exists = Boolean(responseBody(existsResponse));

  if (recreate && exists) {
    await client.indices.delete({ index: PRODUCT_INDEX });
  }

  if (recreate || !exists) {
    await client.indices.create({ index: PRODUCT_INDEX, body: INDEX_BODY });
    logger.info(`OpenSearch product index ready: ${PRODUCT_INDEX}`);
    return { created: true, index: PRODUCT_INDEX };
  }

  return { created: false, index: PRODUCT_INDEX };
}

export async function getProductIndexStats() {
  const client = getOpenSearchClient();
  const countResponse = await client.count({ index: PRODUCT_INDEX });
  const body = responseBody(countResponse);
  return {
    index: PRODUCT_INDEX,
    count: Number(body?.count ?? 0),
  };
}

async function fetchProduct(productId) {
  if (!mongoose.isValidObjectId(productId)) return null;
  return Product.findById(productId).populate(PRODUCT_POPULATE);
}

async function embedProduct(product) {
  const plain = typeof product?.toObject === 'function' ? product.toObject() : product;
  const response = await aiService.embedProducts(
    [
      {
        id: objectIdString(plain?._id ?? plain?.id),
        name: plain?.name,
        description: plain?.description,
        tags: array(plain?.tags),
        category: plain?.category
          ? { name: plain.category.name, slug: plain.category.slug }
          : undefined,
        brand: plain?.brand ? { name: plain.brand.name, slug: plain.brand.slug } : undefined,
        attributes: plain?.attributes ?? {},
      },
    ],
  );

  const item = response?.items?.[0];
  if (!item) throw new Error(`AI service returned no embedding for product ${plain?._id}`);
  return {
    text: item.text,
    embedding: item.embedding,
    embeddingVersion: response.embeddingVersion,
  };
}

export async function indexProduct(productId, { refresh = 'wait_for' } = {}) {
  const product = await fetchProduct(productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  await ensureProductIndex();
  const embedding = await embedProduct(product);
  const document = toSearchDocument(product, embedding);
  const client = getOpenSearchClient();

  await client.index({
    index: PRODUCT_INDEX,
    id: document.productId,
    body: document,
    refresh,
  });

  return document;
}

export async function updateProductSearchFacts(productId, fields, { refresh = 'wait_for' } = {}) {
  if (!mongoose.isValidObjectId(productId) || !fields || typeof fields !== 'object') return false;
  const client = getOpenSearchClient();
  try {
    await client.update({ index: PRODUCT_INDEX, id: productId.toString(), body: { doc: fields }, refresh });
    return true;
  } catch (error) {
    if (error?.statusCode === 404 || error?.body?.statusCode === 404) return false;
    throw error;
  }
}

export async function deleteProductFromIndex(productId, { refresh = 'wait_for' } = {}) {
  if (!mongoose.isValidObjectId(productId)) return false;

  const client = getOpenSearchClient();
  try {
    await client.delete({ index: PRODUCT_INDEX, id: productId.toString(), refresh });
    return true;
  } catch (error) {
    if (error?.statusCode === 404 || error?.body?.statusCode === 404) return false;
    throw error;
  }
}

async function bulkIndexDocuments(documents) {
  if (documents.length === 0) return { indexed: 0, failed: 0, errors: [] };

  const client = getOpenSearchClient();
  const body = [];

  for (const document of documents) {
    body.push({ index: { _index: PRODUCT_INDEX, _id: document.productId } });
    body.push(document);
  }

  const response = await client.bulk({ body, refresh: 'wait_for' });
  const result = responseBody(response);
  const items = Array.isArray(result?.items) ? result.items : [];
  const errors = items
    .map((item, index) => {
      const operation = item?.index ?? item?.create ?? item?.update;
      if (!operation?.error) return null;
      return {
        index,
        productId: documents[index]?.productId,
        reason: operation.error.reason,
        type: operation.error.type,
      };
    })
    .filter(Boolean);

  return {
    indexed: documents.length - errors.length,
    failed: errors.length,
    errors,
  };
}

export async function reindexProducts({
  recreate = false,
  batchSize = env.search.bulkBatchSize,
  embedBatchSize = env.search.embedBatchSize,
} = {}) {
  await ensureProductIndex({ recreate });
  await aiService.healthCheck();

  let processed = 0;
  let indexed = 0;
  let failed = 0;
  const errors = [];
  let lastId = null;

  while (true) {
    const filter = lastId ? { _id: { $gt: lastId } } : {};
    const products = await Product.find(filter)
      .sort({ _id: 1 })
      .limit(batchSize)
      .populate(PRODUCT_POPULATE)
      .lean();

    if (products.length === 0) break;

    for (let offset = 0; offset < products.length; offset += embedBatchSize) {
      const chunk = products.slice(offset, offset + embedBatchSize);
      const response = await aiService.embedProducts(
        chunk.map((product) => ({
          id: objectIdString(product._id),
          name: product.name,
          description: product.description,
          tags: array(product.tags),
          category: product.category
            ? { name: product.category.name, slug: product.category.slug }
            : undefined,
          brand: product.brand
            ? { name: product.brand.name, slug: product.brand.slug }
            : undefined,
          attributes: product.attributes ?? {},
        })),
      );

      const itemsByIndex = new Map(
        (response?.items ?? []).map((item) => [item.index, item]),
      );
      const documents = [];

      for (let index = 0; index < chunk.length; index += 1) {
        const product = chunk[index];
        const embedding = itemsByIndex.get(index);

        try {
          documents.push(toSearchDocument(product, {
            text: embedding?.text,
            embedding: embedding?.embedding,
            embeddingVersion: response.embeddingVersion,
          }));
        } catch (error) {
          failed += 1;
          errors.push({ productId: objectIdString(product._id), reason: error.message });
        }
      }

      const bulkResult = await bulkIndexDocuments(documents);
      indexed += bulkResult.indexed;
      failed += bulkResult.failed;
      errors.push(...bulkResult.errors);
      processed += chunk.length;
    }

    lastId = products[products.length - 1]._id;
  }

  const stats = await getProductIndexStats();
  logger.info(
    `OpenSearch reindex complete: processed=${processed}, indexed=${indexed}, failed=${failed}, total=${stats.count}`,
  );

  return { index: PRODUCT_INDEX, processed, indexed, failed, errors, total: stats.count };
}

export function getProductIndexMapping() {
  return INDEX_BODY;
}
