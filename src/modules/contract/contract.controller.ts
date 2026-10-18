import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Body,
  Path,
  Queries,
  Middlewares,
  Request,
  Response,
  SuccessResponse,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { ContractService } from './contract.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import type { TokenPayload } from '../../utils/jwt.util.ts';
import {
  approveContractAddendumSchema,
  cancelContractAddendumSchema,
  cancelContractSchema,
  checkInContractSchema,
  checkOutContractSchema,
  contractAddendumParamSchema,
  contractIdParamSchema,
  contractQuerySchema,
  createContractAddendumSchema,
  createContractSchema,
  customerSignContractSchema,
  rejectContractAddendumSchema,
  renewContractSchema,
  signContractAddendumSchema,
  terminateContractSchema,
  type ApproveContractAddendumRequest,
  type CancelContractAddendumRequest,
  type CancelContractRequest,
  type CheckInContractRequest,
  type CheckOutContractRequest,
  type ContractQuery,
  type CreateContractAddendumRequest,
  type CreateContractRequest,
  type CustomerSignContractRequest,
  type RejectContractAddendumRequest,
  type RenewContractRequest,
  type SignContractAddendumRequest,
  type TerminateContractRequest,
} from './schemas/contract.request.schema.ts';
import type { ContractResponse } from './schemas/contract.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

interface CallerInfo {
  userId: string;
  role: string;
}

/**
 * Temporary helper to extract caller identity and role during development
 * while @Security decorators are temporarily commented out.
 */
function extractCaller(req: ExpressRequest): CallerInfo {
  const user = req.user as
    { _id?: { toString(): string }; role?: string } | undefined;
  if (user?._id) {
    return {
      userId: user._id.toString(),
      role: user.role || 'customer',
    };
  }

  // Fallback 1: x-user-id and x-user-role headers (only allowed outside production when explicitly enabled)
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_INSECURE_CALLER_FALLBACK === 'true'
  ) {
    const headerUserId = req.headers['x-user-id'] as string | undefined;
    const headerUserRole = req.headers['x-user-role'] as string | undefined;
    if (headerUserId) {
      return {
        userId: headerUserId,
        role: headerUserRole || 'customer',
      };
    }
  }

  // Fallback 2: Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwtUtil.verifyAccessToken(
        authHeader.split(' ')[1]
      ) as TokenPayload;
      if (payload?.userId) {
        return {
          userId: payload.userId,
          role: payload.role || 'customer',
        };
      }
    } catch {
      // ignore token verification error
    }
  }

  // Fallback 3: cookie
  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    try {
      const payload = jwtUtil.verifyAccessToken(cookieToken) as TokenPayload;
      if (payload?.userId) {
        return {
          userId: payload.userId,
          role: payload.role || 'customer',
        };
      }
    } catch {
      // ignore
    }
  }

  throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
}

@Route('contracts')
@Tags('Contracts')
export class ContractController extends Controller {
  constructor(private readonly contractService: ContractService) {
    super();
  }

