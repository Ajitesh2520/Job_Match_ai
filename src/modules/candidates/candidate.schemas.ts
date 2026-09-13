import { z } from 'zod';

export const createCandidateSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  yearsOfExperience: z.number().int().min(0, 'yearsOfExperience must be >= 0'),
  location: z.string().trim().min(1, 'location is required'),
  expectedSalary: z.number().int().positive('expectedSalary must be > 0'),
  skills: z.array(z.string()).default([]),
});

export const candidateIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
