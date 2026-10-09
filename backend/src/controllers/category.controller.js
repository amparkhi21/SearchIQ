import { HTTP_STATUS } from '../constants.js';
import * as categoryService from '../services/category.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isAdmin } from '../utils/roles.js';

// Hidden (inactive) categories are only visible to admins
const visibility = (req) => ({ includeInactive: Boolean(req.query.includeInactive) && isAdmin(req.user) });

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.listCategories(visibility(req));
  return new ApiResponse(HTTP_STATUS.OK, 'Categories fetched', { categories }).send(res);
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategory(req.params.identifier, visibility(req));
  return new ApiResponse(HTTP_STATUS.OK, 'Category fetched', { category }).send(res);
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  return new ApiResponse(HTTP_STATUS.CREATED, 'Category created', { category }).send(res);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  return new ApiResponse(HTTP_STATUS.OK, 'Category updated', { category }).send(res);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  return new ApiResponse(HTTP_STATUS.OK, 'Category deleted').send(res);
});
