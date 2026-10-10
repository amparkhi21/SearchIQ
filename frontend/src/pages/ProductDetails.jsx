import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as productApi from '../api/product.api';
import * as recApi from '../api/recommendation.api';
import { errorMessage, isStatus } from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import useProductActions from '../hooks/useProductActions';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Gallery from '../components/product/Gallery';
import ReviewSection from '../components/product/ReviewSection';
import ProductRail from '../components/ProductRail';
import Rating from '../components/ui/Rating';
import Price from '../components/ui/Price';
import Icon from '../components/ui/Icon';
import QuantityStepper from '../components/ui/QuantityStepper';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Loader';
import { hasDiscount, productId, productImages, stockState } from '../utils/product';
import formatCurrency from '../utils/formatCurrency';
import { SHIPPING_THRESHOLD } from '../utils/constants';

function DetailSkeleton() {
  return (
    <div className="page" aria-hidden="true">
      <div className="skeleton mb-6 h-4 w-64" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="skeleton aspect-[4/3] rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-4 w-40" /><div className="skeleton h-9 w-3/4" /><div className="skeleton h-5 w-48" />
          <div className="skeleton h-24 w-full" /><div className="skeleton h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

function Specs({ product }) {
  const a = product.attributes || {};
  const rows = [
    ['Brand', product.brand?.name],
    ['Category', product.category?.name],
    ['SKU', product.sku],
    ['Colour', a.color],
    ['Variant', a.variant],
    ['Material', a.material],
    ['Suitable for', a.gender && a.gender[0].toUpperCase() + a.gender.slice(1)],
    ['Sizes', a.sizes?.join(', ')],
    ['Best for', a.useCase?.join(', ')],
  ].filter(([, v]) => v);
  if (!rows.length) return <p className="text-sm text-ink-500">No specifications available.</p>;
  return (
    <dl className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 px-4 py-3 text-sm even:bg-ink-50/60 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <dt className="font-medium text-ink-500">{k}</dt>
          <dd className="break-words text-ink-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Details({ product, onReviewsChanged }) {
  const { isAuthenticated } = useAuth();
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('description');
  const { addToCart, toggleWishlist, adding, wishing, wished } = useProductActions(product);
  const stock = stockState(product);
  const out = stock === 'out';
  const maxQty = Math.max(1, Math.min(10, Number(product.stock) || 10));

  useEffect(() => setQty(1), [product.id]);

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
        <Gallery images={productImages(product)} name={product.name} category={product.category} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {product.brand?.name && <Link to={`/search?brand=${product.brand.slug}`} className="font-semibold text-brand-700 hover:underline">{product.brand.name}</Link>}
            {product.category?.name && <><span className="text-ink-300">/</span><Link to={`/search?category=${product.category.slug}`} className="text-ink-500 hover:text-brand-700">{product.category.name}</Link></>}
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {Number(product.ratingCount) > 0 ? (
              <a href="#reviews" className="inline-flex items-center gap-2"><Rating value={product.ratingAvg} size="lg" /><span className="text-sm text-ink-500 hover:underline">{product.ratingCount} reviews</span></a>
            ) : <span className="text-sm text-ink-400">No reviews yet</span>}
            <span className="text-ink-200">|</span>
            {out ? <span className="badge-danger">Out of stock</span>
              : stock === 'low' ? <span className="badge-warn">Only {product.stock} left</span>
              : <span className="badge-success"><Icon name="check" className="h-3 w-3" strokeWidth={3} />In stock</span>}
          </div>

          <div className="mt-5 rounded-xl bg-ink-50 p-4">
            <Price product={product} size="lg" />
            {hasDiscount(product) && <p className="mt-1 text-sm font-medium text-emerald-700">You save {formatCurrency(product.price - product.finalPrice)} ({Math.round(product.discountPercent)}%)</p>}
            <p className="mt-1 text-xs text-ink-500">Inclusive of all taxes</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} max={maxQty} disabled={out} />
            <button type="button" onClick={() => addToCart(qty)} disabled={out || adding} className="btn-primary btn-lg min-w-[11rem] flex-1 sm:flex-none">
              {adding ? <Spinner className="h-5 w-5" /> : <Icon name="cart" className="h-5 w-5" />}{out ? 'Out of stock' : 'Add to cart'}
            </button>
            <button type="button" onClick={toggleWishlist} disabled={wishing} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-lg border transition-colors ${wished ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-rose-500'}`}>
              <Icon name="heart" className="h-5 w-5" filled={wished} />
            </button>
          </div>
          {!isAuthenticated && <p className="mt-3 text-xs text-ink-500"><Link to="/login" className="link">Sign in</Link> to add items to your cart and wishlist.</p>}

          <ul className="mt-6 grid gap-3 text-sm text-ink-600 sm:grid-cols-2">
            <li className="flex items-center gap-2.5"><Icon name="truck" className="h-5 w-5 text-brand-600" />Free delivery over {formatCurrency(SHIPPING_THRESHOLD)}</li>
            <li className="flex items-center gap-2.5"><Icon name="refresh" className="h-5 w-5 text-brand-600" />Cancel before it ships</li>
            <li className="flex items-center gap-2.5"><Icon name="shield" className="h-5 w-5 text-brand-600" />Secure checkout</li>
            <li className="flex items-center gap-2.5"><Icon name="tag" className="h-5 w-5 text-brand-600" />SKU {product.sku}</li>
          </ul>

          {product.tags?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {product.tags.slice(0, 8).map((t) => <Link key={t} to={`/search?q=${encodeURIComponent(t)}`} className="badge-neutral hover:bg-ink-200">#{t}</Link>)}
            </div>
          )}
        </div>
      </div>

      <section className="mt-12">
        <div role="tablist" className="flex gap-1 border-b border-ink-200">
          {[['description', 'Description'], ['specs', 'Specifications']].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'}`}>{label}</button>
          ))}
        </div>
        <div className="pt-6" role="tabpanel">
          {tab === 'description'
            ? <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-ink-600 sm:text-base">{product.description}</p>
            : <div className="max-w-3xl"><Specs product={product} /></div>}
        </div>
      </section>

      <ReviewSection productId={productId(product)} ratingAvg={product.ratingAvg} ratingCount={product.ratingCount} onChanged={onReviewsChanged} />
    </>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState({ loading: true, product: null, error: '', notFound: false });
  const [similar, setSimilar] = useState({ loading: true, products: [] });

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState({ loading: true, product: null, error: '', notFound: false });
    try {
      const d = await productApi.getProduct(id);
      setState({ loading: false, product: d.product, error: '', notFound: false });
    } catch (e) {
      if (!silent) setState({ loading: false, product: null, error: errorMessage(e, 'Could not load this product'), notFound: isStatus(e, 404) });
    }
  }, [id]);

  useEffect(() => { window.scrollTo({ top: 0 }); load(); }, [load]);

  const pid = state.product ? productId(state.product) : null;
  const pname = state.product?.name;
  useEffect(() => {
    if (!pid) return undefined;
    document.title = `${pname} — SearchIQ`;
    let cancelled = false;
    setSimilar({ loading: true, products: [] });
    recApi.similarProducts(pid, 8)
      .then((d) => { if (!cancelled) setSimilar({ loading: false, products: d.products || [] }); })
      .catch(() => { if (!cancelled) setSimilar({ loading: false, products: [] }); });
    if (isAuthenticated) recApi.recordViewed(pid).catch(() => {});
    return () => { cancelled = true; };
  }, [pid, pname, isAuthenticated]);

  if (state.loading) return <DetailSkeleton />;
  if (state.notFound) return <div className="page"><EmptyState icon="search" title="Product not found" text="It may have been removed, or the link is incorrect." action={<Link to="/search" className="btn-primary">Browse products</Link>} /></div>;
  if (state.error || !state.product) return <div className="page"><ErrorState message={state.error} onRetry={() => load()} /></div>;

  const p = state.product;
  const crumbs = [{ label: 'Home', to: '/' }];
  if (p.category) crumbs.push({ label: p.category.name, to: `/search?category=${p.category.slug}` });
  crumbs.push({ label: p.name });

  return (
    <div className="page">
      <Breadcrumbs items={crumbs} />
      <Details product={p} onReviewsChanged={() => load({ silent: true })} />
      <ProductRail eyebrow="You may also like" title="Similar products" products={similar.products.filter((s) => productId(s) !== pid).slice(0, 4)} loading={similar.loading} count={4} />
    </div>
  );
}
