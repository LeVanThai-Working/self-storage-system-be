import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Body,
  Queries,
  Middlewares,
  Request,
  Response,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { StatisticsService } from './statistics.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import type { TokenPayload } from '../../utils/jwt.util.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import {
  StatisticsGranularityEnum,
  FacilityKpiTierEnum,
  FacilityKpiSortByEnum,
  AiInsightFocusAreaEnum,
} from '../../common/enums/statistics.enum.ts';
import {
  statisticsBaseQuerySchema,
  rentalTrendsQuerySchema,
  facilitiesKpiQuerySchema,
  financialAnalyticsQuerySchema,
  ragAdvisorRequestSchema,
} from './schemas/statistics.request.schema.ts';
import type {
  OverviewStatisticsResponse,
  RentalTrendsResponse,
  FacilitiesKpiResponse,
  FinancialAnalyticsResponse,
  ProductAndOperationsResponse,
  RagAdvisorResponse,
  RagEvalResponse,
} from './schemas/statistics.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';

export interface StatisticsBaseQueryDto {
  fromDate?: string;
  toDate?: string;
  facilityId?: string;
}

export interface RentalTrendsQueryDto extends StatisticsBaseQueryDto {
  granularity?: StatisticsGranularityEnum;
}

export interface FacilitiesKpiQueryDto extends StatisticsBaseQueryDto {
  city?: string;
  tier?: FacilityKpiTierEnum;
  sortBy?: FacilityKpiSortByEnum;
  sortOrder?: 'asc' | 'desc';
}

export interface FinancialAnalyticsQueryDto extends StatisticsBaseQueryDto {
  granularity?: StatisticsGranularityEnum;
}

export interface RagAdvisorRequestDto extends StatisticsBaseQueryDto {
  question: string;
  focusArea?: AiInsightFocusAreaEnum;
  topK?: number;
  refresh?: boolean;
}

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
      role: user.role || RoleEnum.CUSTOMER,
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
        role: headerUserRole || RoleEnum.CUSTOMER,
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
          role: payload.role || RoleEnum.CUSTOMER,
        };
      }
    } catch {
      // ignore token verification error
    }
  }

  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    try {
      const payload = jwtUtil.verifyAccessToken(cookieToken) as TokenPayload;
      if (payload?.userId) {
        return {
          userId: payload.userId,
          role: payload.role || RoleEnum.CUSTOMER,
        };
      }
    } catch {
      // ignore
    }
  }

  throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
}

@Tags('Statistics & KPI')
@Route('statistics')
export class StatisticsController extends Controller {
  constructor(private readonly statisticsService: StatisticsService) {
    super();
  }

