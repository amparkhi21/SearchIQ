import * as authService from '../services/auth.service.js';

/**
 * For public routes that behave differently for logged-in users (e.g. admins can see hidden products).
 * A missing or invalid token simply means "anonymous"; it never blocks the request.
 */
export const optionalAuthenticate = async (req, _res, next) => {
  const header = req.get('Authorization');

  if (header && header.startsWith('Bearer ')) {
    try {
      const { user, payload } = await authService.authenticateAccessToken(
        header.slice('Bearer '.length).trim(),
      );
      req.user = user;
      req.auth = { jti: payload.jti, exp: payload.exp };
    } catch {
      // invalid or expired token: continue as anonymous
    }
  }

  next();
};
