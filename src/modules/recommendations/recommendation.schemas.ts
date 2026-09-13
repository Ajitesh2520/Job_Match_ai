import { z } from 'zod';

export const recommendationsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int('limit must be an integer')
    .min(1, 'limit must be >= 1')
    .max(50, 'limit must be <= 50')
    .default(10),
});

export const candidateIdParamSchema = z.object({
  candidateId: z.string().uuid('candidateId must be a valid UUID'),
});

export const jobIdParamSchema = z.object({
  jobId: z.string().uuid('jobId must be a valid UUID'),
});

export type RecommendationsQuery = z.infer<typeof recommendationsQuerySchema>;
