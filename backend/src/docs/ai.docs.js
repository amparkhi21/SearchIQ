import { bearer, errorResponse, jsonBody, jsonResponse, ref, successEnvelope } from './helpers.js';

export const aiSchemas = {
  AiAnalyzeInput: {
    type: 'object',
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        maxLength: 500,
        example: 'comfortable black shoes for college under ₹2500',
      },
      vocabulary: {
        type: 'object',
        description: 'Optional category/brand vocabulary supplied by Node.',
        properties: {
          categories: { type: 'array', items: { type: 'string' } },
          brands: { type: 'array', items: { type: 'string' } },
          colors: { type: 'array', items: { type: 'string' } },
          useCases: { type: 'array', items: { type: 'string' } },
          genders: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  AiAnalyzeResponse: successEnvelope(
    {
      type: 'object',
      properties: {
        cleanQuery: { type: 'string', example: 'comfortable shoes for college' },
        hardFilters: { type: 'object', example: { category: ['Footwear'], maxPrice: 2500 } },
        softSignals: {
          type: 'object',
          example: { colors: ['black'], useCases: ['college'], genders: [] },
        },
        intentTags: { type: 'array', items: { type: 'string' }, example: ['comfort'] },
        confidence: { type: 'object' },
        embedding: { type: 'array', items: { type: 'number' } },
        embeddingVersion: { type: 'string', example: 'minilm-v1' },
        embeddingDimensions: { type: 'integer', example: 384 },
      },
    },
    'AI query analysis completed',
  ),
};

export const aiPaths = {
  '/ai/analyze-query': {
    post: {
      tags: ['AI'],
      summary: 'Analyze a natural-language product query (admin diagnostic)',
      security: bearer,
      requestBody: jsonBody('AiAnalyzeInput'),
      responses: {
        200: jsonResponse('AI analysis', ref('AiAnalyzeResponse')),
        400: errorResponse('Validation failed'),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
        503: errorResponse('AI service unavailable'),
      },
    },
  },
  '/ai/model': {
    get: {
      tags: ['AI'],
      summary: 'Get AI model information (admin only)',
      security: bearer,
      responses: {
        200: jsonResponse(
          'AI model information',
          successEnvelope({
            type: 'object',
            properties: {
              model: { type: 'string' },
              dimensions: { type: 'integer' },
              embeddingVersion: { type: 'string' },
              loaded: { type: 'boolean' },
            },
          }),
        ),
        401: errorResponse('Not authenticated'),
        403: errorResponse('Admin role required'),
      },
    },
  },
  '/ai/diagnostics': {
    get: {
      tags: ['AI'],
      summary: 'Get AI circuit-breaker diagnostics',
      security: bearer,
      responses: {
        200: jsonResponse(
          'AI diagnostics',
          successEnvelope({
            type: 'object',
            properties: {
              circuitOpen: { type: 'boolean' },
              failures: { type: 'integer' },
              openedAt: { type: 'integer', nullable: true },
              baseUrl: { type: 'string' },
            },
          }),
        ),
      },
    },
  },
};
