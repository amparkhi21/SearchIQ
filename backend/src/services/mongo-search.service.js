// MongoDB-only search, used when SEARCH_MODE=mongo (no OpenSearch server, no Python AI service).
// It reuses the catalog's own filter builder, so filters, sorting and pagination behave exactly like
// GET /products, and it returns the same result objects the OpenSearch code path returns, so the
// frontend does not need to know which engine answered.
import mongoose from 'mongoose';
import { PRODUCT_SORTS } from '../constants.js';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import RecentlyViewed from '../models/RecentlyViewed.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';
import { escapeRegExp } from '../utils/regex.js';
import { buildFilter } from './product.service.js';

const POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'brand', select: 'name slug' },
];

const stockStatusOf = (product) => {
  if (product.stock <= 0) return 'out_of_stock';
  if (product.stock <= product.lowStockThreshold) return 'low_stock';
  return 'in_stock';
};

/** Converts a (lean, populated) Product document into the result shape OpenSearch results use. */
export function productToSearchResult(product, extra = {}) {
  return {
    id: String(product._id),
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    discountPercent: product.discountPercent,
    finalPrice: product.finalPrice,
    ratingAvg: product.ratingAvg,
    ratingCount: product.ratingCount,
    soldCount: product.soldCount,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    inStock: product.inStock,
    stockStatus: stockStatusOf(product),
    isActive: product.isActive,
    images: (product.images ?? []).map((image) => ({
      url: image.url,
      alt: image.alt,
      photographerName: image.photographerName,
      photographerUrl: image.photographerUrl,
      photoUrl: image.photoUrl,
    })),
    tags: product.tags ?? [],
    attributes: product.attributes ?? undefined,
    category: { id: product.category?._id && String(product.category._id), name: product.category?.name, slug: product.category?.slug },
    brand: { id: product.brand?._id && String(product.brand._id), name: product.brand?.name, slug: product.brand?.slug },
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    relevanceScore: null, // MongoDB keyword search has no relevance score
    ...extra,
  };
}

/** Keyword search with the same filters / sorting / pagination as GET /products. */
export async function mongoKeywordSearch(query, { admin = false } = {}) {
  if (!query?.q || !query.q.trim()) throw ApiError.badRequest('Search query "q" is required');

  const { page, limit, skip } = getPagination(query);
  const filter = await buildFilter({ ...query, q: query.q.trim() }, { admin });
  // No relevance score without a text index: matches are ordered by popularity unless a sort is given
  const sortKey = query.sort ?? 'popular';

  const [products, total] = await Promise.all([
    Product.find(filter).sort(PRODUCT_SORTS[sortKey]).skip(skip).limit(limit).populate(POPULATE).lean(),
    Product.countDocuments(filter),
  ]);

  return {
    results: products.map((product) => productToSearchResult(product)),
    meta: buildPaginationMeta({ total, page, limit }),
    query: query.q.trim(),
    sort: query.sort ?? 'relevance',
    mode: 'keyword',
  };
}

const wordStartPatterns = (text) =>
  String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((word) => new RegExp(`\\b${escapeRegExp(word)}`, 'i'));

/** Autocomplete suggestions: matching brands and categories (with product counts) plus product names. */
export async function mongoSuggestions(query, limit) {
  const patterns = wordStartPatterns(query);
  const nameFilter = (extra = {}) => ({ ...extra, $and: patterns.map((pattern) => ({ name: pattern })) });

  const [products, brands, categories] = await Promise.all([
    Product.find(nameFilter({ isActive: true }))
      .sort({ soldCount: -1, _id: 1 })
      .limit(Math.min(20, limit * 2))
      .populate(POPULATE)
      .select('name slug brand category soldCount')
      .lean(),
    Brand.find(nameFilter({ isActive: true })).limit(Math.min(5, limit)).select('name slug').lean(),
    Category.find(nameFilter({ isActive: true })).limit(Math.min(5, limit)).select('name slug').lean(),
  ]);

  const [brandCounts, categoryCounts] = await Promise.all([
    Promise.all(brands.map((brand) => Product.countDocuments({ isActive: true, brand: brand._id }))),
    Promise.all(categories.map((category) => Product.countDocuments({ isActive: true, category: category._id }))),
  ]);

  const suggestions = [];
  const seen = new Set();
  const add = (item) => {
    const key = `${item.type}:${String(item.text).trim().toLowerCase()}`;
    if (!item.text || seen.has(key)) return;
    seen.add(key);
    suggestions.push(item);
  };

  brands.forEach((brand, i) => add({ type: 'brand', text: brand.name, score: brandCounts[i] }));
  categories.forEach((category, i) => add({ type: 'category', text: category.name, score: categoryCounts[i] }));
  for (const product of products) {
    add({
      type: 'product',
      text: product.name,
      id: String(product._id),
      slug: product.slug,
      brand: product.brand ? { name: product.brand.name, slug: product.brand.slug } : undefined,
      category: product.category ? { name: product.category.name, slug: product.category.slug } : undefined,
      score: Number(product.soldCount ?? 0),
    });
  }
  return suggestions.slice(0, limit);
}

