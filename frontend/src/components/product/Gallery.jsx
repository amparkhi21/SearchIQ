import { useEffect, useState } from 'react';
import ProductImage from '../ui/ProductImage';
import Icon from '../ui/Icon';
import UnsplashAttribution from '../ui/UnsplashAttribution';

export default function Gallery({ images = [], name, category }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [images.length, name]);
  const list = images.length ? images : [{ url: '', alt: name }];
  const current = list[Math.min(index, list.length - 1)];
  const go = (d) => setIndex((i) => (i + d + list.length) % list.length);
  const arrow = 'absolute top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-800 opacity-0 shadow ring-1 ring-ink-100 transition-opacity focus:opacity-100 group-hover:opacity-100';

  return (
    <div className="lg:sticky lg:top-24">
      <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
        <ProductImage key={current.url} src={current.url} alt={current.alt || name} label={name} category={category} fit="contain" eager className="h-full w-full" />
        <UnsplashAttribution image={current} className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] shadow-sm" />
        {list.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous image" className={`${arrow} left-3`}><Icon name="chevronLeft" className="h-4 w-4" /></button>
            <button type="button" onClick={() => go(1)} aria-label="Next image" className={`${arrow} right-3`}><Icon name="chevronRight" className="h-4 w-4" /></button>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Product images">
          {list.map((img, i) => (
            <button key={`${img.url}-${i}`} type="button" role="tab" aria-selected={i === index} aria-label={`Image ${i + 1}`} onClick={() => setIndex(i)}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-ink-50 transition-colors ${i === index ? 'border-brand-600' : 'border-transparent hover:border-ink-200'}`}>
              <ProductImage src={img.url} alt="" label={name} category={category} className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
