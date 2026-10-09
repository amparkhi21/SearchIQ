import { Router } from 'express';
import { addToWishlist, getWishlist, removeFromWishlist } from '../controllers/wishlist.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { wishlistProductParams } from '../utils/validators/wishlist.validator.js';

const router = Router();
router.use(authenticate);
router.get('/', getWishlist);
router.post('/:productId', validate({ params: wishlistProductParams }), addToWishlist);
router.delete('/:productId', validate({ params: wishlistProductParams }), removeFromWishlist);
export default router;
