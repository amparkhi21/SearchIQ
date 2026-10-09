import { HTTP_STATUS } from '../constants.js';
import * as healthService from '../services/health.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getHealth = asyncHandler(async (_req, res) => {
  const { healthy, data } = await healthService.getHealth();

  res.set('Cache-Control', 'no-store');

  return new ApiResponse(
    healthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE,
    healthy ? 'All systems operational' : 'One or more services are unavailable',
    data,
  ).send(res);
});

export const getLiveness = asyncHandler(async (_req, res) => {
  res.set('Cache-Control', 'no-store');

  return new ApiResponse(HTTP_STATUS.OK, 'Service is alive', healthService.getLiveness()).send(res);
});
