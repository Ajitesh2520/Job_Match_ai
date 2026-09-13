import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { createJobSchema } from './job.schemas.js';
import type { JobService } from './job.service.js';

/**
 * HTTP adapter for Job use cases.
 */
export class JobController {
  constructor(private readonly jobService: JobService) {}

  list = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    void this.jobService;
    res.status(501).json({ error: { message: 'Not implemented', status: 501 } });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    void req;
    void this.jobService;
    res.status(501).json({ error: { message: 'Not implemented', status: 501 } });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const input = createJobSchema.parse(req.body);
    const job = await this.jobService.create(input);
    res.status(201).json(job);
  });
}
