/**
 * Shared domain / API types (placeholders).
 * Concrete shapes will be defined alongside Prisma models and Zod schemas.
 */

export type HealthStatus = {
  status: 'ok';
  timestamp: string;
};

/** Score range for recommendations (0–100). */
export type RecommendationScore = number;

export type ScoreBreakdown = {
  skills: number;
  experience: number;
  location: number;
  salary: number;
  total: RecommendationScore;
};
