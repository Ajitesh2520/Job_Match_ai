import type { NextFunction, Request, Response } from 'express';
import type { RecommendationService } from './recommendation.service.js';

/**
 * HTTP adapter for recommendation use cases.
 * Intended route: GET /candidates/:candidateId/recommendations?limit=
 */
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  getForCandidate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      void req;
      void this.recommendationService;
      res.status(501).json({ error: { message: 'Not implemented', status: 501 } });
    } catch (error) {
      next(error);
    }
  };
}
