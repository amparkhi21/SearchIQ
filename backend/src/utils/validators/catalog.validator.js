import { z } from 'zod';

import { objectIdSchema } from './common.validator.js';

const nonEmpty = (data) => Object.keys(data).length > 0;
const NON_EMPTY_MESSAGE = { message: 'Provide at least one field to update' };

const booleanQuery = z
  .enum(['true', 'false'], { errorMap: () => ({ message: 'Must be true or false' }) })
  .transform((value) => value === 'true');

export const idParams = z.object({ id: objectIdSchema });

export const identifierParams = z.object({
  identifier: z.string().trim().min(1).max(200),
});

export const listCatalogQuery = z.object({
  includeInactive: booleanQuery.optional(),
});

// ---- Categories ----
export const categoryBody = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  image: z.string().trim().url('Image must be a valid URL').max(500).optional(),
  parent: objectIdSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
});

export const updateCategoryBody = categoryBody.partial().refine(nonEmpty, NON_EMPTY_MESSAGE);

// ---- Brands ----
export const brandBody = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  logo: z.string().trim().url('Logo must be a valid URL').max(500).optional(),
  website: z.string().trim().url('Website must be a valid URL').max(300).optional(),
  isActive: z.boolean().default(true),
});

export const updateBrandBody = brandBody.partial().refine(nonEmpty, NON_EMPTY_MESSAGE);
