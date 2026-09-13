import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { CandidateController } from './candidate.controller.js';
import type { CandidateService } from './candidate.service.js';

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

describe('CandidateController boundaries', () => {
  const create = vi.fn();
  let controller: CandidateController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new CandidateController({ create } as unknown as CandidateService);
  });

  it('parses the body and delegates create to CandidateService', async () => {
    const payload = {
      name: 'Ada',
      yearsOfExperience: 5,
      location: 'London',
      expectedSalary: 120000,
      skills: ['TypeScript'],
    };
    const created = { id: 'c1', ...payload, skills: [{ skill: 'typescript' }] };
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
      body: { name: 'Ada' },
    } as unknown as Request);

    expect(create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
