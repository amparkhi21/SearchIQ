import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

export const createOrderBody = z.object({
  addressId: objectIdSchema.optional(),
  paymentMethod: z.enum(['cod', 'upi', 'card']).default('cod'),
});

export const orderIdParams = z.object({ orderId: objectIdSchema });
export const orderListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['placed', 'confirmed', 'shipped', 'out-for-delivery', 'delivered', 'cancelled']).optional(),
});

export const cancelOrderBody = z.object({
  reason: z.string().trim().max(300).optional(),
});
