import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

const ALGORITHM = 'HS256';

/** Creates a short-lived access token. `user` must be a User document (uses user.id and user.role). */
export function signAccessToken(user) {
  const jti = randomUUID();
  const token = jwt.sign({ role: user.role }, env.jwt.accessSecret, {
    algorithm: ALGORITHM,
    issuer: env.jwt.issuer,
    subject: String(user.id),
    jwtid: jti,
    expiresIn: env.jwt.accessExpiresIn,
  });
  return { token, jti };
}

/** Creates a long-lived refresh token (its jti is stored in Redis so it can be revoked). */
export function signRefreshToken(userId) {
  const jti = randomUUID();
  const token = jwt.sign({}, env.jwt.refreshSecret, {
    algorithm: ALGORITHM,
    issuer: env.jwt.issuer,
    subject: String(userId),
    jwtid: jti,
    expiresIn: env.jwt.refreshTtlSeconds,
  });
  return { token, jti };
}

function verify(token, secret, options = {}) {
  try {
    return jwt.verify(token, secret, {
      algorithms: [ALGORITHM],
      issuer: env.jwt.issuer,
      ...options,
    });
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
    );
  }
}

export const verifyAccessToken = (token) => verify(token, env.jwt.accessSecret);

export const verifyRefreshToken = (token) => verify(token, env.jwt.refreshSecret);

/** Verifies the signature of an access token but accepts it even if it already expired. */
export const verifyAccessTokenIgnoreExpiry = (token) =>
  verify(token, env.jwt.accessSecret, { ignoreExpiration: true });
