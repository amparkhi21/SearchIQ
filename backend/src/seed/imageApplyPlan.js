/** Build image-only Mongo updates. Products without a verified exact mapping are preserved. */
export function planProductImageUpdates(products, assignments) {
  const bySku = new Map(products.map((product) => [product.sku, product]));
  const operations = [];
  const changedIds = [];
  const skipped = { missing: [], nameMismatch: [], unchanged: 0 };

  for (const [sku, { image, name }] of assignments) {
    const product = bySku.get(sku);
    if (!product) { skipped.missing.push(sku); continue; }
    if (name && name !== product.name) {
      skipped.nameMismatch.push(`${sku} (db "${product.name}" vs manifest "${name}")`);
      continue;
    }
    if (product.images?.length === 1 && product.images[0]?.url === image.url) {
      skipped.unchanged += 1;
      continue;
    }
    operations.push({ updateOne: { filter: { sku }, update: { $set: { images: [image] } } } });
    changedIds.push(String(product._id));
  }

  return {
    operations,
    changedIds,
    skipped,
    preservedCount: products.filter((product) => !assignments.has(product.sku)
      || skipped.nameMismatch.some((entry) => entry.startsWith(`${product.sku} `))).length,
  };
}
