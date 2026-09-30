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
import type { AmenityService } from './amenity.service.ts';
import type { IUser } from '../user/user.model.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createAmenitySchema,
  updateAmenitySchema,
  amenityIdParamSchema,
  amenityQuerySchema,
  type CreateAmenityRequest,
  type UpdateAmenityRequest,
  type AmenityQuery,
} from './schemas/amenity.request.schema.ts';
import type { AmenityResponse } from './schemas/amenity.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

@Tags('Amenities')
@Route('amenities')
export class AmenityController extends Controller {
  constructor(private readonly amenityService: AmenityService) {
    super();
  }

  @Get('')
  @Middlewares(validateRequest({ query: amenityQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  public async getAmenities(
    @Queries() query: AmenityQuery
  ): Promise<ApiResponse<PaginatedData<AmenityResponse>>> {
    const { items, pagination } =
      await this.amenityService.getAmenities(query);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: { items, pagination },
    };
  }

  @Get('{id}')
  @Middlewares(validateRequest({ params: amenityIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'Amenity not found')
  public async getAmenityById(
    @Path() id: string
  ): Promise<ApiResponse<AmenityResponse>> {
    const amenity = await this.amenityService.getAmenityById(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: amenity,
    };
  }

  @Post('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @SuccessResponse(201, 'Amenity created successfully')
  @Middlewares(validateRequest({ body: createAmenitySchema }))
  @Response<ApiErrorResponse>(
    400,
    'Validation error or amenity already exists'
  )
  public async createAmenity(
    @Body() body: CreateAmenityRequest
  ): Promise<ApiResponse<AmenityResponse>> {
    const amenity = await this.amenityService.createAmenity(body);
    this.setStatus(201);

    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Amenity']),
      data: amenity,
    };
  }

  @Patch('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Middlewares(
    validateRequest({
      params: amenityIdParamSchema,
      body: updateAmenitySchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Validation error or invalid ID')
  @Response<ApiErrorResponse>(404, 'Amenity not found')
  public async updateAmenity(
    @Path() id: string,
    @Body() body: UpdateAmenityRequest
  ): Promise<ApiResponse<AmenityResponse>> {
    const amenity = await this.amenityService.updateAmenity(id, body);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Amenity']),
      data: amenity,
    };
  }

  @Delete('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Middlewares(validateRequest({ params: amenityIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'Amenity not found')
  public async deleteAmenity(
    @Path() id: string,
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<null>> {
    const user = req.user as IUser | undefined;
    const deletedBy = user?._id ? String(user._id) : undefined;

    await this.amenityService.deleteAmenity(id, deletedBy);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_004,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_004, ['Amenity']),
      data: null,
    };
  }
}

