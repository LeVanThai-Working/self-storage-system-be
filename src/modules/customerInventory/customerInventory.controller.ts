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
  inventoryIdParamSchema,
  type StockInRequest,
  type StockOutRequest,
  type StockMoveRequest,
  type StockAdjustRequest,
  type CustomerInventoryQuery,
  type InventoryMovementQuery,
} from './schemas/customerInventory.request.schema.ts';
import type {
  CustomerInventoryResponse,
  InventoryMovementResponse,
} from './schemas/customerInventory.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

/**
 * Helper trích xuất danh tính caller linh hoạt trong giai đoạn phát triển (Rule 14)
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
    };
  }

  // Header x-user-id fallback cho testing / development
  const headerUserId = req.headers['x-user-id'] as string;
  const headerRole = req.headers['x-user-role'] as string;
  if (headerUserId) {
    return {
      id: headerUserId,
      role: headerRole,
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
   * 1. Nhập hàng vào kho/tầng kệ (Stock In)
   * Khách hàng tự nhập thêm hàng vào khoang chứa hoặc tầng kệ của mình.
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
   * 2. Xuất hàng khỏi kho/tầng kệ (Stock Out)
   * Khách hàng tự lấy bớt hàng ra khỏi khoang chứa hoặc tầng kệ.
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
   * 3. Chuyển vị trí hàng nội bộ giữa các tầng kệ (Stock Move)
   * Khách hàng dời hàng giữa các vị trí trong khoang chứa của mình.
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
   * 4. Kiểm kê / Điều chỉnh số lượng tồn kho (Stock Adjust)
   * Khách hàng tự đếm và cập nhật số lượng tồn thực tế kèm lý do bắt buộc.
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
   * 5. Tra cứu nhật ký biến động kho (Inventory Movement Ledger)
   * Lịch sử giao dịch sổ cái nhập/xuất/chuyển/kiểm kê.
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
   * 6. Tra cứu danh sách tồn kho hiện hành
   * Xem số lượng tồn hiện tại của các SKU tại các vị trí/tầng kệ.
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
   * 7. Chi tiết 1 bản ghi tồn kho theo ID
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
}
