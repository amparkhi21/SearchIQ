import {
  bearer,
  errorResponse,
  jsonBody,
  jsonResponse,
  pathParam,
  queryParam,
  ref,
  successEnvelope,
} from './helpers.js';

const identifierParam = (what) => ({
  name: 'identifier',
  in: 'path',
  required: true,
  description: `${what} id or slug`,
  schema: { type: 'string', example: 'footwear' },
});

const includeInactiveParam = queryParam(
  'includeInactive',
  { type: 'boolean' },
  'Admins only: also return hidden (inactive) items. Ignored for everyone else.',
);

export const catalogSchemas = {
  Category: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '66f1a2b3c4d5e6f7a8b9c0d1' },
      name: { type: 'string', example: 'Footwear' },
      slug: { type: 'string', example: 'footwear' },
      description: { type: 'string', example: 'Shoes, sandals and boots for everyone' },
      image: { type: 'string', example: 'https://placehold.co/600x400/png?text=Footwear' },
      parent: { type: 'string', nullable: true, description: 'Parent category id (null for top-level)' },
      sortOrder: { type: 'integer', example: 3 },
      isActive: { type: 'boolean', example: true },
      productCount: { type: 'integer', description: 'Number of visible products', example: 44 },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CategoryInput: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Pet Supplies' },
      description: { type: 'string', example: 'Food, toys and accessories for pets' },
      image: { type: 'string', format: 'uri', example: 'https://placehold.co/600x400/png?text=Pets' },
      parent: { type: 'string', nullable: true, description: 'Parent category id' },
      sortOrder: { type: 'integer', default: 0 },
      isActive: { type: 'boolean', default: true },
    },
  },
  CategoryUpdateInput: {
    type: 'object',
    description: 'Send only the fields you want to change (at least one).',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      image: { type: 'string', format: 'uri' },
      parent: { type: 'string', nullable: true, description: 'Use null to make it a top-level category' },
      sortOrder: { type: 'integer' },
      isActive: { type: 'boolean' },
    },
  },
  CategoryResponse: successEnvelope(
    { type: 'object', properties: { category: ref('Category') } },
    'Category fetched',
  ),
  CategoryListResponse: successEnvelope(
    { type: 'object', properties: { categories: { type: 'array', items: ref('Category') } } },
    'Categories fetched',
  ),
  Brand: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '66f1a2b3c4d5e6f7a8b9c0d2' },
      name: { type: 'string', example: 'Nike' },
      slug: { type: 'string', example: 'nike' },
      description: { type: 'string' },
      logo: { type: 'string' },
      website: { type: 'string' },
      isActive: { type: 'boolean', example: true },
      productCount: { type: 'integer', description: 'Number of visible products', example: 6 },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  BrandInput: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Wildcraft' },
      description: { type: 'string' },
      logo: { type: 'string', format: 'uri' },
      website: { type: 'string', format: 'uri' },
      isActive: { type: 'boolean', default: true },
    },
  },
  BrandUpdateInput: {
    type: 'object',
    description: 'Send only the fields you want to change (at least one).',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      logo: { type: 'string', format: 'uri' },
      website: { type: 'string', format: 'uri' },
      isActive: { type: 'boolean' },
    },
  },
  BrandResponse: successEnvelope(
    { type: 'object', properties: { brand: ref('Brand') } },
    'Brand fetched',
  ),
  BrandListResponse: successEnvelope(
    { type: 'object', properties: { brands: { type: 'array', items: ref('Brand') } } },
    'Brands fetched',
  ),
};

export const catalogPaths = {
  '/categories': {
    get: {
      tags: ['Categories'],
      summary: 'List categories (public)',
      description: 'Sorted by sortOrder then name. Each category includes its number of visible products.',
      parameters: [includeInactiveParam],
      responses: { 200: jsonResponse('Categories', ref('CategoryListResponse')) },
    },
    post: {
      tags: ['Categories'],
      summary: 'Create a category (admin only)',
      security: bearer,
      requestBody: jsonBody('CategoryInput'),
      responses: {
        201: jsonResponse('Category created', ref('CategoryResponse')),
        400: errorResponse('Validation failed'),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
        409: errorResponse('A category with this name already exists'),
      },
    },
  },
  '/categories/{identifier}': {
    get: {
      tags: ['Categories'],
      summary: 'Get a category by id or slug (public)',
      parameters: [identifierParam('Category'), includeInactiveParam],
      responses: {
        200: jsonResponse('Category with its sub-categories', ref('CategoryResponse')),
        404: errorResponse('Category not found'),
      },
    },
  },
  '/categories/{id}': {
    put: {
      tags: ['Categories'],
      summary: 'Update a category (admin only)',
      security: bearer,
      parameters: [pathParam('id', 'Category id')],
      requestBody: jsonBody('CategoryUpdateInput'),
      responses: {
        200: jsonResponse('Category updated', ref('CategoryResponse')),
        400: errorResponse('Validation failed'),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
        404: errorResponse('Category not found'),
        409: errorResponse('A category with this name already exists'),
      },
    },
    delete: {
      tags: ['Categories'],
      summary: 'Delete a category (admin only)',
      description: 'Fails with 409 while the category still has products or sub-categories.',
      security: bearer,
      parameters: [pathParam('id', 'Category id')],
      responses: {
        200: jsonResponse('Category deleted', ref('MessageResponse')),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
        404: errorResponse('Category not found'),
        409: errorResponse('Category still has products or sub-categories'),
      },
    },
  },
  '/brands': {
    get: {
      tags: ['Brands'],
      summary: 'List brands (public)',
      parameters: [includeInactiveParam],
      responses: { 200: jsonResponse('Brands', ref('BrandListResponse')) },
    },
    post: {
      tags: ['Brands'],
      summary: 'Create a brand (admin only)',
      security: bearer,
      requestBody: jsonBody('BrandInput'),
      responses: {
        201: jsonResponse('Brand created', ref('BrandResponse')),
        400: errorResponse('Validation failed'),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
        409: errorResponse('A brand with this name already exists'),
      },
    },
  },
  '/brands/{identifier}': {
    get: {
      tags: ['Brands'],
      summary: 'Get a brand by id or slug (public)',
      parameters: [identifierParam('Brand'), includeInactiveParam],
      responses: {
        200: jsonResponse('Brand', ref('BrandResponse')),
        404: errorResponse('Brand not found'),
      },
    },
  },
  '/brands/{id}': {
    put: {
      tags: ['Brands'],
      summary: 'Update a brand (admin only)',
      security: bearer,
      parameters: [pathParam('id', 'Brand id')],
      requestBody: jsonBody('BrandUpdateInput'),
      responses: {
        200: jsonResponse('Brand updated', ref('BrandResponse')),
        400: errorResponse('Validation failed'),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
        404: errorResponse('Brand not found'),
        409: errorResponse('A brand with this name already exists'),
      },
    },
    delete: {
      tags: ['Brands'],
      summary: 'Delete a brand (admin only)',
      description: 'Fails with 409 while products still use the brand.',
      security: bearer,
      parameters: [pathParam('id', 'Brand id')],
      responses: {
        200: jsonResponse('Brand deleted', ref('MessageResponse')),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
        404: errorResponse('Brand not found'),
        409: errorResponse('Brand still has products'),
      },
    },
  },
};
