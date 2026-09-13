import { ZodError } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { AppError, ErrorCode } from '../shared/errors.js';

type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    status: number;
    details?: unknown;
  };
};

/**
 * Centralized HTTP error mapping. Controllers should forward errors via next(err).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    send(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const code = isLimitValidationError(err)
      ? ErrorCode.INVALID_LIMIT
      : ErrorCode.VALIDATION_ERROR;

    send(res, 400, code, 'Validation failed', err.flatten());
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  send(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, message);
}

function isLimitValidationError(err: ZodError): boolean {
  return err.issues.some((issue) => issue.path[0] === 'limit');
}

function send(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): void {
  const body: ErrorBody = {
    error: {
      code,
      message,
      status,
      ...(details !== undefined ? { details } : {}),
    },
  };
  res.status(status).json(body);
}
