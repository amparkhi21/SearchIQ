import { Router } from 'express';
import { listNotifications, markAllRead, markNotificationRead } from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { notificationIdParams, notificationListQuery } from '../utils/validators/notification.validator.js';

const router = Router();
router.use(authenticate);
router.get('/', validate({ query: notificationListQuery }), listNotifications);
router.patch('/:notificationId/read', validate({ params: notificationIdParams }), markNotificationRead);
router.post('/read-all', markAllRead);
export default router;
