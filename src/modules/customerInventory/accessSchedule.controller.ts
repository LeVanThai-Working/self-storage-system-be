import {
  Controller,
  Route,
  Tags,
  Post,
  Get,
  Body,
  Path,
  Query,
  Middlewares,
  Request,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { AccessScheduleService } from './accessSchedule.service.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  assignAccessScheduleSchema,
  unassignAccessScheduleSchema,
  type AssignAccessScheduleRequest,
  type UnassignAccessScheduleRequest,
  createAccessScheduleSchema,
  checkInAccessScheduleSchema,
  checkOutAccessScheduleSchema,
  cancelAccessScheduleSchema,
  availableAccessSlotsQuerySchema,
  accessScheduleQuerySchema,
  accessScheduleIdParamSchema,
  type CreateAccessScheduleRequest,
  type CheckInAccessScheduleRequest,
  type CheckOutAccessScheduleRequest,
  type CancelAccessScheduleRequest,
  type AccessScheduleQuery,
} from './schemas/accessSchedule.request.schema.ts';
import type {
  AccessScheduleDetailResponse,
  AccessScheduleCheckInResponse,
  AvailableAccessSlotResponse,
  AccessScheduleListItemResponse,
} from './schemas/accessSchedule.response.schema.ts';
import type { ApiResponse } from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { AccessScheduleStatusEnum } from '../../common/enums/customerInventory.enum.ts';
import { AppError } from '../../common/errors/appError.error.ts';

export interface CallerContext {
  userId: string;
  role: RoleEnum;
  assignedFacilityId?: string | null;
}

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
      userId: user._id.toString(),
      role: (user.role as RoleEnum) || RoleEnum.CUSTOMER,
      assignedFacilityId: user.assignedFacilityId?.toString(),
    };
  }

  // Header x-user-id fallback for testing / development (Rule 14)
  const headerUserId = req.headers['x-user-id'] as string;
  const headerRole = req.headers['x-user-role'] as string;
  const headerFacilityId = req.headers['x-facility-id'] as string;
  if (
    headerUserId &&
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_INSECURE_CALLER_FALLBACK === 'true'
  ) {
    return {
      userId: headerUserId,
      role: (headerRole as RoleEnum) || RoleEnum.CUSTOMER,
      assignedFacilityId: headerFacilityId,
    };
  }

  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ALLOW_INSECURE_CALLER_FALLBACK !== 'true'
  )
    throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwtUtil.verifyAccessToken(authHeader.split(' ')[1]) as {
        userId?: string;
        role?: string;
      };
      if (payload?.userId) {
        return {
          userId: payload.userId,
          role: (payload.role as RoleEnum) || RoleEnum.CUSTOMER,
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
      };
      if (payload?.userId) {
        return {
          userId: payload.userId,
          role: (payload.role as RoleEnum) || RoleEnum.CUSTOMER,
        };
      }
    } catch {
      // ignore
    }
  }

  throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
}

@Route('access-schedules')
@Tags('Access Schedules')
export class AccessScheduleController extends Controller {
  constructor(private readonly accessScheduleService: AccessScheduleService) {
    super();
  }

  /**
   * 1. Register a new Access Schedule to visit the warehouse rack
   * Customer books an access time slot and receives a 6-digit OTP
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('')
  @Middlewares(validateRequest({ body: createAccessScheduleSchema }))
  public async createAccessSchedule(
    @Request() req: ExpressRequest,
    @Body() body: CreateAccessScheduleRequest
  ): Promise<ApiResponse<AccessScheduleDetailResponse>> {
    const caller = extractCaller(req);
    const data = await this.accessScheduleService.createAccessSchedule(
      body,
      caller
    );

    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * 2. Get available access slots for a facility on a specific date
   */
  @Get('available-slots')
  @Middlewares(validateRequest({ query: availableAccessSlotsQuerySchema }))
  public async getAvailableSlots(
    @Query() facilityId: string,
    @Query() date: string
  ): Promise<ApiResponse<AvailableAccessSlotResponse[]>> {
    const data = await this.accessScheduleService.getAvailableSlots({
      facilityId,
      date,
    });

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * 3. Responsible staff verifies check-in using a 6-digit OTP
   * Opens gate and returns rented rack locations and vehicle info for loading bay direction
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF
  @Post('check-in')
  @Middlewares(validateRequest({ body: checkInAccessScheduleSchema }))
  public async checkIn(
    @Request() req: ExpressRequest,
    @Body() body: CheckInAccessScheduleRequest
  ): Promise<ApiResponse<AccessScheduleCheckInResponse>> {
    const caller = extractCaller(req);
    const data = await this.accessScheduleService.checkIn(body, caller);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: data.message,
      data,
    };
  }

