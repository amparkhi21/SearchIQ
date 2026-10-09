import { bearer, errorResponse, jsonResponse, queryParam, ref, successEnvelope } from './helpers.js';

const recommendationProduct = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    sku: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    price: { type: 'number' },
    discountPercent: { type: 'number' },
    finalPrice: { type: 'number' },
    ratingAvg: { type: 'number' },
    ratingCount: { type: 'integer' },
    soldCount: { type: 'integer' },
    images: { type: 'array', items: { type: 'object' } },
    attributes: { type: 'object', nullable: true },
    category: { type: 'object' },
    brand: { type: 'object' },
    similarityScore: { type: 'number', nullable: true },
    recommendationScore: { type: 'number', nullable: true },
    matchedViewedProducts: { type: 'integer', nullable: true },
    reason: { type: 'string', nullable: true },
  },
};

export const recommendationSchemas = {
  RecommendationProduct: recommendationProduct,
  RecentlyViewedEntry: {
    type: 'object',
    properties: {
      product: recommendationProduct,
      viewedAt: { type: 'string', format: 'date-time' },
    },
  },
};

const listResponse = (message, itemSchema) => successEnvelope({
  type: 'object',
  properties: {
    products: { type: 'array', items: itemSchema },
  },
}, message);

export const recommendationPaths = {
  '/recommendations/similar/{id}': {
    get: {
      tags: ['Recommendations'],
      summary: 'Get products similar to a product',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Product ID.' },
        queryParam('limit', { type: 'integer', minimum: 1, maximum: 20, default: 10 }, 'Maximum similar products.'),
      ],
      responses: {
        200: jsonResponse('Similar products', listResponse('Similar products fetched', ref('RecommendationProduct'))),
        400: errorResponse('Invalid product id'),
        404: errorResponse('Product not found'),
        503: errorResponse('Recommendation index unavailable'),
      },
    },
  },
  '/recommendations/for-me': {
    get: {
      tags: ['Recommendations'],
      summary: 'Get personalized product recommendations',
      description: 'Uses the authenticated user\'s recently viewed products as recommendation seeds and falls back to popular products when no history exists.',
      security: bearer,
      parameters: [queryParam('limit', { type: 'integer', minimum: 1, maximum: 20, default: 10 }, 'Maximum recommendations.')],
      responses: {
        200: jsonResponse('Personalized recommendations', listResponse('Recommendations fetched', ref('RecommendationProduct'))),
        401: errorResponse('Authentication required'),
        503: errorResponse('Recommendation service unavailable'),
      },
    },
  },
  '/recommendations/viewed/{id}': {
    post: {
      tags: ['Recommendations'],
      summary: 'Record a product as recently viewed',
      security: bearer,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Product ID.' }],
      responses: {
        200: jsonResponse('Recently viewed updated', successEnvelope({ type: 'object', properties: { viewed: { type: 'object' } } }, 'Recently viewed updated')),
        400: errorResponse('Invalid product id'),
        401: errorResponse('Authentication required'),
        404: errorResponse('Product not found'),
      },
    },
  },
  '/recommendations/recently-viewed': {
    get: {
      tags: ['Recommendations'],
      summary: 'Get recently viewed products',
      security: bearer,
      parameters: [queryParam('limit', { type: 'integer', minimum: 1, maximum: 20, default: 10 }, 'Maximum recently viewed products.')],
      responses: {
        200: jsonResponse('Recently viewed', successEnvelope({ type: 'object', properties: { entries: { type: 'array', items: ref('RecentlyViewedEntry') } } }, 'Recently viewed fetched')),
        401: errorResponse('Authentication required'),
      },
    },
    delete: {
      tags: ['Recommendations'],
      summary: 'Clear recently viewed history',
      security: bearer,
      responses: {
        200: jsonResponse('Recently viewed cleared', successEnvelope({ type: 'object', properties: { deleted: { type: 'integer' } } }, 'Recently viewed cleared')),
        401: errorResponse('Authentication required'),
      },
    },
  },
};
