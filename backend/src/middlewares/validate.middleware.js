/**
 * Validates and sanitizes request parts with Zod schemas.
 * Unknown fields are stripped (e.g. a client cannot send `role: "admin"` on register).
 * Validation failures are turned into a 400 response by the error middleware.
 *
 * Usage: validate({ body: schema, query: schema, params: schema })
 */
export const validate =
  ({ body, query, params } = {}) =>
  (req, _res, next) => {
    try {
      if (params) req.params = params.parse(req.params);
      if (query) req.query = query.parse(req.query);
      if (body) req.body = body.parse(req.body ?? {});
      next();
    } catch (err) {
      next(err);
    }
  };
