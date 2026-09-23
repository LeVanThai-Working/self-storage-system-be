import type { ErrorRequestHandler } from 'express';
import createHttpError from 'http-errors';
import { ZodError } from 'zod';
import { AppError } from '../common/errors/appError.error.ts';
import { ResponseUtils } from '../utils/response.util.ts';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal Server Error';
  let errors: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;

    // find ZodError if it's passed to params of AppError
    const zodError = err.params.find(
      (p) =>
        p instanceof ZodError ||
        (p &&
          typeof p === 'object' &&
          ('issues' in p || (p as Error).name === 'ZodError'))
    ) as ZodError | undefined;

    if (zodError?.issues) {
      errors = zodError.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
    } else if (err.params.length > 0) {
      errors = err.params.map((p) =>
        p instanceof Error ? { message: p.message } : p
      );
    }
  }
  // Http Errors
  else if (createHttpError.isHttpError(err)) {
    statusCode = err.statusCode;
    errorCode = 'HTTP_ERROR';
    message = err.message;
  }
  // Other Errors
  else if (err instanceof Error) {
    console.error('Unhandled Error:', err);
    if (process.env.NODE_ENV === 'development') {
      message = err.message;
    }
  }

  ResponseUtils.error(res, statusCode, errorCode, message, {
    path: req.originalUrl,
    errors,
    stack: err.stack,
  });
};
