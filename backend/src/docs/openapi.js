import { env } from '../config/env.js';
import { API_PREFIX } from '../constants.js';
import { aiPaths, aiSchemas } from './ai.docs.js';
import { authPaths, authSchemas } from './auth.docs.js';
import { catalogPaths, catalogSchemas } from './catalog.docs.js';
import { productPaths, productSchemas } from './product.docs.js';
import { searchPaths, searchSchemas } from './search.docs.js';
import { recommendationPaths, recommendationSchemas } from './recommendation.docs.js';
import { analyticsPaths, analyticsSchemas } from './analytics.docs.js';
import { userPaths, userSchemas } from './user.docs.js';
import { commercePaths, commerceSchemas } from './commerce.docs.js';

const serviceHealth = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['up', 'down'], example: 'up' },
    latencyMs: { type: 'integer', example: 4 },
    version: { type: 'string', example: '2.13.0' },
    error: { type: 'string', example: 'MongoDB is not connected' },
  },
  required: ['status', 'latencyMs'],
  additionalProperties: true,
};

const healthData = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok', 'degraded'], example: 'ok' },
    application: { type: 'string', example: 'SearchIQ API' },
    version: { type: 'string', example: '1.0.0' },
    environment: { type: 'string', example: 'development' },
    uptimeSeconds: { type: 'integer', example: 120 },
    timestamp: { type: 'string', format: 'date-time' },
    services: {
      type: 'object',
      properties: {
        mongodb: { $ref: '#/components/schemas/ServiceHealth' },
        redis: { $ref: '#/components/schemas/ServiceHealth' },
        opensearch: { $ref: '#/components/schemas/ServiceHealth' },
      },
    },
  },
};

const healthResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'All systems operational' },
    data: { $ref: '#/components/schemas/HealthData' },
  },
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SearchIQ API',
    version: env.appVersion,
    description:
      'REST API for SearchIQ – an AI-powered e-commerce platform with natural-language product search.\n\n' +
      '**Authentication:** call `POST /auth/login`, copy the `accessToken` from the response, click **Authorize** and paste it. ' +
      'The refresh token is stored automatically in an httpOnly cookie.',
  },
  servers: [{ url: API_PREFIX, description: 'Current environment' }],
  tags: [
    { name: 'Health', description: 'Service health and liveness' },
    { name: 'Auth', description: 'Register, login, token refresh and logout' },
    { name: 'Users', description: 'Profile, addresses and admin user management' },
    { name: 'AI', description: 'Admin diagnostics for the internal AI service' },
    { name: 'Categories', description: 'Product categories (read: public, write: admin)' },
    { name: 'Brands', description: 'Product brands (read: public, write: admin)' },
    { name: 'Products', description: 'Product catalog: list, search, filter, sort and admin management' },
    { name: 'Search', description: 'OpenSearch keyword, semantic, hybrid search, autocomplete and recent-search history' },
    { name: 'Recommendations', description: 'Similar products, personalized recommendations and recently viewed products' },
    { name: 'Admin Analytics', description: 'Administrator search analytics and zero-result insights' },
    { name: 'Cart', description: 'Shopping cart management' },
    { name: 'Wishlist', description: 'Saved products' },
    { name: 'Orders', description: 'Checkout, order history and cancellation' },
    { name: 'Reviews', description: 'Verified-purchase product reviews' },
    { name: 'Notifications', description: 'User notifications and read status' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description:
          'Reports the status of the API and its backing services (MongoDB, Redis, OpenSearch). Returns 503 when any service is down.',
        responses: {
          200: {
            description: 'All services are up',
            content: { 'application/json': { schema: healthResponse } },
          },
          503: {
            description: 'One or more services are down (status: degraded)',
            content: { 'application/json': { schema: healthResponse } },
          },
        },
      },
    },
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        description: 'Confirms the process is running. Does not check backing services.',
        responses: {
          200: {
            description: 'Process is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Service is alive' },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'alive' },
                        uptimeSeconds: { type: 'integer', example: 120 },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    ...aiPaths,
    ...authPaths,
    ...userPaths,
    ...catalogPaths,
    ...productPaths,
    ...searchPaths,
    ...recommendationPaths,
    ...analyticsPaths,
    ...commercePaths,
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token returned by /auth/login or /auth/register',
      },
    },
    schemas: {
      ServiceHealth: serviceHealth,
      HealthData: healthData,
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Route not found: GET /api/v1/unknown' },
          requestId: { type: 'string', format: 'uuid' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      ...aiSchemas,
      ...authSchemas,
      ...userSchemas,
      ...catalogSchemas,
      ...productSchemas,
      ...searchSchemas,
      ...recommendationSchemas,
      ...analyticsSchemas,
      ...commerceSchemas,
    },
  },
};
