import { useEffect, useState } from 'react';

/** Image with a branded fallback tile when the URL is missing or fails (e.g. offline placeholders). */
export default function ProductImage({ src, alt = '', className = '', fit = 'cover', label }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    const initials = (label || alt || 'S').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    return (
      <div role="img" aria-label={alt} className={`flex items-center justify-center bg-gradient-to-br from-ink-100 to-brand-50 ${className}`}>
        <span className="text-2xl font-bold tracking-tight text-ink-400">{initials}</span>
      </div>
    );
  }
  return (
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)}
      className={`${fit === 'contain' ? 'object-contain' : 'object-cover'} ${className}`} />
  );
}
