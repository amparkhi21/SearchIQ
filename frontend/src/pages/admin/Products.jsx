import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as productApi from '../../api/product.api';
import { errorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { AdminHeader } from '../../components/admin/AdminUI';
import ProductFormModal from '../../components/admin/ProductFormModal';
import Icon from '../../components/ui/Icon';
import Pagination from '../../components/ui/Pagination';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import ProductImage from '../../components/ui/ProductImage';
import { RowSkeleton } from '../../components/ui/Skeletons';
import useDebounce from '../../hooks/useDebounce';
import { productImages, productPath, stockState } from '../../utils/product';
import formatCurrency from '../../utils/formatCurrency';

export default function AdminProducts() {
  const toast = useToast();
  useAuth();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [s, setS] = useState({ loading: true, error: '', products: [], meta: {} });
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = create, object = edit
  const dq = useDebounce(q.trim(), 350);

  useEffect(() => {
    Promise.all([productApi.listCategories(), productApi.listBrands()]).then(([c, b]) => { setCats(c.categories || []); setBrands(b.brands || []); }).catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [dq, category]);

  const load = useCallback(async () => {
    setS((x) => ({ ...x, loading: true, error: '' }));
    try {
      const d = await productApi.listProducts({ page, limit: 15, includeInactive: 'true', sort: 'newest', q: dq, category });
      setS({ loading: false, error: '', products: d.products || [], meta: d.meta || {} });
    } catch (e) { setS({ loading: false, error: errorMessage(e, 'Could not load products'), products: [], meta: {} }); }
  }, [page, dq, category]);
  useEffect(() => { load(); }, [load]);

  const toggleActive = async (p) => {
    try {
      const d = await productApi.updateProduct(p.id, { isActive: !p.isActive });
      setS((x) => ({ ...x, products: x.products.map((i) => (i.id === p.id ? { ...i, ...d.product } : i)) }));
      toast.success(d.product.isActive ? 'Product is now visible' : 'Product hidden from the store');
    } catch (e) { toast.error(errorMessage(e, 'Could not update the product')); }
  };

  return (
    <>
      <AdminHeader title="Products" subtitle={s.meta.total != null ? `${s.meta.total} products` : undefined}
        actions={<button type="button" className="btn-primary" onClick={() => setEditing(null)}><Icon name="plus" className="h-4 w-4" />New product</button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1 sm:max-w-sm"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" /><input className="input pl-9" placeholder="Search by name or SKU" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" /></div>
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category"><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
      </div>

      {s.loading ? <RowSkeleton rows={6} /> : s.error ? <ErrorState message={s.error} onRetry={load} />
        : s.products.length === 0 ? <EmptyState icon="package" title="No products found" text="Try a different search or category." />
        : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Product</th><th>Category</th><th className="text-right">Price</th><th className="text-right">Stock</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {s.products.map((p) => {
                    const st = stockState(p);
                    return (
                      <tr key={p.id} className={p.isActive === false ? 'opacity-60' : ''}>
                        <td className="max-w-[22rem]">
                          <div className="flex items-center gap-3">
                            <ProductImage src={productImages(p)[0]?.url} alt="" label={p.name} className="h-11 w-14 shrink-0 rounded-lg bg-ink-50" />
                            <div className="min-w-0"><Link to={productPath(p)} className="block truncate font-medium hover:text-brand-700">{p.name}</Link><p className="truncate text-xs text-ink-400">{p.brand?.name} · {p.sku}</p></div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-ink-600">{p.category?.name}</td>
                        <td className="whitespace-nowrap text-right"><span className="font-semibold">{formatCurrency(p.finalPrice)}</span>{p.discountPercent > 0 && <span className="ml-1.5 text-xs text-emerald-600">-{Math.round(p.discountPercent)}%</span>}</td>
                        <td className="text-right"><span className={`badge-${st === 'out' ? 'danger' : st === 'low' ? 'warn' : 'success'}`}>{p.stock}</span></td>
                        <td>{p.isActive === false ? <span className="badge-neutral">Hidden</span> : <span className="badge-success">Live</span>}</td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button type="button" className="btn-ghost btn-sm" onClick={() => toggleActive(p)}>{p.isActive === false ? 'Show' : 'Hide'}</button>
                            <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(p)}><Icon name="edit" className="h-3.5 w-3.5" />Edit</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={s.meta.page || page} totalPages={s.meta.totalPages || 1} onChange={setPage} />
          </>
        )}

      <ProductFormModal open={editing !== undefined} product={editing || null} categories={cats} brands={brands} onClose={() => setEditing(undefined)}
        onSaved={(p, wasEdit) => { setEditing(undefined); toast.success(wasEdit ? 'Product updated' : 'Product created'); load(); }} />
    </>
  );
}
