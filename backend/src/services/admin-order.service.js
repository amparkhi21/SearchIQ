import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';
import { createNotification } from './notification.service.js';
import { updateProductSearchFacts } from './indexing.service.js';
import { invalidateCatalogSearchCache } from './search-cache.service.js';
import logger from '../config/logger.js';

async function restoreInventoryItem(productId, quantity) {
  await Product.updateOne({ _id: productId }, [
    { $set: { stock: { $add: ['$stock', quantity] }, soldCount: { $max: [0, { $subtract: ['$soldCount', quantity] }] } } },
    { $set: { inStock: { $gt: ['$stock', 0] } } },
  ]);
  const product = await Product.findById(productId).select('stock lowStockThreshold soldCount').lean();
  if (product) {
    const stockStatus = product.stock <= 0 ? 'out_of_stock' : product.stock <= product.lowStockThreshold ? 'low_stock' : 'in_stock';
    try { await updateProductSearchFacts(productId, { stock: product.stock, inStock: product.stock > 0, stockStatus, soldCount: product.soldCount }); }
    catch (error) { logger.warn('Admin cancellation inventory search sync failed', { productId: String(productId), error: error.message }); }
  }
  await invalidateCatalogSearchCache();
}

const TRANSITIONS = Object.freeze({
  placed: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['shipped', 'cancelled']),
  shipped: new Set(['out-for-delivery']),
  'out-for-delivery': new Set(['delivered']),
  delivered: new Set(),
  cancelled: new Set(),
});

export async function listOrders(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = query.status ? { status: query.status } : {};
  const [orders, total] = await Promise.all([
    Order.find(filter).populate({ path: 'user', select: 'name email phone' }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  return { orders, meta: buildPaginationMeta({ total, page, limit }) };
}

export async function getOrder(orderId) {
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.badRequest('Invalid order id');
  const order = await Order.findById(orderId).populate({ path: 'user', select: 'name email phone' });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

export async function updateOrderStatus(orderId, nextStatus, note) {
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.badRequest('Invalid order id');
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status === nextStatus) throw ApiError.badRequest(`Order is already ${nextStatus}`);
  if (!TRANSITIONS[order.status]?.has(nextStatus)) {
    throw ApiError.badRequest(`Cannot change order status from ${order.status} to ${nextStatus}`);
  }

  if (nextStatus === 'cancelled') {
    for (const item of order.items) {
      await restoreInventoryItem(item.product, item.quantity);
    }
    if (order.paymentStatus === 'paid') order.paymentStatus = 'refunded';
    order.cancelledAt = new Date();
    if (note) order.cancelReason = note;
  }
  order.status = nextStatus;
  if (nextStatus === 'delivered' && order.paymentMethod === 'cod') order.paymentStatus = 'paid';
  await order.save();

  await createNotification({
    userId: order.user,
    type: 'order',
    title: `Order ${nextStatus}`,
    message: note ? `${order.orderNumber}: ${note}` : `Your order ${order.orderNumber} is now ${nextStatus}.`,
    data: { orderId: order.id, orderNumber: order.orderNumber, status: nextStatus },
  });
  return order;
}
