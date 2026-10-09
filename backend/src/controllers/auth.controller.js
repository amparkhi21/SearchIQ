import { HTTP_STATUS, REFRESH_COOKIE_NAME } from '../constants.js';
import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { clearRefreshCookie, setRefreshCookie } from '../utils/cookies.js';

const readRefreshToken = (req) => req.cookies?.[REFRESH_COOKIE_NAME] ?? req.body?.refreshToken;

const readAccessToken = (req) => {
  const header = req.get('Authorization');
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;
};

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);

  setRefreshCookie(res, refreshToken);
  return new ApiResponse(HTTP_STATUS.CREATED, 'Registration successful', {
    user,
    accessToken,
  }).send(res);
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  setRefreshCookie(res, refreshToken);
  return new ApiResponse(HTTP_STATUS.OK, 'Login successful', { user, accessToken }).send(res);
});

export const refresh = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.refresh(readRefreshToken(req));

  setRefreshCookie(res, refreshToken);
  return new ApiResponse(HTTP_STATUS.OK, 'Token refreshed', { user, accessToken }).send(res);
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout({
    refreshToken: readRefreshToken(req),
    accessToken: readAccessToken(req),
  });

  clearRefreshCookie(res);
  return new ApiResponse(HTTP_STATUS.OK, 'Logged out successfully').send(res);
});

export const me = asyncHandler(async (req, res) =>
  new ApiResponse(HTTP_STATUS.OK, 'Authenticated user', { user: req.user }).send(res),
);
