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

  it('returns 0 when job max is below expected salary', () => {
    const result = scorer.score(candidate(120000), job(80000, 100000));
    expect(result.score).toBe(0);
    expect(result.details.fit).toBe('below_range');
  });

  it('returns 15 when expected salary is inside the range', () => {
    const result = scorer.score(candidate(100000), job(90000, 120000));
    expect(result.score).toBe(15);
    expect(result.details.fit).toBe('within_range');
  });

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

  it('uses min(15, 15 * E / Jmin) when job minimum exceeds expectation', () => {
    // E=100000, Jmin=200000 => 15 * 0.5 = 7.5
    const result = scorer.score(candidate(100000), job(200000, 250000));
    expect(result.score).toBe(7.5);
    expect(result.details.fit).toBe('above_minimum');
    expect(result.details.formula).toBe('Jmin > E => min(15, 15 * (E / Jmin))');
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
    // E slightly below Jmin still cannot exceed 15 via the formula.
    const result = scorer.score(candidate(99), job(100, 200));
    expect(result.score).toBeLessThanOrEqual(15);
    expect(result.score).toBeCloseTo(15 * (99 / 100), 10);
  });

  it('returns 0 when expected salary is 0 and Jmin is positive', () => {
    const result = scorer.score(candidate(0), job(50000, 80000));
    expect(result.score).toBe(0);
    expect(result.details.fit).toBe('above_minimum');
  });
});
