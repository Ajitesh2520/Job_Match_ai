import { describe, expect, it } from 'vitest';
import { EligibilityChecker } from './eligibility-checker.js';
import type { ScoringCandidate, ScoringJob } from './types.js';

function candidate(overrides: Partial<ScoringCandidate> = {}): ScoringCandidate {
  return {
    skills: ['typescript', 'node.js'],
    yearsOfExperience: 5,
    location: 'London',
    expectedSalary: 100000,
    ...overrides,
  };
}

function job(overrides: Partial<ScoringJob> = {}): ScoringJob {
  return {
    skills: [],
    minYearsExperience: 3,
    location: 'London',
    salaryMin: 90000,
    salaryMax: 120000,
    remoteAllowed: false,
    ...overrides,
  };
}

describe('EligibilityChecker', () => {
  const checker = new EligibilityChecker();

  it('is eligible when the job has no must-have skills', () => {
    expect(
      checker.isEligible(
        candidate({ skills: [] }),
        job({
          skills: [{ skill: 'graphql', type: 'NICE_TO_HAVE' }],
        }),
      ),
    ).toBe(true);
  });

  it('is eligible when the candidate has all must-have skills', () => {
    expect(
      checker.isEligible(
        candidate({ skills: ['TypeScript', 'Go'] }),
        job({
          skills: [
            { skill: 'typescript', type: 'MUST_HAVE' },
            { skill: 'go', type: 'MUST_HAVE' },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('excludes when any must-have skill is missing', () => {
    expect(
      checker.isEligible(
        candidate({ skills: ['typescript'] }),
        job({
          skills: [
            { skill: 'typescript', type: 'MUST_HAVE' },
            { skill: 'kubernetes', type: 'MUST_HAVE' },
          ],
        }),
      ),
    ).toBe(false);
  });

  it('compares skills case-insensitively with trimming', () => {
    expect(
      checker.isEligible(
        candidate({ skills: ['  TypeScript  '] }),
        job({
          skills: [{ skill: 'TYPESCRIPT', type: 'MUST_HAVE' }],
        }),
      ),
    ).toBe(true);
  });

  it('never excludes based on nice-to-have skills alone', () => {
    expect(
      checker.isEligible(
        candidate({ skills: ['typescript'] }),
        job({
          skills: [
            { skill: 'typescript', type: 'MUST_HAVE' },
            { skill: 'rust', type: 'NICE_TO_HAVE' },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('never excludes based on experience, location, or salary mismatch', () => {
    expect(
      checker.isEligible(
        candidate({
          skills: ['go'],
          yearsOfExperience: 0,
          location: 'Berlin',
          expectedSalary: 500000,
        }),
        job({
          skills: [{ skill: 'go', type: 'MUST_HAVE' }],
          minYearsExperience: 10,
          location: 'Tokyo',
          salaryMin: 10000,
          salaryMax: 20000,
          remoteAllowed: false,
        }),
      ),
    ).toBe(true);
  });

  it('treats empty skill lists as eligible', () => {
    expect(checker.isEligible(candidate({ skills: [] }), job({ skills: [] }))).toBe(true);
  });
});
