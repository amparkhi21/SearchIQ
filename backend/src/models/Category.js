import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: String, trim: true, maxlength: 500 },
    // null for top-level categories; set for sub-categories
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

categorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });

export default mongoose.model('Category', categorySchema);
