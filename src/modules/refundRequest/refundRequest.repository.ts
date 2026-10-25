import type { ClientSession } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IRefundRequest } from './refundRequest.model.ts';
import { RefundRequestStatusEnum } from '../../common/enums/refundRequest.enum.ts';
import { paginate } from '../../utils/pagination.util.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

export interface RefundRequestFilter {
  facilityId?: string;
  customerId?: string;
  reservationId?: string;
  contractId?: string;
  status?: RefundRequestStatusEnum;
  reason?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class RefundRequestRepository {
  constructor(
    private readonly refundRequestModel: SoftDeleteModel<IRefundRequest>
  ) {}

  async create(
    data: Partial<IRefundRequest>,
    session?: ClientSession
  ): Promise<IRefundRequest> {
    const docs = await this.refundRequestModel.create([data], { session });
    return docs[0];
  }

  async findById(
    id: string,
    session?: ClientSession
  ): Promise<IRefundRequest | null> {
    return this.refundRequestModel
      .findById(id)
      .session(session || null)
      .populate('facilityId', 'name address')
      .populate('customerId', 'name email phoneNumber')
      .populate('requestedBy', 'name role')
      .populate('approvedBy', 'name role')
      .populate('rejectedBy', 'name role')
      .populate('paidBy', 'name role')
      .populate('cancelledBy', 'name role')
      .exec();
  }

  async findByCode(
    refundCode: string,
    session?: ClientSession
  ): Promise<IRefundRequest | null> {
    return this.refundRequestModel
      .findOne({ refundCode })
      .session(session || null)
      .exec();
  }

  async findByReservationId(
    reservationId: string,
    session?: ClientSession
  ): Promise<IRefundRequest[]> {
    return this.refundRequestModel
      .find({ reservationId })
      .session(session || null)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByContractId(
    contractId: string,
    session?: ClientSession
  ): Promise<IRefundRequest[]> {
    return this.refundRequestModel
      .find({ contractId })
      .session(session || null)
      .sort({ createdAt: -1 })
      .exec();
  }

  async atomicUpdateStatus(
    id: string,
    expectedStatus: RefundRequestStatusEnum | RefundRequestStatusEnum[],
    updateData: Partial<IRefundRequest>,
    session?: ClientSession
  ): Promise<IRefundRequest | null> {
    const statusFilter = Array.isArray(expectedStatus)
      ? { $in: expectedStatus }
      : expectedStatus;

    return this.refundRequestModel
      .findOneAndUpdate(
        { _id: id, status: statusFilter },
        { $set: updateData },
        { returnDocument: 'after', session }
      )
      .exec();
  }

  async sumValidRefundsByReservationId(
    reservationId: string,
    session?: ClientSession
  ): Promise<number> {
    const validStatuses = [
      RefundRequestStatusEnum.PENDING_APPROVAL,
      RefundRequestStatusEnum.APPROVED,
      RefundRequestStatusEnum.PAID,
    ];

    const results = await this.refundRequestModel
      .aggregate<{ total: number }>([
        {
          $match: {
            reservationId:
              typeof reservationId === 'string'
                ? new this.refundRequestModel.base.Types.ObjectId(reservationId)
                : reservationId,
            status: { $in: validStatuses },
            deleted: false,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ])
      .session(session || null);

    return results[0]?.total || 0;
  }

  async sumValidRefundsByContractId(
    contractId: string,
    session?: ClientSession
  ): Promise<number> {
    const validStatuses = [
      RefundRequestStatusEnum.PENDING_APPROVAL,
      RefundRequestStatusEnum.APPROVED,
      RefundRequestStatusEnum.PAID,
    ];

    const results = await this.refundRequestModel
      .aggregate<{ total: number }>([
        {
          $match: {
            contractId:
              typeof contractId === 'string'
                ? new this.refundRequestModel.base.Types.ObjectId(contractId)
                : contractId,
            status: { $in: validStatuses },
            deleted: false,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ])
      .session(session || null);

    return results[0]?.total || 0;
  }

  async paginate(
    filter: RefundRequestFilter
  ): Promise<PaginatedData<IRefundRequest>> {
    const queryFilter: Record<string, unknown> = {};

    if (filter.facilityId) queryFilter.facilityId = filter.facilityId;
    if (filter.customerId) queryFilter.customerId = filter.customerId;
    if (filter.reservationId) queryFilter.reservationId = filter.reservationId;
    if (filter.contractId) queryFilter.contractId = filter.contractId;
    if (filter.status) queryFilter.status = filter.status;
    if (filter.reason) queryFilter.reason = filter.reason;

    return paginate<IRefundRequest>(this.refundRequestModel, {
      page: filter.page,
      limit: filter.limit,
      sortBy: filter.sortBy || 'createdAt',
      sortOrder: filter.sortOrder || 'desc',
      filter: queryFilter,
    });
  }
}
