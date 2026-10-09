import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';
export const wishlistProductParams = z.object({ productId: objectIdSchema });
