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
import type {
  SupportTicketService,
  CallerContext,
} from './supportTicket.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import {
  createSupportTicketSchema,
  processSupportTicketSchema,
  completeSupportTicketSchema,
  cancelSupportTicketSchema,
  supportTicketIdParamSchema,
  supportTicketQuerySchema,
  type CreateSupportTicketRequest,
  type ProcessSupportTicketRequest,
  type CompleteSupportTicketRequest,
  type CancelSupportTicketRequest,
  type SupportTicketQuery,
} from './schemas/supportTicket.request.schema.ts';
import type {
  SupportTicketResponse,
  PaginatedSupportTicketResponse,
} from './schemas/supportTicket.response.schema.ts';
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
      // Ignored: fallback logic
    }
  }

  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    try {
      const payload = jwtUtil.verifyAccessToken(cookieToken) as {
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
      // Ignored: fallback logic
    }
  }

  const bodyUserId = (req.body as Record<string, unknown> | undefined)?.userId;
  if (bodyUserId && typeof bodyUserId === 'string') {
    return {
      id: bodyUserId,
      role: (req.body as Record<string, unknown> | undefined)?.role as
        string | undefined,
      assignedFacilityId: (req.body as Record<string, unknown> | undefined)
        ?.assignedFacilityId as string | undefined,
    };
  }

  const queryUserId = req.query?.userId;
  if (queryUserId && typeof queryUserId === 'string') {
    return {
      id: queryUserId,
      role: req.query?.role as string | undefined,
      assignedFacilityId: req.query?.assignedFacilityId as string | undefined,
    };
  }

  throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
}

@Tags('Support Ticket')
@Route('support-tickets')
export class SupportTicketController extends Controller {
  constructor(private readonly supportTicketService: SupportTicketService) {
    super();
  }

  /**
   * Create a new customer support ticket
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('')
  @Middlewares(validateRequest({ body: createSupportTicketSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async createTicket(
    @Request() req: ExpressRequest,
    @Body() body: CreateSupportTicketRequest
  ): Promise<ApiResponse<SupportTicketResponse>> {
    const caller = extractCaller(req);
    const data = await this.supportTicketService.createTicket(body, caller);
    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * Query support tickets with pagination, search, and filters
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('')
  @Middlewares(validateRequest({ query: supportTicketQuerySchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async findTickets(
    @Request() req: ExpressRequest,
    @Queries() query: SupportTicketQuery
  ): Promise<ApiResponse<PaginatedSupportTicketResponse>> {
    const caller = extractCaller(req);
    const data = await this.supportTicketService.findTickets(query, caller);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * Get support ticket details by ID
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('{id}')
  @Middlewares(validateRequest({ params: supportTicketIdParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async getTicketById(
    @Request() req: ExpressRequest,
    @Path('id') id: string
  ): Promise<ApiResponse<SupportTicketResponse>> {
    const caller = extractCaller(req);
    const data = await this.supportTicketService.getTicketById(id, caller);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * Accept or assign a support ticket to begin processing
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/process')
  @Middlewares(
    validateRequest({
      params: supportTicketIdParamSchema,
      body: processSupportTicketSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async processTicket(
    @Request() req: ExpressRequest,
    @Path('id') id: string,
    @Body() body: ProcessSupportTicketRequest
  ): Promise<ApiResponse<SupportTicketResponse>> {
    const caller = extractCaller(req);
    const data = await this.supportTicketService.processTicket(
      id,
      body,
      caller
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
   * Complete a support ticket with resolution message and instructions
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/complete')
  @Middlewares(
    validateRequest({
      params: supportTicketIdParamSchema,
      body: completeSupportTicketSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async completeTicket(
    @Request() req: ExpressRequest,
    @Path('id') id: string,
    @Body() body: CompleteSupportTicketRequest
  ): Promise<ApiResponse<SupportTicketResponse>> {
    const caller = extractCaller(req);
    const data = await this.supportTicketService.completeTicket(
      id,
      body,
      caller
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
   * Cancel a pending support ticket (Customer only)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('{id}/cancel')
  @Middlewares(
    validateRequest({
      params: supportTicketIdParamSchema,
      body: cancelSupportTicketSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async cancelTicket(
    @Request() req: ExpressRequest,
    @Path('id') id: string,
    @Body() body: CancelSupportTicketRequest
  ): Promise<ApiResponse<SupportTicketResponse>> {
    const caller = extractCaller(req);
    const data = await this.supportTicketService.cancelTicket(id, body, caller);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }
}
