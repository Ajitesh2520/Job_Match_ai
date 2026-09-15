import { describe, expect, it } from 'vitest';
import { EligibilityChecker } from './eligibility-checker.js';
import { createScoringStrategies } from './create-scoring-strategies.js';
import { ScoringEngine } from './scoring-engine.js';
import type { ScoringCandidate, ScoringJob } from './types.js';

/**
 * Highest-value scoring tests: eligibility gates + dimension scores together.
 * These are the cases most likely to be wrong in a matching system.
 */
describe('scoring pipeline (eligibility + ScoringEngine)', () => {
  const eligibility = new EligibilityChecker();
  const engine = new ScoringEngine(createScoringStrategies());

  const baseCandidate: ScoringCandidate = {
    skills: ['typescript', 'node.js'],
    yearsOfExperience: 5,
    location: 'London',
    expectedSalary: 100000,
  };

  const baseJob: ScoringJob = {
    skills: [
      { skill: 'typescript', type: 'MUST_HAVE' },
      { skill: 'graphql', type: 'NICE_TO_HAVE' },
    ],
    minYearsExperience: 3,
    location: 'London',
    salaryMin: 90000,
    salaryMax: 120000,
    remoteAllowed: false,
  };

  function recommend(
    candidate: ScoringCandidate,
    job: ScoringJob,
  ): { eligible: boolean; score: number | null; breakdown: ReturnType<ScoringEngine['score']>['breakdown'] | null } {
    if (!eligibility.isEligible(candidate, job)) {
      return { eligible: false, score: null, breakdown: null };
    }
    const result = engine.score(candidate, job);
    return { eligible: true, score: result.score, breakdown: result.breakdown };
  }

  it('excludes a candidate missing a must-have skill (not scored)', () => {
    const result = recommend(
      { ...baseCandidate, skills: ['node.js'] },
      baseJob,
    );

    expect(result.eligible).toBe(false);
    expect(result.score).toBeNull();
  });

  it('excludes when multiple must-have skills are missing', () => {
    const result = recommend(
      { ...baseCandidate, skills: ['html'] },
      {
        ...baseJob,
        skills: [
          { skill: 'typescript', type: 'MUST_HAVE' },
          { skill: 'kubernetes', type: 'MUST_HAVE' },
        ],
      },
    );

    expect(result.eligible).toBe(false);
  });

  it('keeps the pair eligible when salary has no overlap, but salary score is 0', () => {
    const result = recommend(baseCandidate, {
      ...baseJob,
      salaryMin: 50000,
      salaryMax: 80000, // Jmax < E=100000 → no overlap
    });

    expect(result.eligible).toBe(true);
    expect(result.breakdown?.salary.score).toBe(0);
    expect(result.breakdown?.salary.details).toMatchObject({ fit: 'below_range' });
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThan(0);
  });

  it('scores a near-perfect eligible match at 100 when all dimensions fit', () => {
    const result = recommend(
      {
        skills: ['typescript', 'graphql'],
        yearsOfExperience: 5,
        location: 'London',
        expectedSalary: 100000,
      },
      {
        skills: [
          { skill: 'typescript', type: 'MUST_HAVE' },
          { skill: 'graphql', type: 'NICE_TO_HAVE' },
        ],
        minYearsExperience: 3,
        location: 'London',
        salaryMin: 90000,
        salaryMax: 120000,
        remoteAllowed: false,
      },
    );

    expect(result.eligible).toBe(true);
    expect(result.score).toBe(100);
    expect(result.breakdown?.skills.score).toBe(50);
    expect(result.breakdown?.experience.score).toBe(20);
    expect(result.breakdown?.location.score).toBe(15);
    expect(result.breakdown?.salary.score).toBe(15);
  });

  it('still scores when nice-to-have is missing (eligible, reduced skills points)', () => {
    const result = recommend(
      { ...baseCandidate, skills: ['typescript'] },
      baseJob,
    );

    expect(result.eligible).toBe(true);
    expect(result.breakdown?.skills.score).toBe(40); // 40 must-have + 0 nice
    expect(result.score).toBe(40 + 20 + 15 + 15); // 90
  });

  it('does not exclude on experience / location mismatch — only soft scores drop', () => {
    const result = recommend(
      {
        ...baseCandidate,
        yearsOfExperience: 1,
        location: 'Berlin',
      },
      {
        ...baseJob,
        minYearsExperience: 4,
        remoteAllowed: false,
        skills: [{ skill: 'typescript', type: 'MUST_HAVE' }],
      },
    );

    expect(result.eligible).toBe(true);
    expect(result.breakdown?.experience.score).toBe(5); // 1/4 * 20
    expect(result.breakdown?.location.score).toBe(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
