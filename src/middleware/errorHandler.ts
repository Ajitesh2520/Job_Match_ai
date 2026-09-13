import { ZodError } from 'zod';
import type { NextFunction, Request, Response } from 'express';

type ErrorBody = {
  error: {
    message: string;
    status: number;
    details?: unknown;
  };
};

/**
 * Maps known errors (Zod validation) to HTTP responses.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const body: ErrorBody = {
      error: {
        message: 'Validation failed',
        status: 400,
        details: err.flatten(),
      },
    };
    res.status(400).json(body);
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const status = 500;

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  const body: ErrorBody = {
    error: {
      message,
      status,
    },
  };

  res.status(status).json(body);
}
