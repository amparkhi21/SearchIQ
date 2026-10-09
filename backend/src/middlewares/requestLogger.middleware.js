import morgan from 'morgan';
import logger from '../config/logger.js';

morgan.token('id', (req) => req.id);

const format = ':id :method :url :status :res[content-length] - :response-time ms';

export const requestLogger = morgan(format, {
  stream: logger.stream,
  // Skip noisy container liveness probes
  skip: (req) => req.originalUrl.endsWith('/health/live'),
});
