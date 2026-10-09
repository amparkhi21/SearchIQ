import { useEffect, useState } from 'react';
import * as productApi from '../../api/product.api';
import { errorMessage } from '../../api/axios';
import Modal from '../ui/Modal';
import { Spinner } from '../ui/Loader';

const EMPTY = { name: '', sku: '', category: '', brand: '', price: '', discountPercent: '0', stock: '0', lowStockThreshold: '5', description: '', isActive: true };

/** Create (product=null) or edit. Edit sends only the editable core fields, as a partial PUT. */
export default function ProductFormModal({ open, product, categories, brands, onClose, onSaved }) {
  const editing = Boolean(product);
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({}); setServerError('');
    setF(product ? {
      name: product.name, sku: product.sku, category: product.category?.id || '', brand: product.brand?.id || '', price: String(product.price),
      discountPercent: String(product.discountPercent ?? 0), stock: String(product.stock ?? 0), lowStockThreshold: String(product.lowStockThreshold ?? 5),
      description: product.description || '', isActive: product.isActive !== false,
    } : EMPTY);
  }, [open, product]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const cls = (k) => `input ${errors[k] ? 'input-error' : ''}`;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (f.name.trim().length < 2) errs.name = 'Name is required';
    if (!editing && !/^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/.test(f.sku.trim())) errs.sku = '3–40 characters: letters, numbers, - or _';
    if (!f.category) errs.category = 'Choose a category';
    if (!f.brand) errs.brand = 'Choose a brand';
    if (!(Number(f.price) > 0)) errs.price = 'Price must be greater than 0';
    if (f.discountPercent === '' || Number(f.discountPercent) < 0 || Number(f.discountPercent) > 90) errs.discountPercent = '0–90';
    if (!Number.isInteger(Number(f.stock)) || Number(f.stock) < 0) errs.stock = 'Whole number ≥ 0';
    if (f.description.trim().length < 10) errs.description = 'At least 10 characters';
    setErrors(errs); setServerError('');
    if (Object.keys(errs).length) return;
    const body = {
      name: f.name.trim(), description: f.description.trim(), category: f.category, brand: f.brand,
      price: Number(f.price), discountPercent: Number(f.discountPercent), stock: Number(f.stock),
      lowStockThreshold: Number(f.lowStockThreshold) || 0, isActive: f.isActive,
    };
    setSaving(true);
    try {
      const d = editing ? await productApi.updateProduct(product.id, body) : await productApi.createProduct({ ...body, sku: f.sku.trim() });
      onSaved(d.product, editing);
    } catch (err) { setServerError(errorMessage(err, 'Could not save the product')); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={() => !saving && onClose()} title={editing ? 'Edit product' : 'New product'} size="max-w-2xl"
      footer={<><button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" form="product-form" className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />}{editing ? 'Save changes' : 'Create product'}</button></>}>
      <form id="product-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {serverError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{serverError}</div>}
        <div className="sm:col-span-2"><label className="field-label" htmlFor="pf-name">Name</label><input id="pf-name" className={cls('name')} value={f.name} onChange={set('name')} />{errors.name && <p className="field-error">{errors.name}</p>}</div>
        <div><label className="field-label" htmlFor="pf-sku">SKU</label><input id="pf-sku" className={cls('sku')} value={f.sku} onChange={set('sku')} disabled={editing} />{errors.sku && <p className="field-error">{errors.sku}</p>}</div>
        <div className="flex items-end"><label className="flex items-center gap-2.5 pb-2 text-sm text-ink-700"><input type="checkbox" checked={f.isActive} onChange={set('isActive')} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />Visible in store</label></div>
        <div><label className="field-label" htmlFor="pf-cat">Category</label><select id="pf-cat" className={cls('category')} value={f.category} onChange={set('category')}><option value="">Select…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{errors.category && <p className="field-error">{errors.category}</p>}</div>
        <div><label className="field-label" htmlFor="pf-brand">Brand</label><select id="pf-brand" className={cls('brand')} value={f.brand} onChange={set('brand')}><option value="">Select…</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>{errors.brand && <p className="field-error">{errors.brand}</p>}</div>
        <div><label className="field-label" htmlFor="pf-price">Price (₹)</label><input id="pf-price" type="number" min="0" step="any" className={cls('price')} value={f.price} onChange={set('price')} />{errors.price && <p className="field-error">{errors.price}</p>}</div>
        <div><label className="field-label" htmlFor="pf-disc">Discount (%)</label><input id="pf-disc" type="number" min="0" max="90" className={cls('discountPercent')} value={f.discountPercent} onChange={set('discountPercent')} />{errors.discountPercent && <p className="field-error">{errors.discountPercent}</p>}</div>
        <div><label className="field-label" htmlFor="pf-stock">Stock</label><input id="pf-stock" type="number" min="0" className={cls('stock')} value={f.stock} onChange={set('stock')} />{errors.stock && <p className="field-error">{errors.stock}</p>}</div>
        <div><label className="field-label" htmlFor="pf-low">Low-stock alert at</label><input id="pf-low" type="number" min="0" className="input" value={f.lowStockThreshold} onChange={set('lowStockThreshold')} /></div>
        <div className="sm:col-span-2"><label className="field-label" htmlFor="pf-desc">Description</label><textarea id="pf-desc" className={cls('description')} value={f.description} onChange={set('description')} />{errors.description && <p className="field-error">{errors.description}</p>}</div>
        {!editing && <p className="field-hint sm:col-span-2">Images and tags can be added later; new products appear in search once indexed.</p>}
      </form>
    </Modal>
  );
}
