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
import type { UnitTypeService } from './unitType.service.ts';
import type { IUser } from '../user/user.model.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createUnitTypeSchema,
  updateUnitTypeSchema,
  unitTypeIdParamSchema,
  unitTypeQuerySchema,
  type CreateUnitTypeRequest,
  type UpdateUnitTypeRequest,
  type UnitTypeQuery,
} from './schemas/unitType.request.schema.ts';
import type { UnitTypeResponse } from './schemas/unitType.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

@Tags('Unit Types')
@Route('unit-types')
export class UnitTypeController extends Controller {
  constructor(private readonly unitTypeService: UnitTypeService) {
    super();
  }

  @Get('')
  @Middlewares(validateRequest({ query: unitTypeQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  public async findAllUnitType(
    @Queries() query: UnitTypeQuery
  ): Promise<ApiResponse<PaginatedData<UnitTypeResponse>>> {
    const { items, pagination } =
      await this.unitTypeService.findAllUnitType(query);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: { items, pagination },
    };
  }

  @Get('{id}')
  @Middlewares(validateRequest({ params: unitTypeIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'Unit type not found')
  public async findUnitTypeById(
    @Path() id: string
  ): Promise<ApiResponse<UnitTypeResponse>> {
    const unitType = await this.unitTypeService.findUnitTypeById(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: unitType,
    };
  }

  @Post('')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @SuccessResponse(201, 'Unit type created successfully')
  @Middlewares(validateRequest({ body: createUnitTypeSchema }))
  @Response<ApiErrorResponse>(
    400,
    'Validation error or unit type already exists'
  )
  public async createUnitType(
    @Body() body: CreateUnitTypeRequest
  ): Promise<ApiResponse<UnitTypeResponse>> {
    const unitType = await this.unitTypeService.createUnitType(body);
    this.setStatus(201);

    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Unit Type']),
      data: unitType,
    };
  }

  @Patch('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Middlewares(
    validateRequest({
      params: unitTypeIdParamSchema,
      body: updateUnitTypeSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Validation error or invalid ID')
  @Response<ApiErrorResponse>(404, 'Unit type not found')
  public async updateUnitType(
    @Path() id: string,
    @Body() body: UpdateUnitTypeRequest
  ): Promise<ApiResponse<UnitTypeResponse>> {
    const unitType = await this.unitTypeService.updateUnitType(id, body);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Unit Type']),
      data: unitType,
    };
  }

  @Delete('{id}')
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN
  @Middlewares(validateRequest({ params: unitTypeIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'Unit type not found')
  public async deleteUnitType(
    @Path() id: string,
    @Request() req?: ExpressRequest
  ): Promise<ApiResponse<null>> {
    const deletedBy = (req?.user as IUser)?._id?.toString?.();
    await this.unitTypeService.deleteUnitType(id, deletedBy);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_004,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_004, ['Unit Type']),
      data: null,
    };
  }
}
