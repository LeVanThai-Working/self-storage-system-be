import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Body,
  Queries,
  Path,
  Response,
  // Security,
  Middlewares,
  Request,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type {
  InventoryRequestService,
  CallerContext,
} from './inventoryRequest.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import {
  createOutboundRequestSchema,
  verifyPickupCodeSchema,
  completeOutboundHandoverSchema,
  cancelOutboundRequestSchema,
  createInboundRequestSchema,
  disputeInboundRequestSchema,
  putawayInboundRequestSchema,
  inventoryRequestIdParamSchema,
  inventoryRequestQuerySchema,
  type CreateOutboundRequest,
  type VerifyPickupCodeRequest,
  type CompleteOutboundHandoverRequest,
  type CancelOutboundRequest,
  type CreateInboundRequest,
  type DisputeInboundRequest,
  type PutawayInboundRequest,
  type InventoryRequestQuery,
} from './schemas/inventoryRequest.request.schema.ts';
import type {
  InventoryRequestResponse,
  VerifiedHandoverDetailsResponse,
  PaginatedInventoryRequestResponse,
} from './schemas/inventoryRequest.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';

function extractCaller(req: ExpressRequest): CallerContext {
  const user = req.user as
    | {
        _id?: { toString(): string };
        role?: string;
        assignedFacilityId?: { toString(): string };
      }
    | undefined;

  if (user?._id) {
    return {
      id: user._id.toString(),
      role: user.role,
      assignedFacilityId: user.assignedFacilityId?.toString(),
    };
  }

  const headerUserId = req.headers['x-user-id'] as string;
  const headerRole = req.headers['x-user-role'] as string;
  const headerFacilityId = req.headers['x-facility-id'] as string;
  if (headerUserId) {
    return {
      id: headerUserId,
      role: headerRole,
      assignedFacilityId: headerFacilityId,
    };
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwtUtil.verifyAccessToken(authHeader.split(' ')[1]) as {
        userId?: string;
        role?: string;
        assignedFacilityId?: string;
      };
      if (payload?.userId) {
        return {
          id: payload.userId,
          role: payload.role,
          assignedFacilityId: payload.assignedFacilityId,
        };
      }
    } catch {
      // ignore
    }
  }

  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    try {
      const payload = jwtUtil.verifyAccessToken(cookieToken) as {
        userId?: string;
        role?: string;
        assignedFacilityId?: string;
      };
      if (payload?.userId) {
        return {
          id: payload.userId,
          role: payload.role,
          assignedFacilityId: payload.assignedFacilityId,
        };
      }
    } catch {
      // ignore
    }
  }

  throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
}

@Tags('Customer Inventory Request (Dual Handshake)')
@Route('customer-inventories')
export class InventoryRequestController extends Controller {
  constructor(
    private readonly inventoryRequestService: InventoryRequestService
  ) {
    super();
  }

