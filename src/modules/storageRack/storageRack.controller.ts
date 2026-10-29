import {
  Controller,
  Route,
  Tags,
  Get,
  Request,
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
} from 'tsoa';
import type {
  StorageRackService,
  CallerContext,
} from './storageRack.service.ts';
import type { Request as ExpressRequest } from 'express';
import { jwtUtil } from '../auth/auth.container.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createStorageRackSchema,
  updateStorageRackSchema,
  updateRackTierSchema,
  storageRackIdParamSchema,
  rackTierIdParamSchema,
  storageUnitIdParamSchema,
  storageRackQuerySchema,
  type CreateStorageRackRequest,
  type UpdateStorageRackRequest,
  type UpdateRackTierRequest,
  type StorageRackQuery,
} from './schemas/storageRack.request.schema.ts';
import type {
  StorageRackResponse,
  RackTierResponse,
} from './schemas/storageRack.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

/**
 * Helper to extract caller context flexibly during development (Rule 14)
 */
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
      // Ignored: proceed to fallback
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
      // Ignored: proceed to fallback
    }
  }

  return {};
}

@Tags('Storage Racks')
@Route('storage-racks')
export class StorageRackController extends Controller {
  constructor(private readonly storageRackService: StorageRackService) {
    super();
  }

  /**
   * Get list of storage racks (with pagination, filter by facilityId, storageUnitId, status, rackCode)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('')
  @Middlewares(validateRequest({ query: storageRackQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  public async getStorageRacks(
    @Queries() query: StorageRackQuery
  ): Promise<ApiResponse<PaginatedData<StorageRackResponse>>> {
    const { items, pagination } =
      await this.storageRackService.getStorageRacks(query);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: { items, pagination },
    };
  }

  /**
   * Get all storage racks and their tiers for a specific storage unit
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('unit/{unitId}')
  @Middlewares(validateRequest({ params: storageUnitIdParamSchema }))
  @Response<ApiErrorResponse>(404, 'Storage Unit not found')
  public async getRacksByUnit(
    @Path() unitId: string,
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<StorageRackResponse[]>> {
    const caller = extractCaller(req);
    const racks = await this.storageRackService.getRacksByStorageUnit(
      unitId,
      caller
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: racks,
    };
  }

  /**
   * Get detail of a storage rack by ID (including all its tiers)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('{id}')
  @Middlewares(validateRequest({ params: storageRackIdParamSchema }))
  @Response<ApiErrorResponse>(404, 'Storage Rack not found')
  public async getStorageRackById(
    @Path() id: string
  ): Promise<ApiResponse<StorageRackResponse>> {
    const rack = await this.storageRackService.getStorageRackById(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: rack,
    };
  }

  /**
   * Create a new storage rack manually in a storage unit (automatically creates its tiers)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('')
  @SuccessResponse(201, 'Created')
  @Middlewares(validateRequest({ body: createStorageRackSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid request or duplicate rack code')
  @Response<ApiErrorResponse>(404, 'Storage Unit not found')
  public async createStorageRack(
    @Body() data: CreateStorageRackRequest
  ): Promise<ApiResponse<StorageRackResponse>> {
    this.setStatus(201);
    const created = await this.storageRackService.createStorageRack(data);

    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Storage Rack']),
      data: created,
    };
  }

  /**
   * Auto-provision racks and tiers for a storage unit based on its UnitType default rack config
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('unit/{unitId}/provision')
  @Middlewares(validateRequest({ params: storageUnitIdParamSchema }))
  @Response<ApiErrorResponse>(
    400,
    'Storage unit does not have default rack config'
  )
  @Response<ApiErrorResponse>(404, 'Storage Unit not found')
  public async provisionRacks(
    @Path() unitId: string
  ): Promise<ApiResponse<StorageRackResponse[]>> {
    const racks =
      await this.storageRackService.provisionRacksForUnitEndpoint(unitId);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: racks,
    };
  }

  /**
   * Update storage rack information (name, status, notes)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Patch('{id}')
  @Middlewares(
    validateRequest({
      params: storageRackIdParamSchema,
      body: updateStorageRackSchema,
    })
  )
  @Response<ApiErrorResponse>(404, 'Storage Rack not found')
  public async updateStorageRack(
    @Path() id: string,
    @Body() data: UpdateStorageRackRequest
  ): Promise<ApiResponse<StorageRackResponse>> {
    const updated = await this.storageRackService.updateStorageRack(id, data);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Storage Rack']),
      data: updated,
    };
  }

  /**
   * Update rack tier specifications (dimensions, max weight, status, notes)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Patch('tiers/{id}')
  @Middlewares(
    validateRequest({
      params: rackTierIdParamSchema,
      body: updateRackTierSchema,
    })
  )
  @Response<ApiErrorResponse>(404, 'Rack Tier not found')
  public async updateRackTier(
    @Path() id: string,
    @Body() data: UpdateRackTierRequest
  ): Promise<ApiResponse<RackTierResponse>> {
    const updated = await this.storageRackService.updateRackTier(id, data);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Rack Tier']),
      data: updated,
    };
  }

  /**
   * Soft delete a storage rack (cascade deletes all its tiers)
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Delete('{id}')
  @Middlewares(validateRequest({ params: storageRackIdParamSchema }))
  @Response<ApiErrorResponse>(404, 'Storage Rack not found')
  public async deleteStorageRack(
    @Path() id: string
  ): Promise<ApiResponse<null>> {
    await this.storageRackService.deleteStorageRack(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_004,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_004, ['Storage Rack']),
      data: null,
    };
  }

  /**
   * Restore a soft-deleted storage rack and its tiers
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('{id}/restore')
  @Middlewares(validateRequest({ params: storageRackIdParamSchema }))
  @Response<ApiErrorResponse>(404, 'Storage Rack not found')
  public async restoreStorageRack(
    @Path() id: string
  ): Promise<ApiResponse<StorageRackResponse>> {
    const restored = await this.storageRackService.restoreStorageRack(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: restored,
    };
  }
}
