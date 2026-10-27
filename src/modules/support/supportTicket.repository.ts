import {
  Types,
  type ClientSession,
  type FilterQuery,
  type UpdateQuery,
} from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import { SupportTicket, type ISupportTicket } from './supportTicket.model.ts';
import {
  SupportTicketCategoryEnum,
  SupportTicketPriorityEnum,
  SupportTicketStatusEnum,
} from '../../common/enums/supportTicket.enum.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';

export interface SupportTicketQueryFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customerId?: string;
  facilityId?: string;
  contractId?: string;
  assignedStaffId?: string;
  status?: SupportTicketStatusEnum;
  category?: SupportTicketCategoryEnum;
  priority?: SupportTicketPriorityEnum;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class SupportTicketRepository {
  constructor(
    private readonly model: SoftDeleteModel<ISupportTicket> = SupportTicket
  ) {}

  async create(
    data: Partial<ISupportTicket>,
    session?: ClientSession
  ): Promise<ISupportTicket> {
    const docs = await this.model.create([data], { session });
    return docs[0];
  }

  async findById(
    id: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<ISupportTicket | null> {
    if (typeof id === 'string' && !Types.ObjectId.isValid(id)) return null;
    const q = this.model
      .findById(id)
      .populate('customerId', 'name email phoneNumber role')
      .populate('facilityId', 'code name address')
      .populate('contractId', 'contractCode status startDate endDate')
      .populate('assignedStaffId', 'name email phoneNumber role')
      .populate('staffResponse.respondedBy', 'name email phoneNumber role');

    if (session) q.session(session);
    return q.exec();
  }

  async findByCode(
    ticketCode: string,
    session?: ClientSession
  ): Promise<ISupportTicket | null> {
    const q = this.model
      .findOne({ ticketCode: ticketCode.toUpperCase() })
      .populate('customerId', 'name email phoneNumber role')
      .populate('facilityId', 'code name address')
      .populate('contractId', 'contractCode status startDate endDate')
      .populate('assignedStaffId', 'name email phoneNumber role')
      .populate('staffResponse.respondedBy', 'name email phoneNumber role');

    if (session) q.session(session);
    return q.exec();
  }

  async findPaginated(
    filter: SupportTicketQueryFilter
  ): Promise<PaginateResult<ISupportTicket>> {
    const mongoFilter: FilterQuery<ISupportTicket> = { deleted: false };

    if (filter.customerId && Types.ObjectId.isValid(filter.customerId)) {
      mongoFilter.customerId = new Types.ObjectId(filter.customerId);
    }
    if (filter.facilityId && Types.ObjectId.isValid(filter.facilityId)) {
      mongoFilter.facilityId = new Types.ObjectId(filter.facilityId);
    }
    if (filter.contractId && Types.ObjectId.isValid(filter.contractId)) {
      mongoFilter.contractId = new Types.ObjectId(filter.contractId);
    }
    if (
      filter.assignedStaffId &&
      Types.ObjectId.isValid(filter.assignedStaffId)
    ) {
      mongoFilter.assignedStaffId = new Types.ObjectId(filter.assignedStaffId);
    }
    if (filter.status) {
      mongoFilter.status = filter.status;
    }
    if (filter.category) {
      mongoFilter.category = filter.category;
    }
    if (filter.priority) {
      mongoFilter.priority = filter.priority;
    }

    if (filter.startDate || filter.endDate) {
      mongoFilter.createdAt = {};
      if (filter.startDate) {
        mongoFilter.createdAt.$gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        mongoFilter.createdAt.$lte = new Date(filter.endDate);
      }
    }

    if (filter.search && filter.search.trim()) {
      const searchRegex = new RegExp(filter.search.trim(), 'i');
      mongoFilter.$or = [
        { ticketCode: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
      ];
    }

    return paginate<ISupportTicket>(this.model, {
      page: filter.page || 1,
      limit: filter.limit || 10,
      sortBy: filter.sortBy || 'createdAt',
      sortOrder: filter.sortOrder || 'desc',
      filter: mongoFilter,
      populate: [
        { path: 'customerId', select: 'name email phoneNumber role' },
        { path: 'facilityId', select: 'code name address' },
        {
          path: 'contractId',
          select: 'contractCode status startDate endDate',
        },
        { path: 'assignedStaffId', select: 'name email phoneNumber role' },
        {
          path: 'staffResponse.respondedBy',
          select: 'name email phoneNumber role',
        },
      ],
    });
  }

  async countTicketsToday(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.model.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });
  }

  async atomicUpdateStatus(
    id: string | Types.ObjectId,
    currentStatus: SupportTicketStatusEnum | SupportTicketStatusEnum[],
    updateData: UpdateQuery<ISupportTicket>,
    session?: ClientSession
  ): Promise<ISupportTicket | null> {
    if (typeof id === 'string' && !Types.ObjectId.isValid(id)) return null;

    const statusCondition = Array.isArray(currentStatus)
      ? { $in: currentStatus }
      : currentStatus;

    return this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          status: statusCondition,
          deleted: false,
        },
        updateData,
        {
          returnDocument: 'after',
          session,
        }
      )
      .populate('customerId', 'name email phoneNumber role')
      .populate('facilityId', 'code name address')
      .populate('contractId', 'contractCode status startDate endDate')
      .populate('assignedStaffId', 'name email phoneNumber role')
      .populate('staffResponse.respondedBy', 'name email phoneNumber role')
      .exec();
  }

  async update(
    id: string | Types.ObjectId,
    updateData: UpdateQuery<ISupportTicket>,
    session?: ClientSession
  ): Promise<ISupportTicket | null> {
    if (typeof id === 'string' && !Types.ObjectId.isValid(id)) return null;

    return this.model
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after', session })
      .populate('customerId', 'name email phoneNumber role')
      .populate('facilityId', 'code name address')
      .populate('contractId', 'contractCode status startDate endDate')
      .populate('assignedStaffId', 'name email phoneNumber role')
      .populate('staffResponse.respondedBy', 'name email phoneNumber role')
      .exec();
  }
}
