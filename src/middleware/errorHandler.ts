import type { NextFunction, Request, Response } from 'express';

/**
 * Placeholder central error handler.
 * Will map domain / Zod / Prisma errors to HTTP responses later.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const status = 500;

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(status).json({
    error: {
      message,
      status,
    },
  });
}
