import { JobSkillType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobService } from './job.service.js';
import type { JobRepository } from './job.repository.js';

describe('JobService boundaries', () => {
  const create = vi.fn();
  const findById = vi.fn();
  const findAll = vi.fn();
  let service: JobService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new JobService({ create, findById, findAll } as unknown as JobRepository);
  });

  it('normalizes and deduplicates skills before calling the repository', async () => {
    create.mockResolvedValue({ id: 'j1' });

    await service.create({
      title: 'Backend Engineer',
      minYearsExperience: 3,
      location: 'Remote',
      salaryMin: 100000,
      salaryMax: 150000,
      remoteAllowed: true,
      skills: [
        { skill: '  TypeScript ', type: JobSkillType.MUST_HAVE },
        { skill: 'typescript', type: JobSkillType.NICE_TO_HAVE },
        { skill: 'Go', type: JobSkillType.NICE_TO_HAVE },
      ],
    });

    expect(create).toHaveBeenCalledWith({
      title: 'Backend Engineer',
      minYearsExperience: 3,
      location: 'Remote',
      salaryMin: 100000,
      salaryMax: 150000,
      remoteAllowed: true,
      skills: [
        { skill: 'typescript', type: JobSkillType.MUST_HAVE },
        { skill: 'go', type: JobSkillType.NICE_TO_HAVE },
      ],
    });
  });

  it('delegates list to the repository only', async () => {
    findAll.mockResolvedValue([]);
    await expect(service.list()).resolves.toEqual([]);
    expect(findAll).toHaveBeenCalledTimes(1);
  });
});
