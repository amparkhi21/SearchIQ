import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

const { Schema } = mongoose;

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    logo: { type: String, trim: true, maxlength: 500 },
    website: { type: String, trim: true, maxlength: 300 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

brandSchema.index({ isActive: 1, name: 1 });

export default mongoose.model('Brand', brandSchema);
