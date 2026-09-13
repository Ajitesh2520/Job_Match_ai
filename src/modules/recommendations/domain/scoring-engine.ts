import type { ScoreBreakdown } from '../../../types/index.js';
import type { ScoringStrategy } from './scorers/scoring-strategy.js';

/**
 * Orchestrates scoring strategies and produces an explainable 0–100 breakdown.
 * Strategies are injected (composition) — not hardcoded.
 */
export class ScoringEngine {
  constructor(private readonly _strategies: ScoringStrategy[]) {}

  score(_candidate: unknown, _job: unknown): ScoreBreakdown {
    void this._strategies;
    throw new Error('ScoringEngine.score is not implemented yet');
  }
}
