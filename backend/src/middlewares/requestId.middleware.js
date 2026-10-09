import { randomUUID } from 'node:crypto';

/** Assigns every request an id (reuses a safe incoming X-Request-Id) for log correlation. */
export function requestId(req, res, next) {
  const incoming = req.get('X-Request-Id');
  req.id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
