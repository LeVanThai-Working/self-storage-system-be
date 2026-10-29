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
import { RoleEnum } from '../../common/enums/user.enum.ts';
import type { Request as ExpressRequest } from 'express';
import type { ReservationService } from './reservation.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import type { TokenPayload } from '../../utils/jwt.util.ts';
import {
  assignReservationStaffSchema,
  cancelReservationSchema,
  confirmRefundSchema,
  confirmReservationSchema,
  createReservationSchema,
  extendGracePeriodSchema,
  forceCancelReservationSchema,
  markCustomerArrivedSchema,
  reassignStorageUnitSchema,
  respondUnitReassignSchema,
  reservationIdParamSchema,
  reservationQuerySchema,
  type AssignReservationStaffRequest,
  type CancelReservationRequest,
  type ConfirmRefundRequest,
  type ConfirmReservationRequest,
  type CreateReservationRequest,
  type ExtendGracePeriodRequest,
  type ForceCancelReservationRequest,
  type MarkCustomerArrivedRequest,
  type ReassignStorageUnitRequest,
  type RespondUnitReassignRequest,
  type ReservationQuery,
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
      // ignore token verification error; will throw 401 below
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

@Tags('Reservations')
@Route('reservations')
export class ReservationController extends Controller {
  constructor(private readonly reservationService: ReservationService) {
    super();
  }

  /**
   * Create a new reservation in PENDING_PAYMENT status with hold timer (Customer).
   * Enforces minimum same-day preparation lead time (sameDayLeadMinutes, 400 MESSAGE_CODE_328),
   * maximum startDate offset from checkInDate (maxStartDateOffsetDays, 400 MESSAGE_CODE_329),
   * and flags immediateForfeitWarning when booking is within 24 hours of check-in.
   */
  @Post('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Middlewares(validateRequest({ body: createReservationSchema }))
  @SuccessResponse(201, 'Created')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
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
   * List reservations with pagination & scoping.
   */
  @Get('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ query: reservationQuerySchema }))
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
   * Batch process all expired reservations.
   */
  @Post('process-expired')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Response<ApiErrorResponse>(401, 'Unauthorized')
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
   * Batch process overdue check-ins and no-show auto cancellations.
   */
  @Post('process-overdue')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async processOverdueReservations(
    @Request() req: ExpressRequest
  ): Promise<
    ApiResponse<{
      overdueCount: number;
      noShowCount: number;
      unconfirmedCount: number;
    }>
  > {
    const caller = extractCaller(req);
    if (
      caller.role !== RoleEnum.SYSTEM_ADMIN &&
      caller.role !== RoleEnum.BUSINESS_OPS_MANAGER
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const result = await this.reservationService.processOverdueReservations();
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: {
        overdueCount: result.overdueCount,
        noShowCount: result.noShowCount,
        unconfirmedCount: result.unconfirmedCount,
      },
    };
  }

  /**
   * Get single reservation detail by ID.
   */
  @Get('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(validateRequest({ params: reservationIdParamSchema }))
  @Response<ApiErrorResponse>(404, 'Not Found')
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
   * Facility Manager reassigns a physical storage unit (for CONFIRMED, PAYMENT_SUCCESSFUL, or OVERDUE reservations) due to unexpected maintenance.
   */
  @Post('{id}/reassign-unit')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: reassignStorageUnitSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async reassignStorageUnit(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: ReassignStorageUnitRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.reassignStorageUnit(
      id,
      caller.userId,
      caller.role,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Storage Unit']),
      data: result,
    };
  }

  /**
   * Customer or Staff responds to a pending unit reassign proposal (accept or reject) [CHỐT D4].
   * - Accept: applies new unit, updates basePrice to upgraded price tier, frees old unit.
   * - Reject: cancels reservation as FACILITY_FAULT, releases both units, creates 100% deposit refund request.
   */
  @Post('{id}/respond-reassign')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: respondUnitReassignSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async respondUnitReassign(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: RespondUnitReassignRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.respondUnitReassign(
      id,
      caller,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        body.action === 'accept'
          ? 'Storage Unit Reassign Accepted'
          : 'Storage Unit Reassign Rejected',
      ]),
      data: result,
    };
  }

  /**
   * Facility Staff officially confirms reservation after deposit payment.
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
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async confirmReservation(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: ConfirmReservationRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.confirmReservation(
      id,
      caller.userId,
      caller.role,
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
   * Cancel reservation with refund policy enforcement (2-tier refund: >= 24h before check-in 100% refund, < 24h 0% refund; facility cannot cancel CONFIRMED/OVERDUE; blocks if active contract is linked).
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
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async cancelReservation(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CancelReservationRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.cancelReservation(
      id,
      caller.userId,
      caller.role,
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
   * Manager assigns or updates check-in reception staff.
   */
  @Post('{id}/assign-staff')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: assignReservationStaffSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async assignStaffToCheckIn(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: AssignReservationStaffRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.assignStaffToCheckIn(
      id,
      caller.userId,
      caller.role,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Assigned Staff']),
      data: result,
    };
  }

  /**
   * Facility Manager confirms deposit refund has been disbursed to customer (for CANCELLED or EXPIRED reservations with PENDING refund).
   */
  @Post('{id}/confirm-refund')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: confirmRefundSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async confirmRefund(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: ConfirmRefundRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.confirmRefund(
      id,
      caller.userId,
      caller.role,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Refund']),
      data: result,
    };
  }

  /**
   * Facility Manager / Business Ops Manager / System Admin force-cancels a reservation when storage unit is unavailable due to an incident.
   */
  @Post('{id}/force-cancel')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: forceCancelReservationSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async forceCancelReservation(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: ForceCancelReservationRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.forceCancelReservation(
      id,
      caller.userId,
      caller.role,
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
   * Facility Staff or Manager marks that customer has arrived at facility for check-in.
   */
  @Post('{id}/mark-arrived')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: markCustomerArrivedSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async markCustomerArrived(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body?: MarkCustomerArrivedRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.markCustomerArrived(
      id,
      caller,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Reservation Check-in Arrival',
      ]),
      data: result,
    };
  }

  /**
   * Facility Manager, Business Ops Manager, or System Admin extends check-in grace period for customer.
   */
  @Post('{id}/extend-grace')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Middlewares(
    validateRequest({
      params: reservationIdParamSchema,
      body: extendGracePeriodSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async extendGracePeriod(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: ExtendGracePeriodRequest
  ): Promise<ApiResponse<ReservationResponse>> {
    const caller = extractCaller(req);
    const result = await this.reservationService.extendGracePeriod(
      id,
      caller,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Reservation Grace Period',
      ]),
      data: result,
    };
  }
}
