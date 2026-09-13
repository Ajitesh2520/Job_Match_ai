import { AppError, ErrorCode } from '../../shared/errors.js';
import type { CandidateWithSkills } from '../candidates/candidate.repository.js';
import type { CandidateRepository } from '../candidates/candidate.repository.js';
import type { JobWithSkills } from '../jobs/job.repository.js';
import type { JobRepository } from '../jobs/job.repository.js';
import type { EligibilityChecker } from './domain/eligibility-checker.js';
import type { ScoringEngine } from './domain/scoring-engine.js';
import type {
  EngineScoreBreakdown,
  ScoringCandidate,
  ScoringJob,
} from './domain/types.js';

export class CandidateNotFoundError extends AppError {
  readonly candidateId: string;

  constructor(candidateId: string) {
    super(
      ErrorCode.CANDIDATE_NOT_FOUND,
      `Candidate not found: ${candidateId}`,
      404,
      { candidateId },
    );
    this.name = 'CandidateNotFoundError';
    this.candidateId = candidateId;
  }
}

export type RecommendationResult = {
  jobId: string;
  title: string;
  score: number;
  breakdown: EngineScoreBreakdown;
};

/**
 * Recommendation orchestration:
 * load candidate/jobs → EligibilityChecker → ScoringEngine → ranked results.
 *
 * Depends on repositories and domain collaborators via constructor injection.
 * Does not call Prisma or embed scoring formulas.
 */
export class RecommendationService {
  constructor(
    private readonly candidateRepository: CandidateRepository,
    private readonly jobRepository: JobRepository,
    private readonly eligibilityChecker: EligibilityChecker,
    private readonly scoringEngine: ScoringEngine,
  ) {}

  async recommendForCandidate(
    candidateId: string,
    limit: number,
  ): Promise<RecommendationResult[]> {
    const candidate = await this.candidateRepository.findById(candidateId);
    if (!candidate) {
      throw new CandidateNotFoundError(candidateId);
    }

    const jobs = await this.jobRepository.findAll();
    const scoringCandidate = toScoringCandidate(candidate);

    const recommendations: RecommendationResult[] = [];

    for (const job of jobs) {
      const scoringJob = toScoringJob(job);
      if (!this.eligibilityChecker.isEligible(scoringCandidate, scoringJob)) {
        continue;
      }

      const { score, breakdown } = this.scoringEngine.score(scoringCandidate, scoringJob);
      recommendations.push({
        jobId: job.id,
        title: job.title,
        score,
        breakdown,
      });
    }

    recommendations.sort(compareRecommendations);

    const safeLimit = Math.max(0, limit);
    return recommendations.slice(0, safeLimit);
  }
}

function toScoringCandidate(candidate: CandidateWithSkills): ScoringCandidate {
  return {
    skills: candidate.skills.map((entry) => entry.skill),
    yearsOfExperience: candidate.yearsOfExperience,
    location: candidate.location,
    expectedSalary: candidate.expectedSalary,
  };
}

function toScoringJob(job: JobWithSkills): ScoringJob {
  return {
    skills: job.skills.map((entry) => ({
      skill: entry.skill,
      type: entry.type,
    })),
    minYearsExperience: job.minYearsExperience,
    location: job.location,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    remoteAllowed: job.remoteAllowed,
  };
}

/**
 * Descending by score; ties broken by jobId ascending for stable, deterministic order.
 */
function compareRecommendations(a: RecommendationResult, b: RecommendationResult): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }
  return a.jobId < b.jobId ? -1 : a.jobId > b.jobId ? 1 : 0;
}
