import { connectMongo, disconnectMongo } from '../config/db.js';
import logger, { closeLogger } from '../config/logger.js';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { buildCatalog } from './data/catalog.builder.js';

// node src/seed/catalog.seed.js          -> add/update the demo catalog (safe to run many times)
// node src/seed/catalog.seed.js --reset  -> first delete ALL products, brands and categories
const RESET = process.argv.includes('--reset');

async function seedCatalog() {
  const catalog = buildCatalog();

  await connectMongo();
  await Promise.all([Category.init(), Brand.init(), Product.init()]);

  if (RESET) {
    await Promise.all([Product.deleteMany({}), Brand.deleteMany({}), Category.deleteMany({})]);
    logger.warn('--reset: all existing products, brands and categories were deleted');
  }

  // 1. Categories and brands (matched by slug, so re-running never creates duplicates)
  await Category.bulkWrite(
    catalog.categories.map(({ slug, ...fields }) => ({
      updateOne: { filter: { slug }, update: { $set: fields }, upsert: true },
    })),
  );
  await Brand.bulkWrite(
    catalog.brands.map(({ slug, ...fields }) => ({
      updateOne: { filter: { slug }, update: { $set: fields }, upsert: true },
    })),
  );

  const [categoryDocs, brandDocs] = await Promise.all([
    Category.find({ slug: { $in: catalog.categories.map((c) => c.slug) } }).select('slug name'),
    Brand.find({ slug: { $in: catalog.brands.map((b) => b.slug) } }).select('slug'),
  ]);
  const categoryIds = new Map(categoryDocs.map((doc) => [doc.slug, doc._id]));
  const brandIds = new Map(brandDocs.map((doc) => [doc.slug, doc._id]));

  // 2. Products: replace names with ids and validate every product against the schema first
  const productDocs = catalog.products.map(
    ({ categoryName, categorySlug, brandName, brandSlug, ...product }) => ({
      ...product,
      category: categoryIds.get(categorySlug),
      brand: brandIds.get(brandSlug),
    }),
  );

  const problems = [];
  for (const doc of productDocs) {
    const error = new Product(doc).validateSync();
    if (error) problems.push(`${doc.sku}: ${error.message}`);
  }
  if (problems.length > 0) {
    throw new Error(`Seed data failed validation:\n  ${problems.slice(0, 10).join('\n  ')}`);
  }

  // 3. Upsert by SKU. Ratings and sales counters are only set on first insert, so
  //    re-running the seed never overwrites maintained ratings or manually synced images.
  const result = await Product.bulkWrite(
    productDocs.map(({ sku, slug, ratingAvg, ratingCount, soldCount, images, ...fields }) => ({
      updateOne: {
        filter: { sku },
        update: {
          $set: fields,
          $setOnInsert: { slug, ratingAvg, ratingCount, soldCount, images },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  logger.info(
    `Catalog seeded: ${catalog.categories.length} categories, ${catalog.brands.length} brands, ` +
      `${productDocs.length} products (${result.upsertedCount} created, ${result.modifiedCount} updated)`,
  );

  const perCategory = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  const nameById = new Map(categoryDocs.map((doc) => [String(doc._id), doc.name]));
  perCategory
    .sort((a, b) => b.count - a.count)
    .forEach((row) => logger.info(`  ${nameById.get(String(row._id)) ?? row._id}: ${row.count} products`));

  logger.info(`Total products in database: ${await Product.countDocuments()}`);
}

let exitCode = 0;

try {
  await seedCatalog();
} catch (err) {
  exitCode = 1;
  logger.error(`Catalog seed failed: ${err.message}`);
} finally {
  await disconnectMongo();
  await closeLogger();
  process.exit(exitCode);
}
