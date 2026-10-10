export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;
export const DOCS_PATH = '/api/docs';

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

// Status of an individual backing service in the health check
export const SERVICE_STATUS = Object.freeze({
  UP: 'up',
  DOWN: 'down',
  DISABLED: 'disabled', // intentionally not used in this deployment (e.g. OpenSearch in SEARCH_MODE=mongo)
});

// Overall application status in the health check
export const OVERALL_STATUS = Object.freeze({
  OK: 'ok',
  DEGRADED: 'degraded',
});

// ---- Authentication & authorization ----
export const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});
export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

export const REFRESH_COOKIE_NAME = 'refreshToken';
// The refresh cookie is only sent to the auth endpoints
export const REFRESH_COOKIE_PATH = `${API_PREFIX}/auth`;

export const LOGIN_MAX_FAILED_ATTEMPTS = 5;
export const LOGIN_LOCK_SECONDS = 15 * 60;

// ---- Pagination ----
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ---- Redis key builders ----
export const REDIS_KEYS = Object.freeze({
  refreshToken: (userId, jti) => `refresh:${userId}:${jti}`,
  refreshTokenPattern: (userId) => `refresh:${userId}:*`,
  accessBlacklist: (jti) => `blacklist:access:${jti}`,
  loginFailures: (email) => `login:failures:${email}`,
});

// ---- Product catalog ----
// Maps the `sort` query parameter to a MongoDB sort. `_id` is the tie-breaker so pagination is stable.
export const PRODUCT_SORTS = Object.freeze({
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  price_asc: { finalPrice: 1, _id: 1 },
  price_desc: { finalPrice: -1, _id: 1 },
  rating: { ratingAvg: -1, ratingCount: -1, _id: 1 },
  popular: { soldCount: -1, _id: 1 },
  discount: { discountPercent: -1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
});
export const PRODUCT_SORT_KEYS = Object.freeze(Object.keys(PRODUCT_SORTS));

export const GENDERS = Object.freeze(['men', 'women', 'unisex', 'kids']);
export const PRODUCT_MAX_IMAGES = 10;
export const PRODUCT_MAX_TAGS = 20;
export const MAX_DISCOUNT_PERCENT = 90;
export const MAX_SEARCH_TOKENS = 6;
