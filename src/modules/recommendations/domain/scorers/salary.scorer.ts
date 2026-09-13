import type { ScoringStrategy } from './scoring-strategy.js';

/** Salary scored by overlap / fit between candidate expectation and job range. */
export class SalaryScorer implements ScoringStrategy {
  readonly name = 'salary' as const;

  score(_candidate: unknown, _job: unknown): number {
    throw new Error('SalaryScorer.score is not implemented yet');
  }
}
