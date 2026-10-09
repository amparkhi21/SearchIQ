import { useCallback, useEffect, useState } from 'react';
import { listAdminOrders, updateOrderStatus } from '../../api/admin.api';
import { errorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { AdminHeader } from '../../components/admin/AdminUI';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import Drawer from '../../components/ui/Drawer';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import ProductImage from '../../components/ui/ProductImage';
import OrderTimeline from '../../components/OrderTimeline';
import { AddressText } from '../../components/AddressCard';
import { RowSkeleton } from '../../components/ui/Skeletons';
import { Spinner } from '../../components/ui/Loader';
import { NEXT_STATUS, ORDER_STATUS } from '../../utils/constants';
import { formatDateTime } from '../../utils/format';
import formatCurrency from '../../utils/formatCurrency';

export default function AdminOrders() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [s, setS] = useState({ loading: true, error: '', orders: [], meta: {} });
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState('');

  const load = useCallback(async () => {
    setS((x) => ({ ...x, loading: true, error: '' }));
    try {
      const d = await listAdminOrders({ page, limit: 15, ...(status ? { status } : {}) });
      setS({ loading: false, error: '', orders: d.orders || [], meta: d.meta || {} });
    } catch (e) { setS({ loading: false, error: errorMessage(e, 'Could not load orders'), orders: [], meta: {} }); }
  }, [page, status]);
  useEffect(() => { load(); }, [load]);

  const move = async (order, next) => {
    setSaving(order.id + next);
    try {
      const d = await updateOrderStatus(order.id, next);
      const updated = d.order || { ...order, status: next };
      setS((x) => ({ ...x, orders: x.orders.map((o) => (o.id === order.id ? { ...o, ...updated } : o)) }));
      setSelected((cur) => (cur && cur.id === order.id ? { ...cur, ...updated } : cur));
      toast.success(`${order.orderNumber} → ${ORDER_STATUS[next].label}`);
    } catch (e) { toast.error(errorMessage(e, 'Could not update the order')); } finally { setSaving(''); }
  };

  const actions = (o) => {
    const next = NEXT_STATUS[o.status] || [];
    if (!next.length) return <span className="text-xs text-ink-400">No further actions</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {next.map((n) => (
          <button key={n} type="button" disabled={Boolean(saving)}
            onClick={() => { if (n !== 'cancelled' || window.confirm(`Cancel ${o.orderNumber}? Stock will be restored.`)) move(o, n); }}
            className={`${n === 'cancelled' ? 'btn-danger' : 'btn-primary'} btn-sm`}>
            {saving === o.id + n && <Spinner className="h-3.5 w-3.5" />}{n === 'cancelled' ? 'Cancel' : `Mark ${ORDER_STATUS[n].label.toLowerCase()}`}
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <AdminHeader title="Orders" subtitle={s.meta.total != null ? `${s.meta.total} orders` : undefined}
        actions={<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input h-9 w-auto text-sm" aria-label="Filter by status"><option value="">All statuses</option>{Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>} />
      {s.loading ? <RowSkeleton rows={5} /> : s.error ? <ErrorState message={s.error} onRetry={load} />
        : s.orders.length === 0 ? <EmptyState icon="box" title="No orders found" text="Orders will appear here as customers check out." />
        : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Total</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {s.orders.map((o) => (
                    <tr key={o.id}>
                      <td><button type="button" onClick={() => setSelected(o)} className="font-semibold text-brand-700 hover:underline">{o.orderNumber}</button><p className="text-xs text-ink-400">{o.items?.length || 0} items</p></td>
                      <td className="max-w-[14rem]"><p className="truncate">{o.user?.name || '—'}</p><p className="truncate text-xs text-ink-400">{o.user?.email}</p></td>
                      <td className="whitespace-nowrap text-ink-600">{formatDateTime(o.createdAt)}</td>
                      <td className="whitespace-nowrap font-semibold">{formatCurrency(o.total)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>{actions(o)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={s.meta.page || page} totalPages={s.meta.totalPages || 1} onChange={setPage} />
          </>
        )}

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} side="right" width="max-w-lg" title={selected?.orderNumber || 'Order'}>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between"><StatusBadge status={selected.status} /><span className="text-lg font-bold">{formatCurrency(selected.total)}</span></div>
            <OrderTimeline order={selected} />
            {actions(selected)}
            <section><h3 className="mb-2 text-sm font-semibold">Customer</h3><p className="text-sm text-ink-600">{selected.user?.name} · {selected.user?.email}</p></section>
            <section><h3 className="mb-2 text-sm font-semibold">Ship to</h3>{selected.shippingAddress && <AddressText a={selected.shippingAddress} />}</section>
            <section>
              <h3 className="mb-2 text-sm font-semibold">Items</h3>
              <ul className="divide-y divide-ink-100">
                {(selected.items || []).map((i) => (
                  <li key={i.sku} className="flex items-center gap-3 py-2.5">
                    <ProductImage src={i.image} alt={i.name} label={i.name} className="h-12 w-14 shrink-0 rounded-lg bg-ink-50" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{i.name}</p><p className="text-xs text-ink-500">Qty {i.quantity} × {formatCurrency(i.unitPrice)}</p></div>
                    <span className="text-sm font-semibold">{formatCurrency(i.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-1.5 border-t border-ink-100 pt-3 text-sm">
                <div className="flex justify-between"><dt className="text-ink-500">Subtotal</dt><dd>{formatCurrency(selected.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-500">Shipping</dt><dd>{formatCurrency(selected.shippingFee)}</dd></div>
                <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatCurrency(selected.total)}</dd></div>
              </dl>
            </section>
          </div>
        )}
      </Drawer>
    </>
  );
}
