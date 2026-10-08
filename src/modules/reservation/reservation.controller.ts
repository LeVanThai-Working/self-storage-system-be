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
  Middlewares,
  Request,
  Response,
  SuccessResponse,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { ReservationService } from './reservation.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import type { TokenPayload } from '../../utils/jwt.util.ts';
import {
  assignStorageUnitSchema,
  cancelReservationSchema,
  confirmReservationSchema,
  createReservationSchema,
  rejectReservationSchema,
  reservationIdParamSchema,
  reservationQuerySchema,
  updateReservationSchema,
  type AssignStorageUnitRequest,
  type CancelReservationRequest,
  type ConfirmReservationRequest,
  type CreateReservationRequest,
  type RejectReservationRequest,
  type ReservationQuery,
  type UpdateReservationRequest,
} from './schemas/reservation.request.schema.ts';
import type { ReservationResponse } from './schemas/reservation.response.schema.ts';
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

  // Fallback 1: x-user-id and x-user-role headers
  const headerUserId = req.headers['x-user-id'] as string | undefined;
  const headerUserRole = req.headers['x-user-role'] as string | undefined;
  if (headerUserId) {
    return {
      userId: headerUserId,
      role: headerUserRole || 'customer',
    };
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
      // ignore token verification error; will throw 401 below
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

@Tags('Reservations')
@Route('reservations')
export class ReservationController extends Controller {
  constructor(private readonly reservationService: ReservationService) {
    super();
  }

  /**
   * Create a new reservation in PENDING status (Customer).
   */
  @Post('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Middlewares(validateRequest({ body: createReservationSchema }))
  @SuccessResponse(201, 'Created')
  @Response<ApiErrorResponse>(
    400,
    'Invalid request data or insufficient inventory'
  )
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(404, 'Facility or Offering not found')
  public async createReservation(
    @Request() req: ExpressRequest,
    @Body() body: CreateReservationRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.createReservation(
      caller.userId,
      body
    );

    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Reservation']),
      data: result,
    };
  }

  /**
   * Get paginated list of reservations.
   * Customers only see their own reservations.
   * Staff/Managers can filter across facilities.
   */
  @Get('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ query: reservationQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async getReservations(
    @Request() req: ExpressRequest,
    @Queries() query: ReservationQuery
  ): Promise<ApiResponse<PaginatedData<ReservationResponse>>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.getReservations(
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
   * Process and expire overdue holding reservations (Cron/Admin).
   * Note: Placed before dynamic path param '{id}' to prevent route collision.
   */
  @Post('process-expired')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async processExpiredReservations(): Promise<
    ApiResponse<{ processedCount: number }>
  > {
    const result = await this.reservationService.processExpiredReservations();

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }

  /**
   * Get detailed reservation by ID.
   */
  @Get('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ params: reservationIdParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Reservation not found')
  public async getReservationById(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.getReservationById(
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
   * Update reservation details (Customer, only allowed while in PENDING status).
   */
  @Patch('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: updateReservationSchema,
    })
  )
  @Response<ApiErrorResponse>(
    400,
    'Invalid state or reservation already received'
  )
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Reservation not found')
  public async updateReservation(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: UpdateReservationRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.updateReservation(
      id,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Reservation']),
      data: result,
    };
  }

  /**
   * Facility Manager marks reservation as received (PENDING -> RECEIVED).
   * Locks the reservation from customer updates.
   */
  @Post('{id}/receive')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ params: reservationIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid reservation status transition')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Reservation not found')
  public async receiveReservation(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.receiveReservation(
      id,
      caller.userId
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Reservation']),
      data: result,
    };
  }

  /**
   * Facility Manager assigns a physical storage unit and locks inventory (RECEIVED -> PENDING_PAYMENT).
   */
  @Post('{id}/assign-unit')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: assignStorageUnitSchema,
    })
  )
  @Response<ApiErrorResponse>(
    400,
    'Unit not available, invalid status, or concurrency conflict'
  )
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Reservation or Storage unit not found')
  public async assignStorageUnit(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: AssignStorageUnitRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.assignStorageUnit(
      id,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Reservation']),
      data: result,
    };
  }

  /**
   * Facility Manager rejects reservation (REJECTED).
   */
  @Post('{id}/reject')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: rejectReservationSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Invalid reservation status transition')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Reservation not found')
  public async rejectReservation(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: RejectReservationRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.rejectReservation(
      id,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Reservation']),
      data: result,
    };
  }

  /**
   * Customer retries deposit payment after failure (PAYMENT_FAILED -> PENDING_PAYMENT).
   */
  @Post('{id}/retry-payment')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Middlewares(validateRequest({ params: reservationIdParamSchema }))
  @Response<ApiErrorResponse>(
    400,
    'Holding expired or invalid reservation status'
  )
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Reservation not found')
  public async retryPayment(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.retryPayment(
      id,
      caller.userId
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Reservation']),
      data: result,
    };
  }

  /**
   * Confirm reservation after successful deposit (Staff/Manager: PAYMENT_SUCCESSFUL -> CONFIRMED).
   */
  @Post('{id}/confirm')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: confirmReservationSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Deposit not paid or invalid status')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Reservation not found')
  public async confirmReservation(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: ConfirmReservationRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.confirmReservation(
      id,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Reservation']),
      data: result,
    };
  }

  /**
   * Cancel reservation (CANCELLED).
   * Calculates deposit refund (100% before CONFIRMED, 0% after CONFIRMED) and releases unit/amenities.
   */
  @Post('{id}/cancel')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: cancelReservationSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Reservation cannot be cancelled')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Reservation not found')
  public async cancelReservation(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CancelReservationRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.cancelReservation(
      id,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Reservation']),
      data: result,
    };
  }

  /**
   * Mark reservation as completed (Staff/Manager: CONFIRMED -> COMPLETED).
   */
  @Post('{id}/complete')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ params: reservationIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid status transition')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Reservation not found')
  public async completeReservation(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.completeReservation(
      id,
      caller.userId
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Reservation']),
      data: result,
    };
  }
}
