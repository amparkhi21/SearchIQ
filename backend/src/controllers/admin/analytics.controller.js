import { HTTP_STATUS } from '../../constants.js';
import * as analyticsService from '../../services/analytics.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getSearchAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getSearchAnalytics({
    days: req.query.days,
    limit: req.query.limit,
  });
  return new ApiResponse(HTTP_STATUS.OK, 'Search analytics fetched', data).send(res);
});
