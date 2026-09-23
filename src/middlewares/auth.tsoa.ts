import type { Request } from 'express';
import { AppError } from '../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../common/consts/messageCode.const.ts';
import { jwtUtil } from '../modules/auth/auth.container.ts';
import { User, type IUser } from '../modules/user/user.model.ts';
import { UserStatusEnum } from '../common/enums/user.enum.ts';

export async function expressAuthentication(
  req: Request,
  securityName: string
): Promise<IUser> {
  let token: string | undefined;

  if (securityName === 'cookieAuth') {
    token = req.cookies?.accessToken;
  } else if (securityName === 'bearerAuth') {
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
  }

  // Fallback: accept token from either cookie or Authorization header
  if (!token) {
    token = req.cookies?.accessToken;
  }
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

  return user;
}
