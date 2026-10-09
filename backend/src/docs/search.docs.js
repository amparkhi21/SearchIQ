import { errorResponse, jsonResponse, queryParam, successEnvelope } from './helpers.js';

const searchResult = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    sku: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string' },
    price: { type: 'number' },
    discountPercent: { type: 'number' },
    finalPrice: { type: 'number' },
    ratingAvg: { type: 'number' },
    ratingCount: { type: 'integer' },
    soldCount: { type: 'integer' },
    stock: { type: 'integer' },
    inStock: { type: 'boolean' },
    stockStatus: { type: 'string', enum: ['in_stock', 'low_stock', 'out_of_stock'] },
    isActive: { type: 'boolean' },
    images: { type: 'array', items: { type: 'object' } },
    tags: { type: 'array', items: { type: 'string' } },
    attributes: { type: 'object', nullable: true },
    category: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
      },
    },
    createdAt: { type: 'string', format: 'date-time', nullable: true },
    updatedAt: { type: 'string', format: 'date-time', nullable: true },
    brand: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
      },
    },
    relevanceScore: { type: 'number', nullable: true },
    semanticScore: { type: 'number', nullable: true },
    hybridScore: { type: 'number', nullable: true },
    bm25Rank: { type: 'integer', nullable: true },
    semanticRank: { type: 'integer', nullable: true },
  },
};

const searchListSchema = successEnvelope(
  {
    type: 'object',
    properties: {
      results: { type: 'array', items: searchResult },
    },
    required: ['results'],
  },
  'Products searched',
  true,
);

const searchParameters = [
  queryParam('q', { type: 'string', minLength: 1, maxLength: 100, example: 'black running shoes' }, 'Keyword query.'),
  queryParam('mode', { type: 'string', enum: ['hybrid', 'bm25', 'semantic'], default: 'hybrid' }, 'Unified search mode. The unified endpoint defaults to hybrid.'),
  queryParam('category', { type: 'string', example: 'footwear' }, 'Category id or slug; comma-separated values supported.'),
  queryParam('brand', { type: 'string', example: 'nike,adidas' }, 'Brand id or slug; comma-separated values supported.'),
  queryParam('minPrice', { type: 'number', minimum: 0, example: 500 }, 'Minimum final price after discount.'),
  queryParam('maxPrice', { type: 'number', minimum: 0, example: 2500 }, 'Maximum final price after discount.'),
  queryParam('rating', { type: 'number', minimum: 0, maximum: 5, example: 4 }, 'Minimum average rating.'),
  queryParam('minDiscount', { type: 'number', minimum: 0, maximum: 90, example: 10 }, 'Minimum discount percentage.'),
  queryParam('inStock', { type: 'boolean' }, 'true = only in-stock; false = only out-of-stock.'),
  queryParam('sort', { type: 'string', enum: ['newest', 'oldest', 'price_asc', 'price_desc', 'rating', 'popular', 'discount', 'name_asc'] }, 'Optional explicit sort. Defaults to relevance.'),
  queryParam('page', { type: 'integer', minimum: 1, default: 1 }, 'Page number.'),
  queryParam('limit', { type: 'integer', minimum: 1, maximum: 100, default: 20 }, 'Items per page.'),
  queryParam('includeInactive', { type: 'boolean' }, 'Admins only: include hidden products.'),
];

export const searchSchemas = {
  SearchResult: searchResult,
};