  /**
   * 4. The same staff checks out the departing customer
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF
  @Post('{id}/check-out')
  @Middlewares(
    validateRequest({
      params: accessScheduleIdParamSchema,
      body: checkOutAccessScheduleSchema,
    })
  )
  public async checkOut(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CheckOutAccessScheduleRequest
  ): Promise<ApiResponse<AccessScheduleDetailResponse>> {
    const caller = extractCaller(req);
    const data = await this.accessScheduleService.checkOut(id, body, caller);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * 5. Customer cancels scheduled visit (at least 1 hour before start time)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/cancel')
  @Middlewares(
    validateRequest({
      params: accessScheduleIdParamSchema,
      body: cancelAccessScheduleSchema,
    })
  )
  public async cancelSchedule(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CancelAccessScheduleRequest
  ): Promise<ApiResponse<AccessScheduleDetailResponse>> {
    const caller = extractCaller(req);
    const data = await this.accessScheduleService.cancelSchedule(
      id,
      body,
      caller
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * 6. Scan and mark overdue pending access schedules as NO_SHOW (Ops/Admin or Cron)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('process-no-show')
  public async processNoShowScan(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<{ processedCount: number }>> {
    const caller = extractCaller(req);
    if (
      caller.role !== RoleEnum.BUSINESS_OPS_MANAGER &&
      caller.role !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const processedCount = await this.accessScheduleService.processNoShowScan();

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: { processedCount },
    };
  }

  /**
   * 7. Query Access Schedules with Scoped RBAC
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('')
  @Middlewares(validateRequest({ query: accessScheduleQuerySchema }))
  public async getSchedules(
    @Request() req: ExpressRequest,
    @Query() page: number = 1,
    @Query() limit: number = 10,
    @Query() sortBy?: string,
    @Query() sortOrder?: 'asc' | 'desc',
    @Query() facilityId?: string,
    @Query() customerId?: string,
    @Query() contractId?: string,
    @Query() status?: string,
    @Query() startDate?: string,
    @Query() endDate?: string,
    @Query() assignmentScope?: 'unassigned' | 'mine' | 'all'
  ): Promise<ApiResponse<PaginatedData<AccessScheduleListItemResponse>>> {
    const caller = extractCaller(req);
    const query: AccessScheduleQuery = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      sortBy: sortBy || 'createdAt',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      facilityId,
      customerId,
      contractId,
      status: status as AccessScheduleStatusEnum | undefined,
      startDate,
      endDate,
      assignmentScope,
    };

    const data = await this.accessScheduleService.getSchedules(query, caller);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  // @Security('bearerAuth')
  // TODO: Role authorization: FACILITY_STAFF
  @Post('{id}/claim')
  @Middlewares(validateRequest({ params: accessScheduleIdParamSchema }))
  public async claim(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<AccessScheduleDetailResponse>> {
    const data = await this.accessScheduleService.assignSchedule(
      id,
      null,
      extractCaller(req)
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }
  // @Security('bearerAuth')
  // TODO: Role authorization: FACILITY_MANAGER
  @Post('{id}/assign')
  @Middlewares(
    validateRequest({
      params: accessScheduleIdParamSchema,
      body: assignAccessScheduleSchema,
    })
  )
  public async assign(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: AssignAccessScheduleRequest
  ): Promise<ApiResponse<AccessScheduleDetailResponse>> {
    const data = await this.accessScheduleService.assignSchedule(
      id,
      body,
      extractCaller(req)
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }
  // @Security('bearerAuth')
  // TODO: Role authorization: FACILITY_MANAGER
  @Post('{id}/unassign')
  @Middlewares(
    validateRequest({
      params: accessScheduleIdParamSchema,
      body: unassignAccessScheduleSchema,
    })
  )
  public async unassign(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: UnassignAccessScheduleRequest
  ): Promise<ApiResponse<AccessScheduleDetailResponse>> {
    const data = await this.accessScheduleService.unassignSchedule(
      id,
      body,
      extractCaller(req)
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }
  /**
   * 8. Get Access Schedule detail by ID
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('{id}')
  @Middlewares(validateRequest({ params: accessScheduleIdParamSchema }))
  public async getScheduleById(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<AccessScheduleDetailResponse>> {
    const caller = extractCaller(req);
    const data = await this.accessScheduleService.getScheduleById(id, caller);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }
}
