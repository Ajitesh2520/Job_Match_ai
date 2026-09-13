import type { NextFunction, Request, Response } from 'express';

/**
 * Placeholder request logger.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  console.info(`${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });

  next();
}
