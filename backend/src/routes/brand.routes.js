import { Router } from 'express';

import {
  createBrand,
  deleteBrand,
  getBrand,
  listBrands,
  updateBrand,
} from '../controllers/brand.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { optionalAuthenticate } from '../middlewares/optionalAuth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  brandBody,
  idParams,
  identifierParams,
  listCatalogQuery,
  updateBrandBody,
} from '../utils/validators/catalog.validator.js';

const router = Router();

// Public
router.get('/', optionalAuthenticate, validate({ query: listCatalogQuery }), listBrands);
router.get(
  '/:identifier',
  optionalAuthenticate,
  validate({ params: identifierParams, query: listCatalogQuery }),
  getBrand,
);

// Admin only
router.post('/', authenticate, requireAdmin, validate({ body: brandBody }), createBrand);
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: idParams, body: updateBrandBody }),
  updateBrand,
);
router.delete('/:id', authenticate, requireAdmin, validate({ params: idParams }), deleteBrand);

export default router;
