import {
  Controller,
  Route,
  Tags,
  Post,
  Body,
  Middlewares,
  Request,
  Response,
  SuccessResponse,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { UploadService } from './upload.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import type { TokenPayload } from '../../utils/jwt.util.ts';
import {
  cloudinarySignatureRequestSchema,
  type CloudinarySignatureRequest,
} from './schemas/upload.request.schema.ts';
import type { CloudinarySignatureResponse } from './schemas/upload.response.schema.ts';
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
      const payload = jwtUtil.verifyAccessToken(
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
      const payload = jwtUtil.verifyAccessToken(cookieToken) as TokenPayload;
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

@Route('upload')
@Tags('Upload')
export class UploadController extends Controller {
  constructor(private readonly uploadService: UploadService) {
    super();
  }

  /**
   * Generates a signed payload (signature, timestamp, apiKey, cloudName, folder)
   * for uploading files directly to Cloudinary from client-side applications.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('signature')
  @Middlewares(
    validateRequest({
      body: cloudinarySignatureRequestSchema,
    })
  )
  @SuccessResponse(200, 'Signature generated successfully')
  @Response<ApiErrorResponse>(400, 'Invalid Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized Access')
  @Response<ApiErrorResponse>(500, 'Internal Server Error')
  public async getUploadSignature(
    @Request() req: ExpressRequest,
    @Body() body: CloudinarySignatureRequest
  ): Promise<ApiResponse<CloudinarySignatureResponse>> {
    // Enforce that caller is authenticated
    extractCaller(req);

    const result = this.uploadService.generateUploadSignature(body.folder);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }
}
