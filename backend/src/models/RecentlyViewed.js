import mongoose from 'mongoose';

const { Schema } = mongoose;

const recentlyViewedSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    viewedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false, versionKey: false },
);

recentlyViewedSchema.index({ user: 1, product: 1 }, { unique: true });
recentlyViewedSchema.index({ user: 1, viewedAt: -1 });

export default mongoose.model('RecentlyViewed', recentlyViewedSchema);
