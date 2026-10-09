import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAllProducts } from '../../api/product.api';
import { listAdminOrders, searchAnalytics } from '../../api/admin.api';
import { AdminHeader, BarList, Kpi, Panel, TrendChart } from '../../components/admin/AdminUI';
import StatusBadge from '../../components/ui/StatusBadge';
import { RowSkeleton } from '../../components/ui/Skeletons';
import ErrorState from '../../components/ui/ErrorState';
import { ORDER_STATUS } from '../../utils/constants';
import { formatDate, formatNumber, percent } from '../../utils/format';
import formatCurrency from '../../utils/formatCurrency';
import { stockState } from '../../utils/product';

export default function Dashboard() {
  const [s, setS] = useState({ loading: true, error: '', products: [], orders: [], ordersTotal: 0, analytics: null });
  const load = () => {
    setS((x) => ({ ...x, loading: true, error: '' }));
    Promise.all([listAllProducts({ includeInactive: 'true' }), listAdminOrders({ limit: 100 }), searchAnalytics({ days: 7 })])
      .then(([products, o, analytics]) => setS({ loading: false, error: '', products, orders: o.orders || [], ordersTotal: o.meta?.total ?? (o.orders || []).length, analytics }))
      .catch((e) => setS((x) => ({ ...x, loading: false, error: e?.response?.data?.message || 'Could not load the dashboard' })));
  };
  useEffect(load, []);

  if (s.loading) return <><AdminHeader title="Dashboard" /><RowSkeleton rows={4} /></>;
  if (s.error) return <><AdminHeader title="Dashboard" /><ErrorState message={s.error} onRetry={load} /></>;

  const active = s.products.filter((p) => p.isActive !== false);
  const low = active.filter((p) => stockState(p) === 'low');
  const out = active.filter((p) => stockState(p) === 'out');
  const revenue = s.orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const statusCounts = Object.keys(ORDER_STATUS).map((k) => ({ label: ORDER_STATUS[k].label, value: s.orders.filter((o) => o.status === k).length }));
  const open = s.orders.filter((o) => ['placed', 'confirmed'].includes(o.status)).length;
  const a = s.analytics?.summary || {};
  const daily = (s.analytics?.daily || []).map((d) => ({ date: d.date, a: d.searches, b: d.zeroResultSearches }));

  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Store health at a glance" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Active products" value={formatNumber(active.length)} hint={`${s.products.length - active.length} hidden`} icon="package" />
        <Kpi label="Orders" value={formatNumber(s.ordersTotal)} hint={`${open} awaiting action`} icon="box" tone="sky" />
        <Kpi label="Revenue (latest 100)" value={formatCurrency(revenue)} hint="Excludes cancelled" icon="trendUp" tone="green" />
        <Kpi label="Needs restock" value={formatNumber(low.length + out.length)} hint={`${out.length} out · ${low.length} low`} icon="alert" tone={out.length ? 'red' : 'amber'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Search activity · 7 days" className="lg:col-span-2" action={<Link to="/admin/analytics" className="link text-sm">Details</Link>}>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            {[['Searches', formatNumber(a.totalSearches)], ['Unique users', formatNumber(a.uniqueUsers)], ['Zero-result rate', percent(a.zeroResultRate)]].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-ink-50 p-3"><p className="text-lg font-bold">{v}</p><p className="text-xs text-ink-500">{l}</p></div>
            ))}
          </div>
          <TrendChart data={daily} />
        </Panel>
        <Panel title="Orders by status"><BarList items={statusCounts} empty="No orders yet" /></Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Recent orders" action={<Link to="/admin/orders" className="link text-sm">All orders</Link>}>
          {s.orders.length === 0 ? <p className="py-6 text-center text-sm text-ink-400">No orders yet</p> : (
            <ul className="divide-y divide-ink-100">
              {s.orders.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{o.orderNumber}</p><p className="truncate text-xs text-ink-500">{o.user?.name || o.user?.email || 'Customer'} · {formatDate(o.createdAt)}</p></div>
                  <div className="flex shrink-0 items-center gap-3"><StatusBadge status={o.status} /><span className="w-20 text-right text-sm font-semibold">{formatCurrency(o.total)}</span></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Low stock" action={<Link to="/admin/inventory" className="link text-sm">Manage inventory</Link>}>
          {[...out, ...low].length === 0 ? <p className="py-6 text-center text-sm text-ink-400">Everything is well stocked 🎉</p> : (
            <ul className="divide-y divide-ink-100">
              {[...out, ...low].slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{p.name}</p><p className="text-xs text-ink-500">{p.sku}</p></div>
                  {stockState(p) === 'out' ? <span className="badge-danger">Out of stock</span> : <span className="badge-warn">{p.stock} left</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
