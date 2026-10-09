import { Router } from 'express';
import { createReview, deleteReview, listProductReviews, updateReview } from '../controllers/review.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { reviewBody, reviewIdParams, reviewListQuery, reviewProductParams, updateReviewBody } from '../utils/validators/review.validator.js';

const router = Router();
router.get('/product/:productId', validate({ params: reviewProductParams, query: reviewListQuery }), listProductReviews);
router.post('/product/:productId', authenticate, validate({ params: reviewProductParams, body: reviewBody }), createReview);
router.put('/:reviewId', authenticate, validate({ params: reviewIdParams, body: updateReviewBody }), updateReview);
router.delete('/:reviewId', authenticate, validate({ params: reviewIdParams }), deleteReview);
export default router;
