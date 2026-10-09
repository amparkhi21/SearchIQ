import { Router } from 'express';
import authRoutes from './auth.routes.js';
import aiRoutes from './ai.routes.js';
import brandRoutes from './brand.routes.js';
import categoryRoutes from './category.routes.js';
import healthRoutes from './health.routes.js';
import productRoutes from './product.routes.js';
import recommendationRoutes from './recommendation.routes.js';
import cartRoutes from './cart.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import orderRoutes from './order.routes.js';
import reviewRoutes from './review.routes.js';
import notificationRoutes from './notification.routes.js';
import adminRoutes from './admin.routes.js';
import searchRoutes from './search.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/ai', aiRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/products', productRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', orderRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/search', searchRoutes);

export default router;
