import { z } from 'zod';
import { MAX_DISCOUNT_PERCENT, PRODUCT_SORT_KEYS } from '../../constants.js';

const booleanQuery = z
  .enum(['true', 'false'], { errorMap: () => ({ message: 'Must be true or false' }) })
  .transform((value) => value === 'true');

export const searchQuery = z
  .object({
    q: z
      .string({ required_error: 'Search query is required' })
      .trim()
      .min(1, 'Search query cannot be empty')
      .max(100),
    mode: z.enum(['bm25', 'semantic', 'hybrid']).optional(),
    category: z.string().trim().min(1).max(300).optional(),
    brand: z.string().trim().min(1).max(300).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    minDiscount: z.coerce.number().min(0).max(MAX_DISCOUNT_PERCENT).optional(),
    inStock: booleanQuery.optional(),
    sort: z
      .enum(PRODUCT_SORT_KEYS, {
        errorMap: () => ({ message: `Sort must be one of: ${PRODUCT_SORT_KEYS.join(', ')}` }),
      })
      .optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    includeInactive: booleanQuery.optional(),
  })
  .refine(
    (query) =>
      query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
    { message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'] },
  );


export const searchSuggestionsQuery = z.object({
  q: z.string({ required_error: 'Search suggestion query is required' }).trim().min(1).max(60),
  limit: z.coerce.number().int().min(1).max(15).optional().default(10),
});

export const recentSearchQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
});
