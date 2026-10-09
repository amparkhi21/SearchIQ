import * as authService from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Requires a valid "Authorization: Bearer <accessToken>" header and sets req.user. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.get('Authorization');

  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required');
  }

  const token = header.slice('Bearer '.length).trim();
  const { user, payload } = await authService.authenticateAccessToken(token);

  req.user = user;
  req.auth = { jti: payload.jti, exp: payload.exp };
  next();
});
