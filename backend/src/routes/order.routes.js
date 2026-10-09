import { Router } from 'express';
import { cancelOrder, createOrder, getOrder, listOrders } from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { cancelOrderBody, createOrderBody, orderIdParams, orderListQuery } from '../utils/validators/order.validator.js';

const router = Router();
router.use(authenticate);
router.get('/', validate({ query: orderListQuery }), listOrders);
router.post('/', validate({ body: createOrderBody }), createOrder);
router.get('/:orderId', validate({ params: orderIdParams }), getOrder);
router.post('/:orderId/cancel', validate({ params: orderIdParams, body: cancelOrderBody }), cancelOrder);
export default router;