  /**
   * 1. Customer creates an Outbound (Stock Out) Request
   * Generates One-Time Pickup QR token and HMAC-SHA256 hashed OTP
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('outbound-requests')
  @Middlewares(validateRequest({ body: createOutboundRequestSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async createOutboundRequest(
    @Request() req: ExpressRequest,
    @Body() body: CreateOutboundRequest
  ): Promise<ApiResponse<InventoryRequestResponse>> {
    const caller = extractCaller(req);
    const created = await this.inventoryRequestService.createOutboundRequest(
      body,
      caller
    );

    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, [
        'Outbound Request',
      ]),
      data: created,
    };
  }

  /**
   * 2. Staff verifies Pickup QR Code or OTP (Opens Handover Details & transitions to PROCESSING)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER
  @Post('verify-pickup-code')
  @Middlewares(validateRequest({ body: verifyPickupCodeSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid or expired code')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  public async verifyPickupCode(
    @Request() req: ExpressRequest,
    @Body() body: VerifyPickupCodeRequest
  ): Promise<ApiResponse<VerifiedHandoverDetailsResponse>> {
    const caller = extractCaller(req);
    const result = await this.inventoryRequestService.verifyPickupCode(
      body,
      caller
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
   * 3. Staff completes Outbound Handover (Atomic deduction, movement logging, tier sync)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER
  @Post('outbound-requests/{id}/complete')
  @Middlewares(
    validateRequest({
      params: inventoryRequestIdParamSchema,
      body: completeOutboundHandoverSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  public async completeOutboundHandover(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CompleteOutboundHandoverRequest
  ): Promise<ApiResponse<InventoryRequestResponse>> {
    const caller = extractCaller(req);
    const completed =
      await this.inventoryRequestService.completeOutboundHandover(
        id,
        body,
        caller
      );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Outbound Handover',
      ]),
      data: completed,
    };
  }

  /**
   * 4. Customer cancels Outbound Request (Only allowed when PENDING)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('outbound-requests/{id}/cancel')
  @Middlewares(
    validateRequest({
      params: inventoryRequestIdParamSchema,
      body: cancelOutboundRequestSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Cannot cancel request')
  public async cancelOutboundRequest(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CancelOutboundRequest
  ): Promise<ApiResponse<InventoryRequestResponse>> {
    const caller = extractCaller(req);
    const cancelled = await this.inventoryRequestService.cancelOutboundRequest(
      id,
      caller,
      body.reason
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Outbound Request',
      ]),
      data: cancelled,
    };
  }

  /**
   * 5. Staff assists Inbound delivery receipt (Creates request in Staging Area with 3 evidence images)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER
  @Post('inbound-requests')
  @Middlewares(validateRequest({ body: createInboundRequestSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  public async createInboundRequest(
    @Request() req: ExpressRequest,
    @Body() body: CreateInboundRequest
  ): Promise<ApiResponse<InventoryRequestResponse>> {
    const caller = extractCaller(req);
    const created = await this.inventoryRequestService.createInboundRequest(
      body,
      caller
    );

    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, [
        'Inbound Receipt Request',
      ]),
      data: created,
    };
  }

  /**
   * 6. Customer confirms Inbound receipt
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('inbound-requests/{id}/confirm')
  @Middlewares(validateRequest({ params: inventoryRequestIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  public async confirmInboundRequest(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<InventoryRequestResponse>> {
    const caller = extractCaller(req);
    const confirmed = await this.inventoryRequestService.confirmInboundRequest(
      id,
      caller
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Inbound Confirmation',
      ]),
      data: confirmed,
    };
  }

  /**
   * 7. Customer disputes Inbound delivery
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('inbound-requests/{id}/dispute')
  @Middlewares(
    validateRequest({
      params: inventoryRequestIdParamSchema,
      body: disputeInboundRequestSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  public async disputeInboundRequest(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: DisputeInboundRequest
  ): Promise<ApiResponse<InventoryRequestResponse>> {
    const caller = extractCaller(req);
    const disputed = await this.inventoryRequestService.disputeInboundRequest(
      id,
      caller,
      body.disputeReason
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Inbound Request Disputed',
      ]),
      data: disputed,
    };
  }

  /**
   * 8. Staff performs Putaway (moves goods from staging area onto shelf tiers)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER
  @Post('inbound-requests/{id}/putaway')
  @Middlewares(
    validateRequest({
      params: inventoryRequestIdParamSchema,
      body: putawayInboundRequestSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  public async putawayInboundRequest(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: PutawayInboundRequest
  ): Promise<ApiResponse<InventoryRequestResponse>> {
    const caller = extractCaller(req);
    const putawayResult =
      await this.inventoryRequestService.putawayInboundRequest(
        id,
        body,
        caller
      );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Inbound Putaway Placement',
      ]),
      data: putawayResult,
    };
  }

  /**
   * 9. Query Paginated Inventory Requests
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('requests')
  @Middlewares(validateRequest({ query: inventoryRequestQuerySchema }))
  public async getRequests(
    @Request() req: ExpressRequest,
    @Queries() query: InventoryRequestQuery
  ): Promise<ApiResponse<PaginatedInventoryRequestResponse>> {
    const caller = extractCaller(req);
    const result = await this.inventoryRequestService.findPaginatedRequests(
      query,
      caller
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
   * 10. Process Auto-Accept for Inbound Requests older than 24h (Cron / Batch job)
   * Note: Placed before dynamic path param '{id}' to avoid route collisions.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Post('requests/process-auto-accept')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async processAutoAccept(): Promise<
    ApiResponse<{ processedCount: number }>
  > {
    const count =
      await this.inventoryRequestService.autoAcceptInboundRequests();

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: { processedCount: count },
    };
  }

  /**
   * 11. Get Single Request Details
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('requests/{id}')
  @Middlewares(validateRequest({ params: inventoryRequestIdParamSchema }))
  @Response<ApiErrorResponse>(404, 'Request Not Found')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  public async getRequestById(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<InventoryRequestResponse>> {
    const caller = extractCaller(req);
    const request = await this.inventoryRequestService.getRequestById(
      id,
      caller
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: request,
    };
  }
}
