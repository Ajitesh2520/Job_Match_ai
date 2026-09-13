import { Router } from 'express';
import { getPrismaClient } from '../../infrastructure/prisma/index.js';
import { CandidateRepository } from '../candidates/candidate.repository.js';
import { JobRepository } from '../jobs/job.repository.js';
import {
  EligibilityChecker,
  ExperienceScorer,
  LocationScorer,
  SalaryScorer,
  ScoringEngine,
  SkillScorer,
} from './domain/index.js';
import { RecommendationController } from './recommendation.controller.js';
import { RecommendationService } from './recommendation.service.js';

export type RecommendationRouterOptions = {
  recommendationService?: RecommendationService;
};

/**
 * Composes recommendation dependencies (DI via constructor injection).
 */
export function createRecommendationRouter(
  options: RecommendationRouterOptions = {},
): Router {
  const service = options.recommendationService ?? createDefaultRecommendationService();
  const controller = new RecommendationController(service);

  const router = Router({ mergeParams: true });
  router.get('/', controller.getForCandidate);

  return router;
}

function createDefaultRecommendationService(): RecommendationService {
  const prisma = getPrismaClient();
  const candidateRepository = new CandidateRepository(prisma);
  const jobRepository = new JobRepository(prisma);
  const eligibilityChecker = new EligibilityChecker();
  const scoringEngine = new ScoringEngine([
    new SkillScorer(),
    new ExperienceScorer(),
    new LocationScorer(),
    new SalaryScorer(),
  ]);

  return new RecommendationService(
    candidateRepository,
    jobRepository,
    eligibilityChecker,
    scoringEngine,
  );
}
