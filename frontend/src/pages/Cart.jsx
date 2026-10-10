import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../api/axios';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import QuantityStepper from '../components/ui/QuantityStepper';
import ProductImage from '../components/ui/ProductImage';
import Price from '../components/ui/Price';
import Icon from '../components/ui/Icon';
import OrderSummary from '../components/OrderSummary';
import { RowSkeleton } from '../components/ui/Skeletons';
import { productId, productImages, productPath, stockState } from '../utils/product';
import formatCurrency from '../utils/formatCurrency';

export default function Cart() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { items, count, subtotal, savings, shipping, total, update, remove, clear, loading, pendingId } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  const act = async (fn, okMsg) => {
    try { await fn(); if (okMsg) toast.success(okMsg); } catch (e) { toast.error(errorMessage(e, 'Could not update your cart')); }
  };

  if (authLoading) return <div className="page"><RowSkeleton rows={3} /></div>;
  if (!isAuthenticated) {
    return (
      <div className="page"><EmptyState icon="cart" title="Sign in to view your cart" text="Your cart is saved to your SearchIQ account so you can pick up where you left off."
        action={<div className="flex gap-2"><Link to="/login" state={{ from: { pathname: '/cart' } }} className="btn-primary">Sign in</Link><Link to="/register" className="btn-secondary">Create account</Link></div>} /></div>
    );
  }
  if (loading && items.length === 0) return <div className="page"><PageHeader eyebrow="Shopping cart" title="Your cart" /><RowSkeleton rows={3} /></div>;
  if (items.length === 0) {
    return <div className="page"><EmptyState icon="cart" title="Your cart is empty" text="Looks like you haven’t added anything yet." action={<Link to="/search" className="btn-primary">Start shopping</Link>} /></div>;
  }

  const blocked = items.some((i) => stockState(i.product) === 'out');

  return (
    <div className="page">
      <PageHeader eyebrow="Shopping cart" title={`Your cart (${count})`}
        actions={<button type="button" className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => { if (window.confirm('Remove all items from your cart?')) act(clear, 'Cart cleared'); }}><Icon name="trash" className="h-4 w-4" />Clear cart</button>} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <ul className="space-y-3">
          {items.map(({ product: p, quantity }) => {
            const id = productId(p);
            const busy = pendingId === id || pendingId === 'all';
            const out = stockState(p) === 'out';
            const max = Math.max(1, Math.min(99, Number(p.stock) || 99));
            return (
              <li key={id} className={`card flex gap-4 p-3.5 sm:p-4 ${busy ? 'opacity-70' : ''}`}>
                <Link to={productPath(p)} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-ink-50 sm:h-28 sm:w-32">
                  <ProductImage src={productImages(p)[0]?.url} alt={p.name} label={p.name} category={p.category} className="h-full w-full" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {p.brand?.name && <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{p.brand.name}</p>}
                      <Link to={productPath(p)} className="line-clamp-2 text-sm font-semibold hover:text-brand-700 sm:text-base">{p.name}</Link>
                    </div>
                    <p className="hidden shrink-0 text-base font-bold sm:block">{formatCurrency(Number(p.finalPrice ?? p.price) * quantity)}</p>
                  </div>
                  <div className="mt-1"><Price product={p} size="sm" /></div>
                  {out && <p className="mt-1 text-xs font-medium text-red-600">This item is out of stock — remove it to check out.</p>}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <QuantityStepper size="sm" value={quantity} max={max} disabled={busy || out} onChange={(q) => act(() => update(id, q))} />
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold sm:hidden">{formatCurrency(Number(p.finalPrice ?? p.price) * quantity)}</p>
                      <button type="button" disabled={busy} onClick={() => act(() => remove(id), 'Item removed')} className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-red-600">
                        <Icon name="trash" className="h-4 w-4" />Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          <li><Link to="/search" className="link inline-flex items-center gap-1 text-sm"><Icon name="chevronLeft" className="h-4 w-4" />Continue shopping</Link></li>
        </ul>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary itemCount={count} subtotal={subtotal} savings={savings} shipping={shipping} total={total} showFreeShippingHint>
            <button type="button" className="btn-primary btn-lg btn-block" disabled={blocked} onClick={() => navigate('/checkout')}>Proceed to checkout<Icon name="arrowRight" className="h-5 w-5" /></button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500"><Icon name="lock" className="h-3.5 w-3.5" />Secure checkout</p>
          </OrderSummary>
        </aside>
      </div>
    </div>
  );
}
