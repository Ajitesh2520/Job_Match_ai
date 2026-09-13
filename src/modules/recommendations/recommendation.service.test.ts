import { JobSkillType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CandidateWithSkills } from '../candidates/candidate.repository.js';
import type { JobWithSkills } from '../jobs/job.repository.js';
import type { EligibilityChecker } from './domain/eligibility-checker.js';
import type { ScoringEngine } from './domain/scoring-engine.js';
import type { EngineScoreBreakdown } from './domain/types.js';
import {
  CandidateNotFoundError,
  RecommendationService,
} from './recommendation.service.js';

const emptyBreakdown = (parts: {
  skills: number;
  experience: number;
  location: number;
  salary: number;
}): EngineScoreBreakdown => ({
  skills: { score: parts.skills, maxScore: 50, details: {} },
  experience: { score: parts.experience, maxScore: 20, details: {} },
  location: { score: parts.location, maxScore: 15, details: {} },
  salary: { score: parts.salary, maxScore: 15, details: {} },
});

function makeCandidate(overrides: Partial<CandidateWithSkills> = {}): CandidateWithSkills {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'candidate-1',
    name: 'Ada',
    yearsOfExperience: 5,
    location: 'London',
    expectedSalary: 100000,
    createdAt: now,
    updatedAt: now,
    skills: [{ id: 'cs-1', candidateId: 'candidate-1', skill: 'typescript' }],
    ...overrides,
  };
}

function makeJob(
  id: string,
  title: string,
  skills: JobWithSkills['skills'] = [],
): JobWithSkills {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id,
    title,
    minYearsExperience: 3,
    location: 'London',
    salaryMin: 90000,
    salaryMax: 120000,
    remoteAllowed: false,
    createdAt: now,
    updatedAt: now,
    skills,
  };
}

