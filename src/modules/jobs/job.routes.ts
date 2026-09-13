import { Router } from 'express';
import { getPrismaClient } from '../../infrastructure/prisma/index.js';
import { JobController } from './job.controller.js';
import { JobRepository } from './job.repository.js';
import { JobService } from './job.service.js';

/**
 * Composes Job dependencies and exposes the module router.
 */
export function createJobRouter(): Router {
  const prisma = getPrismaClient();
  const repository = new JobRepository(prisma);
  const service = new JobService(repository);
  const controller = new JobController(service);

  const router = Router();

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);

  return router;
}
