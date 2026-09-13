import { describe, expect, it } from 'vitest';
import { createCandidateSchema } from './candidate.schemas.js';
import { normalizeSkills } from '../../shared/skills.js';

describe('createCandidateSchema', () => {
  const valid = {
    name: 'Ada Lovelace',
    yearsOfExperience: 5,
    location: 'London',
    expectedSalary: 120000,
    skills: ['TypeScript', 'Node.js'],
  };

  it('accepts a valid payload', () => {
    const parsed = createCandidateSchema.parse(valid);
    expect(parsed).toEqual(valid);
  });

  it('defaults skills to an empty array', () => {
    const { skills: _skills, ...rest } = valid;
    const parsed = createCandidateSchema.parse(rest);
    expect(parsed.skills).toEqual([]);
  });

  it('rejects negative yearsOfExperience', () => {
    const result = createCandidateSchema.safeParse({ ...valid, yearsOfExperience: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects expectedSalary of 0', () => {
    const result = createCandidateSchema.safeParse({ ...valid, expectedSalary: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name: _name, ...rest } = valid;
    const result = createCandidateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('candidate skill normalization (service rule)', () => {
  it('normalizes skills before persistence shape', () => {
    expect(normalizeSkills(['  TypeScript ', 'TYPESCRIPT', 'Go '])).toEqual([
      'typescript',
      'go',
    ]);
  });
});
