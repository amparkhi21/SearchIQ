import { Link } from 'react-router-dom';
import Icon from './ui/Icon';
import Rating from './ui/Rating';
import Price from './ui/Price';
import ProductImage from './ui/ProductImage';
import UnsplashAttribution from './ui/UnsplashAttribution';
import useProductActions from '../hooks/useProductActions';
import { hasDiscount, productImages, productPath, stockState } from '../utils/product';
import { Spinner } from './ui/Loader';

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, adding, wishing, wished } = useProductActions(product);
  const images = productImages(product);
  const stock = stockState(product);
  const out = stock === 'out';
  const to = productPath(product);
  const meta = [product.brand?.name, product.category?.name].filter(Boolean);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-50">
        <Link to={to} tabIndex={-1} aria-hidden="true" className="block h-full w-full">
          <ProductImage src={images[0]?.url} alt={images[0]?.alt || product.name} label={product.name}
            category={product.category}
            className={`h-full w-full transition-transform duration-300 group-hover:scale-[1.04] ${out ? 'opacity-60 grayscale' : ''}`} />
        </Link>
        <UnsplashAttribution image={images[0]} className="absolute bottom-1.5 left-1.5 z-10 max-w-[calc(100%-0.75rem)] rounded bg-white/90 px-1.5 py-0.5 text-[9px] shadow-sm" />
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
          {hasDiscount(product) && <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">-{Math.round(product.discountPercent)}%</span>}
          {out && <span className="rounded-md bg-ink-900 px-2 py-0.5 text-[11px] font-semibold text-white">Sold out</span>}
          {stock === 'low' && <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">Only {product.stock} left</span>}
        </div>
        <button type="button" onClick={() => toggleWishlist()} disabled={wishing}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={wished}
          className={`absolute right-2.5 top-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-ink-100 transition-all hover:scale-105 ${wished ? 'text-rose-500' : 'text-ink-500 hover:text-rose-500'}`}>
          <Icon name="heart" className="h-[18px] w-[18px]" filled={wished} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {meta.length > 0 && <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-wide text-ink-400">{meta.join(' · ')}</p>}
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-ink-900">
          <Link to={to} className="after:absolute after:inset-0 after:z-0 hover:text-brand-700 focus-visible:outline-none">{product.name}</Link>
        </h3>
        <div className="mt-2 min-h-[1.25rem]">
          {Number(product.ratingCount) > 0 ? <Rating value={product.ratingAvg} count={product.ratingCount} /> : <span className="text-xs text-ink-400">No reviews yet</span>}
        </div>
        <div className="mt-auto pt-3"><Price product={product} size="sm" /></div>
        <button type="button" onClick={() => addToCart()} disabled={out || adding}
          className={`${out ? 'btn-secondary' : 'btn-primary'} btn-sm relative z-10 mt-3 w-full`}>
          {adding ? <Spinner className="h-4 w-4" /> : <Icon name="cart" className="h-4 w-4" />}
          {out ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
