import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { createCandidateSchema } from './candidate.schemas.js';
import type { CandidateService } from './candidate.service.js';

/**
 * HTTP adapter for Candidate use cases.
 */
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  list = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    res.status(501).json({ error: { message: 'Not implemented', status: 501 } });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    void req;
    void this.candidateService;
    res.status(501).json({ error: { message: 'Not implemented', status: 501 } });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const input = createCandidateSchema.parse(req.body);
    const candidate = await this.candidateService.create(input);
    res.status(201).json(candidate);
  });
}
