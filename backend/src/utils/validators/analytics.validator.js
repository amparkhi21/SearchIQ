import { z } from 'zod';

export const searchAnalyticsQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});
