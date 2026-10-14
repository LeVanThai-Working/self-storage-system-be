import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Path,
  SuccessResponse,
  Response,
  // Security,
  Middlewares,
  Request,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { FacilityTimeSlotService } from './facilityTimeSlot.service.ts';
import type { IUser } from '../user/user.model.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createFacilityTimeSlotSchema,
  updateFacilityTimeSlotSchema,
  timeSlotIdParamSchema,
  facilityIdParamSchema,
  availableTimeSlotsQuerySchema,
  type CreateFacilityTimeSlotRequest,
  type UpdateFacilityTimeSlotRequest,
} from './schemas/facilityTimeSlot.request.schema.ts';
import type {
  FacilityTimeSlotResponse,
  AvailableTimeSlotItemResponse,
} from './schemas/facilityTimeSlot.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';

function extractCaller(req: ExpressRequest): { userId?: string } {
  const expressUser = req.user as IUser | undefined;
  if (expressUser?._id) {
    return { userId: String(expressUser._id) };
  }
  const headerUserId = req.headers['x-user-id'];
  if (typeof headerUserId === 'string' && headerUserId.trim()) {
    return { userId: headerUserId.trim() };
  }
  return {};
}

@Tags('Facility Time Slots')
@Route('facility-time-slots')
export class FacilityTimeSlotController extends Controller {
  constructor(private readonly timeSlotService: FacilityTimeSlotService) {
    super();
  }

  /**
   * Get available check-in time slots and remaining capacity for a specific date in a facility
   */
  @Get('facility/{facilityId}/available')
  @Middlewares(
    validateRequest({
      params: facilityIdParamSchema,
      query: availableTimeSlotsQuerySchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Facility Not Found')
  public async getAvailableSlots(
    @Path() facilityId: string,
    @Query() date: string
  ): Promise<ApiResponse<AvailableTimeSlotItemResponse[]>> {
    const data = await this.timeSlotService.getAvailableSlots(facilityId, date);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * Get all time slots configured for a facility (Manager/Admin view)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, SYSTEM_ADMIN
  @Get('facility/{facilityId}')
  @Middlewares(validateRequest({ params: facilityIdParamSchema }))
  @SuccessResponse(200, 'Success')
  public async getSlotsByFacility(
    @Path() facilityId: string
  ): Promise<ApiResponse<FacilityTimeSlotResponse[]>> {
    const data = await this.timeSlotService.getSlotsByFacility(facilityId);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * Create a new check-in time slot for a facility
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, SYSTEM_ADMIN
  @Post('')
  @Middlewares(validateRequest({ body: createFacilityTimeSlotSchema }))
  @SuccessResponse(201, 'Created')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  public async createTimeSlot(
    @Body() body: CreateFacilityTimeSlotRequest
  ): Promise<ApiResponse<FacilityTimeSlotResponse>> {
    const data = await this.timeSlotService.createTimeSlot(body);
    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Time Slot']),
      data,
    };
  }

  /**
   * Update an existing time slot
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, SYSTEM_ADMIN
  @Patch('{id}')
  @Middlewares(
    validateRequest({
      params: timeSlotIdParamSchema,
      body: updateFacilityTimeSlotSchema,
    })
  )
  @SuccessResponse(200, 'Updated')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Time Slot Not Found')
  public async updateTimeSlot(
    @Path() id: string,
    @Body() body: UpdateFacilityTimeSlotRequest
  ): Promise<ApiResponse<FacilityTimeSlotResponse>> {
    const data = await this.timeSlotService.updateTimeSlot(id, body);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Time Slot']),
      data,
    };
  }

  /**
   * Soft-delete a time slot
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, SYSTEM_ADMIN
  @Delete('{id}')
  @Middlewares(validateRequest({ params: timeSlotIdParamSchema }))
  @SuccessResponse(200, 'Deleted')
  @Response<ApiErrorResponse>(404, 'Time Slot Not Found')
  public async deleteTimeSlot(
    @Path() id: string,
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<null>> {
    const { userId } = extractCaller(req);
    await this.timeSlotService.deleteTimeSlot(id, userId);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_004,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_004, ['Time Slot']),
      data: null,
    };
  }
}
