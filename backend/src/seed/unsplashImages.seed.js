import { connectMongo, disconnectMongo } from '../config/db.js';
import { env } from '../config/env.js';
import logger, { closeLogger } from '../config/logger.js';
import Product from '../models/Product.js';
import { buildCatalog } from './data/catalog.builder.js';
import { productLines } from './data/products.data.js';

const UNSPLASH_API = 'https://api.unsplash.com';
const API_PER_PAGE = 30;

async function searchPhotos(query, remainingSearchRequests) {
  const url = new URL(`${UNSPLASH_API}/search/photos`);
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(API_PER_PAGE));

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${env.unsplash.accessKey}`,
      'Accept-Version': 'v1',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Unsplash photo search failed (${response.status}) for "${query}"`);
  }

  const remainingHeader = response.headers.get('x-ratelimit-remaining');
  const remaining = remainingHeader === null ? null : Number(remainingHeader);
  if (remaining !== null && Number.isFinite(remaining) && remaining < remainingSearchRequests) {
    throw new Error(
      `Unsplash rate limit is too low to complete safely (${remaining} requests remaining; ${remainingSearchRequests} more needed)`,
    );
  }

  const body = await response.json();
  return Array.isArray(body.results) ? body.results : [];
}

async function syncUnsplashImages() {
  if (!env.unsplash.accessKey) {
    throw new Error('Set UNSPLASH_ACCESS_KEY in backend/.env before syncing product images');
  }

  const catalog = buildCatalog();
  const skus = catalog.products.map((product) => product.sku);
  await connectMongo();

  const existingCount = await Product.countDocuments({ sku: { $in: skus } });
  if (existingCount !== skus.length) {
    throw new Error(
      `Expected ${skus.length} seeded products in MongoDB, found ${existingCount}. Run "npm run seed:catalog" first.`,
    );
  }

  const operations = [];
  const usedPhotoIds = new Set();
  let offset = 0;

  for (const [lineIndex, line] of productLines.entries()) {
    const products = catalog.products.slice(offset, offset + line.items.length);
    offset += line.items.length;

    const photos = await searchPhotos(
      `${line.type} ${line.category}`,
      productLines.length - lineIndex - 1,
    );
    const availablePhotos = photos.filter((photo) => photo?.id && !usedPhotoIds.has(photo.id));
    if (availablePhotos.length < products.length) {
      throw new Error(
        `Unsplash returned only ${availablePhotos.length} unique photos for "${line.type}"; need ${products.length}. No database changes were made.`,
      );
    }

    for (const [index, product] of products.entries()) {
      const photo = availablePhotos[index];
      usedPhotoIds.add(photo.id);
      const image = {
        url: photo.urls?.regular,
        alt: `${product.name} - photo by ${photo.user?.name || 'Unsplash contributor'}`.slice(0, 200),
        photographerName: photo.user?.name,
        photographerUrl: photo.user?.links?.html
          ? `${photo.user.links.html}?utm_source=searchiq&utm_medium=referral`
          : undefined,
        photoUrl: photo.links?.html
          ? `${photo.links.html}?utm_source=searchiq&utm_medium=referral`
          : undefined,
      };

      if (!image.url || !image.photographerName || !image.photographerUrl || !image.photoUrl) {
        throw new Error(`Unsplash returned incomplete attribution data for "${product.name}". No database changes were made.`);
      }

      operations.push({
        updateOne: {
          filter: { sku: product.sku },
          update: { $set: { images: [image] } },
        },
      });
    }
  }

  const result = await Product.bulkWrite(operations, { ordered: true });
  if (result.matchedCount !== operations.length) {
    throw new Error(`Updated ${result.matchedCount} of ${operations.length} products; expected all seeded products.`);
  }

  logger.info(`Saved unique Unsplash images for ${result.matchedCount} products`);
}

let exitCode = 0;

try {
  await syncUnsplashImages();
} catch (error) {
  logger.error(`Unsplash image sync failed: ${error.message}`);
  exitCode = 1;
} finally {
  await Promise.allSettled([disconnectMongo(), closeLogger()]);
  process.exitCode = exitCode;
}
