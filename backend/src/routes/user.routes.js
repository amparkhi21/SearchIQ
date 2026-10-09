import { Router } from 'express';

import {
  addAddress,
  changePassword,
  getProfile,
  listUsers,
  removeAddress,
  setUserStatus,
  updateProfile,
} from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  addressBody,
  addressParams,
  changePasswordBody,
  listUsersQuery,
  statusBody,
  updateProfileBody,
  userIdParams,
} from '../utils/validators/user.validator.js';

const router = Router();

router.use(authenticate);

// Any logged-in user
router.get('/profile', getProfile);
router.put('/profile', validate({ body: updateProfileBody }), updateProfile);
router.put('/password', validate({ body: changePasswordBody }), changePassword);
router.post('/addresses', validate({ body: addressBody }), addAddress);
router.delete('/addresses/:addressId', validate({ params: addressParams }), removeAddress);

// Admin only
router.get('/', requireAdmin, validate({ query: listUsersQuery }), listUsers);
router.patch(
  '/:userId/status',
  requireAdmin,
  validate({ params: userIdParams, body: statusBody }),
  setUserStatus,
);

export default router;
