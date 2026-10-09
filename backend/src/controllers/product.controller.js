import { HTTP_STATUS } from '../constants.js';
import * as productService from '../services/product.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isAdmin } from '../utils/roles.js';

export const listProducts = asyncHandler(async (req, res) => {
  const { products, meta } = await productService.listProducts(req.query, {
    admin: isAdmin(req.user),
  });
  return new ApiResponse(HTTP_STATUS.OK, 'Products fetched', { products }, meta).send(res);
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.params.identifier, {
    admin: isAdmin(req.user),
  });
  return new ApiResponse(HTTP_STATUS.OK, 'Product fetched', { product }).send(res);
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  return new ApiResponse(HTTP_STATUS.CREATED, 'Product created', { product }).send(res);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  return new ApiResponse(HTTP_STATUS.OK, 'Product updated', { product }).send(res);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  return new ApiResponse(HTTP_STATUS.OK, 'Product deleted').send(res);
});
