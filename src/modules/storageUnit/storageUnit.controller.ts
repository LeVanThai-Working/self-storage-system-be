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
import { jwtUtil } from '../auth/auth.container.ts';
import type { TokenPayload } from '../../utils/jwt.util.ts';
import type { StorageUnitService } from './storageUnit.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createStorageUnitSchema,
  updateStorageUnitSchema,
  toggleMaintenanceSchema,
  storageUnitIdParamSchema,
  facilityIdParamSchema,
  storageUnitQuerySchema,
  availableStorageUnitQuerySchema,
  type CreateStorageUnitRequest,
  type UpdateStorageUnitRequest,
  type ToggleMaintenanceRequest,
  type StorageUnitQuery,
  type AvailableStorageUnitQuery,
} from './schemas/storageUnit.request.schema.ts';
import type { StorageUnitResponse } from './schemas/storageUnit.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

interface CallerInfo {
  userId: string;
  role: string;
}

function extractCaller(req: ExpressRequest): CallerInfo {
  const user = req.user as
    { _id?: { toString(): string }; role?: string } | undefined;
  if (user?._id) {
    return {
      userId: user._id.toString(),
      role: user.role || 'customer',
    };
  }

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
      // Ignored
    }
  }

  return {
    userId: 'anonymous',
    role: 'customer',
  };
}

@Tags('Storage Units')
@Route('storage-units')
export class StorageUnitController extends Controller {
  constructor(private readonly storageUnitService: StorageUnitService) {
    super();
  }

