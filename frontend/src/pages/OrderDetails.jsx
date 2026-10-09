import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import * as orderApi from '../api/order.api';
import { errorMessage, isStatus } from '../api/axios';
import { useToast } from '../context/ToastContext';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import StatusBadge from '../components/ui/StatusBadge';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import ProductImage from '../components/ui/ProductImage';
import Modal from '../components/ui/Modal';
import Icon from '../components/ui/Icon';
import OrderSummary from '../components/OrderSummary';
import OrderTimeline from '../components/OrderTimeline';
import { AddressText } from '../components/AddressCard';
import { RowSkeleton } from '../components/ui/Skeletons';
import { Spinner } from '../components/ui/Loader';
import { CANCELLABLE, PAYMENT_METHODS } from '../utils/constants';
import { formatDateTime } from '../utils/format';
import formatCurrency from '../utils/formatCurrency';

export default function OrderDetails() {
  const { id } = useParams();
  const location = useLocation();
  const toast = useToast();
  const [state, setState] = useState({ loading: true, order: null, error: '', notFound: false });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setState({ loading: true, order: null, error: '', notFound: false });
    try { const d = await orderApi.getOrder(id); setState({ loading: false, order: d.order, error: '', notFound: false }); }
    catch (e) { setState({ loading: false, order: null, error: errorMessage(e, 'Could not load this order'), notFound: isStatus(e, 404) || isStatus(e, 400) }); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    setCancelling(true);
    try {
      const d = await orderApi.cancelOrder(id, reason.trim());
      setState((s) => ({ ...s, order: d.order }));
      setCancelOpen(false);
      toast.success('Your order has been cancelled');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not cancel this order'));
    } finally { setCancelling(false); }
  };

  if (state.loading) return <div className="page"><RowSkeleton rows={4} /></div>;
  if (state.notFound) return <div className="page"><EmptyState icon="box" title="Order not found" text="This order doesn’t exist or belongs to another account." action={<Link to="/orders" className="btn-primary">Back to orders</Link>} /></div>;
  if (state.error) return <div className="page"><ErrorState message={state.error} onRetry={load} /></div>;

  const o = state.order;
  const canCancel = CANCELLABLE.includes(o.status);
  const itemCount = (o.items || []).reduce((s, i) => s + i.quantity, 0);
  const savings = (o.items || []).reduce((s, i) => s + Math.max(0, (i.listPrice - i.unitPrice) * i.quantity), 0);
  const payment = PAYMENT_METHODS.find((m) => m.value === o.paymentMethod)?.label || o.paymentMethod;

  return (
    <div className="page">
      <Breadcrumbs items={[{ label: 'Orders', to: '/orders' }, { label: o.orderNumber }]} />

      {location.state?.justPlaced && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Icon name="check" className="h-4 w-4" strokeWidth={3} /></span>
          <div><p className="font-semibold text-emerald-900">Thank you — your order is placed!</p><p className="text-sm text-emerald-800">We’ve sent an update to your notifications. You can track it right here.</p></div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Order</p>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold sm:text-3xl">{o.orderNumber}<StatusBadge status={o.status} /></h1>
          <p className="mt-1 text-sm text-ink-500">Placed on {formatDateTime(o.createdAt)}</p>
        </div>
        {canCancel && <button type="button" className="btn-danger" onClick={() => setCancelOpen(true)}>Cancel order</button>}
      </div>

      <div className="card-pad mb-6"><OrderTimeline order={o} /></div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="border-b border-ink-100 px-5 py-4 text-base font-semibold">Items ({itemCount})</h2>
            <ul className="divide-y divide-ink-100">
              {o.items.map((i) => (
                <li key={`${i.sku}`} className="flex items-center gap-4 px-5 py-4">
                  <ProductImage src={i.image} alt={i.name} label={i.name} className="h-16 w-20 shrink-0 rounded-lg bg-ink-50" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${i.product}`} className="line-clamp-2 text-sm font-semibold hover:text-brand-700">{i.name}</Link>
                    <p className="mt-0.5 text-xs text-ink-500">SKU {i.sku} · Qty {i.quantity} × {formatCurrency(i.unitPrice)}</p>
                  </div>
                  <p className="text-sm font-bold">{formatCurrency(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </section>
          <div className="grid gap-6 sm:grid-cols-2">
            <section className="card-pad"><h2 className="mb-2 flex items-center gap-2 text-base font-semibold"><Icon name="map" className="h-5 w-5 text-brand-600" />Delivery address</h2>{o.shippingAddress && <AddressText a={o.shippingAddress} />}</section>
            <section className="card-pad">
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold"><Icon name="card" className="h-5 w-5 text-brand-600" />Payment</h2>
              <p className="text-sm text-ink-600">{payment}</p>
              <p className="mt-1 text-sm capitalize text-ink-500">Status: <span className="font-medium text-ink-800">{o.paymentStatus}</span></p>
            </section>
          </div>
        </div>

        <aside className="lg:self-start"><OrderSummary title="Payment summary" itemCount={itemCount} subtotal={o.subtotal} savings={savings} shipping={o.shippingFee} total={o.total} /></aside>
      </div>

      <Modal open={cancelOpen} onClose={() => !cancelling && setCancelOpen(false)} title="Cancel this order?"
        footer={<><button type="button" className="btn-secondary" onClick={() => setCancelOpen(false)} disabled={cancelling}>Keep order</button><button type="button" className="btn-danger" onClick={cancel} disabled={cancelling}>{cancelling && <Spinner className="h-4 w-4" />}Yes, cancel</button></>}>
        <p className="mb-4 text-sm text-ink-600">Items go back into stock and this can’t be undone.</p>
        <label htmlFor="cancel-reason" className="field-label">Reason <span className="font-normal text-ink-400">(optional)</span></label>
        <textarea id="cancel-reason" className="input" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell us why you’re cancelling" />
      </Modal>
    </div>
  );
}
