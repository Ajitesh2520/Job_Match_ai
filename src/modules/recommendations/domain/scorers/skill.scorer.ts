import type { ScoringStrategy } from './scoring-strategy.js';

/**
 * Must-have skills are hard-filtered elsewhere; this scorer boosts for nice-to-have overlap.
 */
export class SkillScorer implements ScoringStrategy {
  readonly name = 'skills' as const;

  score(_candidate: unknown, _job: unknown): number {
    throw new Error('SkillScorer.score is not implemented yet');
  }
}
