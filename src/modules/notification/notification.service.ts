import mongoose from 'mongoose';
import type { NotificationRepository } from './notification.repository.ts';
import type { MailUtil } from '../../utils/mail.util.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { INotification } from './notification.model.ts';
import type {
  CreateNotificationInput,
  NotificationQuery,
} from './schemas/notification.request.schema.ts';
import {
  type NotificationResponse,
  type UnreadCountResponse,
  notificationResponseSchema,
  unreadCountResponseSchema,
} from './schemas/notification.response.schema.ts';
import {
  NotificationChannelEnum,
  NotificationPriorityEnum,
} from '../../common/enums/notification.enum.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import { emitToUser } from '../../config/socket.config.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';

export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly mailUtil?: MailUtil,
    private readonly auditLogService?: AuditLogService
  ) {}

  private formatNotification(
    notification: INotification
  ): NotificationResponse {
    return {
      id: notification._id.toString(),
      recipientId: notification.recipientId.toString(),
      title: notification.title,
      content: notification.content,
      type: notification.type,
      priority: notification.priority,
      channels: notification.channels,
      isRead: notification.isRead,
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
      metadata: notification.metadata as Record<string, unknown> | undefined,
      createdAt: notification.createdAt
        ? notification.createdAt.toISOString()
        : undefined,
      updatedAt: notification.updatedAt
        ? notification.updatedAt.toISOString()
        : undefined,
    };
  }

  /**
   * Internal Core Method: Create and dispatch notification via In-App (Socket.IO), Database, and Email
   */
  async sendNotification(
    input: CreateNotificationInput
  ): Promise<NotificationResponse> {
    const channels =
      input.channels && input.channels.length > 0
        ? input.channels
        : [NotificationChannelEnum.IN_APP];

    const priority = input.priority || NotificationPriorityEnum.NORMAL;

    // 1. Save notification to MongoDB
    const createdDoc = await this.notificationRepository.create({
      recipientId: new mongoose.Types.ObjectId(input.recipientId),
      title: input.title,
      content: input.content,
      type: input.type,
      priority,
      channels,
      isRead: false,
      readAt: null,
      metadata: input.metadata || {},
    });

    const formatted = validateResponse(
      notificationResponseSchema,
      this.formatNotification(createdDoc)
    );

    // 2. Dispatch realtime via Socket.IO if channels include IN_APP
    if (channels.includes(NotificationChannelEnum.IN_APP)) {
      emitToUser(input.recipientId, 'notification:new', formatted);

      // Also push updated unread count to recipient
      this.notificationRepository
        .countUnread(input.recipientId)
        .then((unreadCount) => {
          emitToUser(input.recipientId, 'notification:unread_count', {
            unreadCount,
          });
        })
        .catch((err) => {
          console.warn('Failed to emit unread count update:', err);
        });
    }

    // 3. Dispatch Email if channels include EMAIL and metadata has email or mailUtil is present
    if (
      channels.includes(NotificationChannelEnum.EMAIL) &&
      this.mailUtil &&
      typeof input.metadata?.email === 'string'
    ) {
      this.mailUtil
        .sendNotificationEmail(input.metadata.email, input.title, input.content)
        .catch((err) => {
          console.warn(
            `Failed to send notification email to ${input.metadata?.email}:`,
            err?.message || err
          );
        });
    }

    return formatted;
  }

  /**
   * Get user's notifications with pagination and filters
   */
  async getMyNotifications(
    userId: string,
    query: NotificationQuery
  ): Promise<PaginatedData<NotificationResponse>> {
    const result = await this.notificationRepository.findMyNotifications(
      userId,
      query
    );

    return {
      items: result.items.map((item) =>
        validateResponse(
          notificationResponseSchema,
          this.formatNotification(item)
        )
      ),
      pagination: result.pagination,
    };
  }

  /**
   * Get total unread notifications count for badge display
   */
  async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
    const unreadCount = await this.notificationRepository.countUnread(userId);
    return validateResponse(unreadCountResponseSchema, { unreadCount });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<NotificationResponse> {
    const updated = await this.notificationRepository.markAsRead(
      notificationId,
      userId
    );

    if (!updated) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Notification']);
    }

    const formatted = validateResponse(
      notificationResponseSchema,
      this.formatNotification(updated)
    );

    // Push updated unread count realtime
    this.notificationRepository
      .countUnread(userId)
      .then((unreadCount) => {
        emitToUser(userId, 'notification:unread_count', { unreadCount });
      })
      .catch((err) => {
        console.warn('Failed to emit unread count update:', err);
      });

    return formatted;
  }

  /**
   * Mark all unread notifications of the user as read
   */
  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const modifiedCount =
      await this.notificationRepository.markAllAsRead(userId);

    // Push unreadCount: 0 realtime
    emitToUser(userId, 'notification:unread_count', { unreadCount: 0 });

    return { modifiedCount };
  }

  /**
   * Soft-delete a notification
   */
  async deleteNotification(
    userId: string,
    notificationId: string
  ): Promise<void> {
    const existing = await this.notificationRepository.findByIdAndRecipient(
      notificationId,
      userId
    );

    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Notification']);
    }

    await this.notificationRepository.deleteById(notificationId);

    this.auditLogService?.record({
      action: AuditActionEnum.DELETE,
      resourceType: AuditResourceEnum.NOTIFICATION,
      resourceId: notificationId,
      before: existing,
    });

    // Update unread count if deleted notification was unread
    if (!existing.isRead) {
      this.notificationRepository
        .countUnread(userId)
        .then((unreadCount) => {
          emitToUser(userId, 'notification:unread_count', { unreadCount });
        })
        .catch((err) => {
          console.warn('Failed to emit unread count update:', err);
        });
    }
  }
}
