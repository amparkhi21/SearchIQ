import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MANIFEST_PATH } from './data/imageManifest.js';
import { buildImageUrl, deriveImageQuery, rankPhotos } from './data/imageMatching.js';

export function loadManifest() {
  try {
    const parsed = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    return { ...parsed, entries: parsed.entries ?? {} };
  } catch {
    return { version: 1, generatedAt: null, entries: {} };
  }
}

export function saveManifest(manifest) {
  const target = fileURLToPath(MANIFEST_PATH);
  const temp = `${target}.tmp`;
  writeFileSync(temp, `${JSON.stringify({ ...manifest, generatedAt: new Date().toISOString() }, null, 2)}\n`);
  renameSync(temp, target); // atomic: an interrupted run never leaves a half-written manifest
}

/** True only when the URL answers 2xx with an image/* content type. */
export async function verifyImageUrl(url, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
    return response.ok && (response.headers.get('content-type') || '').startsWith('image/');
  } catch {
    return false;
  }
}

/** Thrown when the API budget is used up; progress made so far is kept. */
export class BudgetExhausted extends Error {}

/**
 * Resolves one photo per product. Deterministic: products are processed in catalog order,
 * candidates are ranked by relevance (ties by photo id) and no photo is used twice.
 * Already-resolved SKUs are skipped, so the command can be re-run after a rate limit.
 *
 * products: [{ sku, name, line }]   searchPhotos(query, page) -> photos[]   verify(url) -> boolean
 */
export async function resolveImages({ products, manifest, searchPhotos, verify, force = false, onGroup = () => {} }) {
  const used = new Set(Object.values(manifest.entries).map((entry) => entry.photoId));
  const groups = new Map();

  for (const product of products) {
    if (!force && manifest.entries[product.sku]) continue;
    const derived = deriveImageQuery(product.name, product.line, { color: product.color });
    if (!groups.has(derived.query)) groups.set(derived.query, { derived, items: [] });
    groups.get(derived.query).items.push(product);
  }

  const unresolved = [];
  const finished = new Set();
  let resolved = 0;

  for (const [query, { derived, items }] of groups) {
    const pending = [...items];
    for (let page = 1; page <= 2 && pending.length > 0; page += 1) {
      let photos;
      try {
        photos = await searchPhotos(query, page);
      } catch (error) {
        if (error instanceof BudgetExhausted) {
          unresolved.push(...pending);
          for (const [otherQuery, rest] of groups) if (!finished.has(otherQuery) && otherQuery !== query) unresolved.push(...rest.items);
          return { resolved, unresolved: dedupeBySku(unresolved), stoppedEarly: error.message };
        }
        throw error;
      }

      const ranked = rankPhotos(photos, derived, (photo) => !used.has(photo.id));
      for (const { photo, score } of ranked) {
        if (pending.length === 0) break;
        const url = buildImageUrl(photo.urls.raw);
        if (url.length > 500 || !(await verify(url))) continue;

        const product = pending.shift();
        used.add(photo.id);
        manifest.entries[product.sku] = {
          sku: product.sku,
          name: product.name,
          level: derived.level,
          query,
          score,
          photoId: photo.id,
          url,
          alt: `${product.name} - illustrative ${query} photo`.slice(0, 200),
          photographerName: photo.user?.name,
          photographerUrl: photo.user?.links?.html
            ? `${photo.user.links.html}?utm_source=searchiq&utm_medium=referral`
            : undefined,
          photoUrl: photo.links?.html ? `${photo.links.html}?utm_source=searchiq&utm_medium=referral` : undefined,
          source: 'unsplash',
          verifiedAt: new Date().toISOString(),
        };
        resolved += 1;
      }
    }
    unresolved.push(...pending);
    finished.add(query);
    onGroup({ query, resolved, remaining: pending.length });
  }

  return { resolved, unresolved: dedupeBySku(unresolved), stoppedEarly: null };
}

const dedupeBySku = (items) => [...new Map(items.map((item) => [item.sku, item])).values()];
