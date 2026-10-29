import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Path,
  Queries,
  Middlewares,
  Response,
  SuccessResponse,
} from 'tsoa';
import type { LegalEntityService } from './legalEntity.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createLegalEntitySchema,
  legalEntityIdParamSchema,
  legalEntityQuerySchema,
  updateLegalEntitySchema,
  type CreateLegalEntityRequest,
  type LegalEntityQuery,
  type UpdateLegalEntityRequest,
} from './schemas/legalEntity.request.schema.ts';
import type { LegalEntityResponse } from './schemas/legalEntity.response.schema.ts';
import type { ApiResponse } from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

@Route('legal-entities')
@Tags('LegalEntity')
export class LegalEntityController extends Controller {
  constructor(private readonly legalEntityService: LegalEntityService) {
    super();
  }

  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Post('')
  @Middlewares(validateRequest({ body: createLegalEntitySchema }))
  @SuccessResponse(201, 'Legal Entity created successfully')
  @Response(400, 'Bad Request / Duplicate Tax Code')
  @Response(403, 'Forbidden')
  public async createLegalEntity(
    @Body() body: CreateLegalEntityRequest
  ): Promise<ApiResponse<LegalEntityResponse>> {
    const data = await this.legalEntityService.createLegalEntity(body);
    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER, FACILITY_MANAGER
  @Get('')
  @Middlewares(validateRequest({ query: legalEntityQuerySchema }))
  public async getAllLegalEntities(
    @Queries() query: LegalEntityQuery
  ): Promise<ApiResponse<PaginatedData<LegalEntityResponse>>> {
    const result = await this.legalEntityService.findAllLegalEntities(query);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: {
        items: result.items,
        pagination: result.pagination,
      },
    };
  }

  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER, FACILITY_MANAGER
  @Get('{id}')
  @Middlewares(validateRequest({ params: legalEntityIdParamSchema }))
  @Response(404, 'Legal Entity not found')
  public async getLegalEntityById(
    @Path() id: string
  ): Promise<ApiResponse<LegalEntityResponse>> {
    const data = await this.legalEntityService.findLegalEntityById(id);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Patch('{id}')
  @Middlewares(
    validateRequest({
      params: legalEntityIdParamSchema,
      body: updateLegalEntitySchema,
    })
  )
  @Response(400, 'Bad Request')
  @Response(404, 'Legal Entity not found')
  public async updateLegalEntity(
    @Path() id: string,
    @Body() body: UpdateLegalEntityRequest
  ): Promise<ApiResponse<LegalEntityResponse>> {
    const data = await this.legalEntityService.updateLegalEntity(id, body);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN
  @Delete('{id}')
  @Middlewares(validateRequest({ params: legalEntityIdParamSchema }))
  @Response(404, 'Legal Entity not found')
  public async deleteLegalEntity(
    @Path() id: string
  ): Promise<ApiResponse<LegalEntityResponse>> {
    const data = await this.legalEntityService.deleteLegalEntity(id);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }
}
