// Preloaded with `node --import` so the REAL src/index.js can boot with no MongoDB server.
// Replaces mongoose.connect and the Product/Brand/Category/RecentlyViewed query methods with in-memory fakes.
import mongoose from 'mongoose';
import Brand from '../src/models/Brand.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import RecentlyViewed from '../src/models/RecentlyViewed.js';

const oid = (n) => new mongoose.Types.ObjectId(String(n).padStart(24, '0'));
const cats = [{ _id: oid(1), name: 'Footwear', slug: 'footwear' }, { _id: oid(2), name: 'Electronics', slug: 'electronics' }];
const brands = [{ _id: oid(11), name: 'Nike', slug: 'nike', isActive: true }, { _id: oid(12), name: 'Sony', slug: 'sony', isActive: true }];
const mk = (n, name, cat, brand, price, sold, extra = {}) => ({
  _id: oid(100 + n), name, slug: name.toLowerCase().replace(/\W+/g, '-'), sku: `SKU-${n}`, description: `${name} description`,
  price, discountPercent: 0, finalPrice: price, stock: 20, lowStockThreshold: 5, inStock: true, ratingAvg: 4, ratingCount: 10, soldCount: sold,
  isActive: true, tags: ['shoes'], images: [{ url: 'https://img.test/a.jpg', alt: name }], category: cat, brand, createdAt: new Date(2026, 0, n), updatedAt: new Date(2026, 0, n), ...extra,
});
export const products = [
  mk(1, 'Nike Running Shoes', cats[0], brands[0], 5000, 90), mk(2, 'Nike Casual Sneakers', cats[0], brands[0], 4000, 50),
  mk(3, 'Sony Headphones', cats[1], brands[1], 9000, 70, { tags: ['audio'] }), mk(4, 'Hidden Nike Boots', cats[0], brands[0], 3000, 10, { isActive: false }),
];

// Tiny chainable query: filter -> sort -> skip -> limit -> populate -> lean, awaitable.
function query(list) {
  const state = { list: [...list] };
  const q = {
    sort(spec) { const [[k, d]] = Object.entries(spec); state.list.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * d); return q; },
    skip(n) { state.list = state.list.slice(n); return q; }, limit(n) { state.list = state.list.slice(0, n); return q; },
    populate() { return q; }, select() { return q; }, lean() { return q; },
    then(res, rej) { return Promise.resolve(state.list).then(res, rej); },
  };
  return q;
}
// Understands the filter operators the app's buildFilter produces for these tests.
const matches = (doc, filter) => Object.entries(filter).every(([key, cond]) => {
  if (key === '$and') return cond.every((c) => matches(doc, c));
  if (key === '$or') return cond.some((c) => matches(doc, c));
  const value = key.split('.').reduce((o, k) => o?.[k], doc);
  const test = (v) => (cond instanceof RegExp ? cond.test(String(v)) : cond && typeof cond === 'object' && !cond._bsontype && !(cond instanceof Date) && !Array.isArray(cond)
    ? Object.entries(cond).every(([op, arg]) => ({ $gte: (x) => x >= arg, $lte: (x) => x <= arg, $ne: (x) => String(x) !== String(arg), $in: (x) => arg.some((a) => String(a?._id ?? a) === String(x?._id ?? x)), $nin: (x) => !arg.some((a) => String(a) === String(x)) })[op](v))
    : String(v?._id ?? v) === String(cond));
  return Array.isArray(value) ? value.some(test) : test(value);
});
Product.find = (filter = {}) => query(products.filter((p) => matches(p, filter)));
Product.countDocuments = async (filter = {}) => products.filter((p) => matches(p, filter)).length;
Product.findById = (id) => { const q = query(products.filter((p) => String(p._id) === String(id))); const t = q.then.bind(q); q.then = (res, rej) => t((l) => l[0]).then(res, rej); return q; };
Brand.find = (filter = {}) => query(brands.filter((b) => matches(b, filter)));
Category.find = (filter = {}) => query(cats.filter((c) => matches(c, filter)));
RecentlyViewed.find = () => query([]);
Product.distinct = async () => [];
Category.findOne = Brand.findOne = () => query([]);

let connected = false; // models are compiled before connect(); report "connected" only afterwards
mongoose.connect = async () => { connected = true; };
Object.defineProperty(mongoose.connection, 'readyState', { get: () => (connected ? 1 : 0) });
Object.defineProperty(mongoose.connection, 'db', { get: () => ({ admin: () => ({ ping: async () => ({ ok: 1 }) }) }) });
Object.defineProperty(mongoose.connection, 'name', { get: () => 'stubdb' });
mongoose.disconnect = async () => { connected = false; };
