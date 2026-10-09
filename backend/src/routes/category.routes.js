import { Router } from 'express';

import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '../controllers/category.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { optionalAuthenticate } from '../middlewares/optionalAuth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  categoryBody,
  idParams,
  identifierParams,
  listCatalogQuery,
  updateCategoryBody,
} from '../utils/validators/catalog.validator.js';

const router = Router();

// Public
router.get('/', optionalAuthenticate, validate({ query: listCatalogQuery }), listCategories);
router.get(
  '/:identifier',
  optionalAuthenticate,
  validate({ params: identifierParams, query: listCatalogQuery }),
  getCategory,
);

// Admin only
router.post('/', authenticate, requireAdmin, validate({ body: categoryBody }), createCategory);
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: idParams, body: updateCategoryBody }),
  updateCategory,
);
router.delete('/:id', authenticate, requireAdmin, validate({ params: idParams }), deleteCategory);

export default router;
