import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  runWithRequestContext,
  type RequestContext,
} from '../utils/requestContext.util.ts';

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const headerRequestId = req.headers['x-request-id'];
  const requestId =
    typeof headerRequestId === 'string' && headerRequestId.trim()
      ? headerRequestId.trim()
      : crypto.randomUUID();

  res.setHeader('X-Request-Id', requestId);

  const context: RequestContext = {
    requestId,
    ip: req.ip || req.socket.remoteAddress || null,
    userAgent: (req.headers['user-agent'] as string) || null,
    method: req.method || null,
    path: req.originalUrl || req.url || null,
    actor: null,
  };

  runWithRequestContext(context, () => {
    next();
  });
};
