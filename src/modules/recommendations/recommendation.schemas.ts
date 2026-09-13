import { z } from 'zod';

/** Placeholder query schema for GET recommendations (supports limit). */
export const recommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const candidateIdParamSchema = z.object({
  candidateId: z.string().uuid(),
});

export type RecommendationsQuery = z.infer<typeof recommendationsQuerySchema>;
