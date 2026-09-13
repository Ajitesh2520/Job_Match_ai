export {
  createRecommendationRouter,
  createCandidateRecommendationRouter,
  createJobRecommendationRouter,
  createRecommendationService,
} from './recommendation.routes.js';
export type { RecommendationRouterOptions } from './recommendation.routes.js';
export {
  RecommendationService,
  CandidateNotFoundError,
  JobNotFoundError,
  type RecommendationResult,
  type JobRecommendationResult,
  type CandidateRecommendationResult,
} from './recommendation.service.js';
export { RecommendationController } from './recommendation.controller.js';
export * from './domain/index.js';
