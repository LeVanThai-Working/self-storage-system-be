import type { Request, Response } from 'express';
import type { AuthService } from './auth.service.ts';
import type { IUser } from '../user/user.model.ts';
import { ResponseUtils } from '../../utils/response.util.ts';
import { setAuthCookies } from '../../utils/cookie.util.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';

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

  googleCallback = async (req: Request, res: Response): Promise<void> => {
    const { tokens } = this.authService.handleGoogleLogin(req.user as IUser);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.redirect('/auth/me');
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, null);
  };

  getMe = async (req: Request, res: Response): Promise<void> => {
    ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, req.user);
  };
}
