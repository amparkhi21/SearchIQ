import { Router } from 'express';

import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../controllers/product.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { optionalAuthenticate } from '../middlewares/optionalAuth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { idParams, identifierParams } from '../utils/validators/catalog.validator.js';
import {
  listProductsQuery,
  productBody,
  updateProductBody,
} from '../utils/validators/product.validator.js';

const router = Router();

// Public
router.get('/', optionalAuthenticate, validate({ query: listProductsQuery }), listProducts);
router.get(
  '/:identifier',
  optionalAuthenticate,
  validate({ params: identifierParams }),
  getProduct,
);

// Admin only
router.post('/', authenticate, requireAdmin, validate({ body: productBody }), createProduct);
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: idParams, body: updateProductBody }),
  updateProduct,
);
router.delete('/:id', authenticate, requireAdmin, validate({ params: idParams }), deleteProduct);

export default router;
