import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CandidateService } from './candidate.service.js';
import type { CandidateRepository } from './candidate.repository.js';

describe('CandidateService boundaries', () => {
  const create = vi.fn();
  const findById = vi.fn();
  let service: CandidateService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CandidateService({ create, findById } as unknown as CandidateRepository);
  });

  it('normalizes skills before calling the repository', async () => {
    create.mockResolvedValue({ id: 'c1' });

    await service.create({
      name: 'Ada',
      yearsOfExperience: 5,
      location: 'London',
      expectedSalary: 120000,
      skills: ['  TypeScript ', 'TYPESCRIPT', 'Go'],
    });

    expect(create).toHaveBeenCalledWith({
      name: 'Ada',
      yearsOfExperience: 5,
      location: 'London',
      expectedSalary: 120000,
      skills: ['typescript', 'go'],
    });
  });

  it('delegates getById to the repository only', async () => {
    findById.mockResolvedValue(null);
    await expect(service.getById('c1')).resolves.toBeNull();
    expect(findById).toHaveBeenCalledWith('c1');
  });
});
