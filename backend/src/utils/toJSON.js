/** Shared Mongoose toJSON options: expose `id` instead of `_id`, hide `__v`. */
export const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    return ret;
  },
};
