import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import * as userApi from '../api/user.api';
import * as orderApi from '../api/order.api';
import { errorMessage } from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/ui/PageHeader';
import Icon from '../components/ui/Icon';
import ProductImage from '../components/ui/ProductImage';
import OrderSummary from '../components/OrderSummary';
import AddressForm from '../components/AddressForm';
import { AddressText } from '../components/AddressCard';
import { RowSkeleton } from '../components/ui/Skeletons';
import { Spinner } from '../components/ui/Loader';
import { PAYMENT_METHODS } from '../utils/constants';
import { productId, productImages, stockState } from '../utils/product';
import formatCurrency from '../utils/formatCurrency';

function Step({ n, title, children }) {
  return (
    <section className="card-pad">
      <h2 className="mb-4 flex items-center gap-3 text-base font-semibold">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { items, count, subtotal, savings, shipping, total, loading: cartLoading, refresh } = useCart();
  const [addresses, setAddresses] = useState(null);
  const [addressId, setAddressId] = useState('');
  const [adding, setAdding] = useState(false);
  const [method, setMethod] = useState('cod');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const pickDefault = (list, preferred) => preferred || list.find((a) => a.isDefault)?.id || list[0]?.id || '';
  useEffect(() => {
    userApi.getProfile()
      .then((d) => { const list = d.user?.addresses || []; setAddresses(list); setAddressId((cur) => pickDefault(list, cur)); setAdding(list.length === 0); })
      .catch((e) => { setAddresses([]); setError(errorMessage(e, 'Could not load your addresses')); });
  }, []);

  const saveAddress = useCallback(async (payload) => {
    const d = await userApi.addAddress(payload);
    const list = d.addresses || [];
    // The new address is the last one added; select it.
    setAddresses(list);
    setAddressId(list[list.length - 1]?.id || pickDefault(list, ''));
    setAdding(false);
    toast.success('Address saved');
  }, [toast]);

  if (cartLoading && items.length === 0) return <div className="page"><PageHeader eyebrow="Checkout" title="Checkout" /><RowSkeleton rows={3} /></div>;
  if (!cartLoading && items.length === 0 && !placing) return <Navigate to="/cart" replace />;

  const outOfStock = items.filter((i) => stockState(i.product) === 'out');

  const place = async () => {
    setError('');
    if (!addressId) { setError('Choose or add a delivery address to continue.'); return; }
    if (outOfStock.length) { setError('Remove out-of-stock items from your cart first.'); return; }
    setPlacing(true);
    try {
      const d = await orderApi.createOrder({ addressId, paymentMethod: method });
      await refresh(); // the server empties the cart when an order is placed
      toast.success('Order placed successfully');
      navigate(`/orders/${d.order.id}`, { replace: true, state: { justPlaced: true } });
    } catch (e) {
      setError(errorMessage(e, 'We could not place your order. Please try again.'));
      refresh();
      setPlacing(false);
    }
  };

  return (
    <div className="page">
      <PageHeader eyebrow="Checkout" title="Complete your order" actions={<Link to="/cart" className="btn-ghost btn-sm"><Icon name="chevronLeft" className="h-4 w-4" />Back to cart</Link>} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <Step n={1} title="Delivery address">
            {addresses === null ? <RowSkeleton rows={2} /> : (
              <>
                {addresses.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery address">
                    {addresses.map((a) => (
                      <label key={a.id} className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${addressId === a.id ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-ink-200 hover:border-ink-300'}`}>
                        <input type="radio" name="address" className="mt-1 h-4 w-4 shrink-0 border-ink-300 text-brand-600 focus:ring-brand-500" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                        <span className="min-w-0">
                          <span className="mb-1 flex items-center gap-2 text-sm font-semibold">{a.label || 'Address'}{a.isDefault && <span className="badge-neutral">Default</span>}</span>
                          <AddressText a={a} />
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {adding ? (
                  <div className={addresses.length ? 'mt-5 border-t border-ink-100 pt-5' : ''}>
                    <h3 className="mb-3 text-sm font-semibold">{addresses.length ? 'Add a new address' : 'Where should we deliver?'}</h3>
                    <AddressForm onSubmit={saveAddress} onCancel={addresses.length ? () => setAdding(false) : undefined} defaultName={user?.name || ''} defaultPhone={user?.phone || ''} initial={{ isDefault: addresses.length === 0 }} />
                  </div>
                ) : (
                  <button type="button" className="btn-secondary btn-sm mt-4" onClick={() => setAdding(true)}><Icon name="plus" className="h-4 w-4" />Add new address</button>
                )}
              </>
            )}
          </Step>

          <Step n={2} title="Payment method">
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Payment method">
              {PAYMENT_METHODS.map((m) => (
                <label key={m.value} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors ${method === m.value ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-ink-200 hover:border-ink-300'}`}>
                  <span className="flex items-center gap-2.5 text-sm font-semibold">
                    <input type="radio" name="payment" className="h-4 w-4 border-ink-300 text-brand-600 focus:ring-brand-500" checked={method === m.value} onChange={() => setMethod(m.value)} />{m.label}
                  </span>
                  <span className="pl-[26px] text-xs text-ink-500">{m.hint}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-ink-500"><Icon name="info" className="mt-0.5 h-4 w-4" />This is a demo store: no real payment is taken. The selected method is recorded with your order.</p>
          </Step>

          <Step n={3} title={`Review items (${count})`}>
            <ul className="divide-y divide-ink-100">
              {items.map(({ product: p, quantity }) => (
                <li key={productId(p)} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <ProductImage src={productImages(p)[0]?.url} alt={p.name} label={p.name} category={p.category} className="h-14 w-16 shrink-0 rounded-lg bg-ink-50" />
                  <div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-medium">{p.name}</p><p className="text-xs text-ink-500">Qty {quantity} × {formatCurrency(p.finalPrice ?? p.price)}</p></div>
                  <p className="text-sm font-semibold">{formatCurrency(Number(p.finalPrice ?? p.price) * quantity)}</p>
                </li>
              ))}
            </ul>
          </Step>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary itemCount={count} subtotal={subtotal} savings={savings} shipping={shipping} total={total}>
            {error && <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <button type="button" className="btn-primary btn-lg btn-block" disabled={placing || addresses === null} onClick={place}>
              {placing ? <><Spinner className="h-5 w-5" />Placing order…</> : <>Place order · {formatCurrency(total)}</>}
            </button>
            <p className="mt-3 text-center text-xs text-ink-500">By placing your order you agree to SearchIQ’s terms of sale.</p>
          </OrderSummary>
        </aside>
      </div>
    </div>
  );
}
