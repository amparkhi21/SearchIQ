import mongoose from 'mongoose';

const { Schema } = mongoose;

const searchLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    query: { type: String, required: true, trim: true, maxlength: 100 },
    normalizedQuery: { type: String, required: true, trim: true, maxlength: 100 },
    mode: { type: String, enum: ['bm25', 'semantic', 'hybrid'], default: 'hybrid' },
    resultCount: { type: Number, min: 0, default: 0 },
    filters: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

searchLogSchema.index({ user: 1, normalizedQuery: 1 });
searchLogSchema.index({ user: 1, createdAt: -1 });
searchLogSchema.index({ createdAt: -1, resultCount: 1 });
searchLogSchema.index({ normalizedQuery: 1, createdAt: -1 });

export default mongoose.model('SearchLog', searchLogSchema);
