import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  candidateIdParamSchema,
  jobIdParamSchema,
  recommendationsQuerySchema,
} from './recommendation.schemas.js';
import type { RecommendationService } from './recommendation.service.js';

/**
 * HTTP adapter for recommendation use cases.
 */
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  getForCandidate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { candidateId } = candidateIdParamSchema.parse(req.params);
    const { limit } = recommendationsQuerySchema.parse(req.query);

    const recommendations = await this.recommendationService.recommendForCandidate(
      candidateId,
      limit,
    );

    res.status(200).json({
      candidateId,
      recommendations,
    });
  });

  getForJob = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { jobId } = jobIdParamSchema.parse(req.params);
    const { limit } = recommendationsQuerySchema.parse(req.query);

    const recommendations = await this.recommendationService.recommendForJob(jobId, limit);

    res.status(200).json({
      jobId,
      recommendations,
    });
  });
}
