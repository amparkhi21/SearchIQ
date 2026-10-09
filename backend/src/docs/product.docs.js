import { PRODUCT_SORT_KEYS } from '../constants.js';
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

const attributes = {
  type: 'object',
  properties: {
    color: { type: 'string', example: 'black' },
    variant: { type: 'string', example: '8 GB / 128 GB', description: 'Pack size, storage, capacity, shade...' },
    sizes: { type: 'array', items: { type: 'string' }, example: ['7', '8', '9', '10'] },
    material: { type: 'string', example: 'mesh' },
    gender: { type: 'string', enum: ['men', 'women', 'unisex', 'kids'], example: 'unisex' },
    useCase: { type: 'array', items: { type: 'string' }, example: ['running', 'college'] },
  },
};

const images = {
  type: 'array',
  items: {
    type: 'object',
    required: ['url'],
    properties: {
      url: { type: 'string', format: 'uri', example: 'https://placehold.co/800x800/png?text=Shoes' },
      alt: { type: 'string', example: 'Front view' },
      photographerName: { type: 'string', example: 'Jane Photographer' },
      photographerUrl: { type: 'string', format: 'uri' },
      photoUrl: { type: 'string', format: 'uri' },
    },
  },
};

const tags = { type: 'array', items: { type: 'string' }, example: ['shoes', 'running', 'college'] };

const refSummary = (example) => ({
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string', example },
    slug: { type: 'string', example: example.toLowerCase() },
  },
});

export const productSchemas = {
  Product: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '66f1a2b3c4d5e6f7a8b9c0d3' },
      name: { type: 'string', example: 'Campus Mesh Running Shoes for Men' },
      slug: { type: 'string', example: 'campus-mesh-running-shoes-for-men' },
      description: { type: 'string' },
      category: refSummary('Footwear'),
      brand: refSummary('Campus'),
      sku: { type: 'string', example: 'FTW-CAM-001' },
      price: { type: 'number', description: 'List price (MRP)', example: 1499 },
      discountPercent: { type: 'number', example: 20 },
      finalPrice: { type: 'number', description: 'price after discount (calculated)', example: 1199.2 },
      discountAmount: { type: 'number', example: 299.8 },
      stock: { type: 'integer', example: 42 },
      lowStockThreshold: { type: 'integer', example: 5 },
      inStock: { type: 'boolean', description: 'true when stock > 0 (calculated)', example: true },
      stockStatus: { type: 'string', enum: ['in_stock', 'low_stock', 'out_of_stock'] },
      images,
      tags,
      attributes,
      ratingAvg: { type: 'number', example: 4.3 },
      ratingCount: { type: 'integer', example: 1280 },
      soldCount: { type: 'integer', example: 5400 },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  ProductInput: {
    type: 'object',
    required: ['name', 'description', 'category', 'brand', 'sku', 'price'],
    properties: {
      name: { type: 'string', example: 'Campus Everyday Walking Shoes' },
      description: { type: 'string', example: 'Lightweight everyday shoes with a cushioned sole.' },
      category: { type: 'string', description: 'Category id (from GET /categories)' },
      brand: { type: 'string', description: 'Brand id (from GET /brands)' },
      sku: { type: 'string', example: 'FTW-CAM-900', description: '3-40 chars: letters, numbers, - or _ (stored uppercase, must be unique)' },
      price: { type: 'number', example: 1999 },
      discountPercent: { type: 'number', minimum: 0, maximum: 90, default: 0, example: 25 },
      stock: { type: 'integer', minimum: 0, default: 0, example: 50 },
      lowStockThreshold: { type: 'integer', minimum: 0, default: 5 },
      images,
      tags,
      attributes,
      isActive: { type: 'boolean', default: true },
    },
  },
  ProductUpdateInput: {
    type: 'object',
    description:
      'Send only the fields you want to change (at least one). `attributes` are merged with the existing ones; finalPrice and inStock are recalculated automatically.',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string' },
      brand: { type: 'string' },
      sku: { type: 'string' },
      price: { type: 'number', example: 2499 },
      discountPercent: { type: 'number', example: 10 },
      stock: { type: 'integer', example: 0 },
      lowStockThreshold: { type: 'integer' },
      images,
      tags,
      attributes,
      isActive: { type: 'boolean' },
    },
  },
  ProductResponse: successEnvelope(
    { type: 'object', properties: { product: ref('Product') } },
    'Product fetched',
  ),
  ProductListResponse: successEnvelope(
    { type: 'object', properties: { products: { type: 'array', items: ref('Product') } } },
    'Products fetched',
    true,
  ),
};

