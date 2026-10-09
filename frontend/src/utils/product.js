/** Helpers for reading product objects that come from either Mongo (catalog) or OpenSearch (search). */
export const productId = (p) => p?.id || p?._id || '';
export const productPath = (p) => `/products/${p?.slug || productId(p)}`;
export const productImages = (p) => {
  const source = Array.isArray(p?.images)
    ? p.images
    : [p?.imageUrl || p?.image || p?.thumbnail].filter(Boolean);

  return source
    .map((image, index) => {
      if (typeof image === 'string') {
        return {
          url: image,
          alt: `${p?.name || 'Product'} image ${index + 1}`,
        };
      }

      if (image && typeof image === 'object' && typeof image.url === 'string') {
        return {
          ...image,
          alt: image.alt || p?.name || 'Product image',
        };
      }

      return null;
    })
    .filter(Boolean);
};
export const hasDiscount = (p) => Number(p?.discountPercent) > 0 && Number(p?.finalPrice) < Number(p?.price);
export const currentPrice = (p) => Number(p?.finalPrice ?? p?.price ?? 0);
export const stockState = (p) => {
  if (!p) return 'unknown';
  if (p.inStock === false || Number(p.stock) <= 0) return 'out';
  if (p.stockStatus === 'low_stock' || (p.stock != null && Number(p.stock) <= Number(p.lowStockThreshold ?? 5))) return 'low';
  return 'in';
};
