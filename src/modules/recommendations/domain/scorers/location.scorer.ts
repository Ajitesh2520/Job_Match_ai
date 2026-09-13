import type { ScoringStrategy } from './scoring-strategy.js';

/** Location preference: exact match > remote > mismatch. */
export class LocationScorer implements ScoringStrategy {
  readonly name = 'location' as const;

  score(_candidate: unknown, _job: unknown): number {
    throw new Error('LocationScorer.score is not implemented yet');
  }
}