const listParameters = [
  queryParam('q', { type: 'string', example: 'black running shoes' }, 'Keyword search. Every word must match the start of a word in the name, description, tags, colour, use-case, material, brand or category.'),
  queryParam('category', { type: 'string', example: 'footwear' }, 'Category id or slug (comma-separated for several). Includes sub-categories.'),
  queryParam('brand', { type: 'string', example: 'nike,adidas' }, 'Brand id or slug (comma-separated for several).'),
  queryParam('minPrice', { type: 'number', minimum: 0, example: 500 }, 'Minimum final price (after discount).'),
  queryParam('maxPrice', { type: 'number', minimum: 0, example: 2500 }, 'Maximum final price (after discount).'),
  queryParam('rating', { type: 'number', minimum: 0, maximum: 5, example: 4 }, 'Minimum average rating.'),
  queryParam('minDiscount', { type: 'number', minimum: 0, maximum: 90 }, 'Minimum discount percentage.'),
  queryParam('inStock', { type: 'boolean' }, 'true = only available products, false = only out of stock.'),
  queryParam(
    'sort',
    { type: 'string', enum: PRODUCT_SORT_KEYS },
    'Default: newest (or popular when searching with q).',
  ),
  queryParam('page', { type: 'integer', minimum: 1, default: 1 }, 'Page number.'),
  queryParam('limit', { type: 'integer', minimum: 1, maximum: 100, default: 20 }, 'Items per page.'),
  queryParam('includeInactive', { type: 'boolean' }, 'Admins only: also return hidden products.'),
];

export const productPaths = {
  '/products': {
    get: {
      tags: ['Products'],
      summary: 'List and search products (public)',
      description:
        'Combine any of the filters below. Results are paginated: see `meta` for total, totalPages, hasNextPage and hasPrevPage.',
      parameters: listParameters,
      responses: {
        200: jsonResponse('Products', ref('ProductListResponse')),
        400: errorResponse('Invalid filter, sort or pagination value'),
        404: errorResponse('Unknown category or brand in the filter'),
      },
    },
    post: {
      tags: ['Products'],
      summary: 'Create a product (admin only)',
      description: 'slug is generated from the name. finalPrice and inStock are calculated automatically.',
      security: bearer,
      requestBody: jsonBody('ProductInput'),
      responses: {
        201: jsonResponse('Product created', ref('ProductResponse')),
        400: errorResponse('Validation failed (or category/brand does not exist)'),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
        409: errorResponse('SKU already exists'),
      },
    },
  },
  '/products/{identifier}': {
    get: {
      tags: ['Products'],
      summary: 'Get a product by id or slug (public)',
      description: 'Hidden (inactive) products return 404 unless an admin token is sent.',
      parameters: [
        {
          name: 'identifier',
          in: 'path',
          required: true,
          description: 'Product id or slug',
          schema: { type: 'string', example: 'campus-mesh-running-shoes-for-men' },
        },
      ],
      responses: {
        200: jsonResponse('Product', ref('ProductResponse')),
        404: errorResponse('Product not found'),
      },
    },
  },
  '/products/{id}': {
    put: {
      tags: ['Products'],
      summary: 'Update a product (admin only)',
      security: bearer,
      parameters: [pathParam('id', 'Product id')],
      requestBody: jsonBody('ProductUpdateInput'),
      responses: {
        200: jsonResponse('Product updated', ref('ProductResponse')),
        400: errorResponse('Validation failed'),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
        404: errorResponse('Product not found'),
        409: errorResponse('SKU already exists'),
      },
    },
    delete: {
      tags: ['Products'],
      summary: 'Delete a product (admin only)',
      security: bearer,
      parameters: [pathParam('id', 'Product id')],
      responses: {
        200: jsonResponse('Product deleted', ref('MessageResponse')),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
        404: errorResponse('Product not found'),
      },
    },
  },
};
