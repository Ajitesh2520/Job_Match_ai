import {
  resolveScoringWeights,
  type ScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
} from '../../../config/scoring.js';
import type { ScoringStrategy } from './scorers/scoring-strategy.js';
import { ExperienceScorer } from './scorers/experience.scorer.js';
import { LocationScorer } from './scorers/location.scorer.js';
import { SalaryScorer } from './scorers/salary.scorer.js';
import { SkillScorer } from './scorers/skill.scorer.js';

/**
 * Builds the four scoring strategies from validated application weights.
 * Weights are product configuration — not request parameters.
 */
export function createScoringStrategies(
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): ScoringStrategy[] {
  const resolved = resolveScoringWeights(weights);

  return [
    new SkillScorer(resolved.skills),
    new ExperienceScorer(resolved.experience),
    new LocationScorer(resolved.location),
    new SalaryScorer(resolved.salary),
  ];
}
