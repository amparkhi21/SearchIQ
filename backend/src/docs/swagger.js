import swaggerUi from 'swagger-ui-express';
import { DOCS_PATH } from '../constants.js';
import { openApiSpec } from './openapi.js';

export function setupSwagger(app) {
  app.get(`${DOCS_PATH}.json`, (_req, res) => res.json(openApiSpec));

  app.use(
    DOCS_PATH,
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'SearchIQ API Docs',
      swaggerOptions: { persistAuthorization: true },
    }),
  );
}
