import { z } from 'zod';

/** Placeholder Zod schemas for Job APIs. */
export const createJobSchema = z.object({
  // Fields will be defined with Prisma models.
});

export const jobIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
