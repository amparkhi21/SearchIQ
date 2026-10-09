import { env } from '../config/env.js';
import { getOpenSearchClient } from '../config/opensearch.js';
import * as aiService from './ai.service.js';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';
import { resolveByIdOrSlug } from './lookup.service.js';
import { PRODUCT_INDEX } from './indexing.service.js';
import { buildSearchCacheKey, getCachedSearchResult, setCachedSearchResult } from './search-cache.service.js';

const SEARCH_FIELDS = [
  'name^6',
  'brandName^5',
  'categoryName^4',
  'searchableText^2',
  'description',
];

const SORT_BUILDERS = Object.freeze({
  newest: () => [
    { createdAt: { order: 'desc' } },
    { _score: { order: 'desc' } },
    { productId: { order: 'desc' } },
  ],
  oldest: () => [
    { createdAt: { order: 'asc' } },
    { _score: { order: 'desc' } },
    { productId: { order: 'asc' } },
  ],
  price_asc: () => [
    { finalPrice: { order: 'asc' } },
    { _score: { order: 'desc' } },
    { productId: { order: 'asc' } },
  ],
  price_desc: () => [
    { finalPrice: { order: 'desc' } },
    { _score: { order: 'desc' } },
    { productId: { order: 'desc' } },
  ],
  rating: () => [
    { ratingAvg: { order: 'desc' } },
    { ratingCount: { order: 'desc' } },
    { _score: { order: 'desc' } },
    { productId: { order: 'asc' } },
  ],
  popular: () => [
    { soldCount: { order: 'desc' } },
    { _score: { order: 'desc' } },
    { productId: { order: 'desc' } },
  ],
  discount: () => [
    { discountPercent: { order: 'desc' } },
    { _score: { order: 'desc' } },
    { productId: { order: 'desc' } },
  ],
  name_asc: () => [
    { 'name.keyword': { order: 'asc' } },
    { _score: { order: 'desc' } },
    { productId: { order: 'asc' } },
  ],
});

function responseBody(response) {
  return response?.body ?? response;
}


