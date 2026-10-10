import { PRODUCT_MAX_TAGS } from '../../constants.js';
import { calculateFinalPrice } from '../../utils/pricing.js';
import { slugify } from '../../utils/slugify.js';
import { categoryData } from './categories.data.js';
import { loadImageAssignments } from './imageManifest.js';
import { productLines } from './products.data.js';

const DEFAULT_DISCOUNTS = [0, 5, 10, 10, 15, 20, 25, 30, 40];
const LOW_STOCK_THRESHOLD = 5;

/** Small deterministic random generator (mulberry32) so every seed run produces the same catalog. */
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const compact = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0),
    ),
  );

/**
 * Builds the complete demo catalog in memory (no database access).
 * Returns { categories, brands, products }; products reference categories and brands by slug.
 */
export function buildCatalog() {
  const rand = createRandom(20261004);
  const imageAssignments = loadImageAssignments(); // SKU -> curated, relevance-matched image
  const randomInt = (min, max) => min + Math.floor(rand() * (max - min + 1));

  const categories = categoryData.map((category, index) => ({
    name: category.name,
    slug: slugify(category.name),
    description: category.description,
    image: `https://placehold.co/600x400/png?text=${encodeURIComponent(category.name)}`,
    sortOrder: index + 1,
    isActive: true,
  }));
  const prefixByCategory = new Map(categoryData.map((category) => [category.name, category.skuPrefix]));

  const brandCategories = new Map(); // brand name -> Set of category names
  const skuCounters = new Map();
  const usedSlugs = new Set();
  const products = [];

  for (const line of productLines) {
    const skuPrefix = prefixByCategory.get(line.category);
    if (!skuPrefix) throw new Error(`Product line "${line.type}" uses unknown category "${line.category}"`);

    line.items.forEach(([brand, productName, price, variant], index) => {
      const name = variant ? `${brand} ${productName} (${variant})` : `${brand} ${productName}`;

      // Unique slug
      const baseSlug = slugify(name);
      let slug = baseSlug;
      for (let n = 2; usedSlugs.has(slug); n += 1) slug = `${baseSlug}-${n}`;
      usedSlugs.add(slug);

      // Unique SKU: <CATEGORY>-<BRAND>-<NUMBER>
      const brandCode = slugify(brand).replace(/-/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
      const counterKey = `${skuPrefix}-${brandCode}`;
      const counter = (skuCounters.get(counterKey) ?? 0) + 1;
      skuCounters.set(counterKey, counter);
      const sku = `${counterKey}-${String(counter).padStart(3, '0')}`;

      const color = line.colors?.length ? line.colors[index % line.colors.length] : undefined;
      const discountPercent = line.discounts?.length
        ? line.discounts[randomInt(0, line.discounts.length - 1)]
        : DEFAULT_DISCOUNTS[randomInt(0, DEFAULT_DISCOUNTS.length - 1)];

      // ~6% out of stock, ~10% low stock, the rest well stocked
      const stockRoll = rand();
      let stock;
      if (stockRoll < 0.06) stock = 0;
      else if (stockRoll < 0.16) stock = randomInt(1, LOW_STOCK_THRESHOLD);
      else stock = randomInt(10, 250);

      // ~6% brand-new products without reviews
      let ratingAvg = 0;
      let ratingCount = 0;
      let soldCount = randomInt(0, 20);
      if (rand() >= 0.06) {
        ratingAvg = Math.round((3.4 + rand() * 1.5) * 10) / 10;
        ratingCount = 8 + Math.floor(rand() ** 2 * 4500);
        soldCount = Math.floor(ratingCount * (3 + rand() * 7));
      }

      const tags = [
        ...new Set(
          [
            ...line.tags,
            brand.toLowerCase(),
            line.category.toLowerCase(),
            color,
            ...(line.useCase ?? []).slice(0, 3),
          ]
            .filter(Boolean)
            .map((tag) => tag.toLowerCase())
            .filter((tag) => tag.length <= 40),
        ),
      ].slice(0, PRODUCT_MAX_TAGS);

      const description =
        `${name} from ${brand}. ${line.blurb} ` +
        `Key features: ${line.features.join(', ')}.` +
        (variant ? ` Variant: ${variant}.` : '');

      products.push({
        name,
        slug,
        description,
        categoryName: line.category,
        categorySlug: slugify(line.category),
        brandName: brand,
        brandSlug: slugify(brand),
        sku,
        price,
        discountPercent,
        finalPrice: calculateFinalPrice(price, discountPercent),
        stock,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
        inStock: stock > 0,
        // Never assign a generic category photo as if it represented a specific product.
        // Curated type-matched manifest entries are applied separately; the UI supplies a category fallback.
        images: imageAssignments.has(sku) ? [imageAssignments.get(sku).image] : [],
        tags,
        attributes: compact({
          color,
          variant,
          sizes: line.sizes,
          material: line.material,
          gender: line.gender,
          useCase: line.useCase,
        }),
        ratingAvg,
        ratingCount,
        soldCount,
        isActive: true,
      });

      if (!brandCategories.has(brand)) brandCategories.set(brand, new Set());
      brandCategories.get(brand).add(line.category);
    });
  }

  const brands = [...brandCategories.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, categoryNames]) => ({
      name,
      slug: slugify(name),
      description: `Shop ${name} products in ${[...categoryNames].join(', ')} on SearchIQ.`,
      logo: `https://placehold.co/200x200/png?text=${encodeURIComponent(name)}`,
      isActive: true,
    }));

  return { categories, brands, products };
}
