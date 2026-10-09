FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install dependencies first (better layer caching).
# Uses `npm ci` when a lockfile exists, otherwise `npm install`.
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
    && npm cache clean --force

COPY src ./src

# Writable folders for logs and uploads, owned by the non-root user
RUN mkdir -p /app/logs /app/src/uploads \
    && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-5000}/api/v1/health/live > /dev/null || exit 1

CMD ["node", "src/index.js"]
