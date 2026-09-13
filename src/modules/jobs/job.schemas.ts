import { JobSkillType } from '@prisma/client';
import { z } from 'zod';

export const jobSkillTypeSchema = z.nativeEnum(JobSkillType);

export const createJobSkillSchema = z.object({
  skill: z.string().trim().min(1, 'skill is required'),
  type: jobSkillTypeSchema,
});

export const createJobSchema = z
  .object({
    title: z.string().trim().min(1, 'title is required'),
    minYearsExperience: z.number().int().min(0, 'minYearsExperience must be >= 0'),
    location: z.string().trim().min(1, 'location is required'),
    salaryMin: z.number().int().nonnegative('salaryMin must be >= 0'),
    salaryMax: z.number().int().nonnegative('salaryMax must be >= 0'),
    remoteAllowed: z.boolean(),
    skills: z.array(createJobSkillSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.salaryMin > data.salaryMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'salaryMin must be <= salaryMax',
        path: ['salaryMin'],
      });
    }
  });

export const jobIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type CreateJobSkillInput = z.infer<typeof createJobSkillSchema>;
