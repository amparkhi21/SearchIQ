import Brand from '../models/Brand.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify } from '../utils/slugify.js';
import { idOrSlugFilter } from './lookup.service.js';

/** Map of brandId -> number of visible products. */
async function countProductsByBrand() {
  const rows = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

const withCount = (brand, counts) => ({
  ...brand.toJSON(),
  productCount: counts.get(brand.id) ?? 0,
});

export async function listBrands({ includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { isActive: true };

  const [brands, counts] = await Promise.all([
    Brand.find(filter).sort({ name: 1 }),
    countProductsByBrand(),
  ]);

  return brands.map((brand) => withCount(brand, counts));
}

export async function getBrand(identifier, { includeInactive = false } = {}) {
  const filter = idOrSlugFilter(identifier);
  if (!includeInactive) filter.isActive = true;

  const brand = await Brand.findOne(filter);
  if (!brand) throw ApiError.notFound('Brand not found');

  return withCount(brand, await countProductsByBrand());
}

export async function createBrand(data) {
  const slug = slugify(data.name);
  if (!slug) throw ApiError.badRequest('Brand name must contain letters or numbers');

  if (await Brand.exists({ slug })) {
    throw ApiError.conflict('A brand with this name already exists');
  }

  return Brand.create({ ...data, slug });
}

export async function updateBrand(id, data) {
  const brand = await Brand.findById(id);
  if (!brand) throw ApiError.notFound('Brand not found');

  if (data.name !== undefined && data.name !== brand.name) {
    const slug = slugify(data.name);
    if (!slug) throw ApiError.badRequest('Brand name must contain letters or numbers');
    if (slug !== brand.slug && (await Brand.exists({ slug, _id: { $ne: id } }))) {
      throw ApiError.conflict('A brand with this name already exists');
    }
    brand.slug = slug;
  }

  brand.set(data);
  await brand.save();
  return brand;
}

export async function deleteBrand(id) {
  const brand = await Brand.findById(id);
  if (!brand) throw ApiError.notFound('Brand not found');

  const productCount = await Product.countDocuments({ brand: id });
  if (productCount > 0) {
    throw ApiError.conflict(
      `Cannot delete this brand: ${productCount} product(s) still use it. Move or delete them first.`,
    );
  }

  await brand.deleteOne();
}
