import { JobSkillType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { createJobSchema } from './job.schemas.js';
import { normalizeJobSkills } from './job.service.js';

describe('createJobSchema', () => {
  const valid = {
    title: 'Backend Engineer',
    minYearsExperience: 3,
    location: 'Remote',
    salaryMin: 100000,
    salaryMax: 150000,
    remoteAllowed: true,
    skills: [
      { skill: 'TypeScript', type: JobSkillType.MUST_HAVE },
      { skill: 'GraphQL', type: JobSkillType.NICE_TO_HAVE },
    ],
  };

  it('accepts a valid payload', () => {
    expect(createJobSchema.parse(valid)).toEqual(valid);
  });

  it('defaults skills to an empty array', () => {
    const { skills: _skills, ...rest } = valid;
    expect(createJobSchema.parse(rest).skills).toEqual([]);
  });

  it('rejects salaryMin greater than salaryMax', () => {
    const result = createJobSchema.safeParse({
      ...valid,
      salaryMin: 200000,
      salaryMax: 100000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative minYearsExperience', () => {
    const result = createJobSchema.safeParse({ ...valid, minYearsExperience: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid skill type', () => {
    const result = createJobSchema.safeParse({
      ...valid,
      skills: [{ skill: 'Go', type: 'OPTIONAL' }],
    });
    expect(result.success).toBe(false);
  });

  it('allows salaryMin equal to salaryMax', () => {
    const parsed = createJobSchema.parse({
      ...valid,
      salaryMin: 120000,
      salaryMax: 120000,
    });
    expect(parsed.salaryMin).toBe(120000);
  });
});

describe('normalizeJobSkills', () => {
  it('trims, lowercases, and deduplicates by skill keeping first type', () => {
    expect(
      normalizeJobSkills([
        { skill: '  TypeScript ', type: JobSkillType.MUST_HAVE },
        { skill: 'typescript', type: JobSkillType.NICE_TO_HAVE },
        { skill: 'Go', type: JobSkillType.NICE_TO_HAVE },
        { skill: '  ', type: JobSkillType.MUST_HAVE },
      ]),
    ).toEqual([
      { skill: 'typescript', type: JobSkillType.MUST_HAVE },
      { skill: 'go', type: JobSkillType.NICE_TO_HAVE },
    ]);
  });
});
