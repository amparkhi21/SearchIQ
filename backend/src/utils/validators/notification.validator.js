import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';
export const notificationIdParams = z.object({ notificationId: objectIdSchema });
export const notificationListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  unreadOnly: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});
