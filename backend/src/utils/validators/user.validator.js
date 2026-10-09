import { z } from 'zod';

import { MAX_PAGE_SIZE, ROLE_VALUES } from '../../constants.js';
import { nameSchema, passwordSchema } from './auth.validator.js';
import { objectIdSchema } from './common.validator.js';

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,15}$/, 'Please provide a valid phone number');

export const updateProfileBody = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const changePasswordBody = z
  .object({
    currentPassword: z.string({ required_error: 'Current password is required' }).min(1),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

export const addressBody = z.object({
  label: z.string().trim().min(1).max(30).optional(),
  fullName: z.string({ required_error: 'Full name is required' }).trim().min(2).max(100),
  phone: phoneSchema,
  line1: z.string({ required_error: 'Address line 1 is required' }).trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string({ required_error: 'City is required' }).trim().min(2).max(100),
  state: z.string({ required_error: 'State is required' }).trim().min(2).max(100),
  postalCode: z
    .string({ required_error: 'Postal code is required' })
    .trim()
    .regex(/^[A-Za-z0-9\s-]{3,12}$/, 'Please provide a valid postal code'),
  country: z.string().trim().min(2).max(60).default('India'),
  isDefault: z.boolean().optional(),
});

export const addressParams = z.object({ addressId: objectIdSchema });

export const userIdParams = z.object({ userId: objectIdSchema });

export const statusBody = z.object({
  isActive: z.boolean({ required_error: 'isActive is required' }),
});

export const listUsersQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLE_VALUES).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
