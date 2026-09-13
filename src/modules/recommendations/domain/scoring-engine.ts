import type { ScoringStrategy } from './scorers/scoring-strategy.js';
import type {
  EngineScoreBreakdown,
  EngineScoreResult,
  ScoreDimension,
  ScoringCandidate,
  ScoringJob,
} from './types.js';

const REQUIRED_DIMENSIONS: readonly ScoreDimension[] = [
  'skills',
  'experience',
  'location',
  'salary',
] as const;

/**
 * Orchestrates injected scoring strategies and produces an explainable 0–100 result.
 * Does not own eligibility, persistence, or HTTP concerns.
 */
export class ScoringEngine {
  readonly maxScore: number;

  constructor(private readonly strategies: ScoringStrategy[]) {
    if (strategies.length === 0) {
      throw new Error('ScoringEngine requires at least one scoring strategy');
    }

    const names = new Set(strategies.map((strategy) => strategy.name));
    for (const dimension of REQUIRED_DIMENSIONS) {
      if (!names.has(dimension)) {
        throw new Error(`ScoringEngine missing required strategy: ${dimension}`);
      }
    }

    this.maxScore = strategies.reduce((sum, strategy) => sum + strategy.maxScore, 0);
    if (this.maxScore !== 100) {
      throw new Error(`ScoringEngine strategy maxScore sum must be 100, got ${this.maxScore}`);
    }
  }

  score(candidate: ScoringCandidate, job: ScoringJob): EngineScoreResult {
    const breakdown = {} as EngineScoreBreakdown;
    let total = 0;

    for (const strategy of this.strategies) {
      const result = strategy.score(candidate, job);
      breakdown[strategy.name] = {
        score: result.score,
        maxScore: result.maxScore,
        details: result.details,
      };
      total += result.score;
    }

    return {
      score: total,
      breakdown,
    };
  }
}
