import { Router } from 'express';
import {
  clearRecentlyViewed,
  recentlyViewed,
  recommendationsForMe,
  recordViewedProduct,
  similarProducts,
} from '../controllers/recommendation.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { idParams } from '../utils/validators/catalog.validator.js';
import { recommendationQuery } from '../utils/validators/recommendation.validator.js';

const router = Router();

router.get('/similar/:id', validate({ params: idParams, query: recommendationQuery }), similarProducts);
router.get('/for-me', authenticate, validate({ query: recommendationQuery }), recommendationsForMe);
router.post('/viewed/:id', authenticate, validate({ params: idParams }), recordViewedProduct);
router.get('/recently-viewed', authenticate, validate({ query: recommendationQuery }), recentlyViewed);
router.delete('/recently-viewed', authenticate, clearRecentlyViewed);

export default router;
