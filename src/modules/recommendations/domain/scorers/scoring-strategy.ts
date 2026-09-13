import type { ScoreDimension, ScoreResult, ScoringCandidate, ScoringJob } from '../types.js';

/**
 * Contract for individual scoring strategies (Strategy Pattern).
 * Each scorer returns an explainable partial contribution toward the 0–100 total.
 */
export interface ScoringStrategy {
  readonly name: ScoreDimension;
  readonly maxScore: number;
  score(candidate: ScoringCandidate, job: ScoringJob): ScoreResult;
}
