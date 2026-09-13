import type { EligibilityChecker } from './domain/eligibility-checker.js';
import type { ScoringEngine } from './domain/scoring-engine.js';
import type { CandidateRepository } from '../candidates/candidate.repository.js';
import type { JobRepository } from '../jobs/job.repository.js';

/**
 * Recommendation orchestration:
 * load candidate/jobs → EligibilityChecker → ScoringEngine → ranked results.
 */
export class RecommendationService {
  constructor(
    private readonly candidateRepository: CandidateRepository,
    private readonly jobRepository: JobRepository,
    private readonly eligibilityChecker: EligibilityChecker,
    private readonly scoringEngine: ScoringEngine,
  ) {}

  async recommendForCandidate(_candidateId: string, _limit: number): Promise<never[]> {
    void this.candidateRepository;
    void this.jobRepository;
    void this.eligibilityChecker;
    void this.scoringEngine;
    throw new Error('RecommendationService.recommendForCandidate is not implemented yet');
  }
}
