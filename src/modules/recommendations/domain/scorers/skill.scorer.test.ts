import { describe, expect, it } from 'vitest';
import { SkillScorer, SKILL_MAX_SCORE } from './skill.scorer.js';
import type { ScoringCandidate, ScoringJob } from '../types.js';

function candidate(skills: string[]): ScoringCandidate {
  return {
    skills,
    yearsOfExperience: 5,
    location: 'London',
    expectedSalary: 100000,
  };
}

function job(skills: ScoringJob['skills']): ScoringJob {
  return {
    skills,
    minYearsExperience: 3,
    location: 'London',
    salaryMin: 90000,
    salaryMax: 120000,
    remoteAllowed: false,
  };
}

describe('SkillScorer', () => {
  const scorer = new SkillScorer();

  it('exposes max score of 50', () => {
    expect(scorer.maxScore).toBe(SKILL_MAX_SCORE);
    expect(scorer.name).toBe('skills');
  });

  it('returns full 50 when there are no nice-to-have skills', () => {
    const result = scorer.score(
      candidate(['typescript', 'go']),
      job([{ skill: 'typescript', type: 'MUST_HAVE' }]),
    );

    expect(result.score).toBe(50);
    expect(result.maxScore).toBe(50);
    expect(result.details.noNiceToHaveSkills).toBe(true);
    expect(result.details.mustHavePoints).toBe(40);
    expect(result.details.niceToHavePoints).toBe(10);
  });

  it('returns full 50 when the job has no skills at all', () => {
    const result = scorer.score(candidate([]), job([]));
    expect(result.score).toBe(50);
    expect(result.details.noNiceToHaveSkills).toBe(true);
  });

  it('awards 40 + proportional nice-to-have points', () => {
    const result = scorer.score(
      candidate(['typescript', 'graphql']),
      job([
        { skill: 'typescript', type: 'MUST_HAVE' },
        { skill: 'graphql', type: 'NICE_TO_HAVE' },
        { skill: 'rust', type: 'NICE_TO_HAVE' },
      ]),
    );

    expect(result.score).toBe(45);
    expect(result.details.mustHavePoints).toBe(40);
    expect(result.details.niceToHaveMatched).toBe(1);
    expect(result.details.niceToHaveTotal).toBe(2);
    expect(result.details.niceToHavePoints).toBe(5);
    expect(result.details.noNiceToHaveSkills).toBe(false);
  });

  it('awards full 50 when all nice-to-haves match', () => {
    const result = scorer.score(
      candidate(['typescript', 'graphql', 'rust']),
      job([
        { skill: 'typescript', type: 'MUST_HAVE' },
        { skill: 'graphql', type: 'NICE_TO_HAVE' },
        { skill: 'rust', type: 'NICE_TO_HAVE' },
      ]),
    );

    expect(result.score).toBe(50);
    expect(result.details.niceToHavePoints).toBe(10);
  });

  it('awards only the 40 must-have points when no nice-to-haves match', () => {
    const result = scorer.score(
      candidate(['typescript']),
      job([
        { skill: 'typescript', type: 'MUST_HAVE' },
        { skill: 'graphql', type: 'NICE_TO_HAVE' },
      ]),
    );

    expect(result.score).toBe(40);
    expect(result.details.niceToHaveMatched).toBe(0);
    expect(result.details.niceToHavePoints).toBe(0);
  });

  it('matches skills case-insensitively', () => {
    const result = scorer.score(
      candidate(['  TypeScript ']),
      job([
        { skill: 'TYPESCRIPT', type: 'MUST_HAVE' },
        { skill: 'GraphQL', type: 'NICE_TO_HAVE' },
      ]),
    );

    expect(result.details.mustHaveMatched).toBe(1);
    expect(result.score).toBe(40);
  });

  it('deduplicates duplicate job skill entries', () => {
    const result = scorer.score(
      candidate(['go']),
      job([
        { skill: 'go', type: 'NICE_TO_HAVE' },
        { skill: 'GO', type: 'NICE_TO_HAVE' },
      ]),
    );

    expect(result.details.niceToHaveTotal).toBe(1);
    expect(result.score).toBe(50);
  });
});
