import path from 'node:path';
import winston from 'winston';
import { env } from './env.js';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'HH:mm:ss' }),
  colorize(),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const trace = stack ? `\n${stack}` : '';
    return `${ts} ${level}: ${message}${extra}${trace}`;
  }),
);

const prodFormat = combine(errors({ stack: true }), timestamp(), json());

const transports = [new winston.transports.Console()];

if (env.log.toFile) {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      format: prodFormat,
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      format: prodFormat,
    }),
  );
}

const logger = winston.createLogger({
  level: env.log.level,
  format: env.isProduction ? prodFormat : devFormat,
  transports,
  exitOnError: false,
  silent: false,
});

// Stream used by morgan to write HTTP logs through winston
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

/** Flush and close all transports (used during shutdown). */
export const closeLogger = () =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, 1000);
    logger.once('finish', () => {
      clearTimeout(timer);
      resolve();
    });
    logger.end();
  });

export default logger;
