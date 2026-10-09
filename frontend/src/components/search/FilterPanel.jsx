import { useEffect, useMemo, useState } from 'react';
import Icon from '../ui/Icon';

const RATINGS = [4, 3, 2];

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-ink-100 py-4 first:pt-0 last:border-b-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-ink-900">
        {title}
        <Icon name="chevronDown" className={`h-4 w-4 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

function Check({ checked, onChange, children, count }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-sm text-ink-700 hover:bg-ink-50">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined && <span className="shrink-0 text-xs text-ink-400">{count}</span>}
    </label>
  );
}

/**
 * Filter controls. The URL is the source of truth: `filters` come from it and `onChange(patch)` writes back.
 * Price inputs are held locally and applied on blur / Enter / the Apply button.
 * Layout note: the price row is a 2-column grid with `min-w-0` inputs so "Max" can never overflow the panel.
 */
export default function FilterPanel({ filters, categories, brands, onChange, onClear, activeCount, hideTitle = false }) {
  const [minP, setMinP] = useState(filters.minPrice || '');
  const [maxP, setMaxP] = useState(filters.maxPrice || '');
  const [brandQuery, setBrandQuery] = useState('');

  useEffect(() => { setMinP(filters.minPrice || ''); setMaxP(filters.maxPrice || ''); }, [filters.minPrice, filters.maxPrice]);

  const selectedBrands = useMemo(() => (filters.brand ? filters.brand.split(',') : []), [filters.brand]);
  const visibleBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    const list = brands.filter((b) => !q || b.name.toLowerCase().includes(q));
    // Selected brands first, then the most stocked brands.
    return [...list].sort((a, b) => Number(selectedBrands.includes(b.slug)) - Number(selectedBrands.includes(a.slug)) || (b.productCount || 0) - (a.productCount || 0)).slice(0, q ? 40 : 12);
  }, [brands, brandQuery, selectedBrands]);

  const toggleBrand = (slug) => {
    const next = selectedBrands.includes(slug) ? selectedBrands.filter((s) => s !== slug) : [...selectedBrands, slug];
    onChange({ brand: next.join(',') });
  };

  const priceInvalid = minP !== '' && maxP !== '' && Number(minP) > Number(maxP);
  const applyPrice = () => {
    if (priceInvalid) return;
    onChange({ minPrice: minP === '' ? '' : String(Math.max(0, Number(minP))), maxPrice: maxP === '' ? '' : String(Math.max(0, Number(maxP))) });
  };
  const priceKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); applyPrice(); } };

  return (
    <div>
      <div className={`mb-3 flex items-center justify-between ${hideTitle ? 'justify-end' : ''}`}>
        {!hideTitle && <h2 className="text-base font-semibold">Filters</h2>}
        {activeCount > 0 && <button type="button" onClick={onClear} className="text-sm font-medium text-brand-600 hover:text-brand-700">Clear all</button>}
      </div>

      <Section title="Category">
        <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1 scrollbar-thin">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-sm text-ink-700 hover:bg-ink-50">
            <input type="radio" name="category" checked={!filters.category} onChange={() => onChange({ category: '' })} className="h-4 w-4 shrink-0 border-ink-300 text-brand-600 focus:ring-brand-500" />
            <span className="flex-1">All categories</span>
          </label>
          {categories.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-sm text-ink-700 hover:bg-ink-50">
              <input type="radio" name="category" checked={filters.category === c.slug} onChange={() => onChange({ category: c.slug })} className="h-4 w-4 shrink-0 border-ink-300 text-brand-600 focus:ring-brand-500" />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              {c.productCount !== undefined && <span className="shrink-0 text-xs text-ink-400">{c.productCount}</span>}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Price (₹)">
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <label htmlFor="f-min" className="mb-1 block text-xs text-ink-500">Min ₹</label>
            <input id="f-min" type="number" inputMode="numeric" min="0" placeholder="0" value={minP}
              onChange={(e) => setMinP(e.target.value)} onBlur={applyPrice} onKeyDown={priceKey}
              className={`input ${priceInvalid ? 'input-error' : ''}`} />
          </div>
          <div className="min-w-0">
            <label htmlFor="f-max" className="mb-1 block text-xs text-ink-500">Max ₹</label>
            <input id="f-max" type="number" inputMode="numeric" min="0" placeholder="Any" value={maxP}
              onChange={(e) => setMaxP(e.target.value)} onBlur={applyPrice} onKeyDown={priceKey}
              className={`input ${priceInvalid ? 'input-error' : ''}`} />
          </div>
        </div>
        {priceInvalid && <p className="field-error">Min price can’t be higher than max.</p>}
        <button type="button" onClick={applyPrice} disabled={priceInvalid} className="btn-secondary btn-sm mt-3 w-full">Apply price</button>
      </Section>

      <Section title="Brand">
        <div className="relative mb-2">
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input type="search" value={brandQuery} onChange={(e) => setBrandQuery(e.target.value)} placeholder="Find a brand" aria-label="Find a brand" className="input h-9 pl-8 text-sm" />
        </div>
        <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1 scrollbar-thin">
          {visibleBrands.map((b) => (
            <Check key={b.id} checked={selectedBrands.includes(b.slug)} onChange={() => toggleBrand(b.slug)} count={b.productCount}>{b.name}</Check>
          ))}
          {visibleBrands.length === 0 && <p className="px-1 py-2 text-sm text-ink-400">No brands match.</p>}
        </div>
      </Section>

      <Section title="Customer rating">
        <div className="space-y-0.5">
          {RATINGS.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-sm text-ink-700 hover:bg-ink-50">
              <input type="radio" name="rating" checked={filters.rating === String(r)} onChange={() => onChange({ rating: String(r) })} className="h-4 w-4 shrink-0 border-ink-300 text-brand-600 focus:ring-brand-500" />
              <span className="inline-flex items-center gap-1">{r}<Icon name="star" className="h-3.5 w-3.5 text-amber-400" filled strokeWidth={0} /> & up</span>
            </label>
          ))}
          {filters.rating && <button type="button" className="px-1 pt-1 text-xs font-medium text-brand-600" onClick={() => onChange({ rating: '' })}>Any rating</button>}
        </div>
      </Section>

      <Section title="Availability & offers">
        <Check checked={filters.inStock === 'true'} onChange={(e) => onChange({ inStock: e.target.checked ? 'true' : '' })}>In stock only</Check>
        <Check checked={filters.minDiscount === '20'} onChange={(e) => onChange({ minDiscount: e.target.checked ? '20' : '' })}>20% off or more</Check>
      </Section>
    </div>
  );
}
