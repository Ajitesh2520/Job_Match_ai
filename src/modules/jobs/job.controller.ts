import type { NextFunction, Request, Response } from 'express';
import type { JobService } from './job.service.js';

/**
 * HTTP adapter for Job use cases.
 */
export class JobController {
  constructor(private readonly jobService: JobService) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      void this.jobService;
      res.status(501).json({ error: { message: 'Not implemented', status: 501 } });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      void req;
      void this.jobService;
      res.status(501).json({ error: { message: 'Not implemented', status: 501 } });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      void req;
      void this.jobService;
      res.status(501).json({ error: { message: 'Not implemented', status: 501 } });
    } catch (error) {
      next(error);
    }
  };
}
