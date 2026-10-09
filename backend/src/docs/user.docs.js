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

export const userSchemas = {
  PaginationMeta: {
    type: 'object',
    properties: {
      total: { type: 'integer', example: 42 },
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      totalPages: { type: 'integer', example: 3 },
      hasNextPage: { type: 'boolean', example: true },
      hasPrevPage: { type: 'boolean', example: false },
    },
  },
  UpdateProfileRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', example: 'Rahul Sharma' },
      phone: { type: 'string', nullable: true, example: '+91 98765 43210' },
    },
  },
  ChangePasswordRequest: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string', format: 'password' },
      newPassword: { type: 'string', format: 'password', example: 'NewPass@1234' },
    },
  },
  AddressRequest: {
    type: 'object',
    required: ['fullName', 'phone', 'line1', 'city', 'state', 'postalCode'],
    properties: {
      label: { type: 'string', example: 'Home' },
      fullName: { type: 'string', example: 'Rahul Sharma' },
      phone: { type: 'string', example: '+91 98765 43210' },
      line1: { type: 'string', example: '12, MG Road' },
      line2: { type: 'string', example: 'Near City Mall' },
      city: { type: 'string', example: 'Ahmedabad' },
      state: { type: 'string', example: 'Gujarat' },
      postalCode: { type: 'string', example: '380001' },
      country: { type: 'string', example: 'India' },
      isDefault: { type: 'boolean', example: false },
    },
  },
  UpdateUserStatusRequest: {
    type: 'object',
    required: ['isActive'],
    properties: { isActive: { type: 'boolean', example: false } },
  },
  AddressListResponse: successEnvelope(
    { type: 'object', properties: { addresses: { type: 'array', items: ref('Address') } } },
    'Address added',
  ),
  UserListResponse: successEnvelope(
    { type: 'object', properties: { users: { type: 'array', items: ref('User') } } },
    'Users fetched',
    true,
  ),
};

export const userPaths = {
  '/users/profile': {
    get: {
      tags: ['Users'],
      summary: 'Get my profile',
      security: bearer,
      responses: {
        200: jsonResponse('Profile', ref('UserResponse')),
        401: errorResponse('Not authenticated'),
      },
    },
    put: {
      tags: ['Users'],
      summary: 'Update my profile',
      security: bearer,
      requestBody: jsonBody('UpdateProfileRequest'),
      responses: {
        200: jsonResponse('Profile updated', ref('UserResponse')),
        400: errorResponse('Validation failed'),
        401: errorResponse('Not authenticated'),
      },
    },
  },
  '/users/password': {
    put: {
      tags: ['Users'],
      summary: 'Change my password',
      description: 'Logs the user out on all devices; log in again with the new password.',
      security: bearer,
      requestBody: jsonBody('ChangePasswordRequest'),
      responses: {
        200: jsonResponse('Password updated', ref('MessageResponse')),
        400: errorResponse('Validation failed or wrong current password'),
        401: errorResponse('Not authenticated'),
      },
    },
  },
  '/users/addresses': {
    post: {
      tags: ['Users'],
      summary: 'Add a shipping address',
      description: 'The first address becomes the default automatically.',
      security: bearer,
      requestBody: jsonBody('AddressRequest'),
      responses: {
        201: jsonResponse('Address added', ref('AddressListResponse')),
        400: errorResponse('Validation failed'),
        401: errorResponse('Not authenticated'),
      },
    },
  },
  '/users/addresses/{addressId}': {
    delete: {
      tags: ['Users'],
      summary: 'Remove a shipping address',
      security: bearer,
      parameters: [pathParam('addressId', 'Address id')],
      responses: {
        200: jsonResponse('Address removed', ref('AddressListResponse')),
        401: errorResponse('Not authenticated'),
        404: errorResponse('Address not found'),
      },
    },
  },
  '/users': {
    get: {
      tags: ['Users'],
      summary: 'List users (admin only)',
      security: bearer,
      parameters: [
        queryParam('page', { type: 'integer', minimum: 1, default: 1 }, 'Page number'),
        queryParam('limit', { type: 'integer', minimum: 1, maximum: 100, default: 20 }, 'Page size'),
        queryParam('q', { type: 'string' }, 'Search in name or email'),
        queryParam('role', { type: 'string', enum: ['user', 'admin'] }, 'Filter by role'),
        queryParam('isActive', { type: 'boolean' }, 'Filter by active status'),
      ],
      responses: {
        200: jsonResponse('Users', ref('UserListResponse')),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
      },
    },
  },
  '/users/{userId}/status': {
    patch: {
      tags: ['Users'],
      summary: 'Activate or deactivate a user (admin only)',
      security: bearer,
      parameters: [pathParam('userId', 'User id')],
      requestBody: jsonBody('UpdateUserStatusRequest'),
      responses: {
        200: jsonResponse('Status updated', ref('UserResponse')),
        400: errorResponse('Validation failed or trying to deactivate yourself'),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
        404: errorResponse('User not found'),
      },
    },
  },
};
