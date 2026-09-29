import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Patch,
  Body,
  SuccessResponse,
  Response,
  Security,
  Middlewares,
  Request,
} from 'tsoa';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import type { AuthService } from './auth.service.ts';
import type { IUser } from '../user/user.model.ts';
import { setAuthCookies } from '../../utils/cookie.util.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  sendOtpSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type SendOtpRequest,
  type RegisterRequest,
  type LoginRequest,
  type ForgotPasswordRequest,
  type ResetPasswordRequest,
  type ChangePasswordRequest,
} from './schemas/auth.request.schema.ts';
import type {
  AuthUserResponse,
  AuthTokens,
  AuthLoginResponse,
} from './schemas/auth.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';

export type { AuthTokens };

export interface RefreshTokenRequest {
  refreshToken?: string;
}

@Tags('Auth')
@Route('auth')
export class AuthController extends Controller {
  constructor(private readonly authService: AuthService) {
    super();
  }

  @Post('send-otp')
  @Middlewares(validateRequest({ body: sendOtpSchema }))
  @Response<ApiErrorResponse>(400, 'Email already registered or invalid input')
  public async sendOtp(
    @Body() body: SendOtpRequest
  ): Promise<ApiResponse<{ message: string }>> {
    await this.authService.sendOtp(body.email);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: {
        message: 'OTP has been sent to your email.',
      },
    };
  }

  @Post('register')
  @Middlewares(validateRequest({ body: registerSchema }))
  @SuccessResponse(201, 'User registered successfully')
  @Response<ApiErrorResponse>(
    400,
    'Invalid OTP, email already exists, or validation error'
  )
  public async register(
    @Body() body: RegisterRequest,
    @Request() req?: ExpressRequest
  ): Promise<ApiResponse<AuthLoginResponse>> {
    const { user, tokens } = await this.authService.register(body);
    if (req?.res) {
      setAuthCookies(req.res, tokens.accessToken, tokens.refreshToken);
    }
    this.setStatus(201);

    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002),
      data: {
        user: user as unknown as AuthUserResponse,
        tokens,
      },
    };
  }

  @Post('login')
  @Middlewares(validateRequest({ body: loginSchema }))
  @Response<ApiErrorResponse>(401, 'Invalid credentials')
  @Response<ApiErrorResponse>(403, 'Account banned')
  public async login(
    @Body() body: LoginRequest,
    @Request() req?: ExpressRequest
  ): Promise<ApiResponse<AuthLoginResponse>> {
    const { user, tokens } = await this.authService.login(body);
    if (req?.res) {
      setAuthCookies(req.res, tokens.accessToken, tokens.refreshToken);
    }

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: {
        user: user as unknown as AuthUserResponse,
        tokens,
      },
    };
  }

  @Post('refresh')
  @Response<ApiErrorResponse>(401, 'Invalid or revoked refresh token')
  public async refreshToken(
    @Body() body?: RefreshTokenRequest,
    @Request() req?: ExpressRequest
  ): Promise<ApiResponse<AuthTokens>> {
    const token: string | undefined =
      req?.cookies?.refreshToken || body?.refreshToken;

    if (!token) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const tokens = await this.authService.refreshTokens(token);
    if (req?.res) {
      setAuthCookies(req.res, tokens.accessToken, tokens.refreshToken);
    }

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: tokens,
    };
  }

  @Post('logout')
  public async logout(
    @Body() body?: RefreshTokenRequest,
    @Request() req?: ExpressRequest
  ): Promise<ApiResponse<null>> {
    const token: string | undefined =
      req?.cookies?.refreshToken || body?.refreshToken;

    if (token) {
      await this.authService.logout(token);
    }

    if (req?.res) {
      req.res.clearCookie('accessToken');
      req.res.clearCookie('refreshToken');
    }

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: null,
    };
  }

  @Get('me')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @Response<ApiErrorResponse>(401, 'Unauthorized or token expired')
  public async getMe(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<AuthUserResponse>> {
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: req.user as unknown as AuthUserResponse,
    };
  }

  public googleCallback = async (
    req: ExpressRequest,
    res: ExpressResponse
  ): Promise<void> => {
    const { tokens } = await this.authService.handleGoogleLogin(
      req.user as IUser
    );
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.redirect('/auth/me');
  };

  @Post('forgot-password')
  @Middlewares(validateRequest({ body: forgotPasswordSchema }))
  @Response<ApiErrorResponse>(400, 'Google OAuth account cannot reset password')
  @Response<ApiErrorResponse>(404, 'User not found')
  public async forgotPassword(
    @Body() body: ForgotPasswordRequest
  ): Promise<ApiResponse<{ message: string }>> {
    await this.authService.forgotPassword(body.email);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: {
        message: 'Password reset OTP has been sent to your email.',
      },
    };
  }

  @Post('reset-password')
  @Middlewares(validateRequest({ body: resetPasswordSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid OTP or Google OAuth account')
  @Response<ApiErrorResponse>(404, 'User not found')
  public async resetPassword(
    @Body() body: ResetPasswordRequest
  ): Promise<ApiResponse<{ message: string }>> {
    await this.authService.resetPassword(
      body.email,
      body.otp,
      body.newPassword
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: {
        message: 'Password has been reset successfully. Please log in again.',
      },
    };
  }

  @Patch('change-password')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @Middlewares(validateRequest({ body: changePasswordSchema }))
  @Response<ApiErrorResponse>(
    400,
    'Current password is incorrect or Google OAuth account'
  )
  @Response<ApiErrorResponse>(404, 'User not found')
  public async changePassword(
    @Body() body: ChangePasswordRequest,
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<{ message: string }>> {
    const user = req.user as IUser;
    await this.authService.changePassword(
      user._id.toString(),
      body.currentPassword,
      body.newPassword
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: {
        message: 'Password changed successfully. Please log in again.',
      },
    };
  }
}
