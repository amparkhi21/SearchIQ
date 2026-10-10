import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { z } from 'zod';

const pkg = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'),
);

// Treat empty strings in .env (e.g. `OPENSEARCH_USERNAME=`) as "not set"
const emptyToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const str = (defaultValue) =>
  z.preprocess(emptyToUndefined, z.string().default(defaultValue));

const optionalStr = z.preprocess(emptyToUndefined, z.string().optional());

const int = (defaultValue) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(defaultValue));

const bool = (defaultValue) =>
  z
    .preprocess(emptyToUndefined, z.enum(['true', 'false']).default(defaultValue))
    .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['development', 'test', 'production']).default('development'),
  ),
  PORT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(65535).default(5000),
  ),

  MONGO_URI: str('mongodb://localhost:27017/searchiq'),
  REDIS_URL: str('redis://localhost:6379'),

  // opensearch (default): BM25 + semantic + hybrid search via OpenSearch and the AI service.
  // mongo: MongoDB-only keyword search; OpenSearch and the AI service are neither required nor contacted.
  SEARCH_MODE: z
    .preprocess(emptyToUndefined, z.enum(['opensearch', 'mongo', 'mongodb']).default('opensearch'))
    .transform((value) => (value === 'opensearch' ? 'opensearch' : 'mongo')),
  OPENSEARCH_NODE: str('http://localhost:9200'),
  OPENSEARCH_USERNAME: optionalStr,
  OPENSEARCH_PASSWORD: optionalStr,

  AI_SERVICE_URL: str('http://localhost:8000'),
  AI_INTERNAL_KEY: str('dev-only-ai-key-change-me-0123456789abcdef'),
  AI_QUERY_TIMEOUT_MS: int(3000),
  AI_EMBED_TIMEOUT_MS: int(30000),
  AI_RETRIES: int(2),
  AI_CIRCUIT_FAILURE_THRESHOLD: int(5),
  AI_CIRCUIT_RESET_MS: int(30000),

  CORS_ORIGINS: str('http://localhost:5173'),
  TRUST_PROXY: str('false'),

  RATE_LIMIT_WINDOW_MS: int(15 * 60 * 1000),
  RATE_LIMIT_MAX: int(300),
  AUTH_RATE_LIMIT_MAX: int(10),

  LOG_LEVEL: z.preprocess(
    emptyToUndefined,
    z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).optional(),
  ),
  LOG_TO_FILE: bool('false'),

  STARTUP_RETRIES: int(15),
  STARTUP_RETRY_DELAY_MS: int(4000),
  HEALTH_CHECK_TIMEOUT_MS: int(3000),

  SEARCH_INDEX_NAME: str('searchiq-products-v1'),
  SEARCH_EMBEDDING_DIMENSIONS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(384),
  ),
  SEARCH_EMBEDDING_VERSION: str('minilm-v1'),
  SEARCH_TEXT_VERSION: str('product-v1'),
  SEARCH_EMBED_BATCH_SIZE: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(64).default(64),
  ),
  SEARCH_BULK_BATCH_SIZE: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(500).default(100),
  ),
  SEARCH_VECTOR_K: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1000).default(100),
  ),
  SEARCH_HYBRID_CANDIDATE_K: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1000).default(100),
  ),
  SEARCH_HYBRID_BM25_WEIGHT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).max(1).default(0.55),
  ),
  SEARCH_HYBRID_VECTOR_WEIGHT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).max(1).default(0.45),
  ),
  SEARCH_HYBRID_RRF_K: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1000).default(60),
  ),
  SEARCH_CACHE_TTL_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).max(3600).default(60),
  ),
  SEARCH_SUGGESTION_CACHE_TTL_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).max(300).default(30),
  ),

  JWT_ACCESS_SECRET: optionalStr,
  JWT_REFRESH_SECRET: optionalStr,
  JWT_ACCESS_EXPIRES_IN: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d+[smhd]$/, 'Use a format like 15m, 1h or 7d').default('15m'),
  ),
  JWT_REFRESH_EXPIRES_DAYS: int(7),
  BCRYPT_SALT_ROUNDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(4).max(15).default(12),
  ),

  COOKIE_SECURE: z
    .preprocess(emptyToUndefined, z.enum(['true', 'false']).optional())
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  COOKIE_SAME_SITE: z.preprocess(
    emptyToUndefined,
    z.enum(['lax', 'strict', 'none']).default('lax'),
  ),

  ADMIN_NAME: optionalStr,
  ADMIN_EMAIL: optionalStr,
  ADMIN_PASSWORD: optionalStr,
  UNSPLASH_ACCESS_KEY: optionalStr,
});

const parsed = schema.safeParse({
  ...process.env,
  UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY ?? process.env.ACCESS_KEY,
});

