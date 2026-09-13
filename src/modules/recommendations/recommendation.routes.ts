import { Router } from 'express';
import { getPrismaClient } from '../../infrastructure/prisma/index.js';
import { CandidateRepository } from '../candidates/candidate.repository.js';
import { JobRepository } from '../jobs/job.repository.js';
import {
  EligibilityChecker,
  ScoringEngine,
  createScoringStrategies,
} from './domain/index.js';
import { RecommendationController } from './recommendation.controller.js';
import { RecommendationService } from './recommendation.service.js';

export type RecommendationRouterOptions = {
  recommendationService?: RecommendationService;
};

export function createRecommendationService(): RecommendationService {
  const prisma = getPrismaClient();
  const candidateRepository = new CandidateRepository(prisma);
  const jobRepository = new JobRepository(prisma);
  const eligibilityChecker = new EligibilityChecker();
  const scoringEngine = new ScoringEngine(createScoringStrategies());

  return new RecommendationService(
    candidateRepository,
    jobRepository,
    eligibilityChecker,
    scoringEngine,
  );
}

/**
 * GET /candidates/:candidateId/recommendations
 */
export function createCandidateRecommendationRouter(
  recommendationService: RecommendationService,
): Router {
  const controller = new RecommendationController(recommendationService);
  const router = Router({ mergeParams: true });
  router.get('/', controller.getForCandidate);
  return router;
}

/**
 * GET /jobs/:jobId/recommendations
 */
export function createJobRecommendationRouter(
  recommendationService: RecommendationService,
): Router {
  const controller = new RecommendationController(recommendationService);
  const router = Router({ mergeParams: true });
  router.get('/', controller.getForJob);
  return router;
}

/**
 * @deprecated Prefer createCandidateRecommendationRouter with an injected service.
 */
export function createRecommendationRouter(
  options: RecommendationRouterOptions = {},
): Router {
  const service = options.recommendationService ?? createRecommendationService();
  return createCandidateRecommendationRouter(service);
}
