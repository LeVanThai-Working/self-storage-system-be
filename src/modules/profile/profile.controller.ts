import {
  Controller,
  Route,
  Tags,
  Get,
  Patch,
  Body,
  Path,
  Middlewares,
  Request,
  Response,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { ProfileService } from './profile.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { JwtUtil, type TokenPayload } from '../../utils/jwt.util.ts';

let jwtUtilInstance: JwtUtil | null = null;
function getJwtUtil(): JwtUtil {
  if (!jwtUtilInstance) {
    jwtUtilInstance = new JwtUtil();
  }
  return jwtUtilInstance;
}
import {
  updateProfileSchema,
  profileUserIdParamSchema,
  type UpdateProfileRequest,
} from './schemas/profile.request.schema.ts';
import type { ProfileResponse } from './schemas/profile.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';

interface CallerInfo {
  userId: string;
  role: string;
}

/**
 * Helper to extract caller identity while @Security is temporarily commented out.
 */
function extractCaller(req: ExpressRequest): CallerInfo {
  const user = req.user as
    { _id?: { toString(): string }; role?: string } | undefined;
  if (user?._id) {
    return {
      userId: user._id.toString(),
      role: user.role || 'customer',
    };
  }

  const headerUserId = req.headers['x-user-id'] as string | undefined;
  const headerUserRole = req.headers['x-user-role'] as string | undefined;
  if (headerUserId) {
    return {
      userId: headerUserId,
      role: headerUserRole || 'customer',
    };
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = getJwtUtil().verifyAccessToken(
        authHeader.split(' ')[1]
      ) as TokenPayload;
      if (payload?.userId) {
        return {
          userId: payload.userId,
          role: payload.role || 'customer',
        };
      }
    } catch {
      // Ignore token verification errors and try subsequent fallbacks
    }
  }

  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    try {
      const payload = getJwtUtil().verifyAccessToken(
        cookieToken
      ) as TokenPayload;
      if (payload?.userId) {
        return {
          userId: payload.userId,
          role: payload.role || 'customer',
        };
      }
    } catch {
      // Ignore cookie verification errors
    }
  }

  throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
}

@Tags('Profile')
@Route('profile')
export class ProfileController extends Controller {
  constructor(private readonly profileService: ProfileService) {
    super();
  }

  /**
   * Get the authenticated user's own profile.
   * Creates an empty profile if one does not exist yet.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('me')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async getMyProfile(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<ProfileResponse>> {
    const caller = extractCaller(req);
    const profile = await this.profileService.getMyProfile(caller.userId);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: profile,
    };
  }

  /**
   * Update the authenticated user's own profile.
   * Performs an upsert — creates the profile if it does not exist.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Patch('me')
  @Middlewares(validateRequest({ body: updateProfileSchema }))
  @Response<ApiErrorResponse>(400, 'Validation error')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async updateMyProfile(
    @Request() req: ExpressRequest,
    @Body() body: UpdateProfileRequest
  ): Promise<ApiResponse<ProfileResponse>> {
    const caller = extractCaller(req);
    const profile = await this.profileService.updateMyProfile(
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Profile']),
      data: profile,
    };
  }

  /**
   * Get any user's profile by userId.
   * Intended for admin / staff use.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('{userId}')
  @Middlewares(validateRequest({ params: profileUserIdParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(404, 'Profile not found')
  public async getProfileByUserId(
    @Request() req: ExpressRequest,
    @Path() userId: string
  ): Promise<ApiResponse<ProfileResponse>> {
    extractCaller(req);
    const profile = await this.profileService.getProfileByUserId(userId);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: profile,
    };
  }
}
