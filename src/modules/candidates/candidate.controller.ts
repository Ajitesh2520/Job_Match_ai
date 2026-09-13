import type { NextFunction, Request, Response } from 'express';
import { createCandidateSchema } from './candidate.schemas.js';
import type { CandidateService } from './candidate.service.js';

/**
 * HTTP adapter for Candidate use cases.
 */
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(501).json({ error: { message: 'Not implemented', status: 501 } });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      void req;
      void this.candidateService;
      res.status(501).json({ error: { message: 'Not implemented', status: 501 } });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = createCandidateSchema.parse(req.body);
      const candidate = await this.candidateService.create(input);
      res.status(201).json(candidate);
    } catch (error) {
      next(error);
    }
  };
}
