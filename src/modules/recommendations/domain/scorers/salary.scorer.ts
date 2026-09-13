import { DEFAULT_SCORING_WEIGHTS } from '../../../../config/scoring.js';
import type { ScoreResult, ScoringCandidate, ScoringJob } from '../types.js';
import type { ScoringStrategy } from './scoring-strategy.js';

/** @deprecated Prefer DEFAULT_SCORING_WEIGHTS.salary */
export const SALARY_MAX_SCORE = DEFAULT_SCORING_WEIGHTS.salary;

export type SalaryFitKind = 'below_range' | 'within_range' | 'above_minimum';

export type SalaryScoreDetails = {
  expectedSalary: number;
  salaryMin: number;
  salaryMax: number;
  fit: SalaryFitKind;
  formula: string;
};

/**
 * Salary overlap / fit.
 *
 * Let E = expected salary, Jmin = salaryMin, Jmax = salaryMax, M = maxScore.
 *
 * - Jmax < E            => 0
 * - Jmin <= E <= Jmax   => M
 * - Jmin > E            => min(M, M * (E / Jmin))
 *
 * Never excludes the job.
 */
export class SalaryScorer implements ScoringStrategy {
  readonly name = 'salary' as const;
  readonly maxScore: number;

  constructor(maxScore: number = DEFAULT_SCORING_WEIGHTS.salary) {
    this.maxScore = maxScore;
  }

  score(candidate: ScoringCandidate, job: ScoringJob): ScoreResult<SalaryScoreDetails> {
    const expectedSalary = candidate.expectedSalary;
    const salaryMin = job.salaryMin;
    const salaryMax = job.salaryMax;
    const maxScore = this.maxScore;

    if (salaryMax < expectedSalary) {
      return {
        score: 0,
        maxScore,
        details: {
          expectedSalary,
          salaryMin,
          salaryMax,
          fit: 'below_range',
          formula: 'Jmax < E => 0',
        },
      };
    }

    if (salaryMin <= expectedSalary && expectedSalary <= salaryMax) {
      return {
        score: maxScore,
        maxScore,
        details: {
          expectedSalary,
          salaryMin,
          salaryMax,
          fit: 'within_range',
          formula: 'Jmin <= E <= Jmax => maxScore',
        },
      };
    }

    const raw = salaryMin === 0 ? maxScore : maxScore * (expectedSalary / salaryMin);
    const score = Math.min(maxScore, Math.max(0, raw));

    return {
      score,
      maxScore,
      details: {
        expectedSalary,
        salaryMin,
        salaryMax,
        fit: 'above_minimum',
        formula: 'Jmin > E => min(maxScore, maxScore * (E / Jmin))',
      },
    };
  }
}
