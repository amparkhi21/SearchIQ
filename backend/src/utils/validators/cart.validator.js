import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

export const cartProductParams = z.object({ productId: objectIdSchema });
export const quantityBody = z.object({ quantity: z.number().int().min(1).max(99) });
