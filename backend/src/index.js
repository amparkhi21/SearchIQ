import http from 'node:http';

import { env } from './config/env.js';
import logger, { closeLogger } from './config/logger.js';
import { connectAll, disconnectAll } from './config/connections.js';
import app from './app.js';

let server = null;
let shuttingDown = false;

async function start() {
  logger.info(`Starting SearchIQ API v${env.appVersion} (${env.nodeEnv})`);

  await connectAll();

  server = http.createServer(app);
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(env.port, resolve);
  });

  logger.info(`Server listening on port ${env.port}`);
  logger.info(`Health check: http://localhost:${env.port}/api/v1/health`);
  logger.info(`API docs:     http://localhost:${env.port}/api/docs`);
}

async function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Shutting down (${reason})...`);

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeIdleConnections?.();
      });
      logger.info('HTTP server closed');
    }
    await disconnectAll();
    logger.info('Shutdown complete');
  } catch (err) {
    logger.error('Error during shutdown', { error: err.message, stack: err.stack });
    exitCode = 1;
  }

  await closeLogger();
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException', 1);
});

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  shutdown('startup failure', 1);
});
