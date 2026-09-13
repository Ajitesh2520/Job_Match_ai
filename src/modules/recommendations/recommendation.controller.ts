import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  candidateIdParamSchema,
  recommendationsQuerySchema,
} from './recommendation.schemas.js';
import type { RecommendationService } from './recommendation.service.js';

/**
 * HTTP adapter for recommendation use cases.
 * Route: GET /candidates/:candidateId/recommendations?limit=
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
}
