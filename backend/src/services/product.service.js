import { MAX_SEARCH_TOKENS, PRODUCT_SORTS } from '../constants.js';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';
import { escapeRegExp } from '../utils/regex.js';
import { generateUniqueSlug, slugify } from '../utils/slugify.js';
import { idOrSlugFilter, resolveByIdOrSlug } from './lookup.service.js';

const POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'brand', select: 'name slug logo' },
];

// Words that carry no meaning for keyword search
const STOP_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'the', 'to', 'with']);

/** "Black running shoes for college" -> ["black", "running", "shoes", "college"] */
function tokenize(text) {
  if (!text) return [];

  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token && !STOP_WORDS.has(token));

  return [...new Set(tokens)].slice(0, MAX_SEARCH_TOKENS);
}

/**
 * Keyword search without a text index: every word must match the start of a word in the
 * product name, description, tags, colour/use-case/material, or the name of its brand/category.
 * (Semantic natural-language search arrives in Phase 5 with OpenSearch.)
 */
async function buildSearchFilter(tokens) {
  const patterns = tokens.map((token) => new RegExp(`\\b${escapeRegExp(token)}`, 'i'));

  const [brands, categories] = await Promise.all([
    Brand.find({ $or: patterns.map((pattern) => ({ name: pattern })) }).select('name'),
    Category.find({ $or: patterns.map((pattern) => ({ name: pattern })) }).select('name'),
  ]);

  return {
    $and: patterns.map((pattern) => {
      const clauses = [
        { name: pattern },
        { description: pattern },
        { tags: pattern },
        { 'attributes.color': pattern },
        { 'attributes.useCase': pattern },
        { 'attributes.material': pattern },
      ];

      const brandIds = brands.filter((brand) => pattern.test(brand.name)).map((brand) => brand._id);
      if (brandIds.length > 0) clauses.push({ brand: { $in: brandIds } });

      const categoryIds = categories
        .filter((category) => pattern.test(category.name))
        .map((category) => category._id);
      if (categoryIds.length > 0) clauses.push({ category: { $in: categoryIds } });

      return { $or: clauses };
    }),
  };
}

async function buildFilter(query, { admin }) {
  const filter = {};

  // Only admins may see hidden (inactive) products
  if (!(admin && query.includeInactive)) filter.isActive = true;

  if (query.category) {
    const categories = await resolveByIdOrSlug(Category, query.category, 'Category');
    const ids = categories.map((category) => category._id);
    // Filtering by a parent category also includes its sub-categories
    const children = await Category.find({ parent: { $in: ids } }).select('_id');
    filter.category = { $in: [...ids, ...children.map((child) => child._id)] };
  }

  if (query.brand) {
    const brands = await resolveByIdOrSlug(Brand, query.brand, 'Brand');
    filter.brand = { $in: brands.map((brand) => brand._id) };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.finalPrice = {};
    if (query.minPrice !== undefined) filter.finalPrice.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.finalPrice.$lte = query.maxPrice;
  }

  if (query.rating !== undefined) filter.ratingAvg = { $gte: query.rating };
  if (query.minDiscount !== undefined) filter.discountPercent = { $gte: query.minDiscount };
  if (query.inStock !== undefined) filter.inStock = query.inStock;

  const tokens = tokenize(query.q);
  if (tokens.length > 0) Object.assign(filter, await buildSearchFilter(tokens));

  return filter;
}

export async function listProducts(query, { admin = false } = {}) {
  const filter = await buildFilter(query, { admin });
  const { page, limit, skip } = getPagination(query);

  // Searches default to the most popular matches, plain listings to the newest products
  const sortKey = query.sort ?? (query.q ? 'popular' : 'newest');

  const [products, total] = await Promise.all([
    Product.find(filter).sort(PRODUCT_SORTS[sortKey]).skip(skip).limit(limit).populate(POPULATE),
    Product.countDocuments(filter),
  ]);

  return { products, meta: buildPaginationMeta({ total, page, limit }) };
}

export async function getProduct(identifier, { admin = false } = {}) {
  const filter = idOrSlugFilter(identifier);
  if (!admin) filter.isActive = true;

  const product = await Product.findOne(filter).populate(POPULATE);
  if (!product) throw ApiError.notFound('Product not found');

  return product;
}

async function assertReferencesExist({ category, brand }) {
  const [categoryExists, brandExists] = await Promise.all([
    category ? Category.exists({ _id: category }) : true,
    brand ? Brand.exists({ _id: brand }) : true,
  ]);

  const errors = [];
  if (!categoryExists) errors.push({ field: 'category', message: 'Category does not exist' });
  if (!brandExists) errors.push({ field: 'brand', message: 'Brand does not exist' });

  if (errors.length > 0) throw ApiError.badRequest('Validation failed', errors);
}

async function assertSkuAvailable(sku, excludeId) {
  const filter = { sku };
  if (excludeId) filter._id = { $ne: excludeId };

  if (await Product.exists(filter)) {
    throw ApiError.conflict(`A product with SKU "${sku}" already exists`);
  }
}

export async function createProduct(data) {
  await assertReferencesExist(data);
  await assertSkuAvailable(data.sku);

  const slug = await generateUniqueSlug(Product, slugify(data.name));
  const product = await Product.create({ ...data, slug });

  await product.populate(POPULATE);
  return product;
}

export async function updateProduct(id, data) {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  await assertReferencesExist(data);
  if (data.sku && data.sku !== product.sku) await assertSkuAvailable(data.sku, id);

  const { attributes, ...rest } = data;
  product.set(rest);

  // Attributes are merged, so sending { color: "black" } keeps the other attributes
  if (attributes) {
    product.attributes = { ...(product.attributes?.toObject() ?? {}), ...attributes };
  }

  // finalPrice and inStock are recalculated by the model before saving
  await product.save();
  await product.populate(POPULATE);
  return product;
}

export async function deleteProduct(id) {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw ApiError.notFound('Product not found');
}
