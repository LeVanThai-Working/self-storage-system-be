import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Delete,
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
  addContractAmenitySchema,
  cancelContractSchema,
  checkInContractSchema,
  checkOutContractSchema,
  contractAmenityParamSchema,
  contractIdParamSchema,
  contractQuerySchema,
  createContractSchema,
  renewContractSchema,
  terminateContractSchema,
  type AddContractAmenityRequest,
  type CancelContractRequest,
  type CheckInContractRequest,
  type CheckOutContractRequest,
  type ContractQuery,
  type CreateContractRequest,
  type RenewContractRequest,
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

  // Fallback 1: x-user-id and x-user-role headers
  const headerUserId = req.headers['x-user-id'] as string | undefined;
  const headerUserRole = req.headers['x-user-role'] as string | undefined;
  if (headerUserId) {
    return {
      userId: headerUserId,
      role: headerUserRole || 'customer',
    };
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

  // Fallback 4: Customer ID from body (during local tests)
  const body = req.body as { customerId?: string } | undefined;
  if (body?.customerId) {
    return {
      userId: body.customerId,
      role: 'customer',
    };
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
  // TODO: Role authorization: FACILITY_MANAGER, FACILITY_STAFF, BUSINESS_OPS_MANAGER
  @Post('')
  @Middlewares(validateRequest({ body: createContractSchema }))
  @SuccessResponse(201, 'Contract Created Successfully')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
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
  // TODO: Role authorization: ALL (Scoped)
  @Get('')
  @Middlewares(validateRequest({ query: contractQuerySchema }))
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
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
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER, FACILITY_MANAGER
  @Post('process-overdue')
  @SuccessResponse(200, 'Success')
  public async processOverdue(): Promise<
    ApiResponse<{ processedCount: number }>
  > {
    const result = await this.contractService.processOverdueContracts();
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
  // TODO: Role authorization: ALL (Scoped)
  @Get('{id}')
  @Middlewares(validateRequest({ params: contractIdParamSchema }))
  @SuccessResponse(200, 'Success')
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
   * Check-in & Activate contract.
   * Changes status from DRAFT to ACTIVE, storage unit becomes OCCUPIED.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, FACILITY_STAFF
  @Post('{id}/check-in')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: checkInContractSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
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
  // TODO: Role authorization: FACILITY_MANAGER, FACILITY_STAFF
  @Post('{id}/cancel')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: cancelContractSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
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
   * Add amenity to active contract.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER
  @Post('{id}/amenities')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: addContractAmenitySchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async addAmenity(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: AddContractAmenityRequest
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.addAmenity(
      id,
      caller.userId,
      body
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Contract Amenity',
      ]),
      data: contract,
    };
  }

  /**
   * Remove amenity from active contract.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER
  @Delete('{id}/amenities/{amenityOfferingId}')
  @Middlewares(validateRequest({ params: contractAmenityParamSchema }))
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async removeAmenity(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Path() amenityOfferingId: string
  ): Promise<ApiResponse<ContractResponse>> {
    const caller = extractCaller(req);
    const contract = await this.contractService.removeAmenity(
      id,
      amenityOfferingId,
      caller.userId
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Contract Amenity',
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
  // TODO: Role authorization: FACILITY_MANAGER, FACILITY_STAFF
  @Post('{id}/check-out')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: checkOutContractSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
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
  // TODO: Role authorization: FACILITY_MANAGER
  @Post('{id}/terminate')
  @Middlewares(
    validateRequest({
      params: contractIdParamSchema,
      body: terminateContractSchema,
    })
  )
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(400, 'Bad Request')
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
