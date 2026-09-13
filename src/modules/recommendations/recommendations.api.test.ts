import { JobSkillType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { ErrorCode } from '../../shared/errors.js';
import type { CandidateWithSkills } from '../candidates/candidate.repository.js';
import type { JobWithSkills } from '../jobs/job.repository.js';
import {
  EligibilityChecker,
  ExperienceScorer,
  LocationScorer,
  SalaryScorer,
  ScoringEngine,
  SkillScorer,
} from './domain/index.js';
import { RecommendationService } from './recommendation.service.js';

const CANDIDATE_ID = '11111111-1111-4111-8111-111111111111';
const CANDIDATE_HIGH_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CANDIDATE_MID_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CANDIDATE_LOW_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CANDIDATE_INELIGIBLE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const JOB_HIGH_ID = '22222222-2222-4222-8222-222222222222';
const JOB_MID_ID = '33333333-3333-4333-8333-333333333333';
const JOB_LOW_ID = '44444444-4444-4444-8444-444444444444';
const JOB_INELIGIBLE_ID = '55555555-5555-4555-8555-555555555555';
const JOB_ID = '66666666-6666-4666-8666-666666666666';

function makeCandidate(
  overrides: Partial<CandidateWithSkills> & { id?: string; name?: string } = {},
): CandidateWithSkills {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const id = overrides.id ?? CANDIDATE_ID;
  return {
    id,
    name: overrides.name ?? 'Ada Lovelace',
    yearsOfExperience: 5,
    location: 'London',
    expectedSalary: 100000,
    createdAt: now,
    updatedAt: now,
    skills: [
      { id: `cs-${id}-1`, candidateId: id, skill: 'typescript' },
      { id: `cs-${id}-2`, candidateId: id, skill: 'node.js' },
    ],
    ...overrides,
  };
}

function makeJob(
  overrides: Partial<JobWithSkills> & Pick<JobWithSkills, 'id' | 'title'>,
): JobWithSkills {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    minYearsExperience: 3,
    location: 'London',
    salaryMin: 90000,
    salaryMax: 120000,
    remoteAllowed: false,
    createdAt: now,
    updatedAt: now,
    skills: [
      {
        id: `${overrides.id}-skill`,
        jobId: overrides.id,
        skill: 'typescript',
        type: JobSkillType.MUST_HAVE,
      },
    ],
    ...overrides,
  };
}

function buildTestApp(
  options: {
    candidate?: CandidateWithSkills | null;
    candidates?: CandidateWithSkills[];
    job?: JobWithSkills | null;
    jobs?: JobWithSkills[];
  } = {},
) {
  const defaultCandidate = makeCandidate();
  const candidateFindById = vi.fn().mockResolvedValue(
    options.candidate === undefined ? defaultCandidate : options.candidate,
  );
  const candidateFindAll = vi.fn().mockResolvedValue(
    options.candidates ??
      (options.candidate ? [options.candidate] : [defaultCandidate]),
  );
  const jobFindById = vi.fn().mockResolvedValue(options.job === undefined ? null : options.job);
  const jobFindAll = vi.fn().mockResolvedValue(options.jobs ?? []);

  const recommendationService = new RecommendationService(
    { findById: candidateFindById, findAll: candidateFindAll } as never,
    { findById: jobFindById, findAll: jobFindAll } as never,
    new EligibilityChecker(),
    new ScoringEngine([
      new SkillScorer(),
      new ExperienceScorer(),
      new LocationScorer(),
      new SalaryScorer(),
    ]),
  );

  return {
    app: createApp({ recommendationService }),
    candidateFindById,
    jobFindById,
  };
}

