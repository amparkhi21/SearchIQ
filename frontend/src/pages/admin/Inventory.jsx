import { useEffect, useMemo, useState } from 'react';
import { listAllProducts, updateProduct } from '../../api/product.api';
import { errorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { AdminHeader, Kpi } from '../../components/admin/AdminUI';
import Icon from '../../components/ui/Icon';
import Pagination from '../../components/ui/Pagination';
import ErrorState from '../../components/ui/ErrorState';
import ProductImage from '../../components/ui/ProductImage';
import { RowSkeleton } from '../../components/ui/Skeletons';
import { Spinner } from '../../components/ui/Loader';
import { productImages, stockState } from '../../utils/product';
import { formatNumber } from '../../utils/format';

const PAGE = 20;
const FILTERS = [['all', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']];

function StockEditor({ product, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(String(product.stock)), [product.stock]);
  const n = Number(value);
  const valid = value !== '' && Number.isInteger(n) && n >= 0;
  const dirty = valid && n !== product.stock;
  const save = async () => {
    setSaving(true);
    try { const d = await updateProduct(product.id, { stock: n }); onSaved(d.product); toast.success(`Stock updated for ${product.sku}`); }
    catch (e) { toast.error(errorMessage(e, 'Could not update stock')); } finally { setSaving(false); }
  };
  return (
    <div className="flex items-center justify-end gap-2">
      <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && dirty) save(); }}
        className={`input h-8 w-20 text-right text-sm ${!valid ? 'input-error' : ''}`} aria-label={`Stock for ${product.name}`} />
      <button type="button" className="btn-primary btn-sm w-16" disabled={!dirty || saving} onClick={save}>{saving ? <Spinner className="h-3.5 w-3.5" /> : 'Save'}</button>
    </div>
  );
}

export default function Inventory() {
  const [s, setS] = useState({ loading: true, error: '', products: [] });
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    setS((x) => ({ ...x, loading: true, error: '' }));
    listAllProducts({ includeInactive: 'true' }).then((products) => setS({ loading: false, error: '', products })).catch((e) => setS({ loading: false, error: errorMessage(e, 'Could not load inventory'), products: [] }));
  };
  useEffect(load, []);
  useEffect(() => setPage(1), [filter, q]);

  const counts = useMemo(() => ({
    total: s.products.length,
    units: s.products.reduce((a, p) => a + (p.stock || 0), 0),
    low: s.products.filter((p) => stockState(p) === 'low').length,
    out: s.products.filter((p) => stockState(p) === 'out').length,
  }), [s.products]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return s.products
      .filter((p) => (filter === 'all' || stockState(p) === filter) && (!t || p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)))
      .sort((a, b) => a.stock - b.stock);
  }, [s.products, filter, q]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const slice = rows.slice((page - 1) * PAGE, page * PAGE);

  const replace = (p) => setS((x) => ({ ...x, products: x.products.map((i) => (i.id === p.id ? { ...i, ...p } : i)) }));

  return (
    <>
      <AdminHeader title="Inventory" subtitle="Track and adjust stock levels" />
      {s.loading ? <RowSkeleton rows={5} /> : s.error ? <ErrorState message={s.error} onRetry={load} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Kpi label="SKUs" value={formatNumber(counts.total)} icon="package" />
            <Kpi label="Units in stock" value={formatNumber(counts.units)} icon="layers" tone="sky" />
            <Kpi label="Low stock" value={formatNumber(counts.low)} icon="alert" tone="amber" />
            <Kpi label="Out of stock" value={formatNumber(counts.out)} icon="alert" tone="red" />
          </div>
          <div className="my-5 flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5" role="tablist">{FILTERS.map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={filter === v} onClick={() => setFilter(v)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === v ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50'}`}>{l}</button>)}</div>
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" /><input className="input h-9 pl-9" placeholder="Search name or SKU" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search inventory" /></div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Product</th><th>SKU</th><th>Status</th><th className="text-right">Alert at</th><th className="text-right">Stock</th></tr></thead>
              <tbody>
                {slice.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-ink-400">Nothing matches this filter</td></tr> : slice.map((p) => {
                  const st = stockState(p);
                  return (
                    <tr key={p.id}>
                      <td className="max-w-[20rem]"><div className="flex items-center gap-3"><ProductImage src={productImages(p)[0]?.url} alt="" label={p.name} className="h-10 w-12 shrink-0 rounded-lg bg-ink-50" /><span className="truncate font-medium">{p.name}</span></div></td>
                      <td className="whitespace-nowrap text-ink-500">{p.sku}</td>
                      <td>{st === 'out' ? <span className="badge-danger">Out of stock</span> : st === 'low' ? <span className="badge-warn">Low stock</span> : <span className="badge-success">In stock</span>}</td>
                      <td className="text-right text-ink-500">{p.lowStockThreshold}</td>
                      <td><StockEditor product={p} onSaved={replace} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