  /**
   * Get list of physical storage units (with pagination, search, filter by facility/unitType/floor/zone/status)
   */
  @Get('')
  @Middlewares(validateRequest({ query: storageUnitQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  public async getStorageUnits(
    @Queries() query: StorageUnitQuery
  ): Promise<ApiResponse<PaginatedData<StorageUnitResponse>>> {
    const { items, pagination } =
      await this.storageUnitService.getStorageUnits(query);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: { items, pagination },
    };
  }

  /**
   * Lookup available storage units for a facility (for reservation)
   */
  @Get('facility/{facilityId}/available')
  @Middlewares(
    validateRequest({
      params: facilityIdParamSchema,
      query: availableStorageUnitQuerySchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Invalid request or facility inactive')
  @Response<ApiErrorResponse>(404, 'Facility not found')
  public async getAvailableUnits(
    @Path() facilityId: string,
    @Queries() query?: AvailableStorageUnitQuery
  ): Promise<ApiResponse<StorageUnitResponse[]>> {
    const units = await this.storageUnitService.getAvailableUnits(
      facilityId,
      query
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: units,
    };
  }

  /**
   * Get full 2D map layout (all units of facility with their statuses: available, reserved, occupied, under_maintenance)
   */
  @Get('facility/{facilityId}/map-layout')
  @Middlewares(validateRequest({ params: facilityIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid request or facility inactive')
  @Response<ApiErrorResponse>(404, 'Facility not found')
  public async getFacilityMapLayout(
    @Path() facilityId: string
  ): Promise<ApiResponse<StorageUnitResponse[]>> {
    const units =
      await this.storageUnitService.getFacilityMapLayout(facilityId);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: units,
    };
  }

  /**
   * Get physical storage unit details by ID
   */
  @Get('{id}')
  @Middlewares(validateRequest({ params: storageUnitIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'Storage unit not found')
  public async getStorageUnitById(
    @Path() id: string
  ): Promise<ApiResponse<StorageUnitResponse>> {
    const unit = await this.storageUnitService.getStorageUnitById(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: unit,
    };
  }

  /**
   * Create a new physical storage unit
   *
   * // @Security('bearerAuth')
   * // @Security('cookieAuth')
   * // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER, FACILITY_MANAGER
   */
  @Post('')
  @Middlewares(validateRequest({ body: createStorageUnitSchema }))
  @SuccessResponse(201, 'Created')
  @Response<ApiErrorResponse>(
    400,
    'Invalid request or unit number already exists'
  )
  @Response<ApiErrorResponse>(404, 'Facility or Unit Type not found')
  public async createStorageUnit(
    @Body() requestBody: CreateStorageUnitRequest
  ): Promise<ApiResponse<StorageUnitResponse>> {
    const unit = await this.storageUnitService.createStorageUnit(requestBody);
    this.setStatus(201);

    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Storage Unit']),
      data: unit,
    };
  }

  /**
   * Update storage unit information (unitNumber, floor, zone, notes, unitTypeId)
   *
   * // @Security('bearerAuth')
   * // @Security('cookieAuth')
   * // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER, FACILITY_MANAGER
   */
  @Patch('{id}')
  @Middlewares(
    validateRequest({
      params: storageUnitIdParamSchema,
      body: updateStorageUnitSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Invalid request or duplicate unit number')
  @Response<ApiErrorResponse>(404, 'Storage unit not found')
  public async updateStorageUnit(
    @Path() id: string,
    @Body() requestBody: UpdateStorageUnitRequest
  ): Promise<ApiResponse<StorageUnitResponse>> {
    const updated = await this.storageUnitService.updateStorageUnit(
      id,
      requestBody
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Storage Unit']),
      data: updated,
    };
  }

  /**
   * Toggle maintenance status for storage unit (AVAILABLE <-> UNDER_MAINTENANCE)
   * Turning maintenance off is rejected (MESSAGE_CODE_629) while customer goods remain inside the unit.
   *
   * // @Security('bearerAuth')
   * // @Security('cookieAuth')
   * // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER, FACILITY_MANAGER, FACILITY_STAFF
   */
  @Patch('{id}/maintenance')
  @Middlewares(
    validateRequest({
      params: storageUnitIdParamSchema,
      body: toggleMaintenanceSchema,
    })
  )
  @Response<ApiErrorResponse>(
    400,
    'Unit cannot be put into/taken out of maintenance in current status, or still contains customer inventory (MESSAGE_CODE_629)'
  )
  @Response<ApiErrorResponse>(404, 'Storage unit not found')
  public async toggleMaintenance(
    @Path() id: string,
    @Body() requestBody: ToggleMaintenanceRequest
  ): Promise<ApiResponse<StorageUnitResponse>> {
    const updated = await this.storageUnitService.toggleMaintenance(
      id,
      requestBody
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, [
        'Storage Unit Maintenance Status',
      ]),
      data: updated,
    };
  }

  /**
   * Soft-delete storage unit
   *
   * // @Security('bearerAuth')
   * // @Security('cookieAuth')
   * // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
   */
  @Delete('{id}')
  @Middlewares(validateRequest({ params: storageUnitIdParamSchema }))
  @Response<ApiErrorResponse>(
    400,
    'Cannot delete unit while reserved or occupied'
  )
  @Response<ApiErrorResponse>(404, 'Storage unit not found')
  public async deleteStorageUnit(
    @Path() id: string
  ): Promise<ApiResponse<null>> {
    await this.storageUnitService.deleteStorageUnit(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_004,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_004, ['Storage Unit']),
      data: null,
    };
  }

  /**
   * Restore soft-deleted storage unit
   *
   * // @Security('bearerAuth')
   * // @Security('cookieAuth')
   * // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
   */
  @Post('{id}/restore')
  @Middlewares(validateRequest({ params: storageUnitIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Storage unit is not deleted or invalid ID')
  @Response<ApiErrorResponse>(404, 'Storage unit not found')
  public async restoreStorageUnit(
    @Path() id: string
  ): Promise<ApiResponse<StorageUnitResponse>> {
    const unit = await this.storageUnitService.restoreStorageUnit(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Storage Unit']),
      data: unit,
    };
  }

  /**
   * Reconcile orphan RESERVED storage units that have no active Reservation or Contract.
   *
   * // @Security('bearerAuth')
   * // @Security('cookieAuth')
   * // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
   */
  @Post('reconcile')
  @SuccessResponse(200, 'Success')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async reconcile(@Request() req: ExpressRequest): Promise<
    ApiResponse<{
      reconciledCount: number;
      details: Array<{
        unitId: string;
        unitNumber: string;
        facilityId: string;
      }>;
    }>
  > {
    const caller = extractCaller(req);
    const result = await this.storageUnitService.reconcileStorageUnits(
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
}
