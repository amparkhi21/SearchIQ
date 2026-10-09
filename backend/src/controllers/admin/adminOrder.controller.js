import { HTTP_STATUS } from '../../constants.js';
import * as adminOrderService from '../../services/admin-order.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const listAdminOrders = asyncHandler(async (req, res) => {
  const result = await adminOrderService.listOrders(req.query);
  return new ApiResponse(HTTP_STATUS.OK, 'Orders fetched', { orders: result.orders }, result.meta).send(res);
});
export const getAdminOrder = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Order fetched', { order: await adminOrderService.getOrder(req.params.orderId) }).send(res));
export const updateAdminOrderStatus = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Order status updated', { order: await adminOrderService.updateOrderStatus(req.params.orderId, req.body.status, req.body.note) }).send(res));
