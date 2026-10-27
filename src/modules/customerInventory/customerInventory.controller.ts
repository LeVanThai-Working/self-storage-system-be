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
  CustomerInventoryService,
  CallerContext,
} from './customerInventory.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import {
  stockInRequestSchema,
  stockOutRequestSchema,
  stockMoveRequestSchema,
  stockAdjustRequestSchema,
  customerInventoryQuerySchema,
  inventoryMovementQuerySchema,
  customerInventorySummaryQuerySchema,
  inventoryIdParamSchema,
  storageUnitTreeParamSchema,
  skuLocationsParamSchema,
  barcodeParamSchema,
  batchMigrateRackRequestSchema,
  type StockInRequest,
  type StockOutRequest,
  type StockMoveRequest,
  type StockAdjustRequest,
  type CustomerInventoryQuery,
  type CustomerInventorySummaryQuery,
  type InventoryMovementQuery,
  type BatchMigrateRackRequest,
} from './schemas/customerInventory.request.schema.ts';
import type {
  CustomerInventoryResponse,
  InventoryMovementResponse,
  StorageUnitInventoryTreeResponse,
  SkuLocationsResponse,
  CustomerInventorySummaryResponse,
  BatchMigrateRackResponse,
} from './schemas/customerInventory.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

/**
 * Helper to extract caller identity flexibly during development (Rule 14)
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

  // Header x-user-id fallback for testing / development
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
      };
      if (payload?.userId) {
        return {
          id: payload.userId,
          role: payload.role,
        };
      }
    } catch {
      // ignore
    }
  }

  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    try {
      const payload = jwtUtil.verifyAccessToken(cookieToken) as {
        userId?: string;
        role?: string;
      };
      if (payload?.userId) {
        return {
          id: payload.userId,
          role: payload.role,
        };
      }
    } catch {
      // ignore
    }
  }

  throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
}

@Tags('Customer Inventories')
@Route('customer-inventories')
export class CustomerInventoryController extends Controller {
  constructor(
    private readonly customerInventoryService: CustomerInventoryService
  ) {
    super();
  }

  /**
   * 1. Stock In (Stock In)
   * Customer stores new items into their unit or rack tier.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Post('in')
  @Middlewares(validateRequest({ body: stockInRequestSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async stockIn(
    @Request() req: ExpressRequest,
    @Body() body: StockInRequest
  ): Promise<ApiResponse<CustomerInventoryResponse>> {
    const caller = extractCaller(req);
    const data = await this.customerInventoryService.stockIn(body, caller);

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
   * 2. Stock Out (Stock Out)
   * Customer retrieves items from their unit or rack tier.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Post('out')
  @Middlewares(validateRequest({ body: stockOutRequestSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async stockOut(
    @Request() req: ExpressRequest,
    @Body() body: StockOutRequest
  ): Promise<ApiResponse<CustomerInventoryResponse>> {
    const caller = extractCaller(req);
    const data = await this.customerInventoryService.stockOut(body, caller);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * 3. Internal Stock Move (Stock Move)
   * Customer relocates items between locations in their unit.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Post('move')
  @Middlewares(validateRequest({ body: stockMoveRequestSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async stockMove(
    @Request() req: ExpressRequest,
    @Body() body: StockMoveRequest
  ): Promise<ApiResponse<CustomerInventoryResponse>> {
    const caller = extractCaller(req);
    const data = await this.customerInventoryService.stockMove(body, caller);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * 4. Stock Adjust (Stock Adjust)
   * Customer counts and updates physical inventory with mandatory reason.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Post('adjust')
  @Middlewares(validateRequest({ body: stockAdjustRequestSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async stockAdjust(
    @Request() req: ExpressRequest,
    @Body() body: StockAdjustRequest
  ): Promise<ApiResponse<CustomerInventoryResponse>> {
    const caller = extractCaller(req);
    const data = await this.customerInventoryService.stockAdjust(body, caller);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * 5. Inventory Movement Ledger
   * Ledger transaction history of IN, OUT, MOVE, and ADJUST actions.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Get('movements')
  @Middlewares(validateRequest({ query: inventoryMovementQuerySchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async findAllMovements(
    @Request() req: ExpressRequest,
    @Queries() query: InventoryMovementQuery
  ): Promise<ApiResponse<PaginatedData<InventoryMovementResponse>>> {
    const caller = extractCaller(req);
    const result = await this.customerInventoryService.findAllMovements(
      query,
      caller
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
   * 6. Query current inventory list
   * View current stock quantities of SKUs across units and rack tiers.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Get('')
  @Middlewares(validateRequest({ query: customerInventoryQuerySchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async findAllInventories(
    @Request() req: ExpressRequest,
    @Queries() query: CustomerInventoryQuery
  ): Promise<ApiResponse<PaginatedData<CustomerInventoryResponse>>> {
    const caller = extractCaller(req);
    const result = await this.customerInventoryService.findAllInventories(
      query,
      caller
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
   * 8. Storage Unit Inventory Tree
   * Visual tree structure: Unit -> Racks -> Tiers -> SKUs + floor items + summary.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('unit/{storageUnitId}/tree')
  @Middlewares(validateRequest({ params: storageUnitTreeParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Storage Unit not found')
  public async getStorageUnitTree(
    @Request() req: ExpressRequest,
    @Path() storageUnitId: string
  ): Promise<ApiResponse<StorageUnitInventoryTreeResponse>> {
    const caller = extractCaller(req);
    const data = await this.customerInventoryService.getStorageUnitTree(
      storageUnitId,
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
   * 9. Query SKU storage locations by SKU ID
   * List of all locations (facility, unit, rack, tier) where the SKU is present.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('sku/{skuId}/locations')
  @Middlewares(validateRequest({ params: skuLocationsParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Customer SKU not found')
  public async getSkuLocations(
    @Request() req: ExpressRequest,
    @Path() skuId: string
  ): Promise<ApiResponse<SkuLocationsResponse>> {
    const caller = extractCaller(req);
    const data = await this.customerInventoryService.getSkuLocations(
      skuId,
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
   * 10. Scan barcode to look up SKU storage locations
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('barcode/{barcode}/locations')
  @Middlewares(validateRequest({ params: barcodeParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Customer SKU not found')
  public async getSkuLocationsByBarcode(
    @Request() req: ExpressRequest,
    @Path() barcode: string
  ): Promise<ApiResponse<SkuLocationsResponse>> {
    const caller = extractCaller(req);
    const data = await this.customerInventoryService.getSkuLocationsByBarcode(
      barcode,
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
   * 11. Customer Personal Inventory Dashboard Summary
   * Summary of total SKUs, total items, active contracts, units, category breakdown, and recent movements.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('summary')
  @Middlewares(validateRequest({ query: customerInventorySummaryQuerySchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async getCustomerSummary(
    @Request() req: ExpressRequest,
    @Queries() query?: CustomerInventorySummaryQuery
  ): Promise<ApiResponse<CustomerInventorySummaryResponse>> {
    const caller = extractCaller(req);
    const data = await this.customerInventoryService.getCustomerSummary(
      caller,
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
   * 7. Retrieve single inventory record by ID
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Get('{id}')
  @Middlewares(validateRequest({ params: inventoryIdParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async findInventoryById(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<CustomerInventoryResponse>> {
    const caller = extractCaller(req);
    const data = await this.customerInventoryService.findInventoryById(
      id,
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
   * 8. Batch Rack Migration
   * Internal warehouse operation for Staff/FM/Ops/Admin to migrate all active inventory
   * from source rack to an identical, vacant destination rack with valid legal basis.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Post('racks/batch-migrate')
  @Middlewares(validateRequest({ body: batchMigrateRackRequestSchema }))
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  @Response<ApiErrorResponse>(404, 'Not Found')
  public async batchMigrateRack(
    @Request() req: ExpressRequest,
    @Body() body: BatchMigrateRackRequest
  ): Promise<ApiResponse<BatchMigrateRackResponse>> {
    const caller = extractCaller(req);
    const data = await this.customerInventoryService.batchMigrateRack(
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
}
