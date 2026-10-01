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
  // Security,
  Middlewares,
  Request,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { FacilityAmenityOfferingService } from './facilityAmenityOffering.service.ts';
import type { IUser } from '../user/user.model.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createFacilityAmenityOfferingSchema,
  updateFacilityAmenityOfferingSchema,
  facilityAmenityOfferingIdParamSchema,
  facilityOnlyIdParamSchema,
  facilityAmenityOfferingQuerySchema,
  facilityAmenityLookupParamSchema,
  type CreateFacilityAmenityOfferingRequest,
  type UpdateFacilityAmenityOfferingRequest,
  type FacilityAmenityOfferingQuery,
} from './schemas/facilityAmenityOffering.request.schema.ts';
import type { FacilityAmenityOfferingResponse } from './schemas/facilityAmenityOffering.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

@Tags('Facility Amenity Offerings')
@Route('facility-amenity-offerings')
export class FacilityAmenityOfferingController extends Controller {
  constructor(
    private readonly offeringService: FacilityAmenityOfferingService
  ) {
    super();
  }

  @Get('')
  @Middlewares(validateRequest({ query: facilityAmenityOfferingQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  public async getOfferings(
    @Queries() query: FacilityAmenityOfferingQuery
  ): Promise<ApiResponse<PaginatedData<FacilityAmenityOfferingResponse>>> {
    const { items, pagination } =
      await this.offeringService.getOfferings(query);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: { items, pagination },
    };
  }

  @Get('facility/{facilityId}/available')
  @Middlewares(validateRequest({ params: facilityOnlyIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid Facility ID')
  @Response<ApiErrorResponse>(404, 'Facility not found')
  public async getAvailableOfferings(
    @Path() facilityId: string
  ): Promise<ApiResponse<FacilityAmenityOfferingResponse[]>> {
    const offerings =
      await this.offeringService.getAvailableOfferings(facilityId);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: offerings,
    };
  }

  @Get('facility/{facilityId}/amenity/{amenityId}')
  @Middlewares(validateRequest({ params: facilityAmenityLookupParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid parameters format')
  @Response<ApiErrorResponse>(404, 'Facility Amenity Offering not found')
  public async getOfferingByFacilityAndAmenity(
    @Path() facilityId: string,
    @Path() amenityId: string
  ): Promise<ApiResponse<FacilityAmenityOfferingResponse>> {
    const offering = await this.offeringService.getOfferingByFacilityAndAmenity(
      facilityId,
      amenityId
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: offering,
    };
  }

  @Get('{id}')
  @Middlewares(
    validateRequest({ params: facilityAmenityOfferingIdParamSchema })
  )
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'Facility Amenity Offering not found')
  public async getOfferingById(
    @Path() id: string
  ): Promise<ApiResponse<FacilityAmenityOfferingResponse>> {
    const offering = await this.offeringService.getOfferingById(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: offering,
    };
  }

  @Post('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER, FACILITY_MANAGER
  @SuccessResponse(201, 'Facility amenity offering created successfully')
  @Middlewares(validateRequest({ body: createFacilityAmenityOfferingSchema }))
  @Response<ApiErrorResponse>(
    400,
    'Validation error or offering already exists'
  )
  public async createOffering(
    @Body() body: CreateFacilityAmenityOfferingRequest
  ): Promise<ApiResponse<FacilityAmenityOfferingResponse>> {
    const offering = await this.offeringService.createOffering(body);
    this.setStatus(201);

    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, [
        'Facility Amenity Offering',
      ]),
      data: offering,
    };
  }

  @Patch('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER, FACILITY_MANAGER
  @Middlewares(
    validateRequest({
      params: facilityAmenityOfferingIdParamSchema,
      body: updateFacilityAmenityOfferingSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Validation error or invalid ID')
  @Response<ApiErrorResponse>(404, 'Facility Amenity Offering not found')
  public async updateOffering(
    @Path() id: string,
    @Body() body: UpdateFacilityAmenityOfferingRequest
  ): Promise<ApiResponse<FacilityAmenityOfferingResponse>> {
    const offering = await this.offeringService.updateOffering(id, body);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Facility Amenity Offering',
      ]),
      data: offering,
    };
  }

  @Delete('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Middlewares(
    validateRequest({ params: facilityAmenityOfferingIdParamSchema })
  )
  @Response<ApiErrorResponse>(400, 'Invalid ID format or items in use')
  @Response<ApiErrorResponse>(404, 'Facility Amenity Offering not found')
  public async deleteOffering(
    @Path() id: string,
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<null>> {
    const user = req.user as IUser | undefined;
    const deletedBy = user?._id ? String(user._id) : undefined;

    await this.offeringService.deleteOffering(id, deletedBy);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_004,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_004, [
        'Facility Amenity Offering',
      ]),
      data: null,
    };
  }

  @Post('{id}/restore')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Middlewares(
    validateRequest({ params: facilityAmenityOfferingIdParamSchema })
  )
  @Response<ApiErrorResponse>(400, 'Offering is not deleted or invalid ID')
  @Response<ApiErrorResponse>(404, 'Facility Amenity Offering not found')
  public async restoreOffering(
    @Path() id: string
  ): Promise<ApiResponse<FacilityAmenityOfferingResponse>> {
    const offering = await this.offeringService.restoreOffering(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Facility Amenity Offering',
      ]),
      data: offering,
    };
  }
}
