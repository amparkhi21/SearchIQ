import { Router } from 'express';

import {
  clearRecentSearches,
  hybridSearchProductsController,
  recentSearches,
  searchProducts,
  searchSuggestions,
  semanticSearchProducts,
  unifiedSearchProducts,
} from '../controllers/search.controller.js';
import { optionalAuthenticate } from '../middlewares/optionalAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { searchQuery, searchSuggestionsQuery, recentSearchQuery } from '../utils/validators/search.validator.js';

const router = Router();

router.get('/suggestions', optionalAuthenticate, validate({ query: searchSuggestionsQuery }), searchSuggestions);
router.get('/recent', authenticate, validate({ query: recentSearchQuery }), recentSearches);
router.delete('/recent', authenticate, clearRecentSearches);

router.get('/', optionalAuthenticate, validate({ query: searchQuery }), searchProducts);
router.get('/query', optionalAuthenticate, validate({ query: searchQuery }), unifiedSearchProducts);
router.get('/hybrid', optionalAuthenticate, validate({ query: searchQuery }), hybridSearchProductsController);
router.get('/semantic', optionalAuthenticate, validate({ query: searchQuery }), semanticSearchProducts);

export default router;
