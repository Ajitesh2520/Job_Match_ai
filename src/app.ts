import express, { type Express } from 'express';
import { errorHandler, requestLogger } from './middleware/index.js';
import { createCandidateRouter } from './modules/candidates/index.js';
import { healthRouter } from './modules/health/index.js';
import { createJobRouter } from './modules/jobs/index.js';
import {
  createCandidateRecommendationRouter,
  createJobRecommendationRouter,
  createRecommendationService,
  type RecommendationRouterOptions,
} from './modules/recommendations/recommendation.routes.js';

export type CreateAppOptions = RecommendationRouterOptions;

/**
 * Builds and configures the Express application (no listen).
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const recommendationService =
    options.recommendationService ?? createRecommendationService();

  app.use(express.json());
  app.use(requestLogger);

  app.use('/health', healthRouter);
  app.use('/candidates', createCandidateRouter());
  app.use('/jobs', createJobRouter());
  app.use(
    '/candidates/:candidateId/recommendations',
    createCandidateRecommendationRouter(recommendationService),
  );
  app.use(
    '/jobs/:jobId/recommendations',
    createJobRecommendationRouter(recommendationService),
  );

  app.use(errorHandler);

  return app;
}
