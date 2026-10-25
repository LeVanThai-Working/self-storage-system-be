import type { ClientSession, FilterQuery, Model } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IPayment, IPaymentTransaction } from './payment.model.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import {
  PaymentPurposeEnum,
  PaymentStatusEnum,
  PaymentTransactionResultEnum,
} from '../../common/enums/payment.enum.ts';

export interface PaymentQueryFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customerId?: string;
  facilityId?: string;
  reservationId?: string;
  contractId?: string;
  purpose?: PaymentPurposeEnum;
  status?: PaymentStatusEnum;
  paymentCode?: string;
  createdAtFrom?: string | Date;
  createdAtTo?: string | Date;
}

export interface PaymentTransactionQueryFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  result?: PaymentTransactionResultEnum;
  gateway?: string;
  accountNumber?: string;
  code?: string;
}

export class PaymentRepository {
  constructor(
    private readonly payment: SoftDeleteModel<IPayment>,
    private readonly paymentTransaction: Model<IPaymentTransaction>
  ) {}

  // -------------------------------------------------------------
  // Payment methods
  // -------------------------------------------------------------

  async create(data: Partial<IPayment>, session?: ClientSession) {
    if (session) {
      const [created] = await this.payment.create([data], { session });
      return created;
    }
    return this.payment.create(data);
  }

