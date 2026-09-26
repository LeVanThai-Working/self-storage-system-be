import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Queries,
  Path,
  SuccessResponse,
  Response,
  Security,
  Middlewares,
  Request,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { FacilityService } from './facility.service.ts';
import type { IUser } from '../user/user.model.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createFacilitySchema,
  updateFacilitySchema,
  facilityIdParamSchema,
  facilityQuerySchema,
  assignManagerSchema,
  type CreateFacilityRequest,
  type UpdateFacilityRequest,
  type FacilityQuery,
  type AssignManagerRequest,
} from './schemas/facility.request.schema.ts';
import type { FacilityResponse } from './schemas/facility.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

@Tags('Facilities')
@Route('facilities')
export class FacilityController extends Controller {
  constructor(private readonly facilityService: FacilityService) {
    super();
  }

  @Get('')
  @Middlewares(validateRequest({ query: facilityQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  public async findAllFacility(
    @Queries() query: FacilityQuery
  ): Promise<ApiResponse<PaginatedData<FacilityResponse>>> {
    const { items, pagination } =
      await this.facilityService.findAllFacility(query);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: { items, pagination },
    };
  }

  @Get('{id}')
  @Middlewares(validateRequest({ params: facilityIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'Facility not found')
  public async findFacilityById(
    @Path() id: string
  ): Promise<ApiResponse<FacilityResponse>> {
    const facility = await this.facilityService.findFacilityById(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: facility,
    };
  }

  @Post('')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @SuccessResponse(201, 'Facility created successfully')
  @Middlewares(validateRequest({ body: createFacilitySchema }))
  @Response<ApiErrorResponse>(
    400,
    'Validation error or facility already exists'
  )
  public async createFacility(
    @Body() body: CreateFacilityRequest
  ): Promise<ApiResponse<FacilityResponse>> {
    const facility = await this.facilityService.createFacility(body);
    this.setStatus(201);

    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Facility']),
      data: facility,
    };
  }

  @Patch('{id}')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @Middlewares(
    validateRequest({
      params: facilityIdParamSchema,
      body: updateFacilitySchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Validation error or invalid ID')
  @Response<ApiErrorResponse>(404, 'Facility not found')
  public async updateFacility(
    @Path() id: string,
    @Body() body: UpdateFacilityRequest
  ): Promise<ApiResponse<FacilityResponse>> {
    const facility = await this.facilityService.updateFacility(id, body);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Facility']),
      data: facility,
    };
  }

  @Delete('{id}')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @Middlewares(validateRequest({ params: facilityIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'Facility not found')
  public async deleteFacility(
    @Path() id: string,
    @Request() req?: ExpressRequest
  ): Promise<ApiResponse<null>> {
    const deletedBy = (req?.user as IUser)?._id?.toString?.();
    await this.facilityService.deleteFacility(id, deletedBy);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_004,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_004, ['Facility']),
      data: null,
    };
  }

  @Patch('{id}/assign-manager')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @Middlewares(
    validateRequest({
      params: facilityIdParamSchema,
      body: assignManagerSchema,
    })
  )
  @Response<ApiErrorResponse>(
    400,
    'Invalid ID or user is not a Facility Manager'
  )
  @Response<ApiErrorResponse>(404, 'Facility or Manager not found')
  public async assignManager(
    @Path() id: string,
    @Body() body: AssignManagerRequest
  ): Promise<ApiResponse<FacilityResponse>> {
    const facility = await this.facilityService.assignManager(id, body);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Facility']),
      data: facility,
    };
  }
}