describe('RecommendationService', () => {
  const findById = vi.fn();
  const findAll = vi.fn();
  const isEligible = vi.fn();
  const scoreFn = vi.fn();

  let service: RecommendationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecommendationService(
      { findById } as never,
      { findAll } as never,
      { isEligible } as unknown as EligibilityChecker,
      { score: scoreFn } as unknown as ScoringEngine,
    );
  });

  it('throws CandidateNotFoundError when the candidate does not exist', async () => {
    findById.mockResolvedValue(null);

    await expect(service.recommendForCandidate('missing-id', 10)).rejects.toBeInstanceOf(
      CandidateNotFoundError,
    );
    expect(findAll).not.toHaveBeenCalled();
    expect(isEligible).not.toHaveBeenCalled();
    expect(scoreFn).not.toHaveBeenCalled();
  });

  it('excludes jobs missing must-have skills (ineligible)', async () => {
    const candidate = makeCandidate();
    const eligible = makeJob('job-eligible', 'Eligible', [
      {
        id: 'js-1',
        jobId: 'job-eligible',
        skill: 'typescript',
        type: JobSkillType.MUST_HAVE,
      },
    ]);
    const ineligible = makeJob('job-ineligible', 'Ineligible', [
      {
        id: 'js-2',
        jobId: 'job-ineligible',
        skill: 'rust',
        type: JobSkillType.MUST_HAVE,
      },
    ]);

    findById.mockResolvedValue(candidate);
    findAll.mockResolvedValue([eligible, ineligible]);
    isEligible.mockImplementation((_c, job) =>
      job.skills.every(
        (entry: { type: string; skill: string }) =>
          entry.type !== 'MUST_HAVE' || entry.skill === 'typescript',
      ),
    );
    scoreFn.mockReturnValue({
      score: 80,
      breakdown: emptyBreakdown({ skills: 40, experience: 20, location: 15, salary: 5 }),
    });

    const results = await service.recommendForCandidate(candidate.id, 10);

    expect(isEligible).toHaveBeenCalledTimes(2);
    expect(scoreFn).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      expect.objectContaining({ jobId: 'job-eligible', title: 'Eligible', score: 80 }),
    ]);
  });

  it('scores only eligible jobs', async () => {
    const candidate = makeCandidate();
    // Distinct minYearsExperience identifies each job after mapping to ScoringJob.
    const jobA = { ...makeJob('job-a', 'A'), minYearsExperience: 1 };
    const jobB = { ...makeJob('job-b', 'B'), minYearsExperience: 2 };
    const jobC = { ...makeJob('job-c', 'C'), minYearsExperience: 3 };

    findById.mockResolvedValue(candidate);
    findAll.mockResolvedValue([jobA, jobB, jobC]);
    isEligible.mockImplementation(
      (_c, job) => job.minYearsExperience === 1 || job.minYearsExperience === 3,
    );
    scoreFn
      .mockReturnValueOnce({
        score: 70,
        breakdown: emptyBreakdown({ skills: 40, experience: 10, location: 10, salary: 10 }),
      })
      .mockReturnValueOnce({
        score: 90,
        breakdown: emptyBreakdown({ skills: 50, experience: 20, location: 10, salary: 10 }),
      });

    const results = await service.recommendForCandidate(candidate.id, 10);

    expect(isEligible).toHaveBeenCalledTimes(3);
    expect(scoreFn).toHaveBeenCalledTimes(2);
    expect(results.map((r) => r.jobId)).toEqual(['job-c', 'job-a']);
  });

  it('ranks recommendations by descending score', async () => {
    const candidate = makeCandidate();
    const low = makeJob('job-low', 'Low');
    const high = makeJob('job-high', 'High');
    const mid = makeJob('job-mid', 'Mid');

    findById.mockResolvedValue(candidate);
    findAll.mockResolvedValue([low, high, mid]);
    isEligible.mockReturnValue(true);
    scoreFn
      .mockReturnValueOnce({
        score: 60,
        breakdown: emptyBreakdown({ skills: 30, experience: 10, location: 10, salary: 10 }),
      })
      .mockReturnValueOnce({
        score: 95,
        breakdown: emptyBreakdown({ skills: 50, experience: 20, location: 15, salary: 10 }),
      })
      .mockReturnValueOnce({
        score: 80,
        breakdown: emptyBreakdown({ skills: 40, experience: 20, location: 10, salary: 10 }),
      });

    const results = await service.recommendForCandidate(candidate.id, 10);

    expect(results.map((r) => r.jobId)).toEqual(['job-high', 'job-mid', 'job-low']);
    expect(results.map((r) => r.score)).toEqual([95, 80, 60]);
  });

  it('applies deterministic tie-breaking by jobId ascending', async () => {
    const candidate = makeCandidate();
    const jobB = makeJob('job-b', 'B');
    const jobA = makeJob('job-a', 'A');

    findById.mockResolvedValue(candidate);
    findAll.mockResolvedValue([jobB, jobA]);
    isEligible.mockReturnValue(true);
    scoreFn.mockReturnValue({
      score: 75,
      breakdown: emptyBreakdown({ skills: 40, experience: 15, location: 10, salary: 10 }),
    });

    const results = await service.recommendForCandidate(candidate.id, 10);

    expect(results.map((r) => r.jobId)).toEqual(['job-a', 'job-b']);
  });

  it('applies the limit after ranking', async () => {
    const candidate = makeCandidate();
    findById.mockResolvedValue(candidate);
    findAll.mockResolvedValue([
      makeJob('job-1', 'One'),
      makeJob('job-2', 'Two'),
      makeJob('job-3', 'Three'),
    ]);
    isEligible.mockReturnValue(true);
    scoreFn
      .mockReturnValueOnce({
        score: 50,
        breakdown: emptyBreakdown({ skills: 20, experience: 10, location: 10, salary: 10 }),
      })
      .mockReturnValueOnce({
        score: 90,
        breakdown: emptyBreakdown({ skills: 50, experience: 20, location: 10, salary: 10 }),
      })
      .mockReturnValueOnce({
        score: 70,
        breakdown: emptyBreakdown({ skills: 40, experience: 10, location: 10, salary: 10 }),
      });

    const results = await service.recommendForCandidate(candidate.id, 2);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.jobId)).toEqual(['job-2', 'job-3']);
  });

  it('returns an empty list when no jobs are eligible', async () => {
    const candidate = makeCandidate();
    findById.mockResolvedValue(candidate);
    findAll.mockResolvedValue([makeJob('job-1', 'One'), makeJob('job-2', 'Two')]);
    isEligible.mockReturnValue(false);

    const results = await service.recommendForCandidate(candidate.id, 10);

    expect(results).toEqual([]);
    expect(scoreFn).not.toHaveBeenCalled();
  });
});
