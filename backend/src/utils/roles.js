import { ROLES } from '../constants.js';

/** True when `user` is a logged-in admin. Safe to call with undefined (anonymous requests). */
export const isAdmin = (user) => user?.role === ROLES.ADMIN;
