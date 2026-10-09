import { HTTP_STATUS } from '../constants.js';

export class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status code
   * @param {string} message    Human-readable message
   * @param {Array<{field?: string, message: string}>} [errors] Field-level details
   * @param {boolean} [isOperational] false for unexpected programming errors
   */
  constructor(statusCode, message, errors = [], isOperational = true) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errors = []) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(HTTP_STATUS.CONFLICT, message);
  }

  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, message);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, message);
  }

  static internal(message = 'Internal Server Error') {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, [], false);
  }
}
