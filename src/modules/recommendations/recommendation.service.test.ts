import { JobSkillType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CandidateWithSkills } from '../candidates/candidate.repository.js';
import type { JobWithSkills } from '../jobs/job.repository.js';
import type { EligibilityChecker } from './domain/eligibility-checker.js';
import type { ScoringEngine } from './domain/scoring-engine.js';
import type { EngineScoreBreakdown } from './domain/types.js';
import {
  CandidateNotFoundError,
  JobNotFoundError,
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

function makeCandidate(
  overrides: Partial<CandidateWithSkills> & { id?: string; name?: string } = {},
): CandidateWithSkills {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const id = overrides.id ?? 'candidate-1';
  return {
    id,
    name: overrides.name ?? 'Ada',
    yearsOfExperience: 5,
    location: 'London',
    expectedSalary: 100000,
    createdAt: now,
    updatedAt: now,
    skills: [{ id: `cs-${id}`, candidateId: id, skill: 'typescript' }],
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
  const candidateFindById = vi.fn();
  const candidateFindAll = vi.fn();
  const jobFindById = vi.fn();
  const jobFindAll = vi.fn();
  const isEligible = vi.fn();
  const scoreFn = vi.fn();

  let service: RecommendationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecommendationService(
      { findById: candidateFindById, findAll: candidateFindAll } as never,
      { findById: jobFindById, findAll: jobFindAll } as never,
      { isEligible } as unknown as EligibilityChecker,
      { score: scoreFn } as unknown as ScoringEngine,
    );
  });

  describe('recommendForCandidate', () => {
    it('loads the candidate through CandidateRepository and jobs through JobRepository', async () => {
      candidateFindById.mockResolvedValue(makeCandidate());
      jobFindAll.mockResolvedValue([]);

      await service.recommendForCandidate('candidate-1', 10);

      expect(candidateFindById).toHaveBeenCalledWith('candidate-1');
      expect(jobFindAll).toHaveBeenCalledTimes(1);
    });

    it('throws CandidateNotFoundError when the candidate does not exist', async () => {
      candidateFindById.mockResolvedValue(null);

      await expect(service.recommendForCandidate('missing-id', 10)).rejects.toBeInstanceOf(
        CandidateNotFoundError,
      );
      expect(jobFindAll).not.toHaveBeenCalled();
      expect(isEligible).not.toHaveBeenCalled();
      expect(scoreFn).not.toHaveBeenCalled();
    });

    it('excludes jobs missing must-have skills before scoring', async () => {
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

      candidateFindById.mockResolvedValue(candidate);
      jobFindAll.mockResolvedValue([eligible, ineligible]);
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

    it('sorts recommendations by descending score', async () => {
      candidateFindById.mockResolvedValue(makeCandidate());
      jobFindAll.mockResolvedValue([
        makeJob('job-low', 'Low'),
        makeJob('job-high', 'High'),
        makeJob('job-mid', 'Mid'),
      ]);
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

      const results = await service.recommendForCandidate('candidate-1', 10);

      expect(results.map((r) => r.jobId)).toEqual(['job-high', 'job-mid', 'job-low']);
      expect(results.map((r) => r.score)).toEqual([95, 80, 60]);
    });

    it('applies deterministic tie-breaking by jobId ascending', async () => {
      candidateFindById.mockResolvedValue(makeCandidate());
      jobFindAll.mockResolvedValue([makeJob('job-b', 'B'), makeJob('job-a', 'A')]);
      isEligible.mockReturnValue(true);
      scoreFn.mockReturnValue({
        score: 75,
        breakdown: emptyBreakdown({ skills: 40, experience: 15, location: 10, salary: 10 }),
      });

      const results = await service.recommendForCandidate('candidate-1', 10);

      expect(results.map((r) => r.jobId)).toEqual(['job-a', 'job-b']);
    });

    it('applies the recommendation limit after ranking', async () => {
      candidateFindById.mockResolvedValue(makeCandidate());
      jobFindAll.mockResolvedValue([
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

      const results = await service.recommendForCandidate('candidate-1', 2);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.jobId)).toEqual(['job-2', 'job-3']);
    });

    it('returns an empty list when there are no eligible jobs', async () => {
      candidateFindById.mockResolvedValue(makeCandidate());
      jobFindAll.mockResolvedValue([makeJob('job-1', 'One'), makeJob('job-2', 'Two')]);
      isEligible.mockReturnValue(false);

      const results = await service.recommendForCandidate('candidate-1', 10);

      expect(results).toEqual([]);
      expect(scoreFn).not.toHaveBeenCalled();
    });
  });

  describe('recommendForJob', () => {
    it('throws JobNotFoundError when the job does not exist', async () => {
      jobFindById.mockResolvedValue(null);

      await expect(service.recommendForJob('missing-job', 10)).rejects.toBeInstanceOf(
        JobNotFoundError,
      );
      expect(candidateFindAll).not.toHaveBeenCalled();
      expect(isEligible).not.toHaveBeenCalled();
      expect(scoreFn).not.toHaveBeenCalled();
    });

    it('scores only eligible candidates with the same scoring engine', async () => {
      const job = makeJob('job-1', 'Backend', [
        {
          id: 'js-1',
          jobId: 'job-1',
          skill: 'typescript',
          type: JobSkillType.MUST_HAVE,
        },
      ]);
      const eligible = makeCandidate({ id: 'candidate-a', name: 'Ada' });
      const ineligible = makeCandidate({
        id: 'candidate-b',
        name: 'Bob',
        skills: [{ id: 'cs-b', candidateId: 'candidate-b', skill: 'java' }],
      });

      jobFindById.mockResolvedValue(job);
      candidateFindAll.mockResolvedValue([eligible, ineligible]);
      isEligible.mockImplementation((candidate) => candidate.skills.includes('typescript'));
      scoreFn.mockReturnValue({
        score: 88,
        breakdown: emptyBreakdown({ skills: 50, experience: 20, location: 15, salary: 3 }),
      });

      const results = await service.recommendForJob(job.id, 10);

      expect(jobFindById).toHaveBeenCalledWith('job-1');
      expect(candidateFindAll).toHaveBeenCalledTimes(1);
      expect(isEligible).toHaveBeenCalledTimes(2);
      expect(scoreFn).toHaveBeenCalledTimes(1);
      expect(results).toEqual([
        expect.objectContaining({
          candidateId: 'candidate-a',
          name: 'Ada',
          score: 88,
        }),
      ]);
    });

    it('sorts candidates by descending score with deterministic candidateId ties', async () => {
      const job = makeJob('job-1', 'Backend');
      jobFindById.mockResolvedValue(job);
      candidateFindAll.mockResolvedValue([
        makeCandidate({ id: 'candidate-c', name: 'Cara' }),
        makeCandidate({ id: 'candidate-a', name: 'Ada' }),
        makeCandidate({ id: 'candidate-b', name: 'Bea' }),
      ]);
      isEligible.mockReturnValue(true);
      scoreFn
        .mockReturnValueOnce({
          score: 70,
          breakdown: emptyBreakdown({ skills: 40, experience: 10, location: 10, salary: 10 }),
        })
        .mockReturnValueOnce({
          score: 70,
          breakdown: emptyBreakdown({ skills: 40, experience: 10, location: 10, salary: 10 }),
        })
        .mockReturnValueOnce({
          score: 90,
          breakdown: emptyBreakdown({ skills: 50, experience: 20, location: 10, salary: 10 }),
        });

      const results = await service.recommendForJob(job.id, 10);

      expect(results.map((r) => r.candidateId)).toEqual([
        'candidate-b',
        'candidate-a',
        'candidate-c',
      ]);
    });

    it('returns an empty list when no candidates are eligible', async () => {
      jobFindById.mockResolvedValue(makeJob('job-1', 'Backend'));
      candidateFindAll.mockResolvedValue([makeCandidate()]);
      isEligible.mockReturnValue(false);

      const results = await service.recommendForJob('job-1', 10);

      expect(results).toEqual([]);
      expect(scoreFn).not.toHaveBeenCalled();
    });
  });
});
