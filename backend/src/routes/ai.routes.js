import { Router } from 'express';

import { analyzeQuery, aiDiagnostics, modelInfo } from '../controllers/ai.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { aiAnalyzeQueryBody } from '../utils/validators/ai.validator.js';

const router = Router();

router.use(authenticate, requireAdmin);
router.post('/analyze-query', validate({ body: aiAnalyzeQueryBody }), analyzeQuery);
router.get('/model', modelInfo);
router.get('/diagnostics', aiDiagnostics);

export default router;
