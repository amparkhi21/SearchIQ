// Small helpers that keep the OpenAPI definitions short and consistent.

export const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

export const jsonBody = (schemaName) => ({
  required: true,
  content: { 'application/json': { schema: ref(schemaName) } },
});

export const jsonResponse = (description, schema) => ({
  description,
  content: { 'application/json': { schema } },
});

export const errorResponse = (description) => jsonResponse(description, ref('ErrorResponse'));

export const bearer = [{ bearerAuth: [] }];

/** Standard { success, message, data, meta? } envelope used by every endpoint. */
export const successEnvelope = (dataSchema, message = 'OK', withMeta = false) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    data: dataSchema,
    ...(withMeta ? { meta: ref('PaginationMeta') } : {}),
  },
});

export const queryParam = (name, schema, description) => ({
  name,
  in: 'query',
  required: false,
  description,
  schema,
});

export const pathParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', example: '66f1a2b3c4d5e6f7a8b9c0d1' },
});
