import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as productApi from '../api/product.api';
import * as recApi from '../api/recommendation.api';
import { useAuth } from '../hooks/useAuth';
import SearchBox from '../components/search/SearchBox';
import ProductRail from '../components/ProductRail';
import Icon from '../components/ui/Icon';
import { SUGGESTED_SEARCHES } from '../utils/constants';

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

const HOW = [
  { icon: 'search', title: 'Describe it naturally', text: 'Type what you mean — “black running shoes under ₹3000” — instead of guessing keywords.' },
  { icon: 'sparkles', title: 'AI understands intent', text: 'Brand, colour, use-case and budget are extracted and applied as smart filters.' },
  { icon: 'layers', title: 'Hybrid ranking', text: 'Keyword relevance (BM25) is blended with 384-dimension semantic vectors for better matches.' },
];

const TRUST = [
  { icon: 'truck', title: 'Free delivery over ₹999', text: 'Fast, tracked shipping across India.' },
  { icon: 'refresh', title: 'Easy cancellations', text: 'Cancel before your order ships.' },
  { icon: 'shield', title: 'Secure checkout', text: 'Protected accounts and verified reviews.' },
  { icon: 'star', title: 'Honest reviews', text: 'Ratings from verified buyers only.' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState({ loading: true, categories: [], popular: [], deals: [], recs: [] });
  const [recsLoading, setRecsLoading] = useState(false);
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    document.title = 'SearchIQ — Intelligent Shopping';
    let cancelled = false;
    Promise.allSettled([
      productApi.listCategories(),
      productApi.listProducts({ limit: 8, sort: 'popular', inStock: 'true' }),
      productApi.listProducts({ limit: 4, sort: 'discount', inStock: 'true' }),
    ]).then(([c, p, d]) => {
      if (cancelled) return;
      setState({
        loading: false,
        categories: c.value?.categories || [],
        popular: p.value?.products || [],
        deals: d.value?.products || [],
      });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { setRecs([]); return undefined; }
    let cancelled = false;
    setRecsLoading(true);
    recApi.recommendations(4)
      .then((d) => { if (!cancelled) setRecs(d.products || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRecsLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate bg-ink-900 text-white">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-accent-600/20 blur-3xl" />
        </div>
        <div className="container-page grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-brand-200">
              <Icon name="sparkles" className="h-3.5 w-3.5" />AI-powered product discovery
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl xl:text-[3.4rem]">
              Find exactly what you mean, <span className="text-brand-300">not just what you type.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-200 sm:text-lg">
              Search the way you think. SearchIQ understands intent, budget and context, then ranks results with keyword and semantic intelligence.
            </p>
            <div className="mt-8 max-w-xl text-ink-900"><SearchBox size="lg" /></div>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-300">Try:</span>
              {SUGGESTED_SEARCHES.slice(0, 3).map((s) => (
                <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-ink-100 transition-colors hover:bg-white/10">{s}</Link>
              ))}
            </div>
          </div>

          {/* Illustrative "how it understands" card */}
          <div className="hidden lg:block" aria-hidden="true">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-pop backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-300">You searched</p>
              <p className="mt-1.5 rounded-lg bg-white/10 px-3 py-2.5 text-sm text-white">comfortable black shoes for college under ₹2500</p>
              <p className="mt-5 text-xs font-medium uppercase tracking-wider text-ink-300">SearchIQ understood</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {['Footwear', 'Black', 'College use', 'Under ₹2,500', 'Comfort'].map((t) => (
                  <span key={t} className="rounded-full bg-brand-500/20 px-2.5 py-1 text-xs font-medium text-brand-100 ring-1 ring-brand-400/30">{t}</span>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-center">
                {[['BM25', 'keyword'], ['384-D', 'vectors'], ['Hybrid', 'ranking']].map(([a, b]) => (
                  <div key={a}><p className="text-lg font-bold text-white">{a}</p><p className="text-xs text-ink-300">{b}</p></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page">
        {/* Categories */}
        <section className="mt-10 sm:mt-14">
          <div className="mb-5 flex items-end justify-between">
            <div><p className="eyebrow mb-1">Shop by category</p><h2 className="section-title">Browse what you need</h2></div>
            <Link to="/search" className="link hidden items-center gap-1 text-sm sm:inline-flex">All products<Icon name="arrowRight" className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {state.loading
              ? Array.from({ length: 10 }, (_, i) => <div key={i} className="skeleton h-[72px] rounded-xl" />)
              : state.categories.map((c) => (
                <Link key={c.id} to={`/search?category=${encodeURIComponent(c.slug)}`}
                  className="group flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    <Icon name={CATEGORY_ICONS[c.slug] || 'grid'} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink-900">{c.name}</span>
                    <span className="block text-xs text-ink-500">{c.productCount ?? 0} products</span>
                  </span>
                </Link>
              ))}
          </div>
        </section>

        {isAuthenticated && <ProductRail eyebrow="Picked for you" title="Recommended for you" products={recs} loading={recsLoading} to="/search?sort=popular" linkLabel="See more" />}

        <ProductRail eyebrow="Featured" title="Popular right now" products={state.popular.slice(0, 8)} loading={state.loading} count={8} to="/search?sort=popular" />

        {/* AI explainer */}
        <section className="mt-12 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card sm:mt-16">
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_2fr] lg:gap-12">
            <div>
              <p className="eyebrow mb-2">How search works</p>
              <h2 className="text-2xl font-bold sm:text-3xl">Search that understands you</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-500">Every query is analysed by our AI service before it reaches the search engine, so natural language just works.</p>
            </div>
            <ol className="grid gap-6 sm:grid-cols-3">
              {HOW.map((h, i) => (
                <li key={h.title}>
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white"><Icon name={h.icon} className="h-5 w-5" /></span>
                  <h3 className="text-sm font-semibold"><span className="mr-1.5 text-brand-600">{i + 1}.</span>{h.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{h.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <ProductRail eyebrow="Deals" title="Biggest discounts" products={state.deals} loading={state.loading} to="/search?sort=discount" />

        {/* Trust */}
        <section className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4" aria-label="Why shop with SearchIQ">
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-card">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon name={t.icon} className="h-5 w-5" /></span>
              <div><h3 className="text-sm font-semibold">{t.title}</h3><p className="mt-0.5 text-xs leading-relaxed text-ink-500">{t.text}</p></div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
