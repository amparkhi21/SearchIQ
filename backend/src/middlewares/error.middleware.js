import mongoose from 'mongoose';
import { ZodError } from 'zod';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { HTTP_STATUS } from '../constants.js';
import { ApiError } from '../utils/ApiError.js';

/** Converts any thrown value into an ApiError with a safe, client-friendly message. */
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return ApiError.badRequest('Validation failed', errors);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiError.badRequest('Validation failed', errors);
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for "${err.path}"`);
  }

  // MongoDB duplicate key
  if (err?.code === 11000) {
    const fields = Object.keys(err.keyValue ?? {});
    return ApiError.conflict(
      fields.length ? `Duplicate value for: ${fields.join(', ')}` : 'Duplicate value',
    );
  }

  // body-parser errors
  if (err?.type === 'entity.parse.failed') {
    return ApiError.badRequest('Malformed JSON in request body');
  }
  if (err?.type === 'entity.too.large') {
    return new ApiError(HTTP_STATUS.PAYLOAD_TOO_LARGE, 'Request body too large');
  }

  const status = err?.statusCode ?? err?.status;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return new ApiError(status, err.message);
  }

  return ApiError.internal();
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const error = normalizeError(err);
  const isServerError = error.statusCode >= 500;

  logger.log(isServerError ? 'error' : 'warn', error.message, {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    statusCode: error.statusCode,
    stack: isServerError ? err?.stack : undefined,
  });

  const body = {
    success: false,
    message: error.message,
    requestId: req.id,
  };
  if (error.errors.length > 0) body.errors = error.errors;
  if (env.isDevelopment && isServerError) body.stack = err?.stack;

  return res.status(error.statusCode).json(body);
}