  async findById(id: string, session?: ClientSession) {
    const query = this.payment
      .findById(id)
      .populate('customerId', 'name email phoneNumber role status')
      .populate('facilityId', 'name city address phone email status')
      .populate('confirmedBy', 'name email role')
      .populate('cancelledBy', 'name email role');

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findByCode(code: string, session?: ClientSession) {
    const query = this.payment
      .findOne({ paymentCode: code.toUpperCase() })
      .populate('customerId', 'name email phoneNumber role status')
      .populate('facilityId', 'name city address phone email status');

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findActiveByReservation(
    reservationId: string,
    session?: ClientSession
  ) {
    const query = this.payment.findOne({
      reservationId,
      status: PaymentStatusEnum.PENDING,
    });

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async cancelActiveByReservation(
    reservationId: string,
    reason: string = 'Reservation cancelled or expired',
    session?: ClientSession
  ) {
    const query = this.payment.updateMany(
      {
        reservationId,
        status: PaymentStatusEnum.PENDING,
      },
      {
        status: PaymentStatusEnum.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
      }
    );
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findActiveByContract(
    contractId: string,
    purpose?: PaymentPurposeEnum,
    session?: ClientSession
  ) {
    const filter: FilterQuery<IPayment> = {
      contractId,
      status: PaymentStatusEnum.PENDING,
    };
    if (purpose) {
      filter.purpose = purpose;
    }
    const query = this.payment.findOne(filter);

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findPaginated(
    query: PaymentQueryFilter = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IPayment>> {
    const filter: FilterQuery<IPayment> = {};

    if (query.customerId) {
      filter.customerId = query.customerId;
    }

    if (query.facilityId) {
      filter.facilityId = query.facilityId;
    }

    if (query.reservationId) {
      filter.reservationId = query.reservationId;
    }

    if (query.contractId) {
      filter.contractId = query.contractId;
    }

    if (query.purpose) {
      filter.purpose = query.purpose;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.paymentCode) {
      filter.paymentCode = {
        $regex: query.paymentCode.trim(),
        $options: 'i',
      };
    }

    if (query.createdAtFrom || query.createdAtTo) {
      filter.createdAt = {};
      if (query.createdAtFrom) {
        filter.createdAt.$gte = new Date(query.createdAtFrom);
      }
      if (query.createdAtTo) {
        filter.createdAt.$lte = new Date(query.createdAtTo);
      }
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<IPayment>(this.payment, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
      populate: [
        { path: 'customerId', select: 'name email phoneNumber role status' },
        { path: 'facilityId', select: 'name city address status' },
        { path: 'confirmedBy', select: 'name email role' },
        { path: 'cancelledBy', select: 'name email role' },
      ],
    });
  }

  async update(id: string, data: Partial<IPayment>, session?: ClientSession) {
    const query = this.payment.findByIdAndUpdate(id, data, { new: true });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Atomic update of a pending payment during status transitions (e.g. paying via webhook).
   * Ensures status is still PENDING before updating.
   */
  async atomicUpdatePayment(
    id: string,
    updateData: Partial<IPayment>,
    session?: ClientSession
  ) {
    const filter: FilterQuery<IPayment> = {
      _id: id,
      status: PaymentStatusEnum.PENDING,
    };

    const query = this.payment.findOneAndUpdate(filter, updateData, {
      new: true,
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findExpired(now: Date = new Date(), session?: ClientSession) {
    const query = this.payment.find({
      status: PaymentStatusEnum.PENDING,
      expiresAt: { $ne: null, $lt: now },
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async softDelete(id: string, deletedBy?: string, session?: ClientSession) {
    const doc = await this.payment.findById(id).exec();
    if (!doc) return null;

    if (session) {
      await (
        doc as unknown as {
          delete: (
            by?: string,
            opts?: { session: ClientSession }
          ) => Promise<unknown>;
        }
      ).delete(deletedBy, { session });
    } else {
      await (
        doc as unknown as { delete: (by?: string) => Promise<unknown> }
      ).delete(deletedBy);
    }

    return doc;
  }

  // -------------------------------------------------------------
  // PaymentTransaction methods
  // -------------------------------------------------------------

  async findTransactionBySepayId(
    sepayId: number,
    session?: ClientSession
  ): Promise<IPaymentTransaction | null> {
    const query = this.paymentTransaction.findOne({ sepayId });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async createTransaction(
    data: Partial<IPaymentTransaction>,
    session?: ClientSession
  ): Promise<IPaymentTransaction> {
    if (session) {
      const [created] = await this.paymentTransaction.create([data], {
        session,
      });
      return created;
    }
    return this.paymentTransaction.create(data);
  }

  async updateTransactionResult(
    id: string,
    result: PaymentTransactionResultEnum,
    matchedPaymentId?: string | null,
    session?: ClientSession
  ): Promise<IPaymentTransaction | null> {
    const updateData: Partial<IPaymentTransaction> = { result };
    if (matchedPaymentId !== undefined) {
      updateData.matchedPaymentId = matchedPaymentId
        ? (matchedPaymentId as unknown as IPaymentTransaction['matchedPaymentId'])
        : null;
    }

    const query = this.paymentTransaction.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findTransactionById(
    id: string,
    session?: ClientSession
  ): Promise<IPaymentTransaction | null> {
    const query = this.paymentTransaction
      .findById(id)
      .populate('matchedPaymentId');
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findPaginatedTransactions(
    query: PaymentTransactionQueryFilter
  ): Promise<PaginateResult<IPaymentTransaction>> {
    const filter: FilterQuery<IPaymentTransaction> = {};
    if (query.result) {
      filter.result = query.result;
    }
    if (query.gateway) {
      filter.gateway = query.gateway;
    }
    if (query.accountNumber) {
      filter.accountNumber = query.accountNumber;
    }
    if (query.code) {
      filter.code = { $regex: query.code, $options: 'i' };
    }

    return paginate<IPaymentTransaction>(this.paymentTransaction, {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
      filter,
      populate: 'matchedPaymentId',
    });
  }

  async atomicUpdateTransaction(
    id: string,
    expectedResult:
      PaymentTransactionResultEnum | PaymentTransactionResultEnum[],
    updateData: Partial<IPaymentTransaction>,
    session?: ClientSession
  ): Promise<IPaymentTransaction | null> {
    const filter: FilterQuery<IPaymentTransaction> = {
      _id: id,
      result: Array.isArray(expectedResult)
        ? { $in: expectedResult }
        : expectedResult,
    };
    const query = this.paymentTransaction.findOneAndUpdate(filter, updateData, {
      new: true,
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }
}
