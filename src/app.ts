import express, { type Express } from 'express';
import { errorHandler, requestLogger } from './middleware/index.js';
import { createCandidateRouter } from './modules/candidates/index.js';
import { healthRouter } from './modules/health/index.js';
import { createJobRouter } from './modules/jobs/index.js';
import { createRecommendationRouter } from './modules/recommendations/index.js';

/**
 * Builds and configures the Express application (no listen).
 */
export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);

  app.use('/health', healthRouter);
  app.use('/candidates', createCandidateRouter());
  app.use('/jobs', createJobRouter());
  app.use('/candidates/:candidateId/recommendations', createRecommendationRouter());

  app.use(errorHandler);

  return app;
}
