import { z } from 'zod';
import {
  NotificationTypeEnum,
  NotificationPriorityEnum,
  NotificationChannelEnum,
} from '../../../common/enums/notification.enum.ts';

export const notificationResponseSchema = z.object({
  id: z.string(),
  recipientId: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.nativeEnum(NotificationTypeEnum),
  priority: z.nativeEnum(NotificationPriorityEnum),
  channels: z.array(z.nativeEnum(NotificationChannelEnum)),
  isRead: z.boolean(),
  readAt: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const notificationListResponseSchema = z.array(
  notificationResponseSchema
);

export const unreadCountResponseSchema = z.object({
  unreadCount: z.number(),
});

export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
export type NotificationListResponse = z.infer<
  typeof notificationListResponseSchema
>;
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>;
