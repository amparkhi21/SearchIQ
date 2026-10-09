import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';
import { updateProductSearchFacts } from './indexing.service.js';

const PRODUCT_POPULATE = { path: 'user', select: 'name avatar' };
const userIdOf = (user) => user?._id ?? user?.id;

async function assertDeliveredPurchase(userId, productId) {
  const order = await Order.findOne({
    user: userId,
    status: 'delivered',
    'items.product': productId,
  }).select('_id');
  if (!order) throw ApiError.forbidden('You can review a product only after a delivered purchase');
}

async function refreshProductRating(productId) {
  const result = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const ratingAvg = result[0]?.avg ?? 0;
  const ratingCount = result[0]?.count ?? 0;
  const nextAvg = Math.round(ratingAvg * 10) / 10;
  await Product.findByIdAndUpdate(productId, { ratingAvg: nextAvg, ratingCount });
  try {
    await updateProductSearchFacts(productId, { ratingAvg: nextAvg, ratingCount });
  } catch {
    // Search index is derived data; a review must still succeed if OpenSearch is temporarily unavailable.
  }
}

export async function listProductReviews(productId, query) {
  if (!mongoose.isValidObjectId(productId)) throw ApiError.badRequest('Invalid product id');
  if (!(await Product.exists({ _id: productId, isActive: true }))) throw ApiError.notFound('Product not found');
  const { page, limit, skip } = getPagination(query);
  const [reviews, total] = await Promise.all([
    Review.find({ product: productId }).populate(PRODUCT_POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments({ product: productId }),
  ]);
  return { reviews, meta: buildPaginationMeta({ total, page, limit }) };
}

export async function createReview(user, productId, data) {
  const userId = userIdOf(user);
  if (!mongoose.isValidObjectId(productId)) throw ApiError.badRequest('Invalid product id');
  const product = await Product.findOne({ _id: productId, isActive: true }).select('_id');
  if (!product) throw ApiError.notFound('Product not found');
  await assertDeliveredPurchase(userId, productId);
  if (await Review.exists({ user: userId, product: productId })) throw ApiError.conflict('You have already reviewed this product');
  const review = await Review.create({ product: productId, user: userId, ...data, isVerifiedPurchase: true });
  await refreshProductRating(productId);
  return Review.findById(review._id).populate(PRODUCT_POPULATE);
}

export async function updateReview(user, reviewId, data) {
  if (!mongoose.isValidObjectId(reviewId)) throw ApiError.badRequest('Invalid review id');
  const review = await Review.findOneAndUpdate({ _id: reviewId, user: userIdOf(user) }, { $set: data }, { new: true, runValidators: true }).populate(PRODUCT_POPULATE);
  if (!review) throw ApiError.notFound('Review not found');
  await refreshProductRating(review.product);
  return review;
}

export async function deleteReview(user, reviewId) {
  if (!mongoose.isValidObjectId(reviewId)) throw ApiError.badRequest('Invalid review id');
  const review = await Review.findOneAndDelete({ _id: reviewId, user: userIdOf(user) });
  if (!review) throw ApiError.notFound('Review not found');
  await refreshProductRating(review.product);
}
