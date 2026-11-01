import type { ClientSession, FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IInvoice, InvoiceReminderMilestone } from './invoice.model.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
} from '../../common/enums/billing.enum.ts';
import { paginate } from '../../utils/pagination.util.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

export interface InvoiceFilter {
  contractId?: string;
  customerId?: string;
  facilityId?: string;
  status?: InvoiceStatusEnum;
  type?: InvoiceTypeEnum;
  dueBefore?: Date | string;
  dueAfter?: Date | string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class InvoiceRepository {
  constructor(private readonly invoiceModel: SoftDeleteModel<IInvoice>) {}

  async create(
    data: Partial<IInvoice>,
    session?: ClientSession
  ): Promise<IInvoice> {
    const docs = await this.invoiceModel.create([data], { session });
    return docs[0];
  }

  async findById(
    id: string,
    session?: ClientSession
  ): Promise<IInvoice | null> {
    return this.invoiceModel
      .findById(id)
      .session(session || null)
      .exec();
  }

  async findByIdWithDetails(
    id: string,
    session?: ClientSession
  ): Promise<IInvoice | null> {
    return this.invoiceModel
      .findById(id)
      .session(session || null)
      .populate('facilityId', 'name address code')
      .populate('customerId', 'name email phoneNumber')
      .populate('contractId', 'contractCode startDate endDate status')
      .populate('paymentId', 'paymentCode amount method status paidAt')
      .populate('createdBy', 'name email role')
      .populate('confirmedBy', 'name email role')
      .populate('cancelledBy', 'name email role')
      .exec();
  }

  async findByInvoiceCode(
    invoiceCode: string,
    session?: ClientSession
  ): Promise<IInvoice | null> {
    return this.invoiceModel
      .findOne({ invoiceCode })
      .session(session || null)
      .exec();
  }

  async findByContractId(
    contractId: string,
    session?: ClientSession
  ): Promise<IInvoice[]> {
    return this.invoiceModel
      .find({ contractId })
      .session(session || null)
      .sort({ billingPeriodIndex: 1, createdAt: 1 })
      .exec();
  }

  async findActiveByContractAndPeriod(
    contractId: string,
    billingPeriodIndex: number,
    type?: InvoiceTypeEnum,
    session?: ClientSession
  ): Promise<IInvoice | null> {
    const query: Record<string, unknown> = {
      contractId,
      billingPeriodIndex,
      status: { $ne: InvoiceStatusEnum.CANCELLED },
    };
    if (type) {
      query.type = type;
    }
    return this.invoiceModel
      .findOne(query)
      .session(session || null)
      .exec();
  }

  async findLatestByContractId(
    contractId: string,
    session?: ClientSession
  ): Promise<IInvoice | null> {
    return this.invoiceModel
      .findOne({
        contractId,
        status: { $ne: InvoiceStatusEnum.CANCELLED },
      })
      .session(session || null)
      .sort({ billingPeriodIndex: -1, createdAt: -1 })
      .exec();
  }

  async findPendingDueInvoices(
    targetDate: Date,
    facilityId?: string,
    session?: ClientSession
  ): Promise<IInvoice[]> {
    const filter: FilterQuery<IInvoice> = {
      status: InvoiceStatusEnum.ISSUED,
      dueDate: { $lte: targetDate },
    };

    if (facilityId) {
      filter.facilityId = facilityId;
    }

    return this.invoiceModel
      .find(filter)
      .session(session || null)
      .sort({ dueDate: 1 })
      .exec();
  }

  async findOverdueInvoices(
    graceTargetDate: Date,
    limit = 50,
    session?: ClientSession
  ): Promise<IInvoice[]> {
    const filter: FilterQuery<IInvoice> = {
      status: InvoiceStatusEnum.ISSUED,
      dueDate: { $lte: graceTargetDate },
    };

    return this.invoiceModel
      .find(filter)
      .session(session || null)
      .populate('customerId', 'name email phoneNumber')
      .populate('contractId', 'contractCode status')
      .sort({ dueDate: 1 })
      .limit(limit)
      .exec();
  }

  async findInvoicesForReminders(
    startDate: Date,
    endDate: Date,
    limit = 100,
    session?: ClientSession
  ): Promise<IInvoice[]> {
    const filter: FilterQuery<IInvoice> = {
      status: InvoiceStatusEnum.ISSUED,
      dueDate: { $gte: startDate, $lte: endDate },
    };

    return this.invoiceModel
      .find(filter)
      .session(session || null)
      .populate('customerId', 'name email phoneNumber')
      .populate('contractId', 'contractCode status')
      .sort({ dueDate: 1 })
      .limit(limit)
      .exec();
  }

  async recordReminderSent(
    invoiceId: string,
    milestone: InvoiceReminderMilestone,
    session?: ClientSession
  ): Promise<IInvoice | null> {
    return this.invoiceModel
      .findByIdAndUpdate(
        invoiceId,
        {
          $push: {
            remindersSent: {
              milestone,
              sentAt: new Date(),
            },
          },
        },
        { returnDocument: 'after', session }
      )
      .exec();
  }

  async atomicUpdateStatus(
    id: string,
    expectedStatus: InvoiceStatusEnum | InvoiceStatusEnum[],
    updateData: Partial<IInvoice>,
    session?: ClientSession
  ): Promise<IInvoice | null> {
    const statusFilter = Array.isArray(expectedStatus)
      ? { $in: expectedStatus }
      : expectedStatus;

    return this.invoiceModel
      .findOneAndUpdate(
        { _id: id, status: statusFilter },
        { $set: updateData },
        { returnDocument: 'after', session }
      )
      .exec();
  }

  async countUnpaidByContract(
    contractId: string,
    session?: ClientSession
  ): Promise<number> {
    return this.invoiceModel
      .countDocuments({
        contractId,
        status: {
          $in: [InvoiceStatusEnum.ISSUED, InvoiceStatusEnum.OVERDUE],
        },
      })
      .session(session || null);
  }

  async findUnpaidByContract(
    contractId: string,
    session?: ClientSession
  ): Promise<IInvoice[]> {
    return this.invoiceModel
      .find({
        contractId,
        status: {
          $in: [InvoiceStatusEnum.ISSUED, InvoiceStatusEnum.OVERDUE],
        },
      })
      .session(session || null)
      .sort({ billingPeriodIndex: 1, createdAt: 1 })
      .exec();
  }

  async findPaginated(filter: InvoiceFilter): Promise<PaginatedData<IInvoice>> {
    const queryFilter: FilterQuery<IInvoice> = {};

    if (filter.contractId) {
      queryFilter.contractId = filter.contractId;
    }

    if (filter.customerId) {
      queryFilter.customerId = filter.customerId;
    }

    if (filter.facilityId) {
      queryFilter.facilityId = filter.facilityId;
    }

    if (filter.status) {
      queryFilter.status = filter.status;
    }

    if (filter.type) {
      queryFilter.type = filter.type;
    }

    if (filter.dueBefore || filter.dueAfter) {
      const dateFilter: Record<string, Date> = {};
      if (filter.dueBefore) {
        dateFilter.$lte = new Date(filter.dueBefore);
      }
      if (filter.dueAfter) {
        dateFilter.$gte = new Date(filter.dueAfter);
      }
      queryFilter.dueDate = dateFilter;
    }

    return paginate<IInvoice>(this.invoiceModel, {
      page: filter.page,
      limit: filter.limit,
      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
      filter: queryFilter,
    });
  }
}