  /**
   * Tổng quan điều hành toàn chuỗi (Executive Overview):
   * Tỷ lệ lấp đầy kho/kệ/diện tích, doanh thu thực thu & tăng trưởng so với kỳ trước,
   * tiền cọc đang giữ, nợ quá hạn và danh sách công việc cần xử lý ngay (Action Required).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN, FACILITY_MANAGER
  @Get('overview')
  @Middlewares(validateRequest({ query: statisticsBaseQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid Date Range Or Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized Access')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  @Response<ApiErrorResponse>(404, 'Facility Not Found')
  public async getOverview(
    @Request() req: ExpressRequest,
    @Queries() query: StatisticsBaseQueryDto
  ): Promise<ApiResponse<OverviewStatisticsResponse>> {
    const caller = extractCaller(req);
    const data = await this.statisticsService.getOverview(caller.userId, query);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * Phân tích xu hướng thuê theo thời gian (Rental Trends & Temporal Demand):
   * Chuỗi thời gian theo ngày/tuần/tháng/quý, tự động chỉ ra khoảng thời gian cao điểm (peakPeriods)
   * và ít người thuê (lowPeriods), phân bổ nhu cầu theo thứ trong tuần, khung giờ hẹn check-in/ra vào kho,
   * giờ đặt đơn online trong ngày và độ dài kỳ thuê.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN, FACILITY_MANAGER
  @Get('rental-trends')
  @Middlewares(validateRequest({ query: rentalTrendsQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid Date Range Or Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized Access')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  @Response<ApiErrorResponse>(404, 'Facility Not Found')
  public async getRentalTrends(
    @Request() req: ExpressRequest,
    @Queries() query: RentalTrendsQueryDto
  ): Promise<ApiResponse<RentalTrendsResponse>> {
    const caller = extractCaller(req);
    const data = await this.statisticsService.getRentalTrends(
      caller.userId,
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
   * Bảng xếp hạng & Chấm điểm KPI Chi nhánh (Facility KPI Scorecard & Leaderboard):
   * Chấm điểm KPI tổng hợp (0-100), xếp hạng rank, phân loại tier (EXCELLENT/GOOD/AVERAGE/NEEDS_IMPROVEMENT)
   * dựa trên 4 trụ cột: Lấp đầy, Tài chính & Thu hồi nợ, Chuyển đổi & Giữ chân, Chất lượng vận hành & SLA.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN, FACILITY_MANAGER
  @Get('facilities-kpi')
  @Middlewares(validateRequest({ query: facilitiesKpiQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid Date Range Or Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized Access')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  @Response<ApiErrorResponse>(404, 'Facility Not Found')
  public async getFacilitiesKpi(
    @Request() req: ExpressRequest,
    @Queries() query: FacilitiesKpiQueryDto
  ): Promise<ApiResponse<FacilitiesKpiResponse>> {
    const caller = extractCaller(req);
    const data = await this.statisticsService.getFacilitiesKpi(
      caller.userId,
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
   * Phân tích tài chính chuyên sâu (Financial, AR Overdue Aging & Refund Analytics):
   * Chuỗi thời gian doanh thu phát hành vs thực thu vs hoàn tiền, cơ cấu nguồn thu theo khoản mục hóa đơn,
   * tỷ trọng phương thức thanh toán, đối soát cổng SePay, báo cáo tuổi nợ hóa đơn và hoàn tiền theo lý do.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN, FACILITY_MANAGER
  @Get('financial-analytics')
  @Middlewares(validateRequest({ query: financialAnalyticsQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid Date Range Or Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized Access')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  @Response<ApiErrorResponse>(404, 'Facility Not Found')
  public async getFinancialAnalytics(
    @Request() req: ExpressRequest,
    @Queries() query: FinancialAnalyticsQueryDto
  ): Promise<ApiResponse<FinancialAnalyticsResponse>> {
    const caller = extractCaller(req);
    const data = await this.statisticsService.getFinancialAnalytics(
      caller.userId,
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
   * Phân tích hiệu suất sản phẩm & vận hành kho (Product Mix, Booking Funnel & Warehouse Traffic):
   * Hiệu suất lấp đầy và doanh thu theo Loại kho (UnitType), Phân khu kệ (RackZone), Tiện ích bán kèm (Amenity Attach Rate),
   * Phễu chuyển đổi đặt chỗ (Booking Funnel) và Lưu lượng ra vào kho tự quản (AccessSchedule & InventoryMovement).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN, FACILITY_MANAGER
  @Get('product-and-operations')
  @Middlewares(validateRequest({ query: statisticsBaseQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid Date Range Or Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized Access')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  @Response<ApiErrorResponse>(404, 'Facility Not Found')
  public async getProductAndOperations(
    @Request() req: ExpressRequest,
    @Queries() query: StatisticsBaseQueryDto
  ): Promise<ApiResponse<ProductAndOperationsResponse>> {
    const caller = extractCaller(req);
    const data = await this.statisticsService.getProductAndOperations(
      caller.userId,
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
   * Trợ lý RAG Tư vấn Tối ưu hóa Lợi nhuận cho Ops & Quản lý Cơ sở (AI RAG Profit Advisor):
   * Thực hiện Hybrid Retrieval (Gemini Embedding + BM25 Lexical) trên 5 báo cáo thống kê + 4 Playbook nghiệp vụ,
   * định tuyến mô hình thông minh (Fast vs Reasoning), kiểm chứng nguồn trích dẫn (Citations) và đề xuất hành động tăng lợi nhuận.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN, FACILITY_MANAGER
  @Post('ai-rag-advisor')
  @Middlewares(validateRequest({ body: ragAdvisorRequestSchema }))
  @Response<ApiErrorResponse>(
    400,
    'Invalid Request Or Prompt Injection Detected'
  )
  @Response<ApiErrorResponse>(401, 'Unauthorized Access')
  @Response<ApiErrorResponse>(403, 'Access Denied Or Cross-Facility Violation')
  @Response<ApiErrorResponse>(404, 'Facility Not Found')
  public async askRagAdvisor(
    @Request() req: ExpressRequest,
    @Body() body: RagAdvisorRequestDto
  ): Promise<ApiResponse<RagAdvisorResponse>> {
    const caller = extractCaller(req);
    const data = await this.statisticsService.askRagAdvisor(caller.userId, {
      ...body,
      focusArea: body.focusArea ?? AiInsightFocusAreaEnum.ALL,
      topK: body.topK ?? 5,
      refresh: body.refresh ?? false,
    });
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * Kiểm định Tự động Chất lượng Hệ thống RAG (Automated RAG Evaluation Suite):
   * Chạy Golden Dataset (10 kịch bản) để đo lường Retrieval Hit Rate, Citation Faithfulness,
   * Complexity Router Accuracy và Prompt Injection Guardrail Defense Rate. Chỉ dành cho Ops & System Admin.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('ai-rag-eval')
  @Middlewares(validateRequest({ query: statisticsBaseQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid Date Range Or Request')
  @Response<ApiErrorResponse>(401, 'Unauthorized Access')
  @Response<ApiErrorResponse>(403, 'Access Denied')
  public async evaluateRagAdvisor(
    @Request() req: ExpressRequest,
    @Queries() query: StatisticsBaseQueryDto
  ): Promise<ApiResponse<RagEvalResponse>> {
    const caller = extractCaller(req);
    const data = await this.statisticsService.evaluateRagAdvisor(
      caller.userId,
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
}
