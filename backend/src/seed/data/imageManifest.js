import { readFileSync } from 'node:fs';

export const MANIFEST_PATH = new URL('./product-images.manifest.json', import.meta.url);
export const OVERRIDES_PATH = new URL('./product-images.overrides.json', import.meta.url);

function readEntries(fileUrl) {
  try {
    const parsed = JSON.parse(readFileSync(fileUrl, 'utf8'));
    return parsed && typeof parsed.entries === 'object' && parsed.entries ? parsed.entries : {};
  } catch {
    return {}; // a missing or unreadable file simply means "no curated images yet"
  }
}

export function loadImageRecords() {
  const manifest = readEntries(MANIFEST_PATH);
  const overrides = readEntries(OVERRIDES_PATH);
  return new Map([
    ...Object.entries(manifest).map(([sku, entry]) => [sku, { ...entry, recordSource: 'manifest' }]),
    ...Object.entries(overrides).map(([sku, entry]) => [sku, { ...entry, recordSource: 'override' }]),
  ]);
}

/** Converts a manifest/override entry into the shape stored in Product.images. */
export function entryToImage(entry) {
  if (!entry || typeof entry.url !== 'string' || !/^https?:\/\//i.test(entry.url) || entry.url.length > 500) {
    return null;
  }
  const image = { url: entry.url, alt: String(entry.alt || '').slice(0, 200) || undefined };
  if (entry.photographerName) image.photographerName = String(entry.photographerName).slice(0, 100);
  if (entry.photographerUrl) image.photographerUrl = String(entry.photographerUrl).slice(0, 500);
  if (entry.photoUrl) image.photoUrl = String(entry.photoUrl).slice(0, 500);
  return image;
}

function isVerifiedExactRecord(entry) {
  return entry?.verified === true
    && Boolean(String(entry.name ?? '').trim())
    && Boolean(String(entry.source ?? '').trim())
    && (entry.recordSource === 'override' || entry.level === 'exact');
}

/**
 * Only explicitly verified exact-product packshots are eligible to reach a
 * catalog record. Type/category search results are retained for audit only.
 */
export function loadImageAssignments() {
  const assignments = new Map();
  for (const [sku, entry] of loadImageRecords()) {
    if (!isVerifiedExactRecord(entry)) continue;
    const image = entryToImage(entry);
    if (image) assignments.set(sku, { image, level: 'exact', name: entry.name, verified: true });
  }
  return assignments;
}

export function loadUnverifiedImageUrls() {
  const urls = new Set();
  for (const [sku, entry] of loadImageRecords()) {
    if (isVerifiedExactRecord(entry)) continue;
    const image = entryToImage(entry);
    if (image) urls.add(image.url);
  }
  return urls;
}
