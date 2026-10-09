import Notification from '../models/Notification.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';

const userIdOf = (user) => user?._id ?? user?.id;

export async function createNotification({ userId, type, title, message, data }) {
  return Notification.create({ user: userId, type, title, message, data });
}

export async function listNotifications(user, query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { user: userIdOf(user) };
  if (query.unreadOnly === true) filter.isRead = false;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userIdOf(user), isRead: false }),
  ]);
  return { notifications, unreadCount, meta: buildPaginationMeta({ total, page, limit }) };
}

export async function markNotificationRead(user, notificationId) {
  if (!mongoose.isValidObjectId(notificationId)) throw ApiError.badRequest('Invalid notification id');
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userIdOf(user) },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true },
  );
  if (!notification) throw ApiError.notFound('Notification not found');
  return notification;
}

export async function markAllRead(user) {
  const result = await Notification.updateMany(
    { user: userIdOf(user), isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
  return result.modifiedCount ?? 0;
}
