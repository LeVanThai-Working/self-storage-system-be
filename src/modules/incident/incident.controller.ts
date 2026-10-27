import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Body,
  Queries,
  Path,
  Response,
  // Security,
  Middlewares,
  Request,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { IncidentService, CallerContext } from './incident.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import {
  reportIncidentSchema,
  assignIncidentSchema,
  investigateIncidentSchema,
  resolveIncidentSchema,
  closeIncidentSchema,
  cancelIncidentSchema,
  incidentIdParamSchema,
  incidentQuerySchema,
  type ReportIncidentRequest,
  type AssignIncidentRequest,
  type InvestigateIncidentRequest,
  type ResolveIncidentRequest,
  type CloseIncidentRequest,
  type CancelIncidentRequest,
  type IncidentQuery,
} from './schemas/incident.request.schema.ts';
import type {
  IncidentResponse,
  PaginatedIncidentResponse,
} from './schemas/incident.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';

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
      id: user._id.toString(),
      role: user.role,
      assignedFacilityId: user.assignedFacilityId?.toString(),
    };
  }

  const headerUserId = req.headers['x-user-id'] as string;
  const headerRole = req.headers['x-user-role'] as string;
  const headerFacilityId = req.headers['x-facility-id'] as string;
  if (headerUserId) {
    return {
      id: headerUserId,
      role: headerRole,
      assignedFacilityId: headerFacilityId,
    };
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwtUtil.verifyAccessToken(authHeader.split(' ')[1]) as {
        userId?: string;
        role?: string;
        assignedFacilityId?: string;
      };
      if (payload?.userId) {
        return {
          id: payload.userId,
          role: payload.role,
          assignedFacilityId: payload.assignedFacilityId,
        };
      }
    } catch {
      // ignore token verification error in dev fallback
    }
  }

  throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
}

@Route('incidents')
@Tags('Incident')
export class IncidentController extends Controller {
  constructor(private readonly incidentService: IncidentService) {
    super();
  }

  /**
   * Report a new incident (Customer, Facility Staff, or Facility Manager)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER
  @Post('')
  @Middlewares(validateRequest({ body: reportIncidentSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async reportIncident(
    @Request() req: ExpressRequest,
    @Body() body: ReportIncidentRequest
  ): Promise<ApiResponse<IncidentResponse>> {
    const caller = extractCaller(req);
    const incident = await this.incidentService.reportIncident(caller, body);
    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Incident']),
      data: incident,
    };
  }

  /**
   * Query incidents list (paginated, with scoped filters)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('')
  @Middlewares(validateRequest({ query: incidentQuerySchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async getIncidents(
    @Request() req: ExpressRequest,
    @Queries() query: IncidentQuery
  ): Promise<ApiResponse<PaginatedIncidentResponse>> {
    const caller = extractCaller(req);
    const result = await this.incidentService.getIncidents(caller, query);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }

  /**
   * Get incident detail by ID
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('{id}')
  @Middlewares(validateRequest({ params: incidentIdParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async getIncidentById(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<IncidentResponse>> {
    const caller = extractCaller(req);
    const incident = await this.incidentService.getIncidentById(caller, id);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: incident,
    };
  }

  /**
   * Facility Manager assigns a staff member to handle the incident
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/assign')
  @Middlewares(
    validateRequest({
      params: incidentIdParamSchema,
      body: assignIncidentSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async assignStaff(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: AssignIncidentRequest
  ): Promise<ApiResponse<IncidentResponse>> {
    const caller = extractCaller(req);
    const incident = await this.incidentService.assignStaff(caller, id, body);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Incident']),
      data: incident,
    };
  }

  /**
   * Assigned staff starts investigating the incident and notes findings
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/investigate')
  @Middlewares(
    validateRequest({
      params: incidentIdParamSchema,
      body: investigateIncidentSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async investigateIncident(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: InvestigateIncidentRequest
  ): Promise<ApiResponse<IncidentResponse>> {
    const caller = extractCaller(req);
    const incident = await this.incidentService.investigateIncident(
      caller,
      id,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Incident']),
      data: incident,
    };
  }

  /**
   * Assigned staff resolves incident and submits resolution report
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/resolve')
  @Middlewares(
    validateRequest({
      params: incidentIdParamSchema,
      body: resolveIncidentSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async resolveIncident(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: ResolveIncidentRequest
  ): Promise<ApiResponse<IncidentResponse>> {
    const caller = extractCaller(req);
    const incident = await this.incidentService.resolveIncident(
      caller,
      id,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Incident']),
      data: incident,
    };
  }

  /**
   * Customer or Facility Manager accepts and closes the resolved incident
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/close')
  @Middlewares(
    validateRequest({
      params: incidentIdParamSchema,
      body: closeIncidentSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async closeIncident(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CloseIncidentRequest
  ): Promise<ApiResponse<IncidentResponse>> {
    const caller = extractCaller(req);
    const incident = await this.incidentService.closeIncident(caller, id, body);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Incident']),
      data: incident,
    };
  }

  /**
   * Cancel incident report (by reporter when REPORTED or by FM)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/cancel')
  @Middlewares(
    validateRequest({
      params: incidentIdParamSchema,
      body: cancelIncidentSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async cancelIncident(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CancelIncidentRequest
  ): Promise<ApiResponse<IncidentResponse>> {
    const caller = extractCaller(req);
    const incident = await this.incidentService.cancelIncident(
      caller,
      id,
      body
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Incident']),
      data: incident,
    };
  }
}
