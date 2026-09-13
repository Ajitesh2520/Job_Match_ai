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

export class JobNotFoundError extends AppError {
  readonly jobId: string;

  constructor(jobId: string) {
    super(ErrorCode.JOB_NOT_FOUND, `Job not found: ${jobId}`, 404, { jobId });
    this.name = 'JobNotFoundError';
    this.jobId = jobId;
  }
}

/** Job ranked for a candidate (GET /candidates/:id/recommendations). */
export type JobRecommendationResult = {
  jobId: string;
  title: string;
  score: number;
  breakdown: EngineScoreBreakdown;
};

/** Candidate ranked for a job (GET /jobs/:id/recommendations). */
export type CandidateRecommendationResult = {
  candidateId: string;
  name: string;
  score: number;
  breakdown: EngineScoreBreakdown;
};

/** @deprecated Use JobRecommendationResult */
export type RecommendationResult = JobRecommendationResult;

/**
 * Recommendation orchestration for both directions.
 * Always scores with EligibilityChecker + ScoringEngine (candidate, job).
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
  ): Promise<JobRecommendationResult[]> {
    const candidate = await this.candidateRepository.findById(candidateId);
    if (!candidate) {
      throw new CandidateNotFoundError(candidateId);
    }

    const jobs = await this.jobRepository.findAll();
    const scoringCandidate = toScoringCandidate(candidate);
    const recommendations: JobRecommendationResult[] = [];

    for (const job of jobs) {
      const scored = this.scorePair(scoringCandidate, job);
      if (!scored) {
        continue;
      }

      recommendations.push({
        jobId: job.id,
        title: job.title,
        score: scored.score,
        breakdown: scored.breakdown,
      });
    }

    return rankAndLimit(recommendations, limit, (item) => item.jobId);
  }

  async recommendForJob(
    jobId: string,
    limit: number,
  ): Promise<CandidateRecommendationResult[]> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new JobNotFoundError(jobId);
    }

    const candidates = await this.candidateRepository.findAll();
    const scoringJob = toScoringJob(job);
    const recommendations: CandidateRecommendationResult[] = [];

    for (const candidate of candidates) {
      const scored = this.scorePair(toScoringCandidate(candidate), job, scoringJob);
      if (!scored) {
        continue;
      }

      recommendations.push({
        candidateId: candidate.id,
        name: candidate.name,
        score: scored.score,
        breakdown: scored.breakdown,
      });
    }

    return rankAndLimit(recommendations, limit, (item) => item.candidateId);
  }

  /**
   * Shared eligibility + scoring path for both directions.
   * Optional precomputed ScoringJob avoids remapping in reverse loop callers.
   */
  private scorePair(
    scoringCandidate: ScoringCandidate,
    job: JobWithSkills,
    scoringJob: ScoringJob = toScoringJob(job),
  ): { score: number; breakdown: EngineScoreBreakdown } | null {
    if (!this.eligibilityChecker.isEligible(scoringCandidate, scoringJob)) {
      return null;
    }

    return this.scoringEngine.score(scoringCandidate, scoringJob);
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
 * Descending by score; ties broken by stable id ascending.
 */
function rankAndLimit<T extends { score: number }>(
  items: T[],
  limit: number,
  tieBreakId: (item: T) => string,
): T[] {
  items.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    const aId = tieBreakId(a);
    const bId = tieBreakId(b);
    return aId < bId ? -1 : aId > bId ? 1 : 0;
  });

  return items.slice(0, Math.max(0, limit));
}
