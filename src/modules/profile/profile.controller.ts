import {
  Controller,
  Route,
  Tags,
  Get,
  Patch,
  Body,
  Path,
  Security,
  Middlewares,
  Request,
  Response,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { ProfileService } from './profile.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
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
  @Get('me')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async getMyProfile(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<ProfileResponse>> {
    const userId = (
      req.user as unknown as { _id: { toString(): string } }
    )._id.toString();
    const profile = await this.profileService.getMyProfile(userId);

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
  @Patch('me')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @Middlewares(validateRequest({ body: updateProfileSchema }))
  @Response<ApiErrorResponse>(400, 'Validation error')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async updateMyProfile(
    @Request() req: ExpressRequest,
    @Body() body: UpdateProfileRequest
  ): Promise<ApiResponse<ProfileResponse>> {
    const userId = (
      req.user as unknown as { _id: { toString(): string } }
    )._id.toString();
    const profile = await this.profileService.updateMyProfile(userId, body);

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
  @Get('{userId}')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @Middlewares(validateRequest({ params: profileUserIdParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(404, 'Profile not found')
  public async getProfileByUserId(
    @Path() userId: string
  ): Promise<ApiResponse<ProfileResponse>> {
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
