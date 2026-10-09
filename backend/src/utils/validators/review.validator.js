import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const reviewFields = {
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(120).optional(),
  body: z.string().trim().min(5).max(2000),
};

export const reviewProductParams = z.object({ productId: objectIdSchema });
export const reviewIdParams = z.object({ reviewId: objectIdSchema });
export const reviewBody = z.object(reviewFields);
export const updateReviewBody = z.object(reviewFields).partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Provide at least one field to update',
});
export const reviewListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
