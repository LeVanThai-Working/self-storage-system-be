import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Patch,
  Delete,
  Path,
  Body,
  Queries,
  // Security,
  Middlewares,
  Request,
  Response,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { NotificationService } from './notification.service.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { jwtUtil } from '../auth/auth.container.ts';
import {
  notificationQuerySchema,
  notificationIdParamSchema,
  sendTestNotificationSchema,
  type NotificationQuery,
  type SendTestNotificationRequest,
} from './schemas/notification.request.schema.ts';
import {
  NotificationTypeEnum,
  NotificationChannelEnum,
} from '../../common/enums/notification.enum.ts';
import type {
  NotificationResponse,
  UnreadCountResponse,
} from './schemas/notification.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

/**
 * Temporary helper to safely extract userId during development phase when @Security is commented out (Rule 14).
 * Production line ready:
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
      // ignore token verification error
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

@Tags('Notification')
@Route('notifications')
export class NotificationController extends Controller {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  /**
   * Endpoint thử nghiệm bắn thông báo Realtime tạm thời từ Swagger / Postman.
   */
  @Post('test')
  @Middlewares(validateRequest({ body: sendTestNotificationSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid Request')
  public async sendTestNotification(
    @Body() body: SendTestNotificationRequest
  ): Promise<ApiResponse<NotificationResponse>> {
    let notifType = NotificationTypeEnum.SYSTEM_ALERT;
    if (body.type) {
      const lower = body.type.toLowerCase();
      if (lower === 'system') notifType = NotificationTypeEnum.SYSTEM;
      else if (lower === 'approval_request')
        notifType = NotificationTypeEnum.APPROVAL_REQUEST;
      else if (lower === 'storage_unit')
        notifType = NotificationTypeEnum.STORAGE_UNIT;
      else if (lower === 'reservation')
        notifType = NotificationTypeEnum.RESERVATION;
      else if (lower === 'contract') notifType = NotificationTypeEnum.CONTRACT;
      else if (lower === 'payment') notifType = NotificationTypeEnum.PAYMENT;
      else notifType = NotificationTypeEnum.SYSTEM_ALERT;
    }

    const data = await this.notificationService.sendNotification({
      recipientId: body.recipientId,
      title: body.title,
      content: body.body,
      type: notifType,
      channels: [NotificationChannelEnum.IN_APP],
    });

    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, [
        'Test Notification',
      ]),
      data,
    };
  }

  /**
   * Lấy danh sách thông báo của người dùng hiện tại (hỗ trợ phân trang, lọc theo isRead, type, priority).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('')
  @Middlewares(validateRequest({ query: notificationQuerySchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async getMyNotifications(
    @Request() req: ExpressRequest,
    @Queries() query: NotificationQuery
  ): Promise<ApiResponse<PaginatedData<NotificationResponse>>> {
    // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const userId = extractUserId(req);
    if (!userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const result = await this.notificationService.getMyNotifications(
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

  /**
   * Lấy tổng số thông báo chưa đọc của người dùng hiện tại (phục vụ hiển thị badge chuông thông báo).
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Get('unread-count')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async getUnreadCount(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<UnreadCountResponse>> {
    // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const userId = extractUserId(req);
    if (!userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const data = await this.notificationService.getUnreadCount(userId);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }

  /**
   * Đánh dấu 1 thông báo là đã đọc.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Patch('{id}/read')
  @Middlewares(validateRequest({ params: notificationIdParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(404, 'Notification Not Found')
  public async markAsRead(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<NotificationResponse>> {
    // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const userId = extractUserId(req);
    if (!userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const data = await this.notificationService.markAsRead(userId, id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Notification']),
      data,
    };
  }

  /**
   * Đánh dấu tất cả thông báo chưa đọc của người dùng là đã đọc.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Patch('read-all')
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  public async markAllAsRead(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<{ modifiedCount: number }>> {
    // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const userId = extractUserId(req);
    if (!userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const data = await this.notificationService.markAllAsRead(userId);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['Notifications']),
      data,
    };
  }

  /**
   * Xoá mềm 1 thông báo của người dùng.
   */
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN
  @Delete('{id}')
  @Middlewares(validateRequest({ params: notificationIdParamSchema }))
  @Response<ApiErrorResponse>(401, 'Unauthorized')
  @Response<ApiErrorResponse>(404, 'Notification Not Found')
  public async deleteNotification(
    @Request() req: ExpressRequest,
    @Path() id: string
  ): Promise<ApiResponse<null>> {
    // const userId = (req.user as unknown as { _id: { toString(): string } })._id.toString();
    const userId = extractUserId(req);
    if (!userId) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    await this.notificationService.deleteNotification(userId, id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_004,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_004, ['Notification']),
      data: null,
    };
  }
}
