import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';

function userIdOf(user) {
  return user?._id ?? user?.id;
}

function normalizeId(id) {
  return mongoose.isValidObjectId(id) ? id : null;
}

function publicDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id?.toString() };
}

async function loadCart(userId) {
  let cart = await Cart.findOne({ user: userId }).lean();
  if (!cart) {
    const created = await Cart.create({ user: userId, items: [] });
    cart = created.toObject();
  }

  const ids = (cart.items ?? []).map((item) => item.product).filter(Boolean);
  const products = ids.length
    ? await Product.find({ _id: { $in: ids } })
        .populate({ path: 'category', select: 'name slug' })
        .populate({ path: 'brand', select: 'name slug logo' })
        .lean()
    : [];

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const items = (cart.items ?? []).map((item) => ({
    product: publicDoc(productMap.get(item.product.toString())),
    quantity: item.quantity,
  }));

  return {
    id: cart._id?.toString(),
    user: cart.user?.toString(),
    items,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

export async function getCart(user) {
  return loadCart(userIdOf(user));
}

export async function addToCart(user, productId, quantity) {
  const id = normalizeId(productId);
  if (!id) throw ApiError.badRequest('Invalid product id');

  const product = await Product.findOne({ _id: id, isActive: true });
  if (!product) throw ApiError.notFound('Product not found');
  if (product.stock < quantity) throw ApiError.badRequest(`Only ${product.stock} item(s) are available`);

  const cart = await Cart.findOneAndUpdate(
    { user: userIdOf(user) },
    { $setOnInsert: { user: userIdOf(user), items: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const existing = cart.items.find((item) => item.product.toString() === id.toString());
  if (existing) {
    const nextQuantity = existing.quantity + quantity;
    if (nextQuantity > product.stock) {
      throw ApiError.badRequest(`Only ${product.stock} item(s) are available`);
    }
    existing.quantity = nextQuantity;
  } else {
    cart.items.push({ product: id, quantity });
  }

  await cart.save();
  return loadCart(userIdOf(user));
}

export async function updateCartItem(user, productId, quantity) {
  const id = normalizeId(productId);
  if (!id) throw ApiError.badRequest('Invalid product id');

  const product = await Product.findOne({ _id: id, isActive: true });
  if (!product) throw ApiError.notFound('Product not found');
  if (product.stock < quantity) throw ApiError.badRequest(`Only ${product.stock} item(s) are available`);

  const cart = await Cart.findOne({ user: userIdOf(user) });
  if (!cart) throw ApiError.notFound('Cart not found');
  const item = cart.items.find((entry) => entry.product.toString() === id.toString());
  if (!item) throw ApiError.notFound('Product is not in your cart');

  item.quantity = quantity;
  await cart.save();
  return loadCart(userIdOf(user));
}

export async function removeFromCart(user, productId) {
  const id = normalizeId(productId);
  if (!id) throw ApiError.badRequest('Invalid product id');
  const cart = await Cart.findOne({ user: userIdOf(user) });
  if (!cart) throw ApiError.notFound('Cart not found');
  const original = cart.items.length;
  cart.items = cart.items.filter((item) => item.product.toString() !== id.toString());
  if (cart.items.length === original) throw ApiError.notFound('Product is not in your cart');
  await cart.save();
  return loadCart(userIdOf(user));
}

export async function clearCart(user) {
  await Cart.findOneAndUpdate({ user: userIdOf(user) }, { $set: { items: [] } }, { upsert: true });
  return loadCart(userIdOf(user));
}
