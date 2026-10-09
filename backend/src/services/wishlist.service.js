import mongoose from 'mongoose';
import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

const POPULATE = {
  path: 'products',
  match: { isActive: true },
  populate: [
    { path: 'category', select: 'name slug' },
    { path: 'brand', select: 'name slug logo' },
  ],
};

function userIdOf(user) { return user?._id ?? user?.id; }
function valid(id) { return mongoose.isValidObjectId(id); }

export async function getWishlist(user) {
  let wishlist = await Wishlist.findOne({ user: userIdOf(user) }).populate(POPULATE);
  if (!wishlist) wishlist = await Wishlist.create({ user: userIdOf(user), products: [] });
  return wishlist;
}

export async function addToWishlist(user, productId) {
  if (!valid(productId)) throw ApiError.badRequest('Invalid product id');
  const product = await Product.findOne({ _id: productId, isActive: true }).select('_id');
  if (!product) throw ApiError.notFound('Product not found');
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: userIdOf(user) },
    { $setOnInsert: { user: userIdOf(user), products: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (!wishlist.products.some((id) => id.toString() === productId.toString())) wishlist.products.push(product._id);
  await wishlist.save();
  return getWishlist(user);
}

export async function removeFromWishlist(user, productId) {
  if (!valid(productId)) throw ApiError.badRequest('Invalid product id');
  const wishlist = await Wishlist.findOne({ user: userIdOf(user) });
  if (!wishlist) throw ApiError.notFound('Wishlist not found');
  const before = wishlist.products.length;
  wishlist.products = wishlist.products.filter((id) => id.toString() !== productId.toString());
  if (before === wishlist.products.length) throw ApiError.notFound('Product is not in your wishlist');
  await wishlist.save();
  return getWishlist(user);
}
