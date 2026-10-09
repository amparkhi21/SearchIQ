import { Router } from 'express';
import { getHealth, getLiveness } from '../controllers/health.controller.js';

const router = Router();

router.get('/', getHealth);
router.get('/live', getLiveness);

export default router;
