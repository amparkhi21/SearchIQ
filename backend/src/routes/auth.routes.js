import { Router } from 'express';

import { login, logout, me, refresh, register } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimit.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginBody, registerBody, tokenBody } from '../utils/validators/auth.validator.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerBody }), register);
router.post('/login', authLimiter, validate({ body: loginBody }), login);
router.post('/refresh', validate({ body: tokenBody }), refresh);
router.post('/logout', validate({ body: tokenBody }), logout);
router.get('/me', authenticate, me);

export default router;
