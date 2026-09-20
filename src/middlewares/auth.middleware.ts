import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../common/consts/messageCode.const.ts';
import { jwtUtil } from '../modules/auth/auth.container.ts';
import { User } from '../modules/user/user.model.ts';
import { UserStatusEnum } from '../common/enums/user.enum.ts';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    let payload: { userId?: string };
    try {
      payload = jwtUtil.verifyAccessToken(token) as { userId?: string };
    } catch {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_201);
    }

    if (!payload.userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_201);
    }

    const user = await User.findById(payload.userId);
    if (!user || user.status === UserStatusEnum.BANNED) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
