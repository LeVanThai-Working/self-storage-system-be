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
  Query,
  Response,
  // Security,
  Middlewares,
  Request,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type {
  CustomerSkuService,
  CallerContext,
} from './customerSku.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import {
  createCustomerSkuSchema,
  updateCustomerSkuSchema,
  customerSkuQuerySchema,
  customerSkuIdParamSchema,
  barcodeParamSchema,
  type CreateCustomerSkuRequest,
  type UpdateCustomerSkuRequest,
  type CustomerSkuQuery,
} from './schemas/customerSku.request.schema.ts';
import type { CustomerSkuResponse } from './schemas/customerSku.response.schema.ts';
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
      assignedFacilityId: user.assignedFacilityId?.toString(),
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
      // ignore
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
      // ignore
    }
  }

  throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
}

@Tags('Customer SKU')
@Route('customer-skus')
export class CustomerSkuController extends Controller {
  constructor(private readonly customerSkuService: CustomerSkuService) {
    super();
  }

  /**
   * Tạo mã hàng SKU mới
   * Chỉ dành riêng cho Customer tự khai báo danh mục hàng hóa của mình
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('')
  @Middlewares(validateRequest({ body: createCustomerSkuSchema }))
  @Response<ApiErrorResponse>(
    400,
    'Invalid request or duplicate SKU code / barcode'
  )
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Forbidden')
  public async createSku(
    @Request() req: ExpressRequest,
    @Body() body: CreateCustomerSkuRequest
  ): Promise<ApiResponse<CustomerSkuResponse>> {
    const caller = extractCaller(req);
    const created = await this.customerSkuService.createSku(body, caller);

    this.setStatus(201);
    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['Customer SKU']),
      data: created,
    };
  }

  /**
   * Lấy danh sách SKU có phân trang và bộ lọc
   * Customer chỉ xem được của mình; FM xem theo customerId của khách thuê tại cơ sở; Staff bị chặn
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('')
  @Middlewares(validateRequest({ query: customerSkuQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  public async getSkus(
    @Request() req: ExpressRequest,
    @Queries() query: CustomerSkuQuery
  ): Promise<ApiResponse<PaginatedData<CustomerSkuResponse>>> {
    const caller = extractCaller(req);
    const { items, pagination } = await this.customerSkuService.findAll(
      query,
      caller
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: { items, pagination },
    };
  }

  /**
   * Tra cứu nhanh SKU qua mã vạch barcode
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('barcode/{barcode}')
  @Middlewares(validateRequest({ params: barcodeParamSchema }))
  @Response<ApiErrorResponse>(404, 'Customer SKU not found')
  public async getSkuByBarcode(
    @Request() req: ExpressRequest,
    @Path() barcode: string,
    @Query() customerId?: string
  ): Promise<ApiResponse<CustomerSkuResponse>> {
    const caller = extractCaller(req);
    const sku = await this.customerSkuService.findByBarcode(
      barcode,
      caller,
      customerId
    );

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: sku,
    };
  }

  /**
   * Chi tiết một SKU theo ID
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('{id}')
  @Middlewares(validateRequest({ params: customerSkuIdParamSchema }))
  @Response<ApiErrorResponse>(404, 'Customer SKU not found')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  public async getSkuById(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<CustomerSkuResponse>> {
    const caller = extractCaller(req);
    const sku = await this.customerSkuService.findById(id, caller);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: sku,
    };
  }

  /**
   * Cập nhật thông tin SKU
   * Chỉ dành cho Customer sở hữu SKU đó
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Patch('{id}')
  @Middlewares(
    validateRequest({
      params: customerSkuIdParamSchema,
      body: updateCustomerSkuSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Bad Request')
  @Response<ApiErrorResponse>(404, 'Customer SKU not found')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  public async updateSku(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Body() body: UpdateCustomerSkuRequest
  ): Promise<ApiResponse<CustomerSkuResponse>> {
    const caller = extractCaller(req);
    const updated = await this.customerSkuService.updateSku(id, body, caller);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Customer SKU']),
      data: updated,
    };
  }

  /**
   * Xoá mềm SKU
   * Chặn xoá nếu SKU còn tồn kho
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Delete('{id}')
  @Middlewares(validateRequest({ params: customerSkuIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Cannot delete SKU with active inventory')
  @Response<ApiErrorResponse>(404, 'Customer SKU not found')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  public async deleteSku(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<null>> {
    const caller = extractCaller(req);
    await this.customerSkuService.deleteSku(id, caller);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_004,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_004, ['Customer SKU']),
      data: null,
    };
  }

  /**
   * Khôi phục SKU đã xoá mềm
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER
  @Post('{id}/restore')
  @Middlewares(validateRequest({ params: customerSkuIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'SKU code conflict')
  @Response<ApiErrorResponse>(404, 'Customer SKU not found')
  public async restoreSku(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<CustomerSkuResponse>> {
    const caller = extractCaller(req);
    const restored = await this.customerSkuService.restoreSku(id, caller);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: restored,
    };
  }
}
