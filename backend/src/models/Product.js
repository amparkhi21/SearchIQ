import mongoose from 'mongoose';
import { GENDERS, MAX_DISCOUNT_PERCENT } from '../constants.js';
import { calculateFinalPrice, roundMoney } from '../utils/pricing.js';
import { toJSONOptions } from '../utils/toJSON.js';

const { Schema } = mongoose;

const imageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 500 },
    alt: { type: String, trim: true, maxlength: 200 },
    photographerName: { type: String, trim: true, maxlength: 100 },
    photographerUrl: { type: String, trim: true, maxlength: 500 },
    photoUrl: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

// Searchable product facets (also used later for AI semantic search)
const attributesSchema = new Schema(
  {
    color: { type: String, trim: true, maxlength: 60 },
    variant: { type: String, trim: true, maxlength: 80 }, // pack size, storage, capacity, shade...
    sizes: { type: [String], default: undefined }, // available sizes, e.g. shoe sizes
    material: { type: String, trim: true, maxlength: 80 },
    gender: { type: String, enum: [...GENDERS] },
    useCase: { type: [String], default: undefined }, // e.g. running, college, formal
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },

    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },

    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },

    // `price` is the list price (MRP). `finalPrice` is what the customer pays and is
    // always recalculated from price + discountPercent before saving.
    price: { type: Number, required: true, min: 0.01, set: roundMoney },
    discountPercent: { type: Number, default: 0, min: 0, max: MAX_DISCOUNT_PERCENT },
    finalPrice: { type: Number, min: 0 },

    stock: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    lowStockThreshold: { type: Number, default: 5, min: 0, validate: Number.isInteger },
    inStock: { type: Boolean, default: false }, // derived from stock

    images: { type: [imageSchema], default: [] },
    tags: { type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }], default: [] },
    attributes: { type: attributesSchema, default: undefined },

    // Maintained by the review system (Phase 10); seeded with sample values for now
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },

    // Hidden products are not shown to the public but stay in the database
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

productSchema.virtual('discountAmount').get(function discountAmount() {
  return roundMoney(this.price - this.finalPrice);
});

productSchema.virtual('stockStatus').get(function stockStatus() {
  if (this.stock <= 0) return 'out_of_stock';
  if (this.stock <= this.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

// Keep derived fields consistent no matter how the product is created or edited
productSchema.pre('validate', function deriveFields(next) {
  this.finalPrice = calculateFinalPrice(this.price, this.discountPercent);
  this.inStock = this.stock > 0;
  next();
});

productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ category: 1, finalPrice: 1 });
productSchema.index({ brand: 1, finalPrice: 1 });
productSchema.index({ finalPrice: 1 });
productSchema.index({ ratingAvg: -1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ tags: 1 });

export default mongoose.model('Product', productSchema);
