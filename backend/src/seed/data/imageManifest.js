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

/**
 * SKU -> { image, level, name } for every curated product.
 * Hand-verified overrides ("exact") win over generated manifest entries ("type").
 */
export function loadImageAssignments() {
  const assignments = new Map();
  for (const [sku, entry] of Object.entries(readEntries(MANIFEST_PATH))) {
    const image = entryToImage(entry);
    if (image) assignments.set(sku, { image, level: entry.level || 'type', name: entry.name });
  }
  for (const [sku, entry] of Object.entries(readEntries(OVERRIDES_PATH))) {
    const image = entryToImage(entry);
    if (image) assignments.set(sku, { image, level: 'exact', name: entry.name });
  }
  return assignments;
}
