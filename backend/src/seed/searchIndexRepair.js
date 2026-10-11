/**
 * Plans deletion only for duplicate index records proven to describe the same
 * current Mongo product and SKU. A canonical `_id === productId` must exist,
 * and every duplicate must match current product identity fields. Historical
 * generated IDs are then safe to remove; ambiguous records are preserved.
 */
export function planDuplicateIndexCleanup(indexHits, mongoProducts) {
  const productsBySku = new Map();
  const duplicateMongoSkus = new Set();
  for (const product of mongoProducts) {
    const sku = String(product.sku ?? '').trim().toUpperCase();
    if (productsBySku.has(sku)) duplicateMongoSkus.add(sku);
    else productsBySku.set(sku, product);
  }
  const hitsBySku = new Map();
  for (const hit of indexHits) {
    const sku = String(hit?._source?.sku ?? '').trim().toUpperCase();
    if (!sku) continue;
    if (!hitsBySku.has(sku)) hitsBySku.set(sku, []);
    hitsBySku.get(sku).push(hit);
  }

  const deletions = [];
  const ambiguous = [];
  for (const [sku, hits] of hitsBySku) {
    if (hits.length < 2) continue;
    const product = productsBySku.get(sku);
    if (!product || duplicateMongoSkus.has(sku)) {
      ambiguous.push({ sku, reason: duplicateMongoSkus.has(sku) ? 'SKU is not unique in MongoDB' : 'SKU is not present in MongoDB', documentIds: hits.map((hit) => hit._id) });
      continue;
    }
    const productId = String(product._id);
    const expected = {
      name: String(product.name ?? '').trim(),
      brandName: String(product.brandName ?? product.brand?.name ?? '').trim(),
      categorySlug: String(product.categorySlug ?? product.category?.slug ?? '').trim(),
    };
    const matchesIdentity = (hit) => {
      const source = hit?._source ?? {};
      const actual = {
        name: String(source.name ?? '').trim(),
        brandName: String(source.brandName ?? '').trim(),
        categorySlug: String(source.categorySlug ?? '').trim(),
      };
      return String(source.sku ?? '').trim().toUpperCase() === sku
        && actual.name === expected.name
        && actual.brandName === expected.brandName
        && actual.categorySlug === expected.categorySlug;
    };
    const canonical = hits.find((hit) => String(hit._id) === productId);
    if (!canonical
      || String(canonical?._source?.productId ?? '') !== productId
      || !matchesIdentity(canonical)
      || hits.some((hit) => !matchesIdentity(hit) || String(hit?._source?.productId ?? '') !== String(hit?._id ?? ''))) {
      ambiguous.push({ sku, reason: 'duplicate records cannot be proven to match the current Mongo product', documentIds: hits.map((hit) => hit._id) });
      continue;
    }
    deletions.push(...hits.filter((hit) => hit !== canonical));
  }
  return { deletions, ambiguous };
}
