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

const placeholder = (text, background, foreground) =>
  `https://placehold.co/800x800/${background}/${foreground}/png?text=${encodeURIComponent(text)}`;

const PRODUCT_PHOTO_POOLS = [
  {
    pattern: /footwear|shoe|sneaker|sandal|slipper/i,
    urls: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    pattern: /clothing|apparel|fashion|shirt|jeans/i,
    urls: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    pattern: /grocery|food|pantry|snack|staple|beverage/i,
    urls: [
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    pattern: /electronic|mobile|phone|laptop|computer|audio|camera|gaming/i,
    urls: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    pattern: /beauty|cosmetic|skincare|skin care|personal care|makeup/i,
    urls: [
      'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    pattern: /home|kitchen|furniture|decor|appliance/i,
    urls: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    pattern: /sport|fitness|gym|outdoor/i,
    urls: [
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    pattern: /book|stationery|education/i,
    urls: [
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    ],
  },
];

/**
 * Last-resort, category-level photo. Only used when a product has no curated entry in
 * product-images.manifest.json / product-images.overrides.json (see `npm run images:resolve`).
 * One image only: showing the same generic photo twice in a gallery adds nothing.
 */
function getFallbackImages(category, name, sequence) {
  const pool = PRODUCT_PHOTO_POOLS.find(({ pattern }) => pattern.test(category || ''))?.urls;
  // No category photo we trust (e.g. Toys, Bags): store none, so the UI shows its fallback tile
  // instead of an unrelated picture.
  if (!pool) return [];

  return [{ url: pool[sequence % pool.length], alt: `${name} - general ${category} photo` }];
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
  const imageSequences = new Map();
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

      const imageLabel = `${brand} ${line.type}`;
      const imageSequence = imageSequences.get(line.category) ?? 0;
      imageSequences.set(line.category, imageSequence + 1);

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
        images: imageAssignments.has(sku)
          ? [imageAssignments.get(sku).image]
          : getFallbackImages(line.category, name, imageSequence),
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
