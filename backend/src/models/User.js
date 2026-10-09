import mongoose from 'mongoose';
import { ROLES, ROLE_VALUES } from '../constants.js';

const { Schema } = mongoose;

// Output shape for API responses: `id` instead of `_id`, no internals
const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
};

const addressSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 30, default: 'Home' },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 12 },
    country: { type: String, trim: true, maxlength: 60, default: 'India' },
    isDefault: { type: Boolean, default: false },
  },
  { toJSON: toJSONOptions },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Never returned by queries unless explicitly requested with .select('+passwordHash')
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: [...ROLE_VALUES], default: ROLES.USER, index: true },
    phone: { type: String, trim: true, maxlength: 20 },
    avatar: { type: String, trim: true },
    addresses: { type: [addressSchema], default: [] },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

export default mongoose.model('User', userSchema);