if (!parsed.success) {
  // Logger depends on env, so plain console is used here.
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const e = parsed.data;

const isProduction = e.NODE_ENV === 'production';
const isTest = e.NODE_ENV === 'test';

// ---- Cross-field checks ----
const MIN_SECRET_LENGTH = 32;
const DEV_ACCESS_SECRET = 'dev-only-access-secret-change-me-0123456789abcdef';
const DEV_REFRESH_SECRET = 'dev-only-refresh-secret-change-me-0123456789abcdef';

const configErrors = [];

if (isProduction) {
  // The AI key is not used when search runs in MongoDB-only mode
  if (e.SEARCH_MODE !== 'mongo' && e.AI_INTERNAL_KEY.startsWith('dev-only-')) {
    configErrors.push('AI_INTERNAL_KEY must be changed in production');
  }
  if (!e.JWT_ACCESS_SECRET) configErrors.push('JWT_ACCESS_SECRET is required in production');
  if (!e.JWT_REFRESH_SECRET) configErrors.push('JWT_REFRESH_SECRET is required in production');
}
for (const [name, value] of [
  ['JWT_ACCESS_SECRET', e.JWT_ACCESS_SECRET],
  ['JWT_REFRESH_SECRET', e.JWT_REFRESH_SECRET],
]) {
  if (value && value.length < MIN_SECRET_LENGTH) {
    configErrors.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters`);
  }
}
if (e.JWT_ACCESS_SECRET && e.JWT_ACCESS_SECRET === e.JWT_REFRESH_SECRET) {
  configErrors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
}

const cookieSecure = e.COOKIE_SECURE ?? isProduction;
if (e.COOKIE_SAME_SITE === 'none' && !cookieSecure) {
  configErrors.push('COOKIE_SAME_SITE=none requires COOKIE_SECURE=true');
}

if (configErrors.length > 0) {
  console.error('Invalid environment configuration:');
  for (const message of configErrors) console.error(`  - ${message}`);
  process.exit(1);
}

const parseTrustProxy = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value; // e.g. 'loopback' or a CIDR list
};

export const env = Object.freeze({
  appName: 'SearchIQ API',
  appVersion: pkg.version,

  nodeEnv: e.NODE_ENV,
  isProduction,
  isDevelopment: e.NODE_ENV === 'development',
  isTest,

  port: e.PORT,

  mongoUri: e.MONGO_URI,
  redisUrl: e.REDIS_URL,
  opensearch: {
    node: e.OPENSEARCH_NODE,
    username: e.OPENSEARCH_USERNAME,
    password: e.OPENSEARCH_PASSWORD,
  },

  ai: {
    baseUrl: e.AI_SERVICE_URL.replace(/\/$/, ''),
    internalKey: e.AI_INTERNAL_KEY,
    queryTimeoutMs: e.AI_QUERY_TIMEOUT_MS,
    embedTimeoutMs: e.AI_EMBED_TIMEOUT_MS,
    retries: e.AI_RETRIES,
    circuitFailureThreshold: e.AI_CIRCUIT_FAILURE_THRESHOLD,
    circuitResetMs: e.AI_CIRCUIT_RESET_MS,
  },

  corsOrigins: e.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  trustProxy: parseTrustProxy(e.TRUST_PROXY),

  rateLimit: {
    windowMs: e.RATE_LIMIT_WINDOW_MS,
    max: e.RATE_LIMIT_MAX,
    authMax: e.AUTH_RATE_LIMIT_MAX,
  },

  log: {
    level: e.LOG_LEVEL ?? (isProduction ? 'info' : isTest ? 'warn' : 'debug'),
    toFile: e.LOG_TO_FILE,
  },

  startup: {
    retries: e.STARTUP_RETRIES,
    retryDelayMs: e.STARTUP_RETRY_DELAY_MS,
  },

  healthCheckTimeoutMs: e.HEALTH_CHECK_TIMEOUT_MS,

  search: {
    mode: e.SEARCH_MODE,
    mongoOnly: e.SEARCH_MODE === 'mongo',
    indexName: e.SEARCH_INDEX_NAME,
    embeddingDimensions: e.SEARCH_EMBEDDING_DIMENSIONS,
    embeddingVersion: e.SEARCH_EMBEDDING_VERSION,
    textVersion: e.SEARCH_TEXT_VERSION,
    embedBatchSize: e.SEARCH_EMBED_BATCH_SIZE,
    bulkBatchSize: e.SEARCH_BULK_BATCH_SIZE,
    vectorK: e.SEARCH_VECTOR_K,
    hybridCandidateK: e.SEARCH_HYBRID_CANDIDATE_K,
    hybridBm25Weight: e.SEARCH_HYBRID_BM25_WEIGHT,
    hybridVectorWeight: e.SEARCH_HYBRID_VECTOR_WEIGHT,
    hybridRrfK: e.SEARCH_HYBRID_RRF_K,
    cacheTtlSeconds: e.SEARCH_CACHE_TTL_SECONDS,
    suggestionCacheTtlSeconds: e.SEARCH_SUGGESTION_CACHE_TTL_SECONDS,
  },

  jwt: {
    accessSecret: e.JWT_ACCESS_SECRET ?? DEV_ACCESS_SECRET,
    refreshSecret: e.JWT_REFRESH_SECRET ?? DEV_REFRESH_SECRET,
    accessExpiresIn: e.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresDays: e.JWT_REFRESH_EXPIRES_DAYS,
    refreshTtlSeconds: e.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60,
    issuer: 'searchiq-api',
  },

  auth: {
    bcryptSaltRounds: e.BCRYPT_SALT_ROUNDS,
  },

  cookie: {
    secure: cookieSecure,
    sameSite: e.COOKIE_SAME_SITE,
  },

  admin: {
    name: e.ADMIN_NAME ?? 'SearchIQ Admin',
    email: e.ADMIN_EMAIL,
    password: e.ADMIN_PASSWORD,
  },

  unsplash: {
    accessKey: e.UNSPLASH_ACCESS_KEY,
  },
});
