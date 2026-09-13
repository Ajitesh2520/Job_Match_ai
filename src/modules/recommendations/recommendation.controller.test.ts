import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { RecommendationController } from './recommendation.controller.js';
import type { RecommendationService } from './recommendation.service.js';

const CANDIDATE_ID = '11111111-1111-4111-8111-111111111111';

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

describe('RecommendationController boundaries', () => {
  const recommendForCandidate = vi.fn();
  let controller: RecommendationController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new RecommendationController({
      recommendForCandidate,
    } as unknown as RecommendationService);
  });

  it('validates input and delegates to RecommendationService only', async () => {
    const recommendations = [
      {
        jobId: 'job-1',
        title: 'Engineer',
        score: 90,
        breakdown: {
          skills: { score: 50, maxScore: 50, details: {} },
          experience: { score: 20, maxScore: 20, details: {} },
          location: { score: 10, maxScore: 15, details: {} },
          salary: { score: 10, maxScore: 15, details: {} },
        },
      },
    ];
    recommendForCandidate.mockResolvedValue(recommendations);

    const { res, next } = await invoke(controller.getForCandidate, {
      params: { candidateId: CANDIDATE_ID },
      query: { limit: '5' },
    } as unknown as Request);

    expect(recommendForCandidate).toHaveBeenCalledWith(CANDIDATE_ID, 5);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      candidateId: CANDIDATE_ID,
      recommendations,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards validation errors to next without calling the service', async () => {
    const { res, next } = await invoke(controller.getForCandidate, {
      params: { candidateId: 'bad-id' },
      query: {},
    } as unknown as Request);

    expect(recommendForCandidate).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
