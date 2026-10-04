import {
  Controller,
  Route,
  Tags,
  Get,
  Path,
  Queries,
  Security,
  Middlewares,
  Request,
  Response,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { AuditLogService } from './auditLog.service.ts';
import type { IUser } from '../user/user.model.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  auditLogIdParamSchema,
  auditLogQuerySchema,
  auditLogResourceParamSchema,
  type AuditLogQuery,
} from './schemas/auditLog.request.schema.ts';
import type { AuditLogResponse } from './schemas/auditLog.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import type { AuditResourceEnum } from '../../common/enums/auditLog.enum.ts';

@Tags('AuditLogs')
@Route('audit-logs')
export class AuditLogController extends Controller {
  constructor(private readonly auditLogService: AuditLogService) {
    super();
  }

  /**
   * Get all audit logs with pagination and filters.
   */
  @Get('')
  @Security('bearerAuth')
  @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Middlewares(validateRequest({ query: auditLogQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async findAll(
    @Queries() query: AuditLogQuery
  ): Promise<ApiResponse<PaginatedData<AuditLogResponse>>> {
    const data = await this.auditLogService.findAll(query);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * Get current authenticated user's own activity log.
   * Defined before /{id} to ensure proper route matching order in tsoa.
   */
  @Get('me')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @Middlewares(validateRequest({ query: auditLogQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async findMine(
    @Request() req: ExpressRequest,
    @Queries() query: AuditLogQuery
  ): Promise<ApiResponse<PaginatedData<AuditLogResponse>>> {
    const userId = (req.user as IUser)?._id?.toString?.();
    const data = await this.auditLogService.findMine(userId, query);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * Get change timeline for a specific resource type and ID.
   */
  @Get('resource/{resourceType}/{resourceId}')
  @Security('bearerAuth')
  @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER, FACILITY_MANAGER
  @Middlewares(
    validateRequest({
      params: auditLogResourceParamSchema,
      query: auditLogQuerySchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Invalid resource parameters')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async findByResource(
    @Path() resourceType: AuditResourceEnum,
    @Path() resourceId: string,
    @Queries() query: AuditLogQuery
  ): Promise<ApiResponse<PaginatedData<AuditLogResponse>>> {
    const data = await this.auditLogService.findByResource(
      resourceType,
      resourceId,
      query
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
   * Get single audit log record by ID.
   */
  @Get('{id}')
  @Security('bearerAuth')
  @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Middlewares(validateRequest({ params: auditLogIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid audit log ID')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(404, 'Audit log not found')
  public async findById(
    @Path() id: string
  ): Promise<ApiResponse<AuditLogResponse>> {
    const data = await this.auditLogService.findById(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }
}
