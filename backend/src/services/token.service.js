import { env } from '../config/env.js';
import { getRedisClient } from '../config/redis.js';
import { REDIS_KEYS } from '../constants.js';
import { ApiError } from '../utils/ApiError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

/** Creates an access + refresh token pair and registers the refresh token in Redis. */
export async function issueTokenPair(user) {
  const { token: accessToken } = signAccessToken(user);
  const { token: refreshToken, jti } = signRefreshToken(user.id);

  await getRedisClient().set(
    REDIS_KEYS.refreshToken(user.id, jti),
    '1',
    'EX',
    env.jwt.refreshTtlSeconds,
  );

  return { accessToken, refreshToken };
}

/** Deletes every stored refresh token of a user (logout everywhere). */
export async function revokeAllRefreshTokens(userId) {
  const redis = getRedisClient();
  const stream = redis.scanStream({
    match: REDIS_KEYS.refreshTokenPattern(userId),
    count: 100,
  });

  for await (const keys of stream) {
    if (keys.length > 0) await redis.del(...keys);
  }
}

/**
 * Validates a refresh token and removes it from Redis (single use / rotation).
 * A correctly signed token that is NOT in Redis was already used or revoked, which may mean
 * it was stolen, so every session of that user is revoked.
 */
export async function consumeRefreshToken(refreshToken) {
  const payload = verifyRefreshToken(refreshToken);
  const removed = await getRedisClient().del(REDIS_KEYS.refreshToken(payload.sub, payload.jti));

  if (removed === 0) {
    await revokeAllRefreshTokens(payload.sub);
    throw ApiError.unauthorized('Refresh token is no longer valid. Please log in again.');
  }

  return payload;
}

/** Revokes a single refresh token. Invalid tokens are ignored (already unusable). */
export async function revokeRefreshToken(refreshToken) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await getRedisClient().del(REDIS_KEYS.refreshToken(payload.sub, payload.jti));
  } catch {
    // token invalid or expired: nothing to revoke
  }
}

/** Blocks an access token until it would have expired anyway. */
export async function blacklistAccessToken({ jti, exp }) {
  const ttlSeconds = exp - Math.floor(Date.now() / 1000);
  if (ttlSeconds > 0) {
    await getRedisClient().set(REDIS_KEYS.accessBlacklist(jti), '1', 'EX', ttlSeconds);
  }
}

export async function isAccessTokenBlacklisted(jti) {
  return (await getRedisClient().exists(REDIS_KEYS.accessBlacklist(jti))) === 1;
}
