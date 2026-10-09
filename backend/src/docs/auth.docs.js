import {
  bearer,
  errorResponse,
  jsonBody,
  jsonResponse,
  ref,
  successEnvelope,
} from './helpers.js';

export const authSchemas = {
  Address: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '66f1a2b3c4d5e6f7a8b9c0d1' },
      label: { type: 'string', example: 'Home' },
      fullName: { type: 'string', example: 'Rahul Sharma' },
      phone: { type: 'string', example: '+91 98765 43210' },
      line1: { type: 'string', example: '12, MG Road' },
      line2: { type: 'string', example: 'Near City Mall' },
      city: { type: 'string', example: 'Ahmedabad' },
      state: { type: 'string', example: 'Gujarat' },
      postalCode: { type: 'string', example: '380001' },
      country: { type: 'string', example: 'India' },
      isDefault: { type: 'boolean', example: true },
    },
  },
  User: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '66f1a2b3c4d5e6f7a8b9c0d1' },
      name: { type: 'string', example: 'Rahul Sharma' },
      email: { type: 'string', format: 'email', example: 'rahul@example.com' },
      role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
      phone: { type: 'string', example: '+91 98765 43210' },
      avatar: { type: 'string' },
      addresses: { type: 'array', items: ref('Address') },
      isActive: { type: 'boolean', example: true },
      lastLoginAt: { type: 'string', format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  RegisterRequest: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: { type: 'string', example: 'Rahul Sharma' },
      email: { type: 'string', format: 'email', example: 'rahul@example.com' },
      password: {
        type: 'string',
        format: 'password',
        description: '8-72 characters with an uppercase letter, a lowercase letter and a number',
        example: 'Test@1234',
      },
    },
  },
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'rahul@example.com' },
      password: { type: 'string', format: 'password', example: 'Test@1234' },
    },
  },
  RefreshRequest: {
    type: 'object',
    description:
      'Optional. Browsers send the refresh token automatically as an httpOnly cookie, so the body can stay empty.',
    properties: {
      refreshToken: { type: 'string' },
    },
  },
  AuthResponse: successEnvelope(
    {
      type: 'object',
      properties: {
        user: ref('User'),
        accessToken: {
          type: 'string',
          description: 'JWT valid for about 15 minutes. Send as "Authorization: Bearer <token>".',
        },
      },
    },
    'Login successful',
  ),
  UserResponse: successEnvelope(
    { type: 'object', properties: { user: ref('User') } },
    'Authenticated user',
  ),
  MessageResponse: successEnvelope({ type: 'object', nullable: true }, 'Done'),
};

export const authPaths = {
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Create a new account',
      description:
        'Creates a user (role is always "user"), returns an access token and sets the refresh token as an httpOnly cookie.',
      requestBody: jsonBody('RegisterRequest'),
      responses: {
        201: jsonResponse('Account created', ref('AuthResponse')),
        400: errorResponse('Validation failed'),
        409: errorResponse('Email already registered'),
        429: errorResponse('Too many attempts'),
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Log in with email and password',
      description:
        'After 5 failed attempts for the same email, login is locked for 15 minutes.',
      requestBody: jsonBody('LoginRequest'),
      responses: {
        200: jsonResponse('Logged in', ref('AuthResponse')),
        400: errorResponse('Validation failed'),
        401: errorResponse('Invalid email or password'),
        403: errorResponse('Account disabled'),
        429: errorResponse('Too many attempts'),
      },
    },
  },
  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Get a new access token',
      description:
        'Uses the refresh token cookie. The refresh token is rotated: the old one stops working and a new cookie is set. Re-using an old refresh token logs the user out everywhere.',
      requestBody: {
        required: false,
        content: { 'application/json': { schema: ref('RefreshRequest') } },
      },
      responses: {
        200: jsonResponse('Token refreshed', ref('AuthResponse')),
        401: errorResponse('Refresh token missing, expired or already used'),
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Log out',
      description:
        'Revokes the refresh token and blacklists the access token (if sent), then clears the cookie.',
      requestBody: {
        required: false,
        content: { 'application/json': { schema: ref('RefreshRequest') } },
      },
      responses: {
        200: jsonResponse('Logged out', ref('MessageResponse')),
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Get the logged-in user',
      security: bearer,
      responses: {
        200: jsonResponse('Current user', ref('UserResponse')),
        401: errorResponse('Not authenticated'),
      },
    },
  },
};
