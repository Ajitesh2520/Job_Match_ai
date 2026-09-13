import type { ScoreResult, ScoringCandidate, ScoringJob } from '../types.js';
import type { ScoringStrategy } from './scoring-strategy.js';

export const EXPERIENCE_MAX_SCORE = 20;

export type ExperienceScoreDetails = {
  candidateYears: number;
  minimumYears: number;
  meetsMinimum: boolean;
};

/**
 * Experience soft constraint (max 20).
 * Meets or exceeds minimum => 20.
 * Below minimum => proportional (candidateYears / minimumYears) * 20.
 * minimumYears = 0 => 20. Never excludes.
 */
export class ExperienceScorer implements ScoringStrategy {
  readonly name = 'experience' as const;
  readonly maxScore = EXPERIENCE_MAX_SCORE;

  score(candidate: ScoringCandidate, job: ScoringJob): ScoreResult<ExperienceScoreDetails> {
    const candidateYears = candidate.yearsOfExperience;
    const minimumYears = job.minYearsExperience;
    const meetsMinimum = candidateYears >= minimumYears;

    let score: number;
    if (minimumYears === 0 || meetsMinimum) {
      score = EXPERIENCE_MAX_SCORE;
    } else {
      score = (candidateYears / minimumYears) * EXPERIENCE_MAX_SCORE;
    }

    return {
      score,
      maxScore: EXPERIENCE_MAX_SCORE,
      details: {
        candidateYears,
        minimumYears,
        meetsMinimum,
      },
    };
  }
}
