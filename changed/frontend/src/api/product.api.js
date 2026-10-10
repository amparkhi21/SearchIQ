import { api, unwrap, unwrapWithMeta } from './axios';

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** → { products, meta } */
export const listProducts = async (params = {}, config = {}) => unwrapWithMeta(await api.get('/products', { params: clean(params), ...config }));
export const getProduct = async (idOrSlug) => unwrap(await api.get(`/products/${idOrSlug}`));
export const createProduct = async (payload) => unwrap(await api.post('/products', payload));
export const updateProduct = async (id, payload) => unwrap(await api.put(`/products/${id}`, payload));
export const deleteProduct = async (id) => unwrap(await api.delete(`/products/${id}`));
export const listCategories = async (params = {}) => unwrap(await api.get('/categories', { params: clean(params) }));
export const listBrands = async (params = {}) => unwrap(await api.get('/brands', { params: clean(params) }));

/** Admin helper: walk every page (max 100 per page) of the catalog, including hidden products. */
export async function listAllProducts(params = {}) {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const d = await listProducts({ ...params, page, limit: 100 });
    all.push(...(d.products || []));
    totalPages = d.meta?.totalPages || 1;
    page += 1;
  } while (page <= totalPages && page <= 20);
  return all;
}
