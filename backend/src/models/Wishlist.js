import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

const { Schema } = mongoose;

const wishlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    products: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

wishlistSchema.index({ user: 1 });
wishlistSchema.index({ products: 1 });

export default mongoose.model('Wishlist', wishlistSchema);
