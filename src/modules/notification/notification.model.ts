import mongoose, { Schema } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import {
  NotificationTypeEnum,
  NotificationPriorityEnum,
  NotificationChannelEnum,
} from '../../common/enums/notification.enum.ts';

export interface INotification extends SoftDeleteDocument {
  _id: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  type: NotificationTypeEnum;
  priority: NotificationPriorityEnum;
  channels: NotificationChannelEnum[];
  isRead: boolean;
  readAt: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationTypeEnum),
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriorityEnum),
      default: NotificationPriorityEnum.NORMAL,
    },
    channels: {
      type: [String],
      enum: Object.values(NotificationChannelEnum),
      default: [NotificationChannelEnum.IN_APP],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal querying
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });

notificationSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const Notification = mongoose.model<
  INotification,
  SoftDeleteModel<INotification>
>('Notification', notificationSchema);
