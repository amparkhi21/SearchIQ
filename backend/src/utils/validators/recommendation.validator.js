import { z } from 'zod';

export const recommendationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
});
