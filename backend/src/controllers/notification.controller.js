import { HTTP_STATUS } from '../constants.js';
import * as notificationService from '../services/notification.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listNotifications = asyncHandler(async (req, res) => { const result = await notificationService.listNotifications(req.user, req.query); return new ApiResponse(HTTP_STATUS.OK, 'Notifications fetched', { notifications: result.notifications, unreadCount: result.unreadCount }, result.meta).send(res); });
export const markNotificationRead = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Notification marked as read', { notification: await notificationService.markNotificationRead(req.user, req.params.notificationId) }).send(res));
export const markAllRead = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Notifications marked as read', { updated: await notificationService.markAllRead(req.user) }).send(res));
