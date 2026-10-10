import { useEffect, useRef, useState } from 'react';

// Only real http(s) image URLs are rendered; anything else (missing, malformed, javascript:) shows the fallback tile.
const isUsableUrl = (value) => typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim());

/**
 * Product photo with a branded fallback tile when the URL is missing, malformed or fails to load.
 * Keeps its box size while loading (no layout jump) and fades in once the image arrives.
 * `eager` skips lazy loading for above-the-fold images such as the product gallery's main photo.
 */
export default function ProductImage({ src, alt = '', className = '', fit = 'cover', label, eager = false }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
  const url = isUsableUrl(src) ? src.trim() : '';

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
      <div role="img" aria-label={alt || label || 'Product image unavailable'} className={`flex items-center justify-center bg-gradient-to-br from-ink-100 to-brand-50 ${className}`}>
        <span className="text-2xl font-bold tracking-tight text-ink-400">{initials}</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
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
