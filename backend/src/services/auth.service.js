import logger from '../config/logger.js';
import { getRedisClient } from '../config/redis.js';
import {
  LOGIN_LOCK_SECONDS,
  LOGIN_MAX_FAILED_ATTEMPTS,
  REDIS_KEYS,
} from '../constants.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken, verifyAccessTokenIgnoreExpiry } from '../utils/jwt.js';
import { burnPasswordCheck, comparePassword, hashPassword } from '../utils/password.js';
import * as tokenService from './token.service.js';

export async function register({ name, email, password }) {
  if (await User.exists({ email })) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, passwordHash });
  const tokens = await tokenService.issueTokenPair(user);

  logger.info('User registered', { userId: user.id });
  return { user, ...tokens };
}

export async function login({ email, password }) {
  const redis = getRedisClient();
  const failuresKey = REDIS_KEYS.loginFailures(email);

  const failures = Number(await redis.get(failuresKey)) || 0;
  if (failures >= LOGIN_MAX_FAILED_ATTEMPTS) {
    throw ApiError.tooManyRequests(
      'Too many failed login attempts. Please try again in 15 minutes.',
    );
  }

  const user = await User.findOne({ email }).select('+passwordHash');

  let passwordMatches = false;
  if (user) {
    passwordMatches = await comparePassword(password, user.passwordHash);
  } else {
    await burnPasswordCheck(password);
  }

  if (!passwordMatches) {
    const count = await redis.incr(failuresKey);
    if (count === 1) await redis.expire(failuresKey, LOGIN_LOCK_SECONDS);
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been disabled');
  }

  await redis.del(failuresKey);

  const lastLoginAt = new Date();
  await User.updateOne({ _id: user._id }, { lastLoginAt });
  user.lastLoginAt = lastLoginAt;

  const tokens = await tokenService.issueTokenPair(user);

  logger.info('User logged in', { userId: user.id });
  return { user, ...tokens };
}

/** Exchanges a valid refresh token for a new token pair (the old refresh token is invalidated). */
export async function refresh(refreshToken) {
  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token is missing');
  }

  const payload = await tokenService.consumeRefreshToken(refreshToken);

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    await tokenService.revokeAllRefreshTokens(payload.sub);
    throw ApiError.unauthorized('Account not found or disabled');
  }

  const tokens = await tokenService.issueTokenPair(user);
  return { user, ...tokens };
}

export async function logout({ refreshToken, accessToken }) {
  if (refreshToken) {
    await tokenService.revokeRefreshToken(refreshToken);
  }

  if (accessToken) {
    try {
      const payload = verifyAccessTokenIgnoreExpiry(accessToken);
      await tokenService.blacklistAccessToken(payload);
    } catch {
      // invalid access token: nothing to blacklist
    }
  }
}

/** Used by the authenticate middleware: validates an access token and loads its user. */
export async function authenticateAccessToken(accessToken) {
  const payload = verifyAccessToken(accessToken);

  if (await tokenService.isAccessTokenBlacklisted(payload.jti)) {
    throw ApiError.unauthorized('Token has been revoked');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account not found or disabled');
  }

  return { user, payload };
}
