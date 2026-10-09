import { HTTP_STATUS } from '../constants.js';
import * as aiService from '../services/ai.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const analyzeQuery = asyncHandler(async (req, res) => {
  const data = await aiService.analyzeQuery({
    query: req.body.query,
    vocabulary: req.body.vocabulary,
    requestId: req.id,
  });
  return new ApiResponse(HTTP_STATUS.OK, 'AI query analysis completed', data).send(res);
});

export const modelInfo = asyncHandler(async (req, res) => {
  const data = await aiService.getModelInfo(req.id);
  return new ApiResponse(HTTP_STATUS.OK, 'AI model information', data).send(res);
});

export const aiDiagnostics = asyncHandler(async (_req, res) => {
  return new ApiResponse(HTTP_STATUS.OK, 'AI service diagnostics', aiService.aiStatus()).send(res);
});
