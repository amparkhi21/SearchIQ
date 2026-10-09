import { Router } from 'express';
import { getSearchAnalytics } from '../controllers/admin/analytics.controller.js';
import { getAdminOrder, listAdminOrders, updateAdminOrderStatus } from '../controllers/admin/adminOrder.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { searchAnalyticsQuery } from '../utils/validators/analytics.validator.js';
import { adminOrderIdParams, adminOrderListQuery, updateOrderStatusBody } from '../utils/validators/adminOrder.validator.js';

const router = Router();

router.use(authenticate, requireAdmin);
router.get('/analytics/search', validate({ query: searchAnalyticsQuery }), getSearchAnalytics);
router.get('/orders', validate({ query: adminOrderListQuery }), listAdminOrders);
router.get('/orders/:orderId', validate({ params: adminOrderIdParams }), getAdminOrder);
router.patch('/orders/:orderId/status', validate({ params: adminOrderIdParams, body: updateOrderStatusBody }), updateAdminOrderStatus);

export default router;
