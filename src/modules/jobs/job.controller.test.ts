import { JobSkillType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { JobController } from './job.controller.js';
import type { JobService } from './job.service.js';

async function invoke(
  handler: (req: Request, res: Response, next: (err?: unknown) => void) => void,
  req: Request,
): Promise<{ res: Response; next: ReturnType<typeof vi.fn> }> {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();

  await new Promise<void>((resolve) => {
    res.json.mockImplementation(() => {
      resolve();
      return res;
    });
    next.mockImplementation(() => {
      resolve();
    });
    handler(req, res as unknown as Response, next);
  });

  return { res: res as unknown as Response, next };
}

describe('JobController boundaries', () => {
  const create = vi.fn();
  let controller: JobController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new JobController({ create } as unknown as JobService);
  });

  it('parses the body and delegates create to JobService', async () => {
    const payload = {
      title: 'Backend Engineer',
      minYearsExperience: 3,
      location: 'Remote',
      salaryMin: 100000,
      salaryMax: 150000,
      remoteAllowed: true,
      skills: [{ skill: 'TypeScript', type: JobSkillType.MUST_HAVE }],
    };
    const created = { id: 'j1', ...payload };
    create.mockResolvedValue(created);

    const { res, next } = await invoke(controller.create, {
      body: payload,
    } as unknown as Request);

    expect(create).toHaveBeenCalledWith(payload);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards validation errors without calling the service', async () => {
    const { next } = await invoke(controller.create, {
      body: {
        title: 'Backend',
        minYearsExperience: 3,
        location: 'Remote',
        salaryMin: 200000,
        salaryMax: 100000,
        remoteAllowed: true,
      },
    } as unknown as Request);

    expect(create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
