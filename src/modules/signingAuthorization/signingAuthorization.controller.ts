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
  Response,
  SuccessResponse,
} from 'tsoa';
import type { SigningAuthorizationService } from './signingAuthorization.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createSigningAuthorizationSchema,
  signingAuthorizationIdParamSchema,
  signingAuthorizationQuerySchema,
  updateSigningAuthorizationSchema,
  type CreateSigningAuthorizationRequest,
  type SigningAuthorizationQuery,
  type UpdateSigningAuthorizationRequest,
} from './schemas/signingAuthorization.request.schema.ts';
import type { SigningAuthorizationResponse } from './schemas/signingAuthorization.response.schema.ts';
import type { ApiResponse } from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

@Route('signing-authorizations')
@Tags('SigningAuthorization')
export class SigningAuthorizationController extends Controller {
  constructor(
    private readonly signingAuthService: SigningAuthorizationService
  ) {
    super();
  }

  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Post('')
  @Middlewares(validateRequest({ body: createSigningAuthorizationSchema }))
  @SuccessResponse(201, 'Signing authorization created successfully')
  @Response(400, 'Bad Request')
  @Response(404, 'Legal Entity not found')
  public async createSigningAuthorization(
    @Body() body: CreateSigningAuthorizationRequest
  ): Promise<ApiResponse<SigningAuthorizationResponse>> {
    const data = await this.signingAuthService.createSigningAuthorization(body);
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
  @Middlewares(validateRequest({ query: signingAuthorizationQuerySchema }))
  public async getAllSigningAuthorizations(
    @Queries() query: SigningAuthorizationQuery
  ): Promise<ApiResponse<PaginatedData<SigningAuthorizationResponse>>> {
    const result =
      await this.signingAuthService.findAllSigningAuthorizations(query);
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
  @Middlewares(validateRequest({ params: signingAuthorizationIdParamSchema }))
  @Response(404, 'Signing authorization not found')
  public async getSigningAuthorizationById(
    @Path() id: string
  ): Promise<ApiResponse<SigningAuthorizationResponse>> {
    const data = await this.signingAuthService.findSigningAuthorizationById(id);
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
      params: signingAuthorizationIdParamSchema,
      body: updateSigningAuthorizationSchema,
    })
  )
  @Response(400, 'Bad Request')
  @Response(404, 'Signing authorization not found')
  public async updateSigningAuthorization(
    @Path() id: string,
    @Body() body: UpdateSigningAuthorizationRequest
  ): Promise<ApiResponse<SigningAuthorizationResponse>> {
    const data = await this.signingAuthService.updateSigningAuthorization(
      id,
      body
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
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Post('{id}/revoke')
  @Middlewares(validateRequest({ params: signingAuthorizationIdParamSchema }))
  @Response(404, 'Signing authorization not found')
  public async revokeSigningAuthorization(
    @Path() id: string
  ): Promise<ApiResponse<SigningAuthorizationResponse>> {
    const data = await this.signingAuthService.revokeSigningAuthorization(id);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }
}
