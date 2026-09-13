import { describe, expect, it } from 'vitest';
import { SalaryScorer, SALARY_MAX_SCORE } from './salary.scorer.js';
import type { ScoringCandidate, ScoringJob } from '../types.js';

function candidate(expectedSalary: number): ScoringCandidate {
  return {
    skills: [],
    yearsOfExperience: 5,
    location: 'London',
    expectedSalary,
  };
}

function job(salaryMin: number, salaryMax: number): ScoringJob {
  return {
    skills: [],
    minYearsExperience: 0,
    location: 'London',
    salaryMin,
    salaryMax,
    remoteAllowed: false,
  };
}

describe('SalaryScorer', () => {
  const scorer = new SalaryScorer();

  it('exposes max score of 15', () => {
    expect(scorer.maxScore).toBe(SALARY_MAX_SCORE);
    expect(scorer.name).toBe('salary');
  });

  it('returns 0 when salary is below candidate expectation (Jmax < E)', () => {
    const result = scorer.score(candidate(120000), job(80000, 100000));
    expect(result.score).toBe(0);
    expect(result.details.fit).toBe('below_range');
  });

  it('returns 15 when expected salary is inside the range', () => {
    const result = scorer.score(candidate(100000), job(90000, 120000));
    expect(result.score).toBe(15);
    expect(result.details.fit).toBe('within_range');
  });

  describe('salary boundaries', () => {
    it('returns 15 when expected salary equals the minimum', () => {
      const result = scorer.score(candidate(90000), job(90000, 120000));
      expect(result.score).toBe(15);
      expect(result.details.fit).toBe('within_range');
    });

    it('returns 15 when expected salary equals the maximum', () => {
      const result = scorer.score(candidate(120000), job(90000, 120000));
      expect(result.score).toBe(15);
      expect(result.details.fit).toBe('within_range');
    });

    it('returns 15 when expected equals a single-point range', () => {
      const result = scorer.score(candidate(100000), job(100000, 100000));
      expect(result.score).toBe(15);
    });

    it('returns 0 when expected is exactly one above Jmax', () => {
      const result = scorer.score(candidate(100001), job(90000, 100000));
      expect(result.score).toBe(0);
      expect(result.details.fit).toBe('below_range');
    });
  });

  describe('salary above expectation (Jmin > E)', () => {
    it('uses min(15, 15 * E / Jmin)', () => {
      const result = scorer.score(candidate(100000), job(200000, 250000));
      expect(result.score).toBe(7.5);
      expect(result.details.fit).toBe('above_minimum');
      expect(result.details.formula).toBe(
        'Jmin > E => min(maxScore, maxScore * (E / Jmin))',
      );
    });

    it('approaches 15 when Jmin is only slightly above E', () => {
      const result = scorer.score(candidate(100000), job(100001, 150000));
      expect(result.score).toBeCloseTo(15 * (100000 / 100001), 5);
      expect(result.score).toBeLessThan(15);
    });

    it('approaches 0 as Jmin grows far above E', () => {
      const result = scorer.score(candidate(100000), job(10_000_000, 12_000_000));
      expect(result.score).toBeCloseTo(0.15, 5);
    });

    it('caps the above-minimum score at 15', () => {
      const result = scorer.score(candidate(99), job(100, 200));
      expect(result.score).toBeLessThanOrEqual(15);
      expect(result.score).toBeCloseTo(15 * (99 / 100), 10);
    });
  });
});
