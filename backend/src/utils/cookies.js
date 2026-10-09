import { env } from '../config/env.js';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '../constants.js';

const baseOptions = () => ({
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: REFRESH_COOKIE_PATH,
});

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseOptions(),
    maxAge: env.jwt.refreshTtlSeconds * 1000,
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions());
}
