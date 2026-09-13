import type { ScoringStrategy } from './scoring-strategy.js';

/** Experience is a soft constraint. */
export class ExperienceScorer implements ScoringStrategy {
  readonly name = 'experience' as const;

  score(_candidate: unknown, _job: unknown): number {
    throw new Error('ExperienceScorer.score is not implemented yet');
  }
}
