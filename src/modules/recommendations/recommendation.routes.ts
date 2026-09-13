import { Router } from 'express';
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

/**
 * Composes recommendation dependencies (DI via constructor injection).
 */
export function createRecommendationRouter(): Router {
  const candidateRepository = new CandidateRepository();
  const jobRepository = new JobRepository();
  const eligibilityChecker = new EligibilityChecker();
  const scoringEngine = new ScoringEngine([
    new SkillScorer(),
    new ExperienceScorer(),
    new LocationScorer(),
    new SalaryScorer(),
  ]);

  const service = new RecommendationService(
    candidateRepository,
    jobRepository,
    eligibilityChecker,
    scoringEngine,
  );
  const controller = new RecommendationController(service);

  const router = Router({ mergeParams: true });
  router.get('/', controller.getForCandidate);

  return router;
}
