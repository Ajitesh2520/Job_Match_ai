import type { ScoreBreakdown } from '../../../types/index.js';
import type { ScoringCandidate, ScoringJob } from './types.js';
import type { ScoringStrategy } from './scorers/scoring-strategy.js';

/**
 * Orchestrates scoring strategies and produces an explainable 0–100 breakdown.
 * Strategies are injected (composition) — not hardcoded.
 * Not implemented yet.
 */
export class ScoringEngine {
  constructor(private readonly _strategies: ScoringStrategy[]) {}

  score(_candidate: ScoringCandidate, _job: ScoringJob): ScoreBreakdown {
    void this._strategies;
    throw new Error('ScoringEngine.score is not implemented yet');
  }
}
