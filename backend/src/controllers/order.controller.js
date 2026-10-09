import { HTTP_STATUS } from '../constants.js';
import * as orderService from '../services/order.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createOrder = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.CREATED, 'Order placed', { order: await orderService.createOrder(req.user, req.body) }).send(res));
export const listOrders = asyncHandler(async (req, res) => { const result = await orderService.listOrders(req.user, req.query); return new ApiResponse(HTTP_STATUS.OK, 'Orders fetched', { orders: result.orders }, result.meta).send(res); });
export const getOrder = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Order fetched', { order: await orderService.getOrder(req.user, req.params.orderId) }).send(res));
export const cancelOrder = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Order cancelled', { order: await orderService.cancelOrder(req.user, req.params.orderId, req.body.reason) }).send(res));
