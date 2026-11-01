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
import type { InvoiceService } from './invoice.service.ts';
import type { PaymentService } from '../payment/payment.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import type { TokenPayload } from '../../utils/jwt.util.ts';
import { PaymentPurposeEnum } from '../../common/enums/payment.enum.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import {
  invoiceIdParamSchema,
  invoiceQuerySchema,
  cancelInvoiceSchema,
  confirmManualInvoicePaymentSchema,
  createManualInvoiceSchema,
  type InvoiceQuery,
  type CancelInvoiceRequest,
  type ConfirmManualInvoicePaymentRequest,
  type CreateManualInvoiceRequest,
} from './schemas/invoice.request.schema.ts';
import type {
  InvoiceResponse,
  InvoicePdfResponse,
  RecurringInvoiceScanResult,
  OverdueInvoiceScanResult,
  RemindInvoicesScanResult,
} from './schemas/invoice.response.schema.ts';
import type { PaymentResponse } from '../payment/schemas/payment.response.schema.ts';
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
 * Temporary helper to extract caller identity and role during development
 * while @Security decorators are temporarily commented out.
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

  // Fallback 1: x-user-id and x-user-role headers (only allowed outside production when explicitly enabled)
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

  // Fallback 2: Authorization header
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

  // Fallback 3: cookie
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

