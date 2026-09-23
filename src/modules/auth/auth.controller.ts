import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
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
  type SendOtpRequest,
  type RegisterRequest,
  type LoginRequest,
} from './schemas/auth.request.schema.ts';
import type { AuthUserResponse } from './schemas/auth.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  familyId?: string;
}

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
  ): Promise<ApiResponse<AuthUserResponse>> {
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
      data: user as unknown as AuthUserResponse,
    };
  }

  @Post('login')
  @Middlewares(validateRequest({ body: loginSchema }))
  @Response<ApiErrorResponse>(401, 'Invalid credentials')
  @Response<ApiErrorResponse>(403, 'Account banned')
  public async login(
    @Body() body: LoginRequest,
    @Request() req?: ExpressRequest
  ): Promise<ApiResponse<AuthUserResponse>> {
    const { user, tokens } = await this.authService.login(body);
    if (req?.res) {
      setAuthCookies(req.res, tokens.accessToken, tokens.refreshToken);
    }

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: user as unknown as AuthUserResponse,
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
}
