import { Router } from 'express';
import { addToCart, clearCart, getCart, removeFromCart, updateCartItem } from '../controllers/cart.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { cartProductParams, quantityBody } from '../utils/validators/cart.validator.js';

const router = Router();
router.use(authenticate);
router.get('/', getCart);
router.post('/items/:productId', validate({ params: cartProductParams, body: quantityBody }), addToCart);
router.put('/items/:productId', validate({ params: cartProductParams, body: quantityBody }), updateCartItem);
router.delete('/items/:productId', validate({ params: cartProductParams }), removeFromCart);
router.delete('/', clearCart);
export default router;
