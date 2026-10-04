import { Types, type FilterQuery, type Model } from 'mongoose';
import type { IAuditLog } from './auditLog.model.ts';
import type { AuditLogQuery } from './schemas/auditLog.request.schema.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';

export type AuditLogCreateData = Partial<
  Pick<
    IAuditLog,
    | 'version'
    | 'actorRole'
    | 'actorEmail'
    | 'action'
    | 'resourceType'
    | 'resourceId'
    | 'status'
    | 'changes'
    | 'metadata'
    | 'ip'
    | 'userAgent'
    | 'requestId'
    | 'method'
    | 'path'
    | 'createdAt'
  >
> & { actorId: string | null };

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class AuditLogRepository {
  constructor(private readonly auditLog: Model<IAuditLog>) {}

  async insertMany(data: AuditLogCreateData[]): Promise<void> {
    if (data.length === 0) return;
    await this.auditLog.insertMany(data, { ordered: false });
  }

  async findAll(
    query: AuditLogQuery = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IAuditLog>> {
    const filter: FilterQuery<IAuditLog> = {};

    if (query.actorId) filter.actorId = new Types.ObjectId(query.actorId);
    if (query.action) filter.action = query.action;
    if (query.resourceType) filter.resourceType = query.resourceType;
    if (query.resourceId) filter.resourceId = query.resourceId;
    if (query.status) filter.status = query.status;

    if (query.search) {
      const searchRegex = { $regex: escapeRegex(query.search), $options: 'i' };
      filter.$or = [{ actorEmail: searchRegex }, { resourceId: searchRegex }];
    }

    if (query.from || query.to) {
      const createdAt: { $gte?: Date; $lte?: Date } = {};
      if (query.from) createdAt.$gte = new Date(query.from);
      if (query.to) {
        // A date-only `to` (YYYY-MM-DD) includes the whole day
        createdAt.$lte = DATE_ONLY_REGEX.test(query.to)
          ? new Date(`${query.to}T23:59:59.999Z`)
          : new Date(query.to);
      }
      filter.createdAt = createdAt;
    }

    return paginate<IAuditLog>(this.auditLog, {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
      filter,
    });
  }

  async findById(id: string) {
    return this.auditLog.findById(id);
  }
}
