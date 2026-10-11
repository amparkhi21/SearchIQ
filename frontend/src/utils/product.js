/** Helpers for reading product objects that come from either Mongo (catalog) or OpenSearch (search). */
export const productId = (p) => p?.id || p?._id || '';
export const productPath = (p) => `/products/${p?.slug || productId(p)}`;
const configuredApiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api/v1';
const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
const imageBaseUrl = (() => {
  try { return new URL(configuredApiUrl, appOrigin).origin; }
  catch { return appOrigin; }
})();

export const normalizeProductImageUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const raw = value.trim();
    const absolute = /^https?:\/\//i.test(raw);
    const protocolRelative = raw.startsWith('//');
    const rootedRelative = raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../');
    if (!absolute && !protocolRelative && !rootedRelative) return '';
    const url = new URL(raw, imageBaseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return '';
    // Relative product assets are served by the backend alongside the API.
    if (!absolute && !protocolRelative) {
      return new URL(raw.replace(/^\/?/, '/'), imageBaseUrl).toString();
    }
    return url.toString();
  } catch {
    return '';
  }
};
export const isUsableImageUrl = (value) => Boolean(normalizeProductImageUrl(value));
export const shouldShowProductImageFallback = (src, failed = false) => !isUsableImageUrl(src) || failed;
const normalizeImageList = (source, productName) => source
    .map((image, index) => {
      if (typeof image === 'string') {
        return {
          url: normalizeProductImageUrl(image),
          alt: `${productName || 'Product'} image ${index + 1}`,
        };
      }

      if (image && typeof image === 'object' && typeof image.url === 'string') {
        return {
          ...image,
          url: normalizeProductImageUrl(image.url),
          alt: image.alt || productName || 'Product image',
        };
      }

      return null;
    })
    .filter((image) => image?.url);
export const productImages = (p) => {
  const fromArray = normalizeImageList(Array.isArray(p?.images) ? p.images : [], p?.name);
  if (fromArray.length) return fromArray;
  return normalizeImageList([p?.imageUrl || p?.image || p?.thumbnail].filter(Boolean), p?.name);
};
export const hasDiscount = (p) => Number(p?.discountPercent) > 0 && Number(p?.finalPrice) < Number(p?.price);
export const currentPrice = (p) => Number(p?.finalPrice ?? p?.price ?? 0);
export const stockState = (p) => {
  if (!p) return 'unknown';
  if (p.inStock === false || Number(p.stock) <= 0) return 'out';
  if (p.stockStatus === 'low_stock' || (p.stock != null && Number(p.stock) <= Number(p.lowStockThreshold ?? 5))) return 'low';
  return 'in';
};
