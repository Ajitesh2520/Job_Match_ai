import { DEFAULT_SCORING_WEIGHTS } from '../../../../config/scoring.js';
import type { ScoreResult, ScoringCandidate, ScoringJob } from '../types.js';
import type { ScoringStrategy } from './scoring-strategy.js';

/** @deprecated Prefer DEFAULT_SCORING_WEIGHTS.experience */
export const EXPERIENCE_MAX_SCORE = DEFAULT_SCORING_WEIGHTS.experience;

export type ExperienceScoreDetails = {
  candidateYears: number;
  minimumYears: number;
  meetsMinimum: boolean;
};

/**
 * Experience soft constraint.
 * Meets or exceeds minimum => full weight.
 * Below minimum => proportional (candidateYears / minimumYears) * maxScore.
 * minimumYears = 0 => full weight. Never excludes.
 */
export class ExperienceScorer implements ScoringStrategy {
  readonly name = 'experience' as const;
  readonly maxScore: number;

  constructor(maxScore: number = DEFAULT_SCORING_WEIGHTS.experience) {
    this.maxScore = maxScore;
  }

  score(candidate: ScoringCandidate, job: ScoringJob): ScoreResult<ExperienceScoreDetails> {
    const candidateYears = candidate.yearsOfExperience;
    const minimumYears = job.minYearsExperience;
    const meetsMinimum = candidateYears >= minimumYears;

    let score: number;
    if (minimumYears === 0 || meetsMinimum) {
      score = this.maxScore;
    } else {
      score = (candidateYears / minimumYears) * this.maxScore;
    }

    return {
      score,
      maxScore: this.maxScore,
      details: {
        candidateYears,
        minimumYears,
        meetsMinimum,
      },
    };
  }
}
