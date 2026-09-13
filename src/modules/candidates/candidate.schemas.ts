import { z } from 'zod';

/** Placeholder Zod schemas for Candidate APIs. */
export const createCandidateSchema = z.object({
  // Fields will be defined with Prisma models.
});

export const candidateIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
