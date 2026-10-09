import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import { API_PREFIX } from './constants.js';
import routes from './routes/index.js';
import { setupSwagger } from './docs/swagger.js';
import { requestId } from './middlewares/requestId.middleware.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { securityHeaders, requestSanitizers } from './middlewares/security.middleware.js';
import { apiLimiter } from './middlewares/rateLimit.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);

// Request tracing + logging
app.use(requestId);
app.use(requestLogger);

// Security headers + CORS
app.use(securityHeaders);

// Performance + body/cookie parsing
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// Sanitization (must run after body parsing)
app.use(requestSanitizers);

// Static uploads (product images etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

// API documentation
setupSwagger(app);

// API routes (rate limited)
app.use(API_PREFIX, apiLimiter, routes);

// 404 + centralized error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
