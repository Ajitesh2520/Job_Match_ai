import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Forwards rejected promises to Express error middleware.
 * Controllers should use this instead of local try/catch.
 */
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}
