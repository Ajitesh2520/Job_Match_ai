import { describe, expect, it, vi } from 'vitest';
import { ScoringEngine } from './scoring-engine.js';
import type { ScoringStrategy } from './scorers/scoring-strategy.js';
import type { ScoreResult, ScoringCandidate, ScoringJob } from './types.js';

function stubStrategy(
  name: ScoringStrategy['name'],
  maxScore: number,
  scoreValue: number,
  details: Record<string, unknown> = {},
): ScoringStrategy {
  return {
    name,
    maxScore,
    score: vi.fn(
      (): ScoreResult => ({
        score: scoreValue,
        maxScore,
        details,
      }),
    ),
  };
}

const candidate: ScoringCandidate = {
  skills: ['typescript'],
  yearsOfExperience: 5,
  location: 'London',
  expectedSalary: 100000,
};

const job: ScoringJob = {
  skills: [{ skill: 'typescript', type: 'MUST_HAVE' }],
  minYearsExperience: 3,
  location: 'London',
  salaryMin: 90000,
  salaryMax: 120000,
  remoteAllowed: false,
};

describe('ScoringEngine', () => {
  it('rejects an empty strategy list', () => {
    expect(() => new ScoringEngine([])).toThrow(/at least one/i);
  });

  it('requires all four dimensions', () => {
    expect(
      () =>
        new ScoringEngine([
          stubStrategy('skills', 50, 50),
          stubStrategy('experience', 20, 20),
          stubStrategy('location', 15, 15),
        ]),
    ).toThrow(/missing required strategy: salary/i);
  });

  it('requires strategy maxScore sum of 100', () => {
    expect(
      () =>
        new ScoringEngine([
          stubStrategy('skills', 40, 40),
          stubStrategy('experience', 20, 20),
          stubStrategy('location', 15, 15),
          stubStrategy('salary', 15, 15),
        ]),
    ).toThrow(/must be 100/i);
  });

  it('executes all injected strategies and sums scores', () => {
    const skills = stubStrategy('skills', 50, 45, { matched: true });
    const experience = stubStrategy('experience', 20, 20);
    const location = stubStrategy('location', 15, 10);
    const salary = stubStrategy('salary', 15, 11.5);

    const engine = new ScoringEngine([skills, experience, location, salary]);
    const result = engine.score(candidate, job);

    expect(skills.score).toHaveBeenCalledWith(candidate, job);
    expect(experience.score).toHaveBeenCalledWith(candidate, job);
    expect(location.score).toHaveBeenCalledWith(candidate, job);
    expect(salary.score).toHaveBeenCalledWith(candidate, job);

    expect(result.score).toBe(86.5);
    expect(result.breakdown).toEqual({
      skills: { score: 45, maxScore: 50, details: { matched: true } },
      experience: { score: 20, maxScore: 20, details: {} },
      location: { score: 10, maxScore: 15, details: {} },
      salary: { score: 11.5, maxScore: 15, details: {} },
    });
    expect(engine.maxScore).toBe(100);
  });

  it('does not instantiate strategies itself — uses the injected instances', () => {
    const skills = stubStrategy('skills', 50, 50);
    const experience = stubStrategy('experience', 20, 20);
    const location = stubStrategy('location', 15, 15);
    const salary = stubStrategy('salary', 15, 15);

    const engine = new ScoringEngine([skills, experience, location, salary]);
    engine.score(candidate, job);

    expect(skills.score).toHaveBeenCalledTimes(1);
    expect(experience.score).toHaveBeenCalledTimes(1);
    expect(location.score).toHaveBeenCalledTimes(1);
    expect(salary.score).toHaveBeenCalledTimes(1);
  });
});
