import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

const { Schema } = mongoose;

const addressSnapshotSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 30 },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 12 },
    country: { type: String, trim: true, maxlength: 60, default: 'India' },
  },
  { _id: false },
);

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, required: true, trim: true, maxlength: 40 },
    image: { type: String, trim: true, maxlength: 500 },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    unitPrice: { type: Number, required: true, min: 0 },
    listPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },
    shippingAddress: { type: addressSnapshotSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['cod', 'upi', 'card'], default: 'cod' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'shipped', 'out-for-delivery', 'delivered', 'cancelled'],
      default: 'placed',
      index: true,
    },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
