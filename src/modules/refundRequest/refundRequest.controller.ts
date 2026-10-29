import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Body,
  Path,
  Queries,
  Middlewares,
  Request,
  Response,
  SuccessResponse,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { RefundRequestService } from './refundRequest.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import type { TokenPayload } from '../../utils/jwt.util.ts';
import {
  refundRequestIdParamSchema,
  createRefundRequestSchema,
  approveRefundRequestSchema,
  rejectRefundRequestSchema,
  confirmPaidRefundSchema,
  cancelRefundRequestSchema,
  refundRequestQuerySchema,
  type CreateRefundRequest,
  type ApproveRefundRequest,
  type RejectRefundRequest,
  type ConfirmPaidRefund,
  type CancelRefundRequest,
  type RefundRequestQuery,
} from './schemas/refundRequest.request.schema.ts';
import type { RefundRequestResponse } from './schemas/refundRequest.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

interface CallerInfo {
  userId: string;
  role: string;
}

/**
 * Helper to extract caller identity and role while @Security is temporarily commented out.
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

  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_INSECURE_CALLER_FALLBACK === 'true'
  ) {
    const headerUserId = req.headers['x-user-id'] as string | undefined;
    const headerUserRole = req.headers['x-user-role'] as string | undefined;
    if (headerUserId) {
      return {
        userId: headerUserId,
        role: headerUserRole || 'customer',
      };
    }
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
      // ignore token verification error
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
      // ignore
    }
  }

  throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
}

@Tags('Refund Requests')
@Route('refund-requests')
export class RefundRequestController extends Controller {
  constructor(private readonly refundRequestService: RefundRequestService) {
    super();
  }

  /**
   * Tạo yêu cầu hoàn tiền mới (Manual hoặc System triggered).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN, CUSTOMER
  @Post('')
  @Middlewares(validateRequest({ body: createRefundRequestSchema }))
  @SuccessResponse(201, 'Created')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async createRefundRequest(
    @Request() req: ExpressRequest,
    @Body() body: CreateRefundRequest
  ): Promise<ApiResponse<RefundRequestResponse>> {
    const caller = extractCaller(req);
    const result = await this.refundRequestService.createRefundRequest(
      caller.userId,
      caller.role,
      body
    );
    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002),
      data: result,
    };
  }

  /**
   * Phê duyệt yêu cầu hoàn tiền (Maker-Checker và Ngưỡng OPS).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/approve')
  @Middlewares(
    validateRequest({
      params: refundRequestIdParamSchema,
      body: approveRefundRequestSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(
    403,
    'Forbidden / Maker-Checker violation / Exceed threshold'
  )
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async approveRefundRequest(
    @Path() id: string,
    @Request() req: ExpressRequest,
    @Body() body: ApproveRefundRequest
  ): Promise<ApiResponse<RefundRequestResponse>> {
    const caller = extractCaller(req);
    const result = await this.refundRequestService.approveRefundRequest(
      id,
      caller.userId,
      caller.role,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003),
      data: result,
    };
  }

  /**
   * Từ chối yêu cầu hoàn tiền.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/reject')
  @Middlewares(
    validateRequest({
      params: refundRequestIdParamSchema,
      body: rejectRefundRequestSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async rejectRefundRequest(
    @Path() id: string,
    @Request() req: ExpressRequest,
    @Body() body: RejectRefundRequest
  ): Promise<ApiResponse<RefundRequestResponse>> {
    const caller = extractCaller(req);
    const result = await this.refundRequestService.rejectRefundRequest(
      id,
      caller.userId,
      caller.role,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003),
      data: result,
    };
  }

  /**
   * Xác nhận đã chuyển khoản/hoàn tiền thành công (Trạng thái PAID là bất biến).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/confirm-paid')
  @Middlewares(
    validateRequest({
      params: refundRequestIdParamSchema,
      body: confirmPaidRefundSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async confirmPaidRefundRequest(
    @Path() id: string,
    @Request() req: ExpressRequest,
    @Body() body: ConfirmPaidRefund
  ): Promise<ApiResponse<RefundRequestResponse>> {
    const caller = extractCaller(req);
    const result = await this.refundRequestService.confirmPaidRefundRequest(
      id,
      caller.userId,
      caller.role,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003),
      data: result,
    };
  }

  /**
   * Hủy yêu cầu hoàn tiền (bởi người yêu cầu trước khi phê duyệt).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/cancel')
  @Middlewares(
    validateRequest({
      params: refundRequestIdParamSchema,
      body: cancelRefundRequestSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async cancelRefundRequest(
    @Path() id: string,
    @Request() req: ExpressRequest,
    @Body() body: CancelRefundRequest
  ): Promise<ApiResponse<RefundRequestResponse>> {
    const caller = extractCaller(req);
    const result = await this.refundRequestService.cancelRefundRequest(
      id,
      caller.userId,
      caller.role,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003),
      data: result,
    };
  }

  /**
   * Tra cứu danh sách yêu cầu hoàn tiền theo bộ lọc và phân trang.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('')
  @Middlewares(validateRequest({ query: refundRequestQuerySchema }))
  public async listRefundRequests(
    @Request() req: ExpressRequest,
    @Queries() query: RefundRequestQuery
  ): Promise<ApiResponse<PaginatedData<RefundRequestResponse>>> {
    const caller = extractCaller(req);
    const result = await this.refundRequestService.getRefundRequests(
      caller.userId,
      caller.role,
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
   * Chi tiết một yêu cầu hoàn tiền.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('{id}')
  @Middlewares(validateRequest({ params: refundRequestIdParamSchema }))
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async getRefundRequestById(
    @Path() id: string,
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<RefundRequestResponse>> {
    const caller = extractCaller(req);
    const result = await this.refundRequestService.getRefundRequestById(
      id,
      caller.userId,
      caller.role
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }
}