describe('GET /candidates/:candidateId/recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ranked recommendations with score and breakdown', async () => {
    const jobs = [
      makeJob({
        id: JOB_LOW_ID,
        title: 'Low Fit',
        location: 'Berlin',
        remoteAllowed: false,
        minYearsExperience: 10,
        salaryMin: 200000,
        salaryMax: 250000,
        skills: [
          {
            id: 's-low',
            jobId: JOB_LOW_ID,
            skill: 'typescript',
            type: JobSkillType.MUST_HAVE,
          },
          {
            id: 's-low-nice',
            jobId: JOB_LOW_ID,
            skill: 'rust',
            type: JobSkillType.NICE_TO_HAVE,
          },
        ],
      }),
      makeJob({
        id: JOB_HIGH_ID,
        title: 'High Fit',
        skills: [
          {
            id: 's-high',
            jobId: JOB_HIGH_ID,
            skill: 'typescript',
            type: JobSkillType.MUST_HAVE,
          },
          {
            id: 's-high-nice',
            jobId: JOB_HIGH_ID,
            skill: 'node.js',
            type: JobSkillType.NICE_TO_HAVE,
          },
        ],
      }),
      makeJob({
        id: JOB_MID_ID,
        title: 'Mid Fit',
        remoteAllowed: true,
        location: 'Berlin',
        skills: [
          {
            id: 's-mid',
            jobId: JOB_MID_ID,
            skill: 'typescript',
            type: JobSkillType.MUST_HAVE,
          },
        ],
      }),
      makeJob({
        id: JOB_INELIGIBLE_ID,
        title: 'Ineligible',
        skills: [
          {
            id: 's-bad',
            jobId: JOB_INELIGIBLE_ID,
            skill: 'golang',
            type: JobSkillType.MUST_HAVE,
          },
        ],
      }),
    ];

    const { app } = buildTestApp({ jobs });

    const response = await request(app).get(
      `/candidates/${CANDIDATE_ID}/recommendations?limit=10`,
    );

    expect(response.status).toBe(200);
    expect(response.body.candidateId).toBe(CANDIDATE_ID);
    expect(response.body.recommendations).toHaveLength(3);
    expect(response.body.recommendations.map((r: { jobId: string }) => r.jobId)).toEqual([
      JOB_HIGH_ID,
      JOB_MID_ID,
      JOB_LOW_ID,
    ]);
    expect(response.body.recommendations[0]).toEqual(
      expect.objectContaining({
        jobId: JOB_HIGH_ID,
        title: 'High Fit',
        score: expect.any(Number),
        breakdown: expect.objectContaining({
          skills: expect.objectContaining({ score: expect.any(Number), maxScore: 50 }),
          experience: expect.objectContaining({ score: expect.any(Number), maxScore: 20 }),
          location: expect.objectContaining({ score: expect.any(Number), maxScore: 15 }),
          salary: expect.objectContaining({ score: expect.any(Number), maxScore: 15 }),
        }),
      }),
    );
    expect(response.body.recommendations[0].score).toBeGreaterThan(
      response.body.recommendations[1].score,
    );
    expect(response.body.recommendations[1].score).toBeGreaterThan(
      response.body.recommendations[2].score,
    );
  });

  it('ranks recommendations by descending score', async () => {
    const jobs = [
      makeJob({ id: JOB_LOW_ID, title: 'Low', location: 'Berlin', remoteAllowed: false }),
      makeJob({ id: JOB_HIGH_ID, title: 'High' }),
      makeJob({ id: JOB_MID_ID, title: 'Mid', location: 'Berlin', remoteAllowed: true }),
    ];
    const { app } = buildTestApp({ jobs });

    const response = await request(app).get(`/candidates/${CANDIDATE_ID}/recommendations`);

    expect(response.status).toBe(200);
    const scores = response.body.recommendations.map((r: { score: number }) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('applies the limit query parameter', async () => {
    const jobs = [
      makeJob({ id: JOB_HIGH_ID, title: 'High' }),
      makeJob({ id: JOB_MID_ID, title: 'Mid', location: 'Berlin', remoteAllowed: true }),
      makeJob({ id: JOB_LOW_ID, title: 'Low', location: 'Berlin', remoteAllowed: false }),
    ];
    const { app } = buildTestApp({ jobs });

    const response = await request(app).get(
      `/candidates/${CANDIDATE_ID}/recommendations?limit=2`,
    );

    expect(response.status).toBe(200);
    expect(response.body.recommendations).toHaveLength(2);
    expect(response.body.recommendations.map((r: { jobId: string }) => r.jobId)).toEqual([
      JOB_HIGH_ID,
      JOB_MID_ID,
    ]);
  });

  it('defaults limit to 10 when omitted', async () => {
    const jobs = Array.from({ length: 12 }, (_, index) =>
      makeJob({
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, '0')}`,
        title: `Job ${index}`,
      }),
    );
    const { app } = buildTestApp({ jobs });

    const response = await request(app).get(`/candidates/${CANDIDATE_ID}/recommendations`);

    expect(response.status).toBe(200);
    expect(response.body.recommendations).toHaveLength(10);
  });

  it('returns 400 VALIDATION_ERROR for an invalid candidate ID', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/candidates/not-a-uuid/recommendations');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(response.body.error.status).toBe(400);
  });

  it('returns 400 INVALID_LIMIT for limit below 1', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get(
      `/candidates/${CANDIDATE_ID}/recommendations?limit=0`,
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(ErrorCode.INVALID_LIMIT);
  });

  it('returns 400 INVALID_LIMIT for limit above 50', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get(
      `/candidates/${CANDIDATE_ID}/recommendations?limit=51`,
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(ErrorCode.INVALID_LIMIT);
  });

  it('returns 404 CANDIDATE_NOT_FOUND when the candidate does not exist', async () => {
    const { app, candidateFindById } = buildTestApp({ candidate: null });

    const response = await request(app).get(`/candidates/${CANDIDATE_ID}/recommendations`);

    expect(candidateFindById).toHaveBeenCalledWith(CANDIDATE_ID);
    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: ErrorCode.CANDIDATE_NOT_FOUND,
      status: 404,
      details: { candidateId: CANDIDATE_ID },
    });
  });
});

describe('GET /jobs/:jobId/recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ranked candidates with score and breakdown', async () => {
    const job = makeJob({
      id: JOB_ID,
      title: 'Backend Engineer',
      skills: [
        {
          id: 'js-1',
          jobId: JOB_ID,
          skill: 'typescript',
          type: JobSkillType.MUST_HAVE,
        },
        {
          id: 'js-2',
          jobId: JOB_ID,
          skill: 'node.js',
          type: JobSkillType.NICE_TO_HAVE,
        },
      ],
    });

    const candidates = [
      makeCandidate({
        id: CANDIDATE_LOW_ID,
        name: 'Low Fit',
        location: 'Berlin',
        yearsOfExperience: 1,
        expectedSalary: 200000,
        skills: [{ id: 'c-low', candidateId: CANDIDATE_LOW_ID, skill: 'typescript' }],
      }),
      makeCandidate({
        id: CANDIDATE_HIGH_ID,
        name: 'High Fit',
        skills: [
          { id: 'c-high-1', candidateId: CANDIDATE_HIGH_ID, skill: 'typescript' },
          { id: 'c-high-2', candidateId: CANDIDATE_HIGH_ID, skill: 'node.js' },
        ],
      }),
      makeCandidate({
        id: CANDIDATE_MID_ID,
        name: 'Mid Fit',
        location: 'Berlin',
        skills: [{ id: 'c-mid', candidateId: CANDIDATE_MID_ID, skill: 'typescript' }],
      }),
      makeCandidate({
        id: CANDIDATE_INELIGIBLE_ID,
        name: 'Ineligible',
        skills: [{ id: 'c-bad', candidateId: CANDIDATE_INELIGIBLE_ID, skill: 'java' }],
      }),
    ];

    const { app } = buildTestApp({ job, candidates });

    const response = await request(app).get(`/jobs/${JOB_ID}/recommendations?limit=10`);

    expect(response.status).toBe(200);
    expect(response.body.jobId).toBe(JOB_ID);
    expect(response.body.recommendations).toHaveLength(3);
    expect(
      response.body.recommendations.map((r: { candidateId: string }) => r.candidateId),
    ).toEqual([CANDIDATE_HIGH_ID, CANDIDATE_MID_ID, CANDIDATE_LOW_ID]);
    expect(response.body.recommendations[0]).toEqual(
      expect.objectContaining({
        candidateId: CANDIDATE_HIGH_ID,
        name: 'High Fit',
        score: expect.any(Number),
        breakdown: expect.objectContaining({
          skills: expect.objectContaining({ maxScore: 50 }),
          experience: expect.objectContaining({ maxScore: 20 }),
          location: expect.objectContaining({ maxScore: 15 }),
          salary: expect.objectContaining({ maxScore: 15 }),
        }),
      }),
    );
  });

  it('applies the limit query parameter', async () => {
    const job = makeJob({ id: JOB_ID, title: 'Backend Engineer' });
    const candidates = [
      makeCandidate({ id: CANDIDATE_HIGH_ID, name: 'High' }),
      makeCandidate({
        id: CANDIDATE_MID_ID,
        name: 'Mid',
        location: 'Berlin',
      }),
      makeCandidate({
        id: CANDIDATE_LOW_ID,
        name: 'Low',
        location: 'Berlin',
        yearsOfExperience: 1,
      }),
    ];
    const { app } = buildTestApp({ job, candidates });

    const response = await request(app).get(`/jobs/${JOB_ID}/recommendations?limit=2`);

    expect(response.status).toBe(200);
    expect(response.body.recommendations).toHaveLength(2);
  });

  it('returns 404 JOB_NOT_FOUND when the job does not exist', async () => {
    const { app, jobFindById } = buildTestApp({ job: null, candidates: [] });

    const response = await request(app).get(`/jobs/${JOB_ID}/recommendations`);

    expect(jobFindById).toHaveBeenCalledWith(JOB_ID);
    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: ErrorCode.JOB_NOT_FOUND,
      status: 404,
      details: { jobId: JOB_ID },
    });
  });

  it('returns 400 VALIDATION_ERROR for an invalid job ID', async () => {
    const { app } = buildTestApp({ job: null });

    const response = await request(app).get('/jobs/not-a-uuid/recommendations');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });
});