@Tags('Invoices')
@Route('invoices')
export class InvoiceController extends Controller {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly paymentServiceGetter?: () => PaymentService | undefined
  ) {
    super();
  }

  private getPaymentService(): PaymentService | undefined {
    return this.paymentServiceGetter ? this.paymentServiceGetter() : undefined;
  }

  /**
   * View invoices list with pagination and role-based scoping filters.
   * - CUSTOMER: only views own invoices.
   * - FACILITY_STAFF/MANAGER: views invoices within assigned facility.
   * - SYSTEM_ADMIN/BUSINESS_OPS_MANAGER: system-wide view.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('')
  @Middlewares(validateRequest({ query: invoiceQuerySchema }))
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async getInvoices(
    @Request() req: ExpressRequest,
    @Queries() query: InvoiceQuery
  ): Promise<ApiResponse<PaginatedData<InvoiceResponse>>> {
    const caller = extractCaller(req);
    const result = await this.invoiceService.getInvoices(
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
   * Create a manual incidental invoice (e.g. damages, penalty fees, additional services).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('manual')
  @Middlewares(validateRequest({ body: createManualInvoiceSchema }))
  @SuccessResponse(201, 'Manual Invoice Created Successfully')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Contract Not Found')
  public async createManualInvoice(
    @Request() req: ExpressRequest,
    @Body() body: CreateManualInvoiceRequest
  ): Promise<ApiResponse<InvoiceResponse>> {
    const caller = extractCaller(req);
    const invoice = await this.invoiceService.createManualInvoice(
      body,
      caller.userId,
      caller.role
    );

    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Invoice']),
      data: invoice,
    };
  }

  /**
   * Kích hoạt thủ công mẻ quét sinh hóa đơn định kỳ (T-7).
   * Dành cho quản trị viên vận hành hệ thống (BUSINESS_OPS_MANAGER, SYSTEM_ADMIN).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('process-recurring')
  @SuccessResponse(200, 'Recurring Invoices Processed Successfully')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async processRecurringInvoices(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<RecurringInvoiceScanResult>> {
    const caller = extractCaller(req);
    if (
      caller.role !== RoleEnum.SYSTEM_ADMIN &&
      caller.role !== RoleEnum.BUSINESS_OPS_MANAGER
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const result = await this.invoiceService.processRecurringInvoicesScan();

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }

  /**
   * Kích hoạt thủ công mẻ quét hóa đơn quá hạn sau thời gian ân hạn (3 ngày).
   * Dành cho quản trị viên vận hành hệ thống (BUSINESS_OPS_MANAGER, SYSTEM_ADMIN).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('process-overdue')
  @SuccessResponse(200, 'Overdue Invoices Processed Successfully')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async processOverdueInvoices(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<OverdueInvoiceScanResult>> {
    const caller = extractCaller(req);
    if (
      caller.role !== RoleEnum.SYSTEM_ADMIN &&
      caller.role !== RoleEnum.BUSINESS_OPS_MANAGER
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const result = await this.invoiceService.processOverdueInvoicesScan();

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }

  /**
   * Kích hoạt thủ công mẻ nhắc hạn thanh toán hóa đơn (T-3, T-1, T-0).
   * Dành cho quản trị viên vận hành hệ thống (BUSINESS_OPS_MANAGER, SYSTEM_ADMIN).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('process-reminders')
  @SuccessResponse(200, 'Payment Reminders Processed Successfully')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async processPaymentReminders(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<RemindInvoicesScanResult>> {
    const caller = extractCaller(req);
    if (
      caller.role !== RoleEnum.SYSTEM_ADMIN &&
      caller.role !== RoleEnum.BUSINESS_OPS_MANAGER
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const result = await this.invoiceService.processPaymentRemindersScan();

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }

  /**
   * View invoice details by ID.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('{id}')
  @Middlewares(validateRequest({ params: invoiceIdParamSchema }))
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Invoice Not Found')
  public async getInvoiceById(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<InvoiceResponse>> {
    const caller = extractCaller(req);
    const invoice = await this.invoiceService.getInvoiceById(
      id,
      caller.userId,
      caller.role
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: invoice,
    };
  }

  /**
   * Xuất hóa đơn định dạng ISO A4 chuẩn pháp lý (HTML printable kèm mã VietQR).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('{id}/pdf')
  @Middlewares(validateRequest({ params: invoiceIdParamSchema }))
  @SuccessResponse(200, 'Invoice PDF Exported Successfully')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Invoice Not Found')
  public async getInvoicePdf(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<InvoicePdfResponse>> {
    const caller = extractCaller(req);
    const result = await this.invoiceService.getInvoicePdf(
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
   * Create or retrieve active SePay VietQR payment link for this invoice.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/payments')
  @Middlewares(validateRequest({ params: invoiceIdParamSchema }))
  @SuccessResponse(201, 'Invoice Payment Created Successfully')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Invoice Not Found')
  public async createInvoicePayment(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<PaymentResponse>> {
    const caller = extractCaller(req);
    const paymentService = this.getPaymentService();
    if (!paymentService) {
      throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106, [
        'PaymentService not available',
      ]);
    }

    const payment = await paymentService.createPayment(
      caller.userId,
      caller.role,
      {
        purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
        invoiceId: id,
      }
    );

    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Payment']),
      data: payment,
    };
  }

  /**
   * Confirm manual payment at counter (CASH or BANK_TRANSFER).
   * Enforces Maker-Checker and proof receipt requirement.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/confirm-manual')
  @Middlewares(
    validateRequest({
      params: invoiceIdParamSchema,
      body: confirmManualInvoicePaymentSchema,
    })
  )
  @SuccessResponse(200, 'Payment Confirmed Successfully')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Invoice Not Found')
  public async confirmManualPayment(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: ConfirmManualInvoicePaymentRequest
  ): Promise<ApiResponse<InvoiceResponse>> {
    const caller = extractCaller(req);
    const invoice = await this.invoiceService.confirmManualPayment(
      id,
      body,
      caller.userId,
      caller.role
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: invoice,
    };
  }

  /**
   * Cancel an ISSUED or OVERDUE invoice.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/cancel')
  @Middlewares(
    validateRequest({
      params: invoiceIdParamSchema,
      body: cancelInvoiceSchema,
    })
  )
  @SuccessResponse(200, 'Invoice Cancelled Successfully')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Invoice Not Found')
  public async cancelInvoice(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CancelInvoiceRequest
  ): Promise<ApiResponse<InvoiceResponse>> {
    const caller = extractCaller(req);
    const invoice = await this.invoiceService.cancelInvoice(
      id,
      body.reason,
      caller.userId,
      caller.role
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: invoice,
    };
  }
}
