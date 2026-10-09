import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    isVerifiedPurchase: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
