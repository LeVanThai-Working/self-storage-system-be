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
import type { PaymentService } from './payment.service.ts';
import type { SepayService } from './sepay.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import type { TokenPayload } from '../../utils/jwt.util.ts';
import {
  cancelPaymentSchema,
  confirmManualPaymentSchema,
  createPaymentSchema,
  paymentIdParamSchema,
  paymentQuerySchema,
  sepayWebhookSchema,
  type CancelPaymentRequest,
  type ConfirmManualPaymentRequest,
  type CreatePaymentRequest,
  type PaymentQuery,
  type SepayWebhookPayload,
} from './schemas/payment.request.schema.ts';
import type { PaymentResponse } from './schemas/payment.response.schema.ts';
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

@Tags('Payments')
@Route('payments')
export class PaymentController extends Controller {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly sepayService: SepayService
  ) {
    super();
  }

  /**
   * Public webhook endpoint invoked by SePay upon successful bank transaction.
   * Authenticated via header 'Authorization: Apikey <KEY>'.
   */
  @Post('sepay/webhook')
  @Middlewares(validateRequest({ body: sepayWebhookSchema }))
  @Response<ApiErrorResponse>(401, 'Invalid SePay Webhook Authentication')
  public async handleSepayWebhook(
    @Request() req: ExpressRequest,
    @Body() body: SepayWebhookPayload
  ): Promise<{ success: boolean; message?: string }> {
    const authHeader = (req.headers.authorization ||
      req.headers['x-api-key']) as string | undefined;
    const isValid = this.sepayService.verifyWebhookApiKey(authHeader);

    if (!isValid) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_503);
    }

    const result = await this.paymentService.handleSepayWebhook(body);
    return result;
  }

  /**
   * Create or retrieve an active Payment request with dynamic VietQR code.
   */
  @Post('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ body: createPaymentSchema }))
  @SuccessResponse(201, 'Created')
  @Response<ApiErrorResponse>(
    400,
    'Order is not awaiting payment or already expired'
  )
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(404, 'Reservation or Contract not found')
  public async createPayment(
    @Request() req: ExpressRequest,
    @Body() body: CreatePaymentRequest
  ): Promise<ApiResponse<PaymentResponse>> {
    const caller = extractCaller(req);
    const result = await this.paymentService.createPayment(
      caller.userId,
      caller.role,
      body
    );

    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Payment']),
      data: result,
    };
  }

  /**
   * Process expired pending payments (Cron / Batch job).
   * Note: Placed before dynamic path param '{id}' to avoid route collisions.
   */
  @Post('process-expired')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async processExpiredPayments(): Promise<
    ApiResponse<{ processedCount: number }>
  > {
    const result = await this.paymentService.processExpiredPayments();

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }

  /**
   * Get paginated list of payments.
   * Customers only see their own payments. Staff can filter across facilities.
   */
  @Get('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ query: paymentQuerySchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async getPayments(
    @Request() req: ExpressRequest,
    @Queries() query: PaymentQuery
  ): Promise<ApiResponse<PaginatedData<PaymentResponse>>> {
    const caller = extractCaller(req);
    const result = await this.paymentService.getPayments(
      query,
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

  /**
   * Get payment details by ID (polling for payment status).
   */
  @Get('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ params: paymentIdParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Payment not found')
  public async getPaymentById(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<PaymentResponse>> {
    const caller = extractCaller(req);
    const result = await this.paymentService.getPaymentById(
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

  /**
   * Cancel an unsettled payment.
   */
  @Post('{id}/cancel')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: paymentIdParamSchema,
      body: cancelPaymentSchema,
    })
  )
  @Response<ApiErrorResponse>(
    400,
    'Payment cannot be cancelled in current status'
  )
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Payment not found')
  public async cancelPayment(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CancelPaymentRequest
  ): Promise<ApiResponse<PaymentResponse>> {
    const caller = extractCaller(req);
    const result = await this.paymentService.cancelPayment(
      id,
      caller.userId,
      caller.role,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Payment']),
      data: result,
    };
  }

  /**
   * Staff/Manager confirms manual payment (Cash / Counter transfer).
   */
  @Post('{id}/confirm-manual')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: paymentIdParamSchema,
      body: confirmManualPaymentSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Payment cannot be manually confirmed')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Payment not found')
  public async confirmManualPayment(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: ConfirmManualPaymentRequest
  ): Promise<ApiResponse<PaymentResponse>> {
    const caller = extractCaller(req);
    const result = await this.paymentService.confirmManualPayment(
      id,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Payment']),
      data: result,
    };
  }
}