function buildTextQuery(q) {
  const trimmed = String(q ?? '').trim();
  if (!trimmed) {
    return { match_all: {} };
  }

  return {
    bool: {
      should: [
        {
          multi_match: {
            query: trimmed,
            fields: SEARCH_FIELDS,
            type: 'best_fields',
            operator: 'and',
            boost: 4,
          },
        },
        {
          multi_match: {
            query: trimmed,
            fields: ['name^8', 'brandName^6', 'categoryName^5', 'searchableText^2'],
            type: 'phrase',
            slop: 1,
            boost: 3,
          },
        },
        {
          multi_match: {
            query: trimmed,
            fields: ['name^6', 'brandName^5', 'categoryName^4', 'searchableText^2'],
            type: 'bool_prefix',
            boost: 1.5,
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
}


function buildHybridTextQuery(query, softSignals = {}, intentTags = []) {
  const primary = buildTextQuery(query);
  const should = [];

  for (const color of softSignals.colors ?? []) {
    if (color) {
      should.push({ term: { 'attributes.color': { value: color, boost: 3.5 } } });
      should.push({ match: { searchableText: { query: color, boost: 1.25 } } });
    }
  }

  for (const useCase of softSignals.useCases ?? []) {
    if (useCase) {
      should.push({ term: { 'attributes.useCase': { value: useCase, boost: 3.0 } } });
      should.push({ match: { searchableText: { query: useCase, boost: 1.1 } } });
    }
  }

  for (const intent of intentTags ?? []) {
    if (intent) {
      should.push({ match: { searchableText: { query: intent, boost: 0.75 } } });
    }
  }

  if (!should.length) return primary;
  return {
    bool: {
      must: [primary],
      should,
      minimum_should_match: 0,
    },
  };
}

function uniqueStrings(values) {
  return [...new Set((values ?? []).filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

async function buildAiVocabulary() {
  const [categories, brands, colors, useCases, genders] = await Promise.all([
    Category.find({}).select('name slug').lean(),
    Brand.find({}).select('name slug').lean(),
    Product.distinct('attributes.color'),
    Product.distinct('attributes.useCase'),
    Product.distinct('attributes.gender'),
  ]);

  return {
    categories: uniqueStrings(categories.flatMap((item) => [item.name, item.slug])),
    brands: uniqueStrings(brands.flatMap((item) => [item.name, item.slug])),
    colors: uniqueStrings(colors),
    useCases: uniqueStrings(useCases),
    genders: uniqueStrings(genders),
  };
}

async function resolveNamedFilterValues(Model, values) {
  const names = uniqueStrings(values);
  if (!names.length) return null;
  const lowered = names.map((value) => value.toLowerCase());
  const docs = await Model.find({
    $or: [
      { slug: { $in: lowered } },
      { name: { $in: names } },
    ],
  }).select('_id slug name').lean();
  if (!docs.length) return names.join(',');
  return docs.map((doc) => String(doc._id)).join(',');
}

async function mergeAiHardFilters(query, hardFilters = {}) {
  const merged = { ...query };

  if (merged.category === undefined && Array.isArray(hardFilters.category) && hardFilters.category.length) {
    merged.category = await resolveNamedFilterValues(Category, hardFilters.category);
  }

  if (merged.brand === undefined && Array.isArray(hardFilters.brand) && hardFilters.brand.length) {
    merged.brand = await resolveNamedFilterValues(Brand, hardFilters.brand);
  }

  const clientMin = merged.minPrice;
  const clientMax = merged.maxPrice;
  const aiMin = hardFilters.minPrice;
  const aiMax = hardFilters.maxPrice;

  if (aiMin !== undefined) merged.minPrice = clientMin === undefined ? aiMin : Math.max(clientMin, aiMin);
  if (aiMax !== undefined) merged.maxPrice = clientMax === undefined ? aiMax : Math.min(clientMax, aiMax);

  if (merged.minPrice !== undefined && merged.maxPrice !== undefined && merged.minPrice > merged.maxPrice) {
    throw ApiError.badRequest('Search constraints produce an empty price range');
  }

  if (merged.inStock === undefined && hardFilters.inStock !== undefined) {
    merged.inStock = hardFilters.inStock;
  }

  return merged;
}

function hybridSortResults(results, sort) {
  if (!sort || sort === 'relevance') {
    return results.sort((a, b) => {
      const score = Number(b.hybridScore ?? 0) - Number(a.hybridScore ?? 0);
      if (score) return score;
      const semantic = Number(b.semanticScore ?? 0) - Number(a.semanticScore ?? 0);
      if (semantic) return semantic;
      const bm25 = Number(b.relevanceScore ?? 0) - Number(a.relevanceScore ?? 0);
      if (bm25) return bm25;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  const direction = sort === 'price_asc' || sort === 'name_asc' || sort === 'oldest' ? 1 : -1;
  const compare = (left, right) => {
    const keyMap = {
      newest: ['createdAt'],
      oldest: ['createdAt'],
      price_asc: ['finalPrice'],
      price_desc: ['finalPrice'],
      rating: ['ratingAvg', 'ratingCount'],
      popular: ['soldCount'],
      discount: ['discountPercent'],
      name_asc: ['name'],
    };
    const keys = keyMap[sort] ?? ['hybridScore'];
    for (const key of keys) {
      const a = left[key] ?? '';
      const b = right[key] ?? '';
      if (typeof a === 'string' || typeof b === 'string') {
        const cmp = String(a).localeCompare(String(b));
        if (cmp) return cmp * direction;
      } else if (Number(a) !== Number(b)) {
        return (Number(a) - Number(b)) * direction;
      }
    }
    return Number(right.hybridScore ?? 0) - Number(left.hybridScore ?? 0);
  };
  return results.sort(compare);
}

function fuseHybridCandidates(bm25Hits, vectorHits, { bm25Weight, vectorWeight, rrfK }) {
  const byId = new Map();
  bm25Hits.forEach((hit, index) => {
    const id = hit?._source?.productId;
    if (!id) return;
    const existing = byId.get(id) ?? { source: hit._source, bm25Rank: null, semanticRank: null, relevanceScore: null, semanticScore: null };
    existing.bm25Rank = index + 1;
    existing.relevanceScore = typeof hit._score === 'number' ? hit._score : null;
    byId.set(id, existing);
  });
  vectorHits.forEach((hit, index) => {
    const id = hit?._source?.productId;
    if (!id) return;
    const existing = byId.get(id) ?? { source: hit._source, bm25Rank: null, semanticRank: null, relevanceScore: null, semanticScore: null };
    existing.semanticRank = index + 1;
    existing.semanticScore = typeof hit._score === 'number' ? hit._score : null;
    byId.set(id, existing);
  });

  return [...byId.values()].map((item) => {
    const bm25Contribution = item.bm25Rank ? bm25Weight / (rrfK + item.bm25Rank) : 0;
    const vectorContribution = item.semanticRank ? vectorWeight / (rrfK + item.semanticRank) : 0;
    return {
      source: item.source,
      relevanceScore: item.relevanceScore,
      semanticScore: item.semanticScore,
      bm25Rank: item.bm25Rank,
      semanticRank: item.semanticRank,
      hybridScore: bm25Contribution + vectorContribution,
    };
  });
}


function buildVectorKnnQuery(vector, k, filters) {
  const knnClause = {
    vector,
    k,
  };

  if (Array.isArray(filters) && filters.length > 0) {
    knnClause.filter = { bool: { filter: filters } };
  }

  return { knn: { embedding: knnClause } };
}

function toSemanticSearchResult(hit) {
  const result = toSearchResult(hit);
  return {
    ...result,
    semanticScore: typeof hit?._score === 'number' ? hit._score : null,
  };
}

async function ensureSearchIndex(client) {
  const existsResponse = await client.indices.exists({ index: PRODUCT_INDEX });
  if (!Boolean(responseBody(existsResponse))) {
    throw ApiError.serviceUnavailable('Search index is unavailable; run the reindex command first');
  }
}

async function resolveCategoryIds(input) {
  if (!input) return null;
  const categories = await resolveByIdOrSlug(Category, input, 'Category');
  const ids = categories.map((category) => String(category._id));
  const childIds = await Category.find({ parent: { $in: categories.map((category) => category._id) } })
    .select('_id')
    .lean();
  return [...new Set([...ids, ...childIds.map((child) => String(child._id))])];
}

async function resolveBrandIds(input) {
  if (!input) return null;
  const brands = await resolveByIdOrSlug(Brand, input, 'Brand');
  return [...new Set(brands.map((brand) => String(brand._id)))];
}

async function buildFilters(query, { admin }) {
  const filters = [
    { term: { isActive: true } },
  ];

  if (admin && query.includeInactive === true) {
    filters.pop();
  }

  const [categoryIds, brandIds] = await Promise.all([
    resolveCategoryIds(query.category),
    resolveBrandIds(query.brand),
  ]);

  if (categoryIds?.length) filters.push({ terms: { categoryId: categoryIds } });
  if (brandIds?.length) filters.push({ terms: { brandId: brandIds } });

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const range = {};
    if (query.minPrice !== undefined) range.gte = query.minPrice;
    if (query.maxPrice !== undefined) range.lte = query.maxPrice;
    filters.push({ range: { finalPrice: range } });
  }

  if (query.rating !== undefined) filters.push({ range: { ratingAvg: { gte: query.rating } } });
  if (query.minDiscount !== undefined) {
    filters.push({ range: { discountPercent: { gte: query.minDiscount } } });
  }
  if (query.inStock !== undefined) filters.push({ term: { inStock: query.inStock } });

  return filters;
}

function buildSort(sort) {
  const sortKey = sort || 'relevance';
  if (sortKey === 'relevance') {
    return [
      { _score: { order: 'desc' } },
      { soldCount: { order: 'desc' } },
      { createdAt: { order: 'desc' } },
      { productId: { order: 'desc' } },
    ];
  }
  return SORT_BUILDERS[sortKey]();
}

function normalizeImage(image) {
  if (!image || typeof image !== 'object') return null;
  return {
    url: image.url,
    alt: image.alt,
    photographerName: image.photographerName,
    photographerUrl: image.photographerUrl,
    photoUrl: image.photoUrl,
  };
}

export function toSearchResult(hit) {
  const source = hit?._source ?? {};
  return {
    id: source.productId,
    sku: source.sku,
    name: source.name,
    slug: source.slug,
    description: source.description,
    price: source.price,
    discountPercent: source.discountPercent,
    finalPrice: source.finalPrice,
    ratingAvg: source.ratingAvg,
    ratingCount: source.ratingCount,
    soldCount: source.soldCount,
    stock: source.stock,
    lowStockThreshold: source.lowStockThreshold,
    inStock: source.inStock,
    stockStatus: source.stockStatus,
    isActive: source.isActive,
    images: Array.isArray(source.images) ? source.images.map(normalizeImage).filter(Boolean) : [],
    tags: Array.isArray(source.tags) ? source.tags : [],
    attributes: source.attributes ?? undefined,
    category: {
      id: source.categoryId,
      name: source.categoryName,
      slug: source.categorySlug,
    },
    brand: {
      id: source.brandId,
      name: source.brandName,
      slug: source.brandSlug,
    },
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    relevanceScore: typeof hit?._score === 'number' ? hit._score : null,
  };
}

export async function searchProducts(query, { admin = false, requestId } = {}) {
  if (!query?.q || !query.q.trim()) {
    throw ApiError.badRequest('Search query "q" is required');
  }

  const { page, limit, skip } = getPagination(query);
  const normalizedQuery = { ...query, page, limit };

  // A missing index is an operational problem, not an empty search result.
  let client;
  try {
    client = getOpenSearchClient();
    await ensureSearchIndex(client);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.serviceUnavailable('Search index is unavailable');
  }

  try {
    const filters = await buildFilters(normalizedQuery, { admin });
    const body = {
      from: skip,
      size: limit,
      track_total_hits: true,
      query: {
        bool: {
          must: [buildTextQuery(normalizedQuery.q)],
          filter: filters,
        },
      },
      sort: buildSort(normalizedQuery.sort),
      _source: true,
    };

    const response = await client.search({ index: PRODUCT_INDEX, body });
    const result = responseBody(response);
    const hits = result?.hits?.hits ?? [];
    const totalRaw = result?.hits?.total;
    const total = typeof totalRaw === 'number' ? totalRaw : Number(totalRaw?.value ?? 0);

    return {
      results: hits.map(toSearchResult),
      meta: buildPaginationMeta({ total, page, limit }),
      query: normalizedQuery.q.trim(),
      sort: normalizedQuery.sort ?? 'relevance',
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.serviceUnavailable('Search service is unavailable');
  }
}


export async function hybridSearchProducts(query, { admin = false, requestId } = {}) {
  if (!query?.q || !query.q.trim()) {
    throw ApiError.badRequest('Search query "q" is required');
  }

  const { page, limit, skip } = getPagination(query);
  const normalizedQuery = { ...query, page, limit };

  let client;
  try {
    client = getOpenSearchClient();
    await ensureSearchIndex(client);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.serviceUnavailable('Search index is unavailable');
  }

  let analysis;
  try {
    const vocabulary = await buildAiVocabulary();
    analysis = await aiService.analyzeQuery({
      query: normalizedQuery.q.trim(),
      vocabulary,
      requestId,
    });
    if (!Array.isArray(analysis?.embedding) || analysis.embedding.length !== env.search.embeddingDimensions) {
      throw new Error('AI service returned an invalid query embedding');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.serviceUnavailable('Hybrid search is unavailable because AI query analysis failed');
  }

  const filterQuery = await mergeAiHardFilters(normalizedQuery, analysis?.hardFilters);
  const filters = await buildFilters(filterQuery, { admin });

  try {
    const countBody = { query: { bool: { filter: filters } } };
    const countResponse = await client.count({ index: PRODUCT_INDEX, body: countBody });
    const total = Number(responseBody(countResponse)?.count ?? 0);

    if (total === 0) {
      return {
        results: [],
        meta: buildPaginationMeta({ total, page, limit }),
        query: normalizedQuery.q.trim(),
        mode: 'hybrid',
        analysis: {
          cleanQuery: analysis.cleanQuery,
          hardFilters: analysis.hardFilters,
          softSignals: analysis.softSignals,
          intentTags: analysis.intentTags,
          confidence: analysis.confidence,
        },
        embeddingVersion: analysis.embeddingVersion ?? env.search.embeddingVersion,
        embeddingDimensions: analysis.embeddingDimensions ?? env.search.embeddingDimensions,
        weights: {
          bm25: env.search.hybridBm25Weight,
          vector: env.search.hybridVectorWeight,
        },
      };
    }

    const candidateK = Math.min(1000, Math.max(env.search.hybridCandidateK, skip + limit));
    const keyword = analysis.cleanQuery?.trim() || normalizedQuery.q.trim();
    const bm25Body = {
      size: Math.min(candidateK, total),
      track_total_hits: false,
      query: {
        bool: {
          must: [buildHybridTextQuery(keyword, analysis.softSignals, analysis.intentTags)],
          filter: filters,
        },
      },
      sort: [
        { _score: { order: 'desc' } },
        { soldCount: { order: 'desc' } },
        { createdAt: { order: 'desc' } },
        { productId: { order: 'desc' } },
      ],
      _source: true,
    };

    const vectorBody = {
      size: Math.min(candidateK, total),
      track_total_hits: false,
      query: buildVectorKnnQuery(analysis.embedding, Math.min(candidateK, total), filters),
      _source: true,
    };

    const [bm25Response, vectorResponse] = await Promise.all([
      client.search({ index: PRODUCT_INDEX, body: bm25Body }),
      client.search({ index: PRODUCT_INDEX, body: vectorBody }),
    ]);

    const bm25Hits = responseBody(bm25Response)?.hits?.hits ?? [];
    const vectorHits = responseBody(vectorResponse)?.hits?.hits ?? [];
    const fused = fuseHybridCandidates(bm25Hits, vectorHits, {
      bm25Weight: env.search.hybridBm25Weight,
      vectorWeight: env.search.hybridVectorWeight,
      rrfK: env.search.hybridRrfK,
    });

    const results = fused.map((item) => ({
      ...toSearchResult({ _source: item.source, _score: item.relevanceScore }),
      relevanceScore: item.relevanceScore,
      semanticScore: item.semanticScore,
      hybridScore: item.hybridScore,
      bm25Rank: item.bm25Rank,
      semanticRank: item.semanticRank,
    }));

    hybridSortResults(results, normalizedQuery.sort);
    const pagedResults = results.slice(skip, skip + limit);

    return {
      results: pagedResults,
      meta: buildPaginationMeta({ total, page, limit }),
      query: normalizedQuery.q.trim(),
      mode: 'hybrid',
      analysis: {
        cleanQuery: analysis.cleanQuery,
        hardFilters: analysis.hardFilters,
        softSignals: analysis.softSignals,
        intentTags: analysis.intentTags,
        confidence: analysis.confidence,
      },
      embeddingVersion: analysis.embeddingVersion ?? env.search.embeddingVersion,
      embeddingDimensions: analysis.embeddingDimensions ?? env.search.embeddingDimensions,
      candidateCount: fused.length,
      weights: {
        bm25: env.search.hybridBm25Weight,
        vector: env.search.hybridVectorWeight,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.serviceUnavailable('Hybrid search service is unavailable');
  }
}


export async function semanticSearchProducts(query, { admin = false, requestId } = {}) {
  if (!query?.q || !query.q.trim()) {
    throw ApiError.badRequest('Search query "q" is required');
  }

  const { page, limit, skip } = getPagination(query);
  const normalizedQuery = { ...query, page, limit };

  let client;
  try {
    client = getOpenSearchClient();
    await ensureSearchIndex(client);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.serviceUnavailable('Search index is unavailable');
  }

  let filters;
  try {
    filters = await buildFilters(normalizedQuery, { admin });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw error;
  }

  let embedding;
  let embeddingVersion = env.search.embeddingVersion;
  try {
    const aiResult = await aiService.embedQuery(normalizedQuery.q.trim(), requestId);
    embedding = aiResult?.embedding;
    embeddingVersion = aiResult?.embeddingVersion ?? embeddingVersion;
    if (!Array.isArray(embedding) || embedding.length !== env.search.embeddingDimensions) {
      throw new Error(
        `AI service returned an invalid query embedding; expected ${env.search.embeddingDimensions} dimensions`,
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.serviceUnavailable('Semantic search is unavailable');
  }

  try {
    // Count filtered documents separately because kNN's hit count reflects the candidate set,
    // not necessarily the complete number of matching documents.
    const countBody = filters.length > 0
      ? { query: { bool: { filter: filters } } }
      : { query: { match_all: {} } };
    const countResponse = await client.count({ index: PRODUCT_INDEX, body: countBody });
    const countResult = responseBody(countResponse);
    const total = Number(countResult?.count ?? 0);

    if (total === 0) {
      return {
        results: [],
        meta: buildPaginationMeta({ total, page, limit }),
        query: normalizedQuery.q.trim(),
        mode: 'semantic',
        embeddingVersion,
        embeddingDimensions: embedding.length,
      };
    }

    const requestedK = Math.max(env.search.vectorK, skip + limit);
    const k = Math.min(total, 1000, requestedK);
    const body = {
      size: Math.min(k, total),
      track_total_hits: false,
      query: buildVectorKnnQuery(embedding, k, filters),
      _source: true,
    };

    const response = await client.search({ index: PRODUCT_INDEX, body });
    const result = responseBody(response);
    const hits = result?.hits?.hits ?? [];
    const pagedHits = hits.slice(skip, skip + limit);

    return {
      results: pagedHits.map(toSemanticSearchResult),
      meta: buildPaginationMeta({ total, page, limit }),
      query: normalizedQuery.q.trim(),
      mode: 'semantic',
      embeddingVersion,
      embeddingDimensions: embedding.length,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.serviceUnavailable('Semantic search service is unavailable');
  }
}

export async function unifiedSearchProducts(query, { admin = false, requestId } = {}) {
  if (!query?.q || !query.q.trim()) {
    throw ApiError.badRequest('Search query "q" is required');
  }

  const mode = query.mode ?? 'hybrid';
  if (!['bm25', 'semantic', 'hybrid'].includes(mode)) {
    throw ApiError.badRequest('Search mode must be bm25, semantic or hybrid');
  }

  const cacheKey = buildSearchCacheKey(query, { mode, admin });
  const cached = await getCachedSearchResult(cacheKey);
  if (cached) return { ...cached, cached: true };

  let result;
  if (mode === 'semantic') {
    result = await semanticSearchProducts(query, { admin, requestId });
  } else if (mode === 'bm25') {
    result = await searchProducts(query, { admin, requestId });
  } else {
    result = await hybridSearchProducts(query, { admin, requestId });
  }

  const cacheable = { ...result, mode };
  await setCachedSearchResult(cacheKey, cacheable);
  return { ...cacheable, cached: false };
}
