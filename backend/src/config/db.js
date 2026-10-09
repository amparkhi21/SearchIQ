import mongoose from 'mongoose';
import { env } from './env.js';
import logger from './logger.js';
import { maskUri } from '../utils/maskUri.js';

mongoose.set('strictQuery', true);

mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
mongoose.connection.on('error', (err) =>
  logger.error('MongoDB connection error', { error: err.message }),
);

export async function connectMongo() {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  });
  logger.info(`MongoDB ready: ${maskUri(env.mongoUri)}`);
  return mongoose.connection;
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  }
}
