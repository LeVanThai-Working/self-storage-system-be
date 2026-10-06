import {
  Controller,
  Route,
  Tags,
  Get,
  Queries,
  // Security,
  Middlewares,
  Request,
  Response,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { FacilityManagerService } from './facilityManager.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import {
  facilityStaffQuerySchema,
  type FacilityStaffQuery,
} from './schemas/facilityManager.request.schema.ts';
import type { FacilityResponse } from '../facility/schemas/facility.response.schema.ts';
import type { UserResponse } from '../user/schemas/user.response.schema.ts';
import type { MyFacilityDashboardResponse } from './schemas/facilityManager.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

/**
 * Helper tạm thời để trích xuất userId trong giai đoạn phát triển (khi @Security đang ẩn).
 * Khi bước vào phase phân quyền (bật lại @Security), xóa helper này và mở lại các dòng:
 * // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
 */
function extractUserId(req: ExpressRequest): string | undefined {
  const user = req.user as { _id?: { toString(): string } } | undefined;
  if (user?._id) {
    return user._id.toString();
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwtUtil.verifyAccessToken(authHeader.split(' ')[1]) as {
        userId?: string;
      };
      if (payload?.userId) return payload.userId;
    } catch {
      // ignore token verification error; will throw 401 below
    }
  }
  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    try {
      const payload = jwtUtil.verifyAccessToken(cookieToken) as {
        userId?: string;
      };
      if (payload?.userId) return payload.userId;
    } catch {
      // ignore
    }
  }
  return undefined;
}
@Tags('Facility Manager')
@Route('my-facility')
export class FacilityManagerController extends Controller {
  constructor(private readonly facilityManagerService: FacilityManagerService) {
    super();
  }

  /**
   * Tra cứu thông tin chi tiết cơ sở mà Facility Manager hiện tại đang phụ trách.
   * Danh tính được xác định từ token đăng nhập.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('')
  @Response<ApiErrorResponse>(401, 'Unauthorized Access')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  @Response<ApiErrorResponse>(404, 'Assigned Facility Not Found')
  @Response<ApiErrorResponse>(500, 'Internal Server Error')
  public async getMyFacility(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<FacilityResponse>> {
    // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const userId = extractUserId(req);
    if (!userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const facility = await this.facilityManagerService.getMyFacility(userId);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: facility,
    };
  }

  /**
   * Dashboard thống kê tổng quan cơ sở: số lượng phòng theo trạng thái, tỷ lệ lấp đầy (occupancyRate),
   * tổng tiện ích, số lượng đang sử dụng, và số tiện ích hết hàng.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('dashboard')
  @Response<ApiErrorResponse>(401, 'Unauthorized Access')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  @Response<ApiErrorResponse>(404, 'Assigned Facility Not Found')
  @Response<ApiErrorResponse>(500, 'Internal Server Error')
  public async getMyFacilityDashboard(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<MyFacilityDashboardResponse>> {
    // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const userId = extractUserId(req);
    if (!userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const dashboard =
      await this.facilityManagerService.getMyFacilityDashboard(userId);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: dashboard,
    };
  }

  /**
   * Lấy danh sách nhân viên (FACILITY_STAFF) thuộc cơ sở do Facility Manager quản lý.
   * Hỗ trợ phân trang, tìm kiếm theo tên/email/sđt, lọc theo trạng thái, và sắp xếp.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('staffs')
  @Middlewares(validateRequest({ query: facilityStaffQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized Access')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  @Response<ApiErrorResponse>(404, 'Assigned Facility Not Found')
  @Response<ApiErrorResponse>(500, 'Internal Server Error')
  public async getMyFacilityStaffs(
    @Request() req: ExpressRequest,
    @Queries() query: FacilityStaffQuery
  ): Promise<ApiResponse<PaginatedData<UserResponse>>> {
    // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const userId = extractUserId(req);
    if (!userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const result = await this.facilityManagerService.getMyFacilityStaffs(
      userId,
      query
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
