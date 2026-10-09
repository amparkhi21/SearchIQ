import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify } from '../utils/slugify.js';
import { idOrSlugFilter } from './lookup.service.js';

/** Map of categoryId -> number of visible products. */
async function countProductsByCategory() {
  const rows = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

const withCount = (category, counts) => ({
  ...category.toJSON(),
  productCount: counts.get(category.id) ?? 0,
});

/** A category may not be its own parent or sit below one of its own descendants. */
async function assertValidParent(categoryId, parentId) {
  if (categoryId && String(parentId) === String(categoryId)) {
    throw ApiError.badRequest('A category cannot be its own parent');
  }

  let current = await Category.findById(parentId).select('parent');
  if (!current) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'parent', message: 'Parent category does not exist' },
    ]);
  }

  for (let depth = 0; depth < 10 && current?.parent; depth += 1) {
    if (categoryId && String(current.parent) === String(categoryId)) {
      throw ApiError.badRequest('A category cannot be moved below one of its own sub-categories');
    }
    current = await Category.findById(current.parent).select('parent');
  }
}

export async function listCategories({ includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { isActive: true };

  const [categories, counts] = await Promise.all([
    Category.find(filter).sort({ sortOrder: 1, name: 1 }),
    countProductsByCategory(),
  ]);

  return categories.map((category) => withCount(category, counts));
}

export async function getCategory(identifier, { includeInactive = false } = {}) {
  const filter = idOrSlugFilter(identifier);
  if (!includeInactive) filter.isActive = true;

  const category = await Category.findOne(filter);
  if (!category) throw ApiError.notFound('Category not found');

  const [counts, children] = await Promise.all([
    countProductsByCategory(),
    Category.find({ parent: category._id, ...(includeInactive ? {} : { isActive: true }) })
      .sort({ sortOrder: 1, name: 1 })
      .select('name slug'),
  ]);

  return { ...withCount(category, counts), children: children.map((child) => child.toJSON()) };
}

export async function createCategory(data) {
  const slug = slugify(data.name);
  if (!slug) throw ApiError.badRequest('Category name must contain letters or numbers');

  if (await Category.exists({ slug })) {
    throw ApiError.conflict('A category with this name already exists');
  }
  if (data.parent) await assertValidParent(null, data.parent);

  return Category.create({ ...data, slug });
}

export async function updateCategory(id, data) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Category not found');

  const { parent, ...rest } = data;

  if (rest.name !== undefined && rest.name !== category.name) {
    const slug = slugify(rest.name);
    if (!slug) throw ApiError.badRequest('Category name must contain letters or numbers');
    if (slug !== category.slug && (await Category.exists({ slug, _id: { $ne: id } }))) {
      throw ApiError.conflict('A category with this name already exists');
    }
    category.slug = slug;
  }

  if (parent !== undefined) {
    if (parent) await assertValidParent(id, parent);
    category.parent = parent; // null makes it a top-level category
  }

  category.set(rest);
  await category.save();
  return category;
}

export async function deleteCategory(id) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Category not found');

  const [productCount, childCount] = await Promise.all([
    Product.countDocuments({ category: id }),
    Category.countDocuments({ parent: id }),
  ]);

  if (productCount > 0) {
    throw ApiError.conflict(
      `Cannot delete this category: ${productCount} product(s) still use it. Move or delete them first.`,
    );
  }
  if (childCount > 0) {
    throw ApiError.conflict(
      `Cannot delete this category: it has ${childCount} sub-categor${childCount === 1 ? 'y' : 'ies'}.`,
    );
  }

  await category.deleteOne();
}

