import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as productApi from '../api/product.api';
import useSearch from '../hooks/useSearch';
import ProductGrid from '../components/ProductGrid';
import FilterPanel from '../components/search/FilterPanel';
import AiInsight from '../components/search/AiInsight';
import Icon from '../components/ui/Icon';
import Drawer from '../components/ui/Drawer';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { ProductGridSkeleton } from '../components/ui/Skeletons';
import { SORT_OPTIONS, SUGGESTED_SEARCHES } from '../utils/constants';
import { formatNumber } from '../utils/format';
import formatCurrency from '../utils/formatCurrency';

const FILTER_KEYS = ['category', 'brand', 'minPrice', 'maxPrice', 'rating', 'inStock', 'minDiscount'];
const PAGE_SIZE = 24;

export default function SearchResults() {
  const [sp, setSp] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [drawer, setDrawer] = useState(false);

  const q = (sp.get('q') || '').trim();
  const sort = sp.get('sort') || 'relevance';
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, sp.get(k) || ''])), [sp]);

  useEffect(() => {
    Promise.all([productApi.listCategories(), productApi.listBrands()])
      .then(([c, b]) => { setCategories(c.categories || []); setBrands(b.brands || []); })
      .catch(() => {});
  }, []);

  const params = useMemo(() => {
    const p = { page, limit: PAGE_SIZE, sort };
    if (q) p.q = q;
    FILTER_KEYS.forEach((k) => { if (filters[k]) p[k] = filters[k]; });
    return p;
  }, [q, sort, page, filters]);

  const { loading, error, data, reload } = useSearch(params);
  const { products, meta, mode, analysis } = data;
  const total = meta?.total ?? products.length;

  // Update the URL (single source of truth). Any filter / sort change resets pagination.
  const update = useCallback((patch, { keepPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => { if (v === '' || v == null) next.delete(k); else next.set(k, String(v)); });
    if (!keepPage) next.delete('page');
    if (next.get('sort') === 'relevance') next.delete('sort');
    setSp(next);
  }, [sp, setSp]);

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (sort !== 'relevance') next.set('sort', sort);
    setSp(next);
  };

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);
  useEffect(() => { document.title = q ? `${q} — SearchIQ` : 'Browse products — SearchIQ'; }, [q]);

  const catName = (slug) => categories.find((c) => c.slug === slug)?.name || slug;
  const brandName = (slug) => brands.find((b) => b.slug === slug)?.name || slug;

  const chips = [];
  if (filters.category) chips.push({ key: 'category', label: catName(filters.category), clear: { category: '' } });
  filters.brand && filters.brand.split(',').forEach((s) => chips.push({ key: `brand-${s}`, label: brandName(s), clear: { brand: filters.brand.split(',').filter((x) => x !== s).join(',') } }));
  if (filters.minPrice || filters.maxPrice) {
    const label = filters.minPrice && filters.maxPrice ? `${formatCurrency(filters.minPrice)} – ${formatCurrency(filters.maxPrice)}` : filters.minPrice ? `From ${formatCurrency(filters.minPrice)}` : `Up to ${formatCurrency(filters.maxPrice)}`;
    chips.push({ key: 'price', label, clear: { minPrice: '', maxPrice: '' } });
  }
  if (filters.rating) chips.push({ key: 'rating', label: `${filters.rating}★ & up`, clear: { rating: '' } });
  if (filters.inStock === 'true') chips.push({ key: 'inStock', label: 'In stock', clear: { inStock: '' } });
  if (filters.minDiscount) chips.push({ key: 'minDiscount', label: `${filters.minDiscount}%+ off`, clear: { minDiscount: '' } });

  const panel = (
    <FilterPanel filters={filters} categories={categories} brands={brands} onChange={(patch) => update(patch)} onClear={clearFilters} activeCount={chips.length} />
  );

  return (
    <div className="page">
      <header className="mb-5">
        <p className="eyebrow mb-1">{q ? 'Search results' : 'Catalog'}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{q ? <>Results for <span className="text-brand-700">“{q}”</span></> : 'Browse all products'}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto overflow-x-hidden p-4 scrollbar-thin">{panel}</div>
        </aside>

        <section className="min-w-0" aria-live="polite">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="mr-auto text-sm text-ink-600">
              {loading ? 'Searching…' : <><strong className="text-ink-900">{formatNumber(total)}</strong> {total === 1 ? 'product' : 'products'}{mode && <span className="ml-2 badge-brand align-middle"><Icon name="sparkles" className="h-3 w-3" />{mode} search</span>}</>}
            </p>
            <button type="button" onClick={() => setDrawer(true)} className="btn-secondary btn-sm lg:hidden">
              <Icon name="filter" className="h-4 w-4" />Filters{chips.length > 0 && <span className="ml-0.5 rounded-full bg-brand-600 px-1.5 text-[10px] text-white">{chips.length}</span>}
            </button>
            <label className="flex items-center gap-2 text-sm text-ink-600">
              <span className="hidden sm:inline">Sort by</span>
              <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort products" className="input h-9 w-auto py-0 text-sm">
                {SORT_OPTIONS.filter((o) => q || o.value !== 'relevance').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>

          {!loading && <AiInsight analysis={analysis} />}

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button key={c.key} type="button" onClick={() => update(c.clear)} className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-2 text-xs font-medium text-brand-800 hover:bg-brand-100">
                  {c.label}<Icon name="close" className="h-3.5 w-3.5" /><span className="sr-only">Remove filter</span>
                </button>
              ))}
              <button type="button" onClick={clearFilters} className="text-xs font-medium text-ink-500 hover:text-ink-800">Clear all</button>
            </div>
          )}

          {loading ? (
            <ProductGridSkeleton count={8} className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : products.length === 0 ? (
            <EmptyState icon="search" title={q ? `No results for “${q}”` : 'No products match these filters'}
              text={chips.length ? 'Try removing a filter or widening your price range.' : 'Check the spelling or try describing what you need in different words.'}
              action={
                <div className="flex flex-col items-center gap-3">
                  {chips.length > 0 && <button type="button" className="btn-primary" onClick={clearFilters}>Clear all filters</button>}
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTED_SEARCHES.slice(0, 3).map((s) => <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="badge-neutral hover:bg-ink-200">{s}</Link>)}
                  </div>
                </div>
              } />
          ) : (
            <>
              <ProductGrid products={products} className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4" />
              <Pagination page={meta?.page || page} totalPages={meta?.totalPages || 1} onChange={(p) => update({ page: p }, { keepPage: true })} />
            </>
          )}
        </section>
      </div>

      {/* Mobile filter drawer */}
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Filters" side="right"
        footer={<div className="grid grid-cols-2 gap-2"><button type="button" className="btn-secondary" onClick={() => { clearFilters(); setDrawer(false); }}>Clear all</button><button type="button" className="btn-primary" onClick={() => setDrawer(false)}>Show {loading ? '' : formatNumber(total)} results</button></div>}>
        <FilterPanel filters={filters} categories={categories} brands={brands} onChange={(patch) => update(patch)} onClear={clearFilters} activeCount={chips.length} hideTitle />
      </Drawer>
    </div>
  );
}
