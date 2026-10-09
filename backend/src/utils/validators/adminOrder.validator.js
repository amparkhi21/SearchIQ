import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const statuses = ['placed', 'confirmed', 'shipped', 'out-for-delivery', 'delivered', 'cancelled'];
export const adminOrderListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(statuses).optional(),
});
export const adminOrderIdParams = z.object({ orderId: objectIdSchema });
export const updateOrderStatusBody = z.object({
  status: z.enum(statuses),
  note: z.string().trim().max(300).optional(),
});
