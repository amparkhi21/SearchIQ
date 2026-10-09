import { ROLES } from '../constants.js';
import { ApiError } from '../utils/ApiError.js';

/** Role-based access control. Must run after `authenticate`. */
export const authorize =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };

export const requireAdmin = authorize(ROLES.ADMIN);
