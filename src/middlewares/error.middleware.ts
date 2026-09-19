import type { ErrorRequestHandler } from 'express';
import createHttpError from 'http-errors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  const error = createHttpError.isHttpError(err)
    ? err
    : createHttpError(500, 'Internal Server Error');

  res.status(error.statusCode).json({
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
};
