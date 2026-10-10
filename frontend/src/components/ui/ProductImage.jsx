import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

const CATEGORY_ICONS = {
  grocery: 'package',
  clothing: 'tag',
  footwear: 'box',
  electronics: 'bolt',
  beauty: 'sparkles',
  'home-and-kitchen': 'home',
  'sports-and-fitness': 'trendUp',
  'stationery-and-office': 'layers',
  'toys-and-games': 'star',
  'bags-and-luggage': 'package',
};

// Only real http(s) image URLs are rendered; anything else (missing, malformed, javascript:) shows the fallback tile.
const isUsableUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
};

/**
 * Product photo with a branded fallback tile when the URL is missing, malformed or fails to load.
 * Keeps its box size while loading (no layout jump) and fades in once the image arrives.
 * `eager` skips lazy loading for above-the-fold images such as the product gallery's main photo.
 */
export default function ProductImage({ src, alt = '', className = '', fit = 'cover', label, category, eager = false }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
  const url = isUsableUrl(src) ? src.trim() : '';
  const categoryName = typeof category === 'string' ? category : category?.name;
  const categorySlug = typeof category === 'object' ? category?.slug : '';

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [url]);

  // An image can finish (or fail) before React attaches its handlers, e.g. when served from cache.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) setLoaded(true);
    else setFailed(true);
  }, [url]);

  if (!url || failed) {
    const initials = (label || alt || 'S').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    return (
      <div role="img" aria-label={alt || label || 'Product image unavailable'} className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink-100 to-brand-50 px-3 text-center ${className}`}>
        {categoryName
          ? <Icon name={CATEGORY_ICONS[categorySlug] || 'grid'} className="h-9 w-9 text-brand-500" />
          : <span className="text-2xl font-bold tracking-tight text-ink-400">{initials}</span>}
        {categoryName && <span className="text-xs font-medium text-ink-500">{categoryName}</span>}
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      key={url}
      src={url}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`${fit === 'contain' ? 'object-contain' : 'object-cover'} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}
