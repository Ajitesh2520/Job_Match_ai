import { describe, expect, it } from 'vitest';
import { ExperienceScorer, EXPERIENCE_MAX_SCORE } from './experience.scorer.js';
import type { ScoringCandidate, ScoringJob } from '../types.js';

function candidate(yearsOfExperience: number): ScoringCandidate {
  return {
    skills: [],
    yearsOfExperience,
    location: 'London',
    expectedSalary: 100000,
  };
}

function job(minYearsExperience: number): ScoringJob {
  return {
    skills: [],
    minYearsExperience,
    location: 'London',
    salaryMin: 90000,
    salaryMax: 120000,
    remoteAllowed: false,
  };
}

describe('ExperienceScorer', () => {
  const scorer = new ExperienceScorer();

  it('exposes max score of 20', () => {
    expect(scorer.maxScore).toBe(EXPERIENCE_MAX_SCORE);
    expect(scorer.name).toBe('experience');
  });

  it('returns proportional score when experience is below the minimum', () => {
    const result = scorer.score(candidate(2), job(4));
    expect(result.score).toBe(10);
    expect(result.details.meetsMinimum).toBe(false);
    expect(result.details.candidateYears).toBe(2);
    expect(result.details.minimumYears).toBe(4);
  });

  it('returns 20 when experience equals the minimum', () => {
    const result = scorer.score(candidate(5), job(5));
    expect(result.score).toBe(20);
    expect(result.details.meetsMinimum).toBe(true);
  });

  it('returns 20 when experience is above the minimum', () => {
    const result = scorer.score(candidate(10), job(3));
    expect(result.score).toBe(20);
    expect(result.details.meetsMinimum).toBe(true);
  });

  it('returns 20 when minimum experience is zero', () => {
    const result = scorer.score(candidate(0), job(0));
    expect(result.score).toBe(20);
    expect(result.details.minimumYears).toBe(0);
  });

  it('returns 0 when candidate has 0 years and minimum is positive', () => {
    const result = scorer.score(candidate(0), job(5));
    expect(result.score).toBe(0);
  });

  it('handles fractional proportional scores deterministically', () => {
    const result = scorer.score(candidate(1), job(3));
    expect(result.score).toBeCloseTo(20 / 3, 10);
  });
});
