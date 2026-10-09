import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';

import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const allowedOrigins = new Set([
  ...env.corsOrigins,
  // Allow Swagger UI "Try it out" (same-origin requests) in non-production
  ...(env.isProduction ? [] : [`http://localhost:${env.port}`]),
]);

const corsMiddleware = cors({
  origin(origin, callback) {
    // Allow non-browser clients (curl, Postman, server-to-server) that send no Origin header
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(ApiError.forbidden(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy'],
  maxAge: 600,
});

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      // Avoid forcing https on http://localhost in development
      'upgrade-insecure-requests': env.isProduction ? [] : null,
    },
  },
  // Allow the frontend (different origin) to load images from /uploads
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/** Runs before body parsing: security headers + CORS. */
export const securityHeaders = [helmetMiddleware, corsMiddleware];

/** Runs after body parsing: HTTP parameter pollution + NoSQL injection protection. */
export const requestSanitizers = [hpp(), mongoSanitize()];
