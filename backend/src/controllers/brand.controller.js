import { HTTP_STATUS } from '../constants.js';
import * as brandService from '../services/brand.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isAdmin } from '../utils/roles.js';

// Hidden (inactive) brands are only visible to admins
const visibility = (req) => ({ includeInactive: Boolean(req.query.includeInactive) && isAdmin(req.user) });

export const listBrands = asyncHandler(async (req, res) => {
  const brands = await brandService.listBrands(visibility(req));
  return new ApiResponse(HTTP_STATUS.OK, 'Brands fetched', { brands }).send(res);
});

export const getBrand = asyncHandler(async (req, res) => {
  const brand = await brandService.getBrand(req.params.identifier, visibility(req));
  return new ApiResponse(HTTP_STATUS.OK, 'Brand fetched', { brand }).send(res);
});

export const createBrand = asyncHandler(async (req, res) => {
  const brand = await brandService.createBrand(req.body);
  return new ApiResponse(HTTP_STATUS.CREATED, 'Brand created', { brand }).send(res);
});

export const updateBrand = asyncHandler(async (req, res) => {
  const brand = await brandService.updateBrand(req.params.id, req.body);
  return new ApiResponse(HTTP_STATUS.OK, 'Brand updated', { brand }).send(res);
});

export const deleteBrand = asyncHandler(async (req, res) => {
  await brandService.deleteBrand(req.params.id);
  return new ApiResponse(HTTP_STATUS.OK, 'Brand deleted').send(res);
});
