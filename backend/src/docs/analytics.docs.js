import { bearer, errorResponse, jsonResponse, queryParam, successEnvelope } from './helpers.js';

const analyticsData = {
  type: 'object',
  properties: {
    windowDays: { type: 'integer', example: 7 },
    summary: {
      type: 'object',
      properties: {
        totalSearches: { type: 'integer' },
        uniqueUsers: { type: 'integer' },
        zeroResultSearches: { type: 'integer' },
        zeroResultRate: { type: 'number' },
        totalResultsReturned: { type: 'integer' },
      },
    },
    topQueries: { type: 'array', items: { type: 'object' } },
    zeroResultQueries: { type: 'array', items: { type: 'object' } },
    modeUsage: { type: 'array', items: { type: 'object' } },
    daily: { type: 'array', items: { type: 'object' } },
  },
};

export const analyticsSchemas = { SearchAnalytics: analyticsData };

export const analyticsPaths = {
  '/admin/analytics/search': {
    get: {
      tags: ['Admin Analytics'],
      summary: 'Get search analytics',
      description: 'Aggregates authenticated-user search logs for an administrator. Includes top queries, zero-result queries, mode usage and daily volume.',
      security: bearer,
      parameters: [
        queryParam('days', { type: 'integer', minimum: 1, maximum: 90, default: 7 }, 'Lookback window in days.'),
        queryParam('limit', { type: 'integer', minimum: 1, maximum: 50, default: 10 }, 'Number of top queries returned.'),
      ],
      responses: {
        200: jsonResponse('Search analytics', successEnvelope(analyticsData, 'Search analytics fetched')),
        400: errorResponse('Invalid analytics parameters'),
        401: errorResponse('Authentication required'),
        403: errorResponse('Admin role required'),
      },
    },
  },
};
