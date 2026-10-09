import { HTTP_STATUS } from '../constants.js';
import * as userService from '../services/user.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { clearRefreshCookie } from '../utils/cookies.js';

export const getProfile = asyncHandler(async (req, res) =>
  new ApiResponse(HTTP_STATUS.OK, 'Profile fetched', { user: req.user }).send(res),
);

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user, req.body);
  return new ApiResponse(HTTP_STATUS.OK, 'Profile updated', { user }).send(res);
});

export const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);

  clearRefreshCookie(res);
  return new ApiResponse(
    HTTP_STATUS.OK,
    'Password updated. Please log in again on all devices.',
  ).send(res);
});

export const addAddress = asyncHandler(async (req, res) => {
  const addresses = await userService.addAddress(req.user, req.body);
  return new ApiResponse(HTTP_STATUS.CREATED, 'Address added', { addresses }).send(res);
});

export const removeAddress = asyncHandler(async (req, res) => {
  const addresses = await userService.removeAddress(req.user, req.params.addressId);
  return new ApiResponse(HTTP_STATUS.OK, 'Address removed', { addresses }).send(res);
});

export const listUsers = asyncHandler(async (req, res) => {
  const { users, meta } = await userService.listUsers(req.query);
  return new ApiResponse(HTTP_STATUS.OK, 'Users fetched', { users }, meta).send(res);
});

export const setUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.setUserStatus(req.user, req.params.userId, req.body.isActive);
  return new ApiResponse(
    HTTP_STATUS.OK,
    user.isActive ? 'User activated' : 'User deactivated',
    { user },
  ).send(res);
});
