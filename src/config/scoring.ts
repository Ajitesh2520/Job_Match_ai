/**
 * Application/product scoring weight configuration.
 * Not exposed via HTTP query parameters — change here (or inject at composition time).
 */

export type ScoringWeights = {
  skills: number;
  experience: number;
  location: number;
  salary: number;
};

/** Default weights — total 100. Preserves current scoring behavior. */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  skills: 50,
  experience: 20,
  location: 15,
  salary: 15,
};

/**
 * Within the skills budget: must-have core fit vs nice-to-have boost.
 * 40/50 and 10/50 of the skills weight (preserves historical 40 + 10 split).
 */
export const SKILL_MUST_HAVE_SHARE = 0.8;
export const SKILL_NICE_TO_HAVE_SHARE = 0.2;

/**
 * Within the location budget: remote (non-exact) score as a fraction of max.
 * Preserves historical remote = 10 when location max = 15.
 */
export const LOCATION_REMOTE_SHARE = 10 / 15;

const DIMENSIONS = ['skills', 'experience', 'location', 'salary'] as const;

/**
 * Ensures each weight is a finite non-negative number and the total is exactly 100.
 */
export function validateScoringWeights(weights: ScoringWeights): ScoringWeights {
  for (const key of DIMENSIONS) {
    const value = weights[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`Scoring weight "${key}" must be a non-negative finite number`);
    }
  }

  const total =
    weights.skills + weights.experience + weights.location + weights.salary;

  if (total !== 100) {
    throw new Error(`Scoring weights must total exactly 100, got ${total}`);
  }

  return {
    skills: weights.skills,
    experience: weights.experience,
    location: weights.location,
    salary: weights.salary,
  };
}

export function resolveScoringWeights(
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): ScoringWeights {
  return validateScoringWeights(weights);
}
