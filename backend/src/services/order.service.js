import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';
import { createNotification } from './notification.service.js';
import { updateProductSearchFacts } from './indexing.service.js';
import logger from '../config/logger.js';

const SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 49;
const ALLOWED_CANCEL_STATUSES = new Set(['placed', 'confirmed']);

function userIdOf(user) { return user?._id ?? user?.id; }
function money(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function makeOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SQ-${stamp}-${random}`;
}
function addressSnapshot(address) {
  return {
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}

async function getShippingAddress(userId, addressId) {
  const user = await User.findById(userId).select('addresses');
  if (!user) throw ApiError.unauthorized('Account not found');
  if (addressId) {
    if (!mongoose.isValidObjectId(addressId)) throw ApiError.badRequest('Invalid address id');
    const address = user.addresses.id(addressId);
    if (!address) throw ApiError.notFound('Address not found');
    return addressSnapshot(address);
  }
  const defaultAddress = user.addresses.find((address) => address.isDefault) ?? user.addresses[0];
  if (!defaultAddress) throw ApiError.badRequest('Add a shipping address before placing an order');
  return addressSnapshot(defaultAddress);
}

async function rollbackStock(changes) {
  await Promise.all(changes.map(({ productId, quantity }) =>
    Product.updateOne({ _id: productId }, { $inc: { stock: quantity, soldCount: -quantity } })));
}

async function syncInventoryAfterChange(productIds) {
  await Promise.allSettled(
    productIds.map(async (productId) => {
      const product = await Product.findById(productId).select('stock lowStockThreshold inStock soldCount').lean();
      if (!product) return;
      const stockStatus = product.stock <= 0
        ? 'out_of_stock'
        : product.stock <= product.lowStockThreshold
          ? 'low_stock'
          : 'in_stock';
      await updateProductSearchFacts(productId, {
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        inStock: product.inStock,
        stockStatus,
        soldCount: product.soldCount,
      });
    }),
  ).then((results) => {
    results.filter((result) => result.status === 'rejected').forEach((result) => {
      logger.warn('Search inventory sync failed', { error: result.reason?.message });
    });
  });
}

export async function createOrder(user, { addressId, paymentMethod }) {
  const userId = userIdOf(user);
  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: [
      { path: 'category', select: 'name slug' },
      { path: 'brand', select: 'name slug' },
    ],
  });
  if (!cart || cart.items.length === 0) throw ApiError.badRequest('Your cart is empty');

  const shippingAddress = await getShippingAddress(userId, addressId);
  const orderItems = [];
  const stockChanges = [];
  let subtotal = 0;

  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isActive) throw ApiError.badRequest('One or more cart products are no longer available');
    const qty = item.quantity;
    const updated = await Product.findOneAndUpdate(
      { _id: product._id, isActive: true, stock: { $gte: qty } },
      { $inc: { stock: -qty, soldCount: qty } },
      { new: true },
    ).select('name sku images price finalPrice');
    if (!updated) {
      await rollbackStock(stockChanges);
      throw ApiError.badRequest(`Insufficient stock for ${product.name}`);
    }
    stockChanges.push({ productId: product._id, quantity: qty });
    const lineTotal = money(updated.finalPrice * qty);
    subtotal = money(subtotal + lineTotal);
    orderItems.push({
      product: updated._id,
      name: updated.name,
      sku: updated.sku,
      image: updated.images?.[0]?.url,
      quantity: qty,
      unitPrice: updated.finalPrice,
      listPrice: updated.price,
      lineTotal,
    });
  }

  const shippingFee = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = money(subtotal + shippingFee);

  let order;
  try {
    order = await Order.create({
      orderNumber: makeOrderNumber(),
      user: userId,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingFee,
      total,
      paymentMethod,
      paymentStatus: 'pending',
      status: 'placed',
    });
  } catch (error) {
    await rollbackStock(stockChanges);
    throw error;
  }

  await Cart.updateOne({ _id: cart._id }, { $set: { items: [] } });
  await syncInventoryAfterChange(stockChanges.map((entry) => entry.productId));
  await createNotification({
    userId,
    type: 'order',
    title: 'Order placed',
    message: `Your order ${order.orderNumber} has been placed successfully.`,
    data: { orderId: order.id, orderNumber: order.orderNumber },
  });
  return order;
}

export async function listOrders(user, query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { user: userIdOf(user) };
  if (query.status) filter.status = query.status;
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  return { orders, meta: buildPaginationMeta({ total, page, limit }) };
}

export async function getOrder(user, orderId) {
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.badRequest('Invalid order id');
  const order = await Order.findOne({ _id: orderId, user: userIdOf(user) });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

export async function cancelOrder(user, orderId, reason) {
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.badRequest('Invalid order id');
  const order = await Order.findOne({ _id: orderId, user: userIdOf(user) });
  if (!order) throw ApiError.notFound('Order not found');
  if (!ALLOWED_CANCEL_STATUSES.has(order.status)) throw ApiError.badRequest('This order can no longer be cancelled');

  for (const item of order.items) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity, soldCount: -item.quantity } });
  }
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  if (reason) order.cancelReason = reason;
  if (order.paymentStatus === 'paid') order.paymentStatus = 'refunded';
  await order.save();
  await syncInventoryAfterChange(order.items.map((item) => item.product));
  await createNotification({
    userId: userIdOf(user),
    type: 'order',
    title: 'Order cancelled',
    message: `Order ${order.orderNumber} has been cancelled.`,
    data: { orderId: order.id, orderNumber: order.orderNumber },
  });
  return order;
}
