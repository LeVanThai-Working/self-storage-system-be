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
import { RoleEnum } from '../../common/enums/user.enum.ts';
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
  processContractOverdueQuerySchema,
  rejectContractAddendumSchema,
  renewContractSchema,
  signContractAddendumSchema,
  terminateContractSchema,
  disputeSettlementSchema,
  walkInContractSchema,
  type ApproveContractAddendumRequest,
  type CancelContractAddendumRequest,
  type CancelContractRequest,
  type CheckInContractRequest,
  type CheckOutContractRequest,
  type ContractQuery,
  type CreateContractAddendumRequest,
  type CreateContractRequest,
  type CustomerSignContractRequest,
  type ProcessContractOverdueQuery,
  type RejectContractAddendumRequest,
  type RenewContractRequest,
  type SignContractAddendumRequest,
  type TerminateContractRequest,
  type DisputeSettlementRequest,
  type WalkInContractRequest,
} from './schemas/contract.request.schema.ts';
import type {
  ContractResponse,
  ProcessContractOverdueResponse,
} from './schemas/contract.response.schema.ts';
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

  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('walk-in')
  @Middlewares(validateRequest({ body: walkInContractSchema }))
  @SuccessResponse(201, 'Walk-in contract created successfully')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async createWalkInContract(
    @Request() req: ExpressRequest,
    @Body() body: WalkInContractRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.createWalkInContract(
      body,
      caller.userId,
      caller.role
    );

    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, [
        'Walk-in Contract',
      ]),
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

  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('{id}/draft-pdf')
  @Middlewares(validateRequest({ params: contractIdParamSchema }))
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async getContractDraftPdf(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<{ html: string; contractCode: string }>> {
    const caller = extractCaller(req);
    const result = await this.contractService.getContractDraftPdf(
      id,
      caller.userId,
      caller.role
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: {
        html: result.html,
        contractCode: result.contractCode,
      },
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
   * If actualCheckInDate shifts contract dates and customer had already signed, saves previous signature
   * in signatureHistory, resets customerSigned to false, and rejects with 400 MESSAGE_CODE_425
   * requiring customer re-signing before check-in can be finalized.
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
   * Cancel or Void DRAFT contract.
   * - cancellationType = 'cancel': Cancel contract. If sourced from reservation, forfeiture / refund is calculated based on policy snapshot. If walk-in, deposit is 100% forfeited.
   * - cancellationType = 'void': Void invalid draft contract (Staff/Manager/Ops/Admin only). If sourced from reservation, reservation and unit hold are preserved. If walk-in, deposit is 100% refunded.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER (cancel only), FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
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
   * @deprecated Direct contract renewal is deprecated. Please use Contract Addendum (RENEW) via POST /contracts/{id}/addendums.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: DEPRECATED (Always returns 400 with MESSAGE_CODE_416)
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
   * Create a Contract Addendum (RENEW or UNIT_CHANGE).
   * - RENEW: CUSTOMER creates in PENDING_APPROVAL; FACILITY_MANAGER / BUSINESS_OPS_MANAGER / SYSTEM_ADMIN creates in DRAFT.
   * - UNIT_CHANGE: Only FACILITY_MANAGER / BUSINESS_OPS_MANAGER / SYSTEM_ADMIN creates in DRAFT and reserves the replacement unit.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER (RENEW only), FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/addendums')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: createContractAddendumSchema,
    })
  )
  @SuccessResponse(201, 'Contract Addendum Created Successfully')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Forbidden')
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
      caller.role,
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
   * Facility Manager approves a PENDING_APPROVAL addendum request and transitions it to DRAFT for customer signing.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/addendums/{addendumId}/approve')
  @Middlewares(
    validateRequest({
      params: contractAddendumParamSchema,
      body: approveContractAddendumSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Forbidden')
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
      caller.role,
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
   * Facility Manager rejects a PENDING_APPROVAL addendum request.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/addendums/{addendumId}/reject')
  @Middlewares(
    validateRequest({
      params: contractAddendumParamSchema,
      body: rejectContractAddendumSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Forbidden')
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
      caller.role,
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
   * Customer signs addendum (First signing step: Customer side).
   * Addendum remains in DRAFT awaiting Facility Manager signature.
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
  @Response<ApiErrorResponse>(403, 'Forbidden')
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
      caller.role,
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
   * Facility Manager signs addendum after Customer has signed (Second signing step: Facility side).
   * Transitions addendum to ACTIVE and applies RENEW or UNIT_CHANGE changes to the contract.
   * For UNIT_CHANGE addendums, returns 400 MESSAGE_CODE_629 if the previous storage unit still contains customer inventory.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/addendums/{addendumId}/staff-sign')
  @Middlewares(
    validateRequest({
      params: contractAddendumParamSchema,
      body: signContractAddendumSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(
    400,
    'Bad Request (MESSAGE_CODE_410/412/415 for signing state, MESSAGE_CODE_629 if old unit still contains inventory on UNIT_CHANGE)'
  )
  @Response<ApiErrorResponse>(403, 'Forbidden')
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
      caller.role,
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
   * Cancel addendum (when PENDING_APPROVAL or DRAFT) and release reserved replacement storage unit (if UNIT_CHANGE).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/addendums/{addendumId}/cancel')
  @Middlewares(
    validateRequest({
      params: contractAddendumParamSchema,
      body: cancelContractAddendumSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(403, 'Forbidden')
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
      caller.role,
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
   * Returns 400 MESSAGE_CODE_420 if customer inventory still remains on this contract,
   * or 400 MESSAGE_CODE_421 if open (unclosed) incidents still exist on this contract.
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
  @Response<ApiErrorResponse>(
    400,
    'Bad Request (MESSAGE_CODE_401 if invalid contract status, MESSAGE_CODE_420 if customer inventory remains, MESSAGE_CODE_421 if open incidents exist)'
  )
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

  /**
   * Customer confirms contract deposit settlement agreement.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('{id}/settlement/confirm')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async confirmSettlement(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.confirmSettlement(
      id,
      caller.userId,
      caller.role
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Contract Settlement',
      ]),
      data: contract,
    };
  }

  /**
   * Customer disputes contract deposit settlement deductions / damage fee.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('{id}/settlement/dispute')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: disputeSettlementSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async disputeSettlement(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: DisputeSettlementRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.disputeSettlement(
      id,
      caller.userId,
      caller.role,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Contract Settlement',
      ]),
      data: contract,
    };
  }

  /**
   * Scan and transition expired ACTIVE contracts to OVERDUE status.
   * Calculates overdue penalty fees and isolates failures per contract.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Post('process-overdue')
  @Middlewares(validateRequest({ query: processContractOverdueQuerySchema }))
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async processOverdue(
    @Request() req: ExpressRequest,
    @Queries() query?: ProcessContractOverdueQuery
  ): Promise<ApiResponse<ProcessContractOverdueResponse>> {
    const caller = extractCaller(req);
    if (
      caller.role !== RoleEnum.SYSTEM_ADMIN &&
      caller.role !== RoleEnum.BUSINESS_OPS_MANAGER
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
        RoleEnum.SYSTEM_ADMIN,
        RoleEnum.BUSINESS_OPS_MANAGER,
      ]);
    }

    const result = await this.contractService.processOverdueContracts(query);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: result,
    };
  }
}