const popularityOf = (product) =>
  Math.log1p(Math.max(0, product.soldCount ?? 0)) +
  ((product.ratingAvg ?? 0) / 5) * 2 +
  Math.log1p(Math.max(0, product.ratingCount ?? 0)) * 0.1;

/** Best sellers, used when there is nothing personal to base recommendations on. */
export async function mongoPopularProducts(limit) {
  const products = await Product.find({ isActive: true })
    .sort({ soldCount: -1, ratingAvg: -1, ratingCount: -1, _id: 1 })
    .limit(limit)
    .populate(POPULATE)
    .lean();
  return products.map((product) =>
    productToSearchResult(product, {
      recommendationScore: Number((Math.min(1, popularityOf(product) / 20)).toFixed(6)),
      reason: 'popular',
    }),
  );
}

/** Scores candidates by how much they share with the seed products (category, brand, tags, price). */
function rankBySimilarity(candidates, seeds) {
  const seedBrands = new Set(seeds.map((seed) => String(seed.brand)));
  const seedTags = new Set(seeds.flatMap((seed) => seed.tags ?? []));
  const seedPrice = seeds.reduce((sum, seed) => sum + (seed.finalPrice ?? 0), 0) / Math.max(1, seeds.length);

  return candidates
    .map((candidate) => {
      const sharedTags = (candidate.tags ?? []).filter((tag) => seedTags.has(tag)).length;
      const priceGap = seedPrice > 0 ? Math.min(1, Math.abs((candidate.finalPrice ?? 0) - seedPrice) / seedPrice) : 1;
      const similarity =
        1 + (seedBrands.has(String(candidate.brand?._id ?? candidate.brand)) ? 0.5 : 0) + sharedTags * 0.25 + (1 - priceGap) * 0.5;
      return { candidate, similarity, rank: similarity + Math.min(1, popularityOf(candidate) / 20) * 0.2 };
    })
    .sort((a, b) => b.rank - a.rank || String(a.candidate._id).localeCompare(String(b.candidate._id)));
}

/** Similar products without embeddings: same category, ranked by shared brand/tags/price. */
export async function mongoSimilarProducts(product, limit) {
  const candidates = await Product.find({ isActive: true, _id: { $ne: product._id }, category: product.category?._id ?? product.category })
    .sort({ soldCount: -1, ratingAvg: -1, _id: 1 })
    .limit(60)
    .populate(POPULATE)
    .lean();

  const seed = { brand: product.brand?._id ?? product.brand, tags: product.tags, finalPrice: product.finalPrice };
  return rankBySimilarity(candidates, [seed])
    .slice(0, limit)
    .map(({ candidate, similarity }) => productToSearchResult(candidate, { similarityScore: Number(similarity.toFixed(4)) }));
}

/** Personalised picks from recently viewed products (same categories), else best sellers. */
export async function mongoRecommendations(userId, limit) {
  const recent = await RecentlyViewed.find({ user: userId }).sort({ viewedAt: -1 }).limit(5).select('product').lean();
  if (!recent.length) return mongoPopularProducts(limit);

  const seedIds = recent.map((entry) => entry.product);
  const seeds = await Product.find({ _id: { $in: seedIds } }).select('category brand tags finalPrice').lean();
  const categoryIds = [...new Set(seeds.map((seed) => String(seed.category)))].filter((id) => mongoose.isValidObjectId(id));
  if (!categoryIds.length) return mongoPopularProducts(limit);

  const candidates = await Product.find({ isActive: true, _id: { $nin: seedIds }, category: { $in: categoryIds } })
    .sort({ soldCount: -1, ratingAvg: -1, _id: 1 })
    .limit(80)
    .populate(POPULATE)
    .lean();
  if (!candidates.length) return mongoPopularProducts(limit);

  return rankBySimilarity(candidates, seeds)
    .slice(0, limit)
    .map(({ candidate, similarity, rank }) =>
      productToSearchResult(candidate, {
        similarityScore: Number(similarity.toFixed(4)),
        recommendationScore: Number(rank.toFixed(6)),
        matchedViewedProducts: seeds.length,
        reason: seeds.length > 1 ? 'similar-to-recent-views' : 'similar-to-recent-view',
      }),
    );
}
