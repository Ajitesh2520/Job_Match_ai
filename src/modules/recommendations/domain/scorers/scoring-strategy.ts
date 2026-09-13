import type { ScoreBreakdown } from '../../../../types/index.js';

/**
 * Contract for individual scoring strategies (Strategy Pattern).
 * Each scorer returns a partial contribution toward the 0–100 total.
 */
export interface ScoringStrategy {
  readonly name: keyof Omit<ScoreBreakdown, 'total'>;
  score(_candidate: unknown, _job: unknown): number;
}
