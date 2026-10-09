import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import * as tokenService from './token.service.js';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function updateProfile(user, { name, phone }) {
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone === null ? undefined : phone;

  await user.save();
  return user;
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  // Force every device to log in again
  await tokenService.revokeAllRefreshTokens(userId);
}

export async function addAddress(user, data) {
  const makeDefault = data.isDefault === true || user.addresses.length === 0;

  if (makeDefault) {
    user.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  user.addresses.push({ ...data, isDefault: makeDefault });
  await user.save();
  return user.addresses;
}

export async function removeAddress(user, addressId) {
  const address = user.addresses.id(addressId);
  if (!address) throw ApiError.notFound('Address not found');

  const wasDefault = address.isDefault;
  user.addresses.pull(addressId);

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  return user.addresses;
}

export async function listUsers(query) {
  const { page, limit, skip } = getPagination(query);

  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.q) {
    const pattern = new RegExp(escapeRegExp(query.q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, meta: buildPaginationMeta({ total, page, limit }) };
}

export async function setUserStatus(adminUser, targetUserId, isActive) {
  if (adminUser.id === targetUserId && !isActive) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }

  const user = await User.findByIdAndUpdate(targetUserId, { isActive }, { new: true });
  if (!user) throw ApiError.notFound('User not found');

  if (!isActive) {
    await tokenService.revokeAllRefreshTokens(targetUserId);
  }

  return user;
}
