import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/** General API limiter, mounted on the API prefix (health checks are exempt). */
export const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/health'),
  handler: (_req, _res, next) => next(ApiError.tooManyRequests()),
});

/** Stricter limiter for login/register: only failed requests count towards the limit. */
export const authLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.authMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, _res, next) =>
    next(ApiError.tooManyRequests('Too many attempts, please try again later')),
});
