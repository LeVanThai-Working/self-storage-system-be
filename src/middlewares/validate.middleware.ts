import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../common/consts/messageCode.const.ts';

interface RequestValidationSchema {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export const validateRequest = (schema: RequestValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        const parsedQuery = (await schema.query.parseAsync(
          req.query
        )) as unknown as Request['query'];
        Object.defineProperty(req, 'query', {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(
          req.params
        )) as unknown as Request['params'];
      }
      next();
    } catch (error) {
      next(new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [error]));
    }
  };
};
