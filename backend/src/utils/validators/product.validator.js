import { z } from 'zod';

import {
  GENDERS,
  MAX_DISCOUNT_PERCENT,
  PRODUCT_MAX_IMAGES,
  PRODUCT_MAX_TAGS,
  PRODUCT_SORT_KEYS,
} from '../../constants.js';
import { objectIdSchema } from './common.validator.js';

const imageSchema = z.object({
  url: z.string().trim().url('Image url must be a valid URL').max(500),
  alt: z.string().trim().max(200).optional(),
  photographerName: z.string().trim().max(100).optional(),
  photographerUrl: z.string().trim().url().max(500).optional(),
  photoUrl: z.string().trim().url().max(500).optional(),
});

const attributesSchema = z.object({
  color: z.string().trim().max(60).optional(),
  variant: z.string().trim().max(80).optional(),
  sizes: z.array(z.string().trim().min(1).max(20)).max(30).optional(),
  material: z.string().trim().max(80).optional(),
  gender: z.enum(GENDERS).optional(),
  useCase: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
});

export const productBody = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2).max(200),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000),
  category: objectIdSchema,
  brand: objectIdSchema,
  sku: z
    .string({ required_error: 'SKU is required' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9_-]{2,39}$/, 'SKU must be 3-40 characters: letters, numbers, - or _'),
  price: z
    .number({ required_error: 'Price is required', invalid_type_error: 'Price must be a number' })
    .positive('Price must be greater than 0')
    .max(10_000_000),
  discountPercent: z.number().min(0).max(MAX_DISCOUNT_PERCENT).default(0),
  stock: z.number().int('Stock must be a whole number').min(0).max(1_000_000).default(0),
  lowStockThreshold: z.number().int().min(0).max(10_000).default(5),
  images: z.array(imageSchema).max(PRODUCT_MAX_IMAGES).default([]),
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(40))
    .max(PRODUCT_MAX_TAGS)
    .default([]),
  attributes: attributesSchema.optional(),
  isActive: z.boolean().default(true),
});

// Partial update: only the fields that are sent are changed (defaults are not re-applied)
export const updateProductBody = productBody
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const booleanQuery = z
  .enum(['true', 'false'], { errorMap: () => ({ message: 'Must be true or false' }) })
  .transform((value) => value === 'true');

export const listProductsQuery = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z
      .string()
      .trim()
      .max(100)
      .transform((value) => (value === '' ? undefined : value))
      .optional(),
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
    includeInactive: booleanQuery.optional(),
  })
  .refine(
    (query) =>
      query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
    { message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'] },
  );
