import { describe, expect, it, vi } from 'vitest';
import { ScoringEngine } from './scoring-engine.js';
import {
  ExperienceScorer,
  LocationScorer,
  SalaryScorer,
  SkillScorer,
} from './scorers/index.js';
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

function createProductionEngine(): ScoringEngine {
  return new ScoringEngine([
    new SkillScorer(),
    new ExperienceScorer(),
    new LocationScorer(),
    new SalaryScorer(),
  ]);
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

  describe('scoring total <= 100 with production strategies', () => {
    const engine = createProductionEngine();

    it('scores a perfect match at exactly 100', () => {
      const result = engine.score(
        {
          skills: ['typescript', 'node.js'],
          yearsOfExperience: 5,
          location: 'London',
          expectedSalary: 100000,
        },
        {
          skills: [
            { skill: 'typescript', type: 'MUST_HAVE' },
            { skill: 'node.js', type: 'NICE_TO_HAVE' },
          ],
          minYearsExperience: 3,
          location: 'London',
          salaryMin: 90000,
          salaryMax: 120000,
          remoteAllowed: false,
        },
      );

      expect(result.score).toBe(100);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(engine.maxScore).toBe(100);
    });

    it('never exceeds 100 for mismatched soft constraints', () => {
      const result = engine.score(
        {
          skills: ['typescript'],
          yearsOfExperience: 1,
          location: 'Berlin',
          expectedSalary: 200000,
        },
        {
          skills: [
            { skill: 'typescript', type: 'MUST_HAVE' },
            { skill: 'rust', type: 'NICE_TO_HAVE' },
          ],
          minYearsExperience: 10,
          location: 'Tokyo',
          salaryMin: 50000,
          salaryMax: 80000,
          remoteAllowed: false,
        },
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(
        result.breakdown.skills.score +
          result.breakdown.experience.score +
          result.breakdown.location.score +
          result.breakdown.salary.score,
      ).toBe(result.score);
    });

    it('never exceeds 100 when there are no nice-to-have skills', () => {
      const result = engine.score(candidate, {
        ...job,
        skills: [{ skill: 'typescript', type: 'MUST_HAVE' }],
      });

      expect(result.breakdown.skills.score).toBe(50);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
