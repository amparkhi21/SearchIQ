import { z } from 'zod';

export const nameSchema = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be at most 50 characters');

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Please provide a valid email address')
  .max(254, 'Email is too long');

// bcrypt only uses the first 72 bytes, so longer passwords are rejected
export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number');

export const registerBody = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginBody = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
});

// Refresh/logout normally read the httpOnly cookie; the body is a fallback for non-browser clients
export const tokenBody = z.object({
  refreshToken: z.string().min(1).optional(),
});
