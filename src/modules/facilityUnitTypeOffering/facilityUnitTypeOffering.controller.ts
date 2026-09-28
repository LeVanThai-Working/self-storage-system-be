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
import type { FacilityUnitTypeOfferingService } from './facilityUnitTypeOffering.service.ts';
import type { IUser } from '../user/user.model.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createOfferingSchema,
  updateOfferingSchema,
  offeringIdParamSchema,
  offeringQuerySchema,
  facilityUnitTypeParamSchema,
  type CreateOfferingRequest,
  type UpdateOfferingRequest,
  type OfferingQuery,
} from './schemas/facilityUnitTypeOffering.request.schema.ts';
import type { FacilityUnitTypeOfferingResponse } from './schemas/facilityUnitTypeOffering.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

@Tags('Facility Unit Type Offerings')
@Route('facility-unit-type-offerings')
export class FacilityUnitTypeOfferingController extends Controller {
  constructor(
    private readonly offeringService: FacilityUnitTypeOfferingService
  ) {
    super();
  }

  /**
   * Lấy danh sách cấu hình bảng giá (có phân trang, lọc, sắp xếp)
   */
  @Get('')
  @Middlewares(validateRequest({ query: offeringQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  public async getOfferings(
    @Queries() query: OfferingQuery
  ): Promise<ApiResponse<PaginatedData<FacilityUnitTypeOfferingResponse>>> {
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

  /**
   * Lấy chi tiết cấu hình bảng giá theo ID
   */
  @Get('{id}')
  @Middlewares(validateRequest({ params: offeringIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'Offering not found')
  public async getOfferingById(
    @Path() id: string
  ): Promise<ApiResponse<FacilityUnitTypeOfferingResponse>> {
    const offering = await this.offeringService.getOfferingById(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: offering,
    };
  }

  /**
   * Tra cứu nhanh bảng giá theo cặp facilityId + unitTypeId
   * (dùng bởi StorageUnit, Reservation, Contract)
   */
  @Get('facility/{facilityId}/unit-type/{unitTypeId}')
  @Middlewares(validateRequest({ params: facilityUnitTypeParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'Offering not found')
  public async getOfferingByFacilityAndUnitType(
    @Path() facilityId: string,
    @Path() unitTypeId: string
  ): Promise<ApiResponse<FacilityUnitTypeOfferingResponse>> {
    const offering =
      await this.offeringService.getOfferingByFacilityAndUnitType(
        facilityId,
        unitTypeId
      );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: offering,
    };
  }

  /**
   * Tạo cấu hình bảng giá mới cho cơ sở
   */
  @Post('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER, FACILITY_MANAGER
  @SuccessResponse(201, 'Offering created successfully')
  @Middlewares(validateRequest({ body: createOfferingSchema }))
  @Response<ApiErrorResponse>(
    400,
    'Validation error, inactive Facility/UnitType, or offering already exists'
  )
  @Response<ApiErrorResponse>(404, 'Facility or Unit Type not found')
  public async createOffering(
    @Body() body: CreateOfferingRequest
  ): Promise<ApiResponse<FacilityUnitTypeOfferingResponse>> {
    const offering = await this.offeringService.createOffering(body);
    this.setStatus(201);

    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, [
        'Facility Unit Type Offering',
      ]),
      data: offering,
    };
  }

  /**
   * Cập nhật cấu hình bảng giá
   */
  @Patch('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER, FACILITY_MANAGER
  @Middlewares(
    validateRequest({
      params: offeringIdParamSchema,
      body: updateOfferingSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Validation error or invalid ID')
  @Response<ApiErrorResponse>(404, 'Offering not found')
  public async updateOffering(
    @Path() id: string,
    @Body() body: UpdateOfferingRequest
  ): Promise<ApiResponse<FacilityUnitTypeOfferingResponse>> {
    const offering = await this.offeringService.updateOffering(id, body);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Facility Unit Type Offering',
      ]),
      data: offering,
    };
  }

  /**
   * Xóa mềm cấu hình bảng giá
   */
  @Delete('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Middlewares(validateRequest({ params: offeringIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'Offering not found')
  public async deleteOffering(
    @Path() id: string,
    @Request() req?: ExpressRequest
  ): Promise<ApiResponse<null>> {
    const deletedBy = (req?.user as IUser)?._id?.toString?.();
    await this.offeringService.deleteOffering(id, deletedBy);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_004,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_004, [
        'Facility Unit Type Offering',
      ]),
      data: null,
    };
  }
}
