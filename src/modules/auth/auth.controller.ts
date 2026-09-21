import type { Request, Response } from 'express';
import type { AuthService } from './auth.service.ts';
import type { IUser } from '../user/user.model.ts';
import { ResponseUtils } from '../../utils/response.util.ts';
import { setAuthCookies } from '../../utils/cookie.util.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { AppError } from '../../common/errors/appError.error.ts';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  sendOtp = async (req: Request, res: Response): Promise<void> => {
    await this.authService.sendOtp(req.body.email);
    ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, {
      message: 'OTP has been sent to your email.',
    });
  };

  register = async (req: Request, res: Response): Promise<void> => {
    const { user, tokens } = await this.authService.register(req.body);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    ResponseUtils.success(res, 201, MESSAGE_CODE.MESSAGE_CODE_002, user);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { user, tokens } = await this.authService.login(req.body);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, user);
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    const token: string | undefined =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const tokens = await this.authService.refreshTokens(token);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, tokens);
  };

  googleCallback = async (req: Request, res: Response): Promise<void> => {
    const { tokens } = await this.authService.handleGoogleLogin(
      req.user as IUser
    );
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.redirect('/auth/me');
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const token: string | undefined =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (token) {
      await this.authService.logout(token);
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, null);
  };

  getMe = async (req: Request, res: Response): Promise<void> => {
    ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, req.user);
  };
}
