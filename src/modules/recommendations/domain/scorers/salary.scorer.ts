import type { ScoreResult, ScoringCandidate, ScoringJob } from '../types.js';
import type { ScoringStrategy } from './scoring-strategy.js';

export const SALARY_MAX_SCORE = 15;

export type SalaryFitKind = 'below_range' | 'within_range' | 'above_minimum';

export type SalaryScoreDetails = {
  expectedSalary: number;
  salaryMin: number;
  salaryMax: number;
  fit: SalaryFitKind;
  formula: string;
};

/**
 * Salary overlap / fit (max 15).
 *
 * Let E = expected salary, Jmin = salaryMin, Jmax = salaryMax.
 *
 * - Jmax < E            => 0   (job pays below expectation)
 * - Jmin <= E <= Jmax   => 15  (expectation inside range)
 * - Jmin > E            => 15 * (E / Jmin), capped at 15
 *
 * Formula when Jmin > E:
 *   score = min(15, 15 * (E / Jmin))
 *
 * Rationale: a job whose minimum is only slightly above expectation still
 * fits well; as Jmin rises farther above E, fit declines toward 0.
 * Never excludes the job.
 */
export class SalaryScorer implements ScoringStrategy {
  readonly name = 'salary' as const;
  readonly maxScore = SALARY_MAX_SCORE;

  score(candidate: ScoringCandidate, job: ScoringJob): ScoreResult<SalaryScoreDetails> {
    const expectedSalary = candidate.expectedSalary;
    const salaryMin = job.salaryMin;
    const salaryMax = job.salaryMax;

    if (salaryMax < expectedSalary) {
      return {
        score: 0,
        maxScore: SALARY_MAX_SCORE,
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
        score: SALARY_MAX_SCORE,
        maxScore: SALARY_MAX_SCORE,
        details: {
          expectedSalary,
          salaryMin,
          salaryMax,
          fit: 'within_range',
          formula: 'Jmin <= E <= Jmax => 15',
        },
      };
    }

    // Jmin > E (and Jmax >= E follows from the branches above when Jmin > E,
    // unless the range is inverted — still apply the above-minimum formula).
    const raw = salaryMin === 0 ? SALARY_MAX_SCORE : SALARY_MAX_SCORE * (expectedSalary / salaryMin);
    const score = Math.min(SALARY_MAX_SCORE, Math.max(0, raw));

    return {
      score,
      maxScore: SALARY_MAX_SCORE,
      details: {
        expectedSalary,
        salaryMin,
        salaryMax,
        fit: 'above_minimum',
        formula: 'Jmin > E => min(15, 15 * (E / Jmin))',
      },
    };
  }
}