export const searchPaths = {

  '/search/suggestions': {
    get: {
      tags: ['Search'],
      summary: 'Autocomplete product, brand and category suggestions',
      parameters: [
        queryParam('q', { type: 'string', minLength: 1, maxLength: 60, example: 'run' }, 'Suggestion prefix/query.'),
        queryParam('limit', { type: 'integer', minimum: 1, maximum: 15, default: 10 }, 'Maximum suggestions returned.'),
      ],
      responses: {
        200: jsonResponse(
          'Search suggestions',
          successEnvelope({
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['product', 'brand', 'category'] },
                    text: { type: 'string' },
                    id: { type: 'string', nullable: true },
                    slug: { type: 'string', nullable: true },
                    score: { type: 'number' },
                  },
                },
              },
              cached: { type: 'boolean' },
            },
          }, 'Search suggestions fetched', true),
        ),
        400: errorResponse('Invalid suggestion query'),
        503: errorResponse('Search suggestions unavailable'),
      },
    },
  },
  '/search/recent': {
    get: {
      tags: ['Search'],
      summary: "Get the authenticated user's recent searches",
      security: [{ bearerAuth: [] }],
      parameters: [queryParam('limit', { type: 'integer', minimum: 1, maximum: 20, default: 10 }, 'Maximum recent searches returned.')],
      responses: {
        200: jsonResponse('Recent searches', successEnvelope({
          type: 'object',
          properties: {
            searches: { type: 'array', items: { type: 'object' } },
          },
        }, 'Recent searches fetched')),
        401: errorResponse('Authentication required'),
      },
    },
    delete: {
      tags: ['Search'],
      summary: "Clear the authenticated user's recent searches",
      security: [{ bearerAuth: [] }],
      responses: {
        200: jsonResponse('Recent searches cleared', successEnvelope({ type: 'object', properties: { deleted: { type: 'integer' } } }, 'Recent searches cleared')),
        401: errorResponse('Authentication required'),
      },
    },
  },
  '/search/query': {
    get: {
      tags: ['Search'],
      summary: 'Unified product search',
      description:
        'Production search entry point. Defaults to hybrid ranking and can explicitly select BM25 or semantic mode. Results are cached briefly in Redis when available.',
      parameters: searchParameters,
      responses: {
        200: jsonResponse(
          'Search results',
          successEnvelope(
            {
              type: 'object',
              properties: {
                results: { type: 'array', items: searchResult },
                mode: { type: 'string', enum: ['hybrid', 'bm25', 'semantic'] },
                query: { type: 'string' },
                cached: { type: 'boolean' },
                analysis: { type: 'object', nullable: true },
                embeddingVersion: { type: 'string', nullable: true },
                embeddingDimensions: { type: 'integer', nullable: true },
                candidateCount: { type: 'integer', nullable: true },
                weights: { type: 'object', nullable: true },
              },
              required: ['results', 'mode', 'query', 'cached'],
            },
            'Search completed',
            true,
          ),
        ),
        400: errorResponse('Invalid query, mode, filter, sort or pagination value'),
        404: errorResponse('Unknown category or brand in the filter'),
        503: errorResponse('Search index or AI service unavailable'),
      },
    },
  },
  '/search': {
    get: {
      tags: ['Search'],
      summary: 'BM25 keyword product search',
      description:
        'Searches the OpenSearch product index using BM25/full-text relevance. Supports product filters, sorting and pagination. Vector and hybrid search are added in later phases.',
      parameters: searchParameters,
      responses: {
        200: jsonResponse('Search results', searchListSchema),
        400: errorResponse('Invalid query, filter, sort or pagination value'),
        404: errorResponse('Unknown category or brand in the filter'),
        503: errorResponse('Search index/service unavailable'),
      },
    },
  },

  '/search/hybrid': {
    get: {
      tags: ['Search'],
      summary: 'Hybrid BM25 + semantic product search',
      description:
        'Analyzes the query with the AI service, applies high-confidence hard filters, then fuses OpenSearch BM25 and vector kNN rankings with weighted reciprocal-rank fusion (RRF). Color/use-case/intent signals are used as soft boosts rather than hard filters.',
      parameters: searchParameters,
      responses: {
        200: jsonResponse(
          'Hybrid search results',
          successEnvelope(
            {
              type: 'object',
              properties: {
                results: { type: 'array', items: searchResult },
                mode: { type: 'string', example: 'hybrid' },
                query: { type: 'string', example: 'comfortable black shoes for college under 2500' },
                analysis: {
                  type: 'object',
                  properties: {
                    cleanQuery: { type: 'string' },
                    hardFilters: { type: 'object' },
                    softSignals: { type: 'object' },
                    intentTags: { type: 'array', items: { type: 'string' } },
                    confidence: { type: 'object' },
                  },
                },
                embeddingVersion: { type: 'string', example: 'minilm-v1' },
                embeddingDimensions: { type: 'integer', example: 384 },
                candidateCount: { type: 'integer' },
                weights: {
                  type: 'object',
                  properties: {
                    bm25: { type: 'number', example: 0.55 },
                    vector: { type: 'number', example: 0.45 },
                  },
                },
              },
              required: ['results', 'mode', 'query', 'analysis', 'embeddingVersion', 'embeddingDimensions'],
            },
            'Hybrid search completed',
            true,
          ),
        ),
        400: errorResponse('Invalid query, AI-derived constraints, filter, sort or pagination value'),
        404: errorResponse('Unknown category or brand in the filter'),
        503: errorResponse('AI or search service unavailable'),
      },
    },
  },
  '/search/semantic': {
    get: {
      tags: ['Search'],
      summary: 'Semantic vector product search',
      description:
        'Embeds the query with all-MiniLM-L6-v2 and searches the product embedding field with OpenSearch kNN. Supports product filters and pagination. Hybrid ranking is added in a later phase.',
      parameters: searchParameters.filter((parameter) => parameter.name !== 'sort'),
      responses: {
        200: jsonResponse(
          'Semantic search results',
          successEnvelope(
            {
              type: 'object',
              properties: {
                results: { type: 'array', items: searchResult },
                mode: { type: 'string', example: 'semantic' },
                embeddingVersion: { type: 'string', example: 'minilm-v1' },
                embeddingDimensions: { type: 'integer', example: 384 },
              },
              required: ['results', 'mode', 'embeddingVersion', 'embeddingDimensions'],
            },
            'Products searched semantically',
            true,
          ),
        ),
        400: errorResponse('Invalid query, filter or pagination value'),
        404: errorResponse('Unknown category or brand in the filter'),
        503: errorResponse('AI or search service unavailable'),
      },
    },
  },
};
