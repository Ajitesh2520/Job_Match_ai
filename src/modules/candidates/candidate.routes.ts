import { Router } from 'express';
import { getPrismaClient } from '../../infrastructure/prisma/index.js';
import { CandidateController } from './candidate.controller.js';
import { CandidateRepository } from './candidate.repository.js';
import { CandidateService } from './candidate.service.js';

/**
 * Composes Candidate dependencies and exposes the module router.
 */
export function createCandidateRouter(): Router {
  const prisma = getPrismaClient();
  const repository = new CandidateRepository(prisma);
  const service = new CandidateService(repository);
  const controller = new CandidateController(service);

  const router = Router();

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);

  return router;
}
