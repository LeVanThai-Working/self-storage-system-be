import mongoose, { type ClientSession, type FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { INotification } from './notification.model.ts';
import type { NotificationQuery } from './schemas/notification.request.schema.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';

export class NotificationRepository {
  constructor(private readonly notification: SoftDeleteModel<INotification>) {}

  async create(
    data: Partial<INotification>,
    session?: ClientSession
  ): Promise<INotification> {
    const doc = new this.notification(data);
    return doc.save({ session });
  }

  async findMyNotifications(
    userId: string,
    query: NotificationQuery
  ): Promise<PaginateResult<INotification>> {
    const filter: FilterQuery<INotification> = {
      recipientId: new mongoose.Types.ObjectId(userId),
    };

    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.priority) {
      filter.priority = query.priority;
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<INotification>(this.notification, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.notification.countDocuments({
      recipientId: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });
  }

  async findByIdAndRecipient(
    id: string,
    userId: string
  ): Promise<INotification | null> {
    return this.notification.findOne({
      _id: new mongoose.Types.ObjectId(id),
      recipientId: new mongoose.Types.ObjectId(userId),
    });
  }

  async markAsRead(
    id: string,
    userId: string,
    session?: ClientSession
  ): Promise<INotification | null> {
    return this.notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        recipientId: new mongoose.Types.ObjectId(userId),
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { returnDocument: 'after', session }
    );
  }

  async markAllAsRead(
    userId: string,
    session?: ClientSession
  ): Promise<number> {
    const result = await this.notification.updateMany(
      {
        recipientId: new mongoose.Types.ObjectId(userId),
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { session }
    );
    return result.modifiedCount;
  }

  async deleteById(id: string) {
    return this.notification.deleteById(id);
  }
}
