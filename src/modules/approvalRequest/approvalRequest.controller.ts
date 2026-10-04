import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Patch,
  Body,
  Path,
  Queries,
  // Security,
  Middlewares,
  Request,
  Response,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { ApprovalRequestService } from './approvalRequest.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import {
  createApprovalRequestSchema,
  reviewApprovalRequestSchema,
  approvalRequestIdParamSchema,
  approvalRequestQuerySchema,
  type CreateApprovalRequest,
  type ReviewApprovalRequest,
  type ApprovalRequestQuery,
} from './schemas/approvalRequest.request.schema.ts';
import type { ApprovalRequestResponse } from './schemas/approvalRequest.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

/**
 * Helper tạm thời để trích xuất userId trong giai đoạn phát triển (khi @Security đang ẩn).
 * Khi bước vào phase phân quyền (bật lại @Security), xóa helper này và mở lại các dòng:
 * // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
 */
function extractUserId(
  req: ExpressRequest,
  fallbackId?: string
): string | undefined {
  const user = req.user as { _id?: { toString(): string } } | undefined;
  if (user?._id) {
    return user._id.toString();
  }
  if (fallbackId) {
    return fallbackId;
  }
  const headerUserId = req.headers['x-user-id'];
  if (typeof headerUserId === 'string' && headerUserId.trim()) {
    return headerUserId.trim();
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwtUtil.verifyAccessToken(authHeader.split(' ')[1]) as {
        userId?: string;
      };
      if (payload?.userId) return payload.userId;
    } catch {
      // ignore token verification error; will throw 401 below
    }
  }
  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    try {
      const payload = jwtUtil.verifyAccessToken(cookieToken) as {
        userId?: string;
      };
      if (payload?.userId) return payload.userId;
    } catch {
      // ignore
    }
  }
  return undefined;
}

@Tags('Approval Requests')
@Route('approval-requests')
export class ApprovalRequestController extends Controller {
  constructor(private readonly approvalRequestService: ApprovalRequestService) {
    super();
  }

  /**
   * Submit a new approval request (Facility Manager).
   */
  @Post('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ body: createApprovalRequestSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async createApprovalRequest(
    @Request() req: ExpressRequest,
    @Body() body: CreateApprovalRequest
  ): Promise<ApiResponse<ApprovalRequestResponse>> {
    // Production line (uncomment when @Security is enabled):
    // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const userId = extractUserId(req, body.requesterId);
    if (!userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const result = await this.approvalRequestService.createRequest(
      userId,
      body
    );
    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, [
        'Approval Request',
      ]),
      data: result,
    };
  }

  /**
   * Get approval requests submitted by the authenticated user / facility.
   * NOTE: Placed before @Get('{id}') to avoid path collision.
   */
  @Get('my-requests')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER
  @Middlewares(validateRequest({ query: approvalRequestQuerySchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async getMyApprovalRequests(
    @Request() req: ExpressRequest,
    @Queries() query: ApprovalRequestQuery
  ): Promise<ApiResponse<PaginatedData<ApprovalRequestResponse>>> {
    // Production line (uncomment when @Security is enabled):
    // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const userId = extractUserId(req, query.requesterId);
    if (!userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const result = await this.approvalRequestService.getMyRequests(
      userId,
      query
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }

  /**
   * Get all approval requests across all facilities (Operations Manager & Admin).
   */
  @Get('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ query: approvalRequestQuerySchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async getAllApprovalRequests(
    @Queries() query: ApprovalRequestQuery
  ): Promise<ApiResponse<PaginatedData<ApprovalRequestResponse>>> {
    const result = await this.approvalRequestService.getAllRequests(query);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }

  /**
   * Get details of a specific approval request.
   */
  @Get('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN, FACILITY_MANAGER
  @Middlewares(validateRequest({ params: approvalRequestIdParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async getApprovalRequestById(
    @Path() id: string
  ): Promise<ApiResponse<ApprovalRequestResponse>> {
    const result = await this.approvalRequestService.getRequestById(id);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }

  /**
   * Cancel a pending approval request (Facility Manager).
   */
  @Patch('{id}/cancel')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ params: approvalRequestIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async cancelApprovalRequest(
    @Path() id: string,
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<ApprovalRequestResponse>> {
    // Production line (uncomment when @Security is enabled):
    // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const userId = extractUserId(
      req,
      (req.query.requesterId as string) || (req.body?.requesterId as string)
    );

    if (!userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const result = await this.approvalRequestService.cancelRequest(userId, id);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Approval Request Cancelled',
      ]),
      data: result,
    };
  }

  /**
   * Review an approval request (Approve or Reject).
   * Automatically executes database changes if approved.
   */
  @Patch('{id}/review')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: approvalRequestIdParamSchema,
      body: reviewApprovalRequestSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async reviewApprovalRequest(
    @Path() id: string,
    @Request() req: ExpressRequest,
    @Body() body: ReviewApprovalRequest
  ): Promise<ApiResponse<ApprovalRequestResponse>> {
    // Production line (uncomment when @Security is enabled):
    // const approverId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const approverId = extractUserId(req, body.approverId);

    if (!approverId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const result = await this.approvalRequestService.reviewRequest(
      approverId,
      id,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Approval Request Reviewed',
      ]),
      data: result,
    };
  }
}