  /**
   * Create a new contract (From Reservation or Walk-in).
   * Status will be DRAFT.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('')
  @Middlewares(validateRequest({ body: createContractSchema }))
  @SuccessResponse(201, 'Contract Created Successfully')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async createContract(
    @Request() req: ExpressRequest,
    @Body() body: CreateContractRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.createContract(
      body,
      caller.userId,
      caller.role
    );

    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Contract']),
      data: contract,
    };
  }

  /**
   * View contracts list with pagination and scoped filters.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('')
  @Middlewares(validateRequest({ query: contractQuerySchema }))
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async getContracts(
    @Request() req: ExpressRequest,
    @Queries() query: ContractQuery
  ): Promise<ApiResponse<PaginatedData<ContractResponse>>> {
    const caller = extractCaller(req);
    const result = await this.contractService.getContracts(
      query,
      caller.userId,
      caller.role
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }

  /**
   * Batch process active contracts that have passed their endDate to mark them as OVERDUE.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('process-overdue')
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async processOverdue(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<{ processedCount: number }>> {
    const caller = extractCaller(req);
    const result = await this.contractService.processOverdueContracts(
      caller.userId,
      caller.role
    );
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }

  /**
   * View contract details by ID.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('{id}')
  @Middlewares(validateRequest({ params: contractIdParamSchema }))
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async getContractById(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.getContractById(
      id,
      caller.userId,
      caller.role
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: contract,
    };
  }

  /**
   * Customer signs contract terms on Mobile (Two-party signing: Customer side).
   * Contract remains DRAFT until Facility Manager completes check-in.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('{id}/customer-sign')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: customerSignContractSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async customerSignContract(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CustomerSignContractRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.customerSignContract(
      id,
      caller.userId,
      caller.role,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Contract']),
      data: contract,
    };
  }

  /**
   * Facility Manager confirms handover & signs contract on Web (Two-party signing: Facility side).
   * Requires customerSigned === true; transitions contract to ACTIVE and storage unit to OCCUPIED.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/check-in')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: checkInContractSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async checkInContract(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CheckInContractRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.checkInContract(
      id,
      caller.userId,
      caller.role,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Contract']),
      data: contract,
    };
  }

  /**
   * Cancel DRAFT contract.
   * Deposit is forfeited (100% loss), storage unit and amenities are released.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/cancel')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: cancelContractSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async cancelContract(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CancelContractRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.cancelContract(
      id,
      caller.userId,
      caller.role,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Contract']),
      data: contract,
    };
  }

  /**
   * Renew contract by extending endDate.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER
  @Post('{id}/renew')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: renewContractSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async renewContract(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: RenewContractRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.renewContract(
      id,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Contract']),
      data: contract,
    };
  }

  /**
   * Customer requests to add (install) or remove (uninstall) amenities for an ACTIVE contract (Creates Contract Addendum in PENDING_APPROVAL).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('{id}/addendums')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: createContractAddendumSchema,
    })
  )
  @SuccessResponse(201, 'Contract Addendum Created Successfully')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async createAddendum(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CreateContractAddendumRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.createAddendum(
      id,
      caller.userId,
      body
    );

    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, [
        'Contract Addendum',
      ]),
      data: contract,
    };
  }

  /**
   * Facility Manager approves amenity addendum request (ADD or REMOVE), creates DRAFT addendum, and assigns staff for physical handover/uninstall.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER
  @Post('{id}/addendums/{addendumId}/approve')
  @Middlewares(
    validateRequest({
      params: contractAddendumParamSchema,
      body: approveContractAddendumSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async approveAddendum(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Path() addendumId: string,
    @Body() body: ApproveContractAddendumRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.approveAddendum(
      id,
      addendumId,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Contract Addendum',
      ]),
      data: contract,
    };
  }

  /**
   * Facility Manager rejects amenity addendum request and releases locked inventory (if ADD).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER
  @Post('{id}/addendums/{addendumId}/reject')
  @Middlewares(
    validateRequest({
      params: contractAddendumParamSchema,
      body: rejectContractAddendumSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async rejectAddendum(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Path() addendumId: string,
    @Body() body: RejectContractAddendumRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.rejectAddendum(
      id,
      addendumId,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Contract Addendum',
      ]),
      data: contract,
    };
  }

  /**
   * Customer signs addendum on Mobile (Two-party signing: Customer side).
   * When both customerSigned and staffSigned are true, addendum becomes ACTIVE and changes are applied to the contract.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('{id}/addendums/{addendumId}/customer-sign')
  @Middlewares(
    validateRequest({
      params: contractAddendumParamSchema,
      body: signContractAddendumSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async customerSignAddendum(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Path() addendumId: string,
    @Body() body: SignContractAddendumRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.customerSignAddendum(
      id,
      addendumId,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Contract Addendum',
      ]),
      data: contract,
    };
  }

  /**
   * Staff confirms physical handover/uninstall & signs addendum on Web (Two-party signing: Staff side).
   * When both customerSigned and staffSigned are true, addendum becomes ACTIVE and changes are applied to the contract.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER
  @Post('{id}/addendums/{addendumId}/staff-sign')
  @Middlewares(
    validateRequest({
      params: contractAddendumParamSchema,
      body: signContractAddendumSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async staffSignAddendum(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Path() addendumId: string,
    @Body() body: SignContractAddendumRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.staffSignAddendum(
      id,
      addendumId,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Contract Addendum',
      ]),
      data: contract,
    };
  }

  /**
   * Cancel addendum (when PENDING_APPROVAL or DRAFT) and release locked amenity inventory (if ADD).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER
  @Post('{id}/addendums/{addendumId}/cancel')
  @Middlewares(
    validateRequest({
      params: contractAddendumParamSchema,
      body: cancelContractAddendumSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async cancelAddendum(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Path() addendumId: string,
    @Body() body: CancelContractAddendumRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.cancelAddendum(
      id,
      addendumId,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Contract Addendum',
      ]),
      data: contract,
    };
  }

  /**
   * Check-out & Liquidate contract.
   * Changes status to COMPLETED, assesses damageFee and overdueFee, calculates deposit refund,
   * vacates storage unit into UNDER_MAINTENANCE for inspection/cleaning.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/check-out')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: checkOutContractSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async checkOutContract(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: CheckOutContractRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.checkOutContract(
      id,
      caller.userId,
      caller.role,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Contract']),
      data: contract,
    };
  }

  /**
   * Terminate contract early due to terms violation.
   * Moves storage unit to UNDER_MAINTENANCE and releases amenities.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/terminate')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: terminateContractSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async terminateContract(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: TerminateContractRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.terminateContract(
      id,
      caller.userId,
      caller.role,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Contract']),
      data: contract,
    };
  }
}
