import { Router, type Request, type Response } from 'express';
import type { HealthStatus } from '../../types/index.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const body: HealthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(body);
});
