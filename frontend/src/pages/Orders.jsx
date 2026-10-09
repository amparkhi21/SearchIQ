import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as orderApi from '../api/order.api';
import { errorMessage } from '../api/axios';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Pagination from '../components/ui/Pagination';
import StatusBadge from '../components/ui/StatusBadge';
import ProductImage from '../components/ui/ProductImage';
import Icon from '../components/ui/Icon';
import { RowSkeleton } from '../components/ui/Skeletons';
import { ORDER_STATUS } from '../utils/constants';
import { formatDate } from '../utils/format';
import formatCurrency from '../utils/formatCurrency';

const TABS = [['', 'All'], ['placed', 'Placed'], ['confirmed', 'Confirmed'], ['shipped', 'Shipped'], ['out-for-delivery', 'Out for delivery'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']];

export default function Orders() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || '';
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const [state, setState] = useState({ loading: true, error: '', orders: [], meta: {} });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const d = await orderApi.listOrders({ page, limit: 10, ...(status ? { status } : {}) });
      setState({ loading: false, error: '', orders: d.orders || [], meta: d.meta || {} });
    } catch (e) {
      setState({ loading: false, error: errorMessage(e, 'Could not load your orders'), orders: [], meta: {} });
    }
  }, [page, status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { document.title = 'My orders — SearchIQ'; }, []);

  const setParam = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n); };

  return (
    <div className="page max-w-4xl">
      <PageHeader eyebrow="Account" title="My orders" subtitle="Track, review and manage your purchases." />

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0" role="tablist" aria-label="Filter by status">
        {TABS.map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={status === v} onClick={() => setParam('status', v)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${status === v ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50'}`}>{label}</button>
        ))}
      </div>

      {state.loading ? <RowSkeleton rows={4} />
        : state.error ? <ErrorState message={state.error} onRetry={load} />
        : state.orders.length === 0 ? (
          <EmptyState icon="box" title={status ? `No ${ORDER_STATUS[status]?.label.toLowerCase()} orders` : 'No orders yet'} text={status ? 'Try another status filter.' : 'When you place an order it will show up here.'}
            action={!status && <Link to="/search" className="btn-primary">Start shopping</Link>} />
        ) : (
          <>
            <ul className="space-y-3">
              {state.orders.map((o) => (
                <li key={o.id}>
                  <Link to={`/orders/${o.id}`} className="card block p-4 transition-all hover:border-ink-200 hover:shadow-lift sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{o.orderNumber}</p>
                        <p className="text-xs text-ink-500">Placed {formatDate(o.createdAt)} · {o.items?.length || 0} {(o.items?.length || 0) === 1 ? 'item' : 'items'}</p>
                      </div>
                      <div className="flex items-center gap-3"><StatusBadge status={o.status} /><p className="text-base font-bold">{formatCurrency(o.total)}</p></div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      {(o.items || []).slice(0, 4).map((it) => <ProductImage key={it.sku} src={it.image} alt={it.name} label={it.name} className="h-12 w-14 rounded-lg bg-ink-50" />)}
                      {(o.items?.length || 0) > 4 && <span className="inline-flex h-12 w-14 items-center justify-center rounded-lg bg-ink-100 text-xs font-semibold text-ink-600">+{o.items.length - 4}</span>}
                      <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-brand-600">View details<Icon name="chevronRight" className="h-4 w-4" /></span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={state.meta.page || page} totalPages={state.meta.totalPages || 1} onChange={(p) => setParam('page', String(p))} />
          </>
        )}
    </div>
  );
}
