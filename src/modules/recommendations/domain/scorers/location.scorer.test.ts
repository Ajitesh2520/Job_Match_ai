import { describe, expect, it } from 'vitest';
import { LocationScorer, LOCATION_MAX_SCORE } from './location.scorer.js';
import type { ScoringCandidate, ScoringJob } from '../types.js';

function candidate(location: string): ScoringCandidate {
  return {
    skills: [],
    yearsOfExperience: 5,
    location,
    expectedSalary: 100000,
  };
}

function job(location: string, remoteAllowed: boolean): ScoringJob {
  return {
    skills: [],
    minYearsExperience: 0,
    location,
    salaryMin: 90000,
    salaryMax: 120000,
    remoteAllowed,
  };
}

describe('LocationScorer', () => {
  const scorer = new LocationScorer();

  it('exposes max score of 15', () => {
    expect(scorer.maxScore).toBe(LOCATION_MAX_SCORE);
    expect(scorer.name).toBe('location');
  });

  it('returns 15 for an exact location match', () => {
    const result = scorer.score(candidate('London'), job('London', false));
    expect(result.score).toBe(15);
    expect(result.details.match).toBe('exact');
  });

  it('matches locations case-insensitively with trimming', () => {
    const result = scorer.score(candidate('  NEW YORK '), job('new york', true));
    expect(result.score).toBe(15);
    expect(result.details.match).toBe('exact');
  });

  it('returns 10 when locations differ but remote is allowed', () => {
    const result = scorer.score(candidate('London'), job('Berlin', true));
    expect(result.score).toBe(10);
    expect(result.details.match).toBe('remote');
    expect(result.details.remoteAllowed).toBe(true);
  });

  it('returns 0 when locations differ and remote is not allowed', () => {
    const result = scorer.score(candidate('London'), job('Berlin', false));
    expect(result.score).toBe(0);
    expect(result.details.match).toBe('mismatch');
  });

  it('prefers exact match over remote when both could apply', () => {
    const result = scorer.score(candidate('Remote'), job('remote', true));
    expect(result.score).toBe(15);
    expect(result.details.match).toBe('exact');
  });
});
