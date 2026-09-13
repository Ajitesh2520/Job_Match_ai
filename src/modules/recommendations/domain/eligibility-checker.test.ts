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

  describe('must-have eligibility', () => {
    it('is eligible when the candidate has every must-have skill', () => {
      expect(
        checker.isEligible(
          candidate({ skills: ['typescript', 'go', 'react'] }),
          job({
            skills: [
              { skill: 'typescript', type: 'MUST_HAVE' },
              { skill: 'go', type: 'MUST_HAVE' },
            ],
          }),
        ),
      ).toBe(true);
    });

    it('excludes when a single must-have skill is missing', () => {
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

    it('excludes when multiple must-have skills are missing', () => {
      expect(
        checker.isEligible(
          candidate({ skills: ['html'] }),
          job({
            skills: [
              { skill: 'typescript', type: 'MUST_HAVE' },
              { skill: 'go', type: 'MUST_HAVE' },
              { skill: 'kubernetes', type: 'MUST_HAVE' },
            ],
          }),
        ),
      ).toBe(false);
    });
  });

  describe('nice-to-have and soft constraints', () => {
    it('does not exclude when nice-to-have skills are missing', () => {
      expect(
        checker.isEligible(
          candidate({ skills: ['typescript'] }),
          job({
            skills: [
              { skill: 'typescript', type: 'MUST_HAVE' },
              { skill: 'rust', type: 'NICE_TO_HAVE' },
              { skill: 'graphql', type: 'NICE_TO_HAVE' },
            ],
          }),
        ),
      ).toBe(true);
    });

    it('is eligible when the job has only nice-to-have skills', () => {
      expect(
        checker.isEligible(
          candidate({ skills: [] }),
          job({
            skills: [{ skill: 'graphql', type: 'NICE_TO_HAVE' }],
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
  });

  describe('no must-have skills', () => {
    it('is eligible when the job has an empty skill list', () => {
      expect(checker.isEligible(candidate({ skills: [] }), job({ skills: [] }))).toBe(true);
    });

    it('is eligible when must-have entries normalize to empty strings', () => {
      expect(
        checker.isEligible(
          candidate({ skills: [] }),
          job({
            skills: [
              { skill: '   ', type: 'MUST_HAVE' },
              { skill: '', type: 'MUST_HAVE' },
            ],
          }),
        ),
      ).toBe(true);
    });
  });

  describe('normalization', () => {
    it('matches must-have skills case-insensitively with trimming', () => {
      expect(
        checker.isEligible(
          candidate({ skills: ['  TypeScript  ', 'NODE.JS'] }),
          job({
            skills: [
              { skill: 'typescript', type: 'MUST_HAVE' },
              { skill: '  node.js ', type: 'MUST_HAVE' },
            ],
          }),
        ),
      ).toBe(true);
    });

    it('treats duplicate normalized must-have skills as a single requirement', () => {
      expect(
        checker.isEligible(
          candidate({ skills: ['typescript'] }),
          job({
            skills: [
              { skill: 'TypeScript', type: 'MUST_HAVE' },
              { skill: '  TYPESCRIPT ', type: 'MUST_HAVE' },
              { skill: 'typescript', type: 'MUST_HAVE' },
            ],
          }),
        ),
      ).toBe(true);
    });
  });
});
