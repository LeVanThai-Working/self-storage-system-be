import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis.config.ts';

const DEFAULT_IDEMPOTENCY_TTL_SECONDS = 1800; // 30 minutes

export interface CachedIdempotentResponse {
  statusCode: number;
  body: unknown;
}

/**
 * Idempotency Middleware
 * Intercepts requests carrying 'x-idempotency-key' or 'idempotency-key' header.
 * If the key has already been processed, returns the exact cached response with 'X-Idempotent-Replay: true'.
 * Otherwise, captures the response and saves it in Redis with a 30-minute TTL.
 */
export function idempotencyMiddleware(
  ttlSeconds: number = DEFAULT_IDEMPOTENCY_TTL_SECONDS
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const rawKey =
      req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
    const idempotencyKey =
      typeof rawKey === 'string' && rawKey.trim() ? rawKey.trim() : null;

    if (!idempotencyKey) {
      return next();
    }

    const redisKey = `idempotency:${idempotencyKey}`;

    try {
      const cached = await redis.get(redisKey);
      if (cached) {
        const parsed: CachedIdempotentResponse = JSON.parse(cached);
        res.setHeader('X-Idempotent-Replay', 'true');
        res.status(parsed.statusCode).send(parsed.body);
        return;
      }
    } catch (err: unknown) {
      console.warn(
        `[IdempotencyMiddleware] Failed to check key ${idempotencyKey}:`,
        err instanceof Error ? err.message : String(err)
      );
    }

    // Intercept response to store result in Redis
    const originalSend = res.send.bind(res);

    res.send = (body?: unknown): Response => {
      if (res.statusCode < 500) {
        try {
          const cachePayload: CachedIdempotentResponse = {
            statusCode: res.statusCode,
            body,
          };
          redis
            .set(redisKey, JSON.stringify(cachePayload), 'EX', ttlSeconds)
            .catch((err) => {
              console.warn(
                `[IdempotencyMiddleware] Failed to cache key ${idempotencyKey}:`,
                err instanceof Error ? err.message : String(err)
              );
            });
        } catch (err) {
          console.warn('[IdempotencyMiddleware] Cache payload error:', err);
        }
      }
      return originalSend(body);
    };

    next();
  };
}
