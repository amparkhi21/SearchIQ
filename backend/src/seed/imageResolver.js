/**
 * Automatic stock-photo matching is intentionally disabled. A reachable and
 * product-type-relevant Unsplash image is still not an exact product packshot.
 * Keep this API as an offline inventory helper so the existing image command
 * can report SKUs that need a verified override without writing guesses.
 */
export function unresolvedExactImages(products, records = new Map()) {
  return products.filter((product) => {
    const record = records.get(product.sku);
    return !record || record.verified !== true || record.level !== 'exact';
  });
}

export async function resolveImages({ products, manifest }) {
  const records = new Map(Object.entries(manifest?.entries ?? {}));
  return {
    resolved: 0,
    unresolved: unresolvedExactImages(products, records),
    stoppedEarly: 'Automatic stock-photo matching is disabled; add a manually verified exact image override by SKU.',
  };
}
