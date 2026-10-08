import type { ClientSession, FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IContract } from './contract.model.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import {
  ContractSourceEnum,
  ContractStatusEnum,
} from '../../common/enums/contract.enum.ts';

export interface ContractQueryFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customerId?: string;
  facilityId?: string;
  storageUnitId?: string;
  facilityUnitTypeOfferingId?: string;
  status?: ContractStatusEnum;
  source?: ContractSourceEnum;
  contractCode?: string;
  startDateFrom?: string | Date;
  startDateTo?: string | Date;
  endDateFrom?: string | Date;
  endDateTo?: string | Date;
}

export class ContractRepository {
  constructor(private readonly contract: SoftDeleteModel<IContract>) {}

  async create(data: Partial<IContract>, session?: ClientSession) {
    if (session) {
      const [created] = await this.contract.create([data], { session });
      return created;
    }
    return this.contract.create(data);
  }

  async findById(id: string, session?: ClientSession) {
    const query = this.contract
      .findById(id)
      .populate('customerId', 'name email phoneNumber role status')
      .populate('facilityId', 'name city address phone email status')
      .populate(
        'facilityUnitTypeOfferingId',
        'unitTypeId billingUnit pricePerUnit depositMultiplier minRentalDays status'
      )
      .populate('storageUnitId', 'unitNumber floor zone status')
      .populate('assignedStaffId', 'name email role phoneNumber')
      .populate('inspectedBy', 'name email role')
      .populate('cancelledBy', 'name email role')
      .populate('terminatedBy', 'name email role')
      .populate('renewals.renewedBy', 'name email role');

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findByCode(code: string, session?: ClientSession) {
    const query = this.contract
      .findOne({ contractCode: code.toUpperCase() })
      .populate('customerId', 'name email phoneNumber role status')
      .populate('facilityId', 'name city address phone email status')
      .populate(
        'facilityUnitTypeOfferingId',
        'unitTypeId billingUnit pricePerUnit depositMultiplier minRentalDays status'
      )
      .populate('storageUnitId', 'unitNumber floor zone status')
      .populate('assignedStaffId', 'name email role phoneNumber');

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findByReservationId(reservationId: string, session?: ClientSession) {
    const query = this.contract.findOne({ reservationId });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findPaginated(
    query: ContractQueryFilter = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IContract>> {
    const filter: FilterQuery<IContract> = {};

    if (query.customerId) {
      filter.customerId = query.customerId;
    }

    if (query.facilityId) {
      filter.facilityId = query.facilityId;
    }

    if (query.storageUnitId) {
      filter.storageUnitId = query.storageUnitId;
    }

    if (query.facilityUnitTypeOfferingId) {
      filter.facilityUnitTypeOfferingId = query.facilityUnitTypeOfferingId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.source) {
      filter.source = query.source;
    }

    if (query.contractCode) {
      filter.contractCode = {
        $regex: query.contractCode.trim(),
        $options: 'i',
      };
    }

    if (query.startDateFrom || query.startDateTo) {
      filter.startDate = {};
      if (query.startDateFrom) {
        filter.startDate.$gte = new Date(query.startDateFrom);
      }
      if (query.startDateTo) {
        filter.startDate.$lte = new Date(query.startDateTo);
      }
    }

    if (query.endDateFrom || query.endDateTo) {
      filter.endDate = {};
      if (query.endDateFrom) {
        filter.endDate.$gte = new Date(query.endDateFrom);
      }
      if (query.endDateTo) {
        filter.endDate.$lte = new Date(query.endDateTo);
      }
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<IContract>(this.contract, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
      populate: [
        { path: 'customerId', select: 'name email phoneNumber role status' },
        { path: 'facilityId', select: 'name city address status' },
        {
          path: 'facilityUnitTypeOfferingId',
          select: 'unitTypeId billingUnit pricePerUnit status',
        },
        { path: 'storageUnitId', select: 'unitNumber floor zone status' },
        { path: 'assignedStaffId', select: 'name email role phoneNumber' },
      ],
    });
  }

  async update(id: string, data: Partial<IContract>, session?: ClientSession) {
    const query = this.contract.findByIdAndUpdate(id, data, { new: true });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async atomicUpdateStatus(
    id: string,
    expectedStatus: ContractStatusEnum | ContractStatusEnum[],
    updateData: Partial<IContract>,
    session?: ClientSession
  ) {
    const filter: FilterQuery<IContract> = {
      _id: id,
      status: Array.isArray(expectedStatus)
        ? { $in: expectedStatus }
        : expectedStatus,
    };

    const query = this.contract.findOneAndUpdate(filter, updateData, {
      new: true,
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findExpiredActiveContracts(
    now: Date = new Date(),
    session?: ClientSession
  ) {
    const query = this.contract.find({
      status: ContractStatusEnum.ACTIVE,
      endDate: { $lt: now },
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async countActiveByStorageUnitId(
    storageUnitId: string,
    session?: ClientSession
  ) {
    const query = this.contract.countDocuments({
      storageUnitId,
      status: {
        $in: [
          ContractStatusEnum.DRAFT,
          ContractStatusEnum.ACTIVE,
          ContractStatusEnum.OVERDUE,
        ],
      },
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async countActiveByFacilityId(facilityId: string, session?: ClientSession) {
    const query = this.contract.countDocuments({
      facilityId,
      status: {
        $in: [
          ContractStatusEnum.DRAFT,
          ContractStatusEnum.ACTIVE,
          ContractStatusEnum.OVERDUE,
        ],
      },
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async countActiveByUserId(userId: string, session?: ClientSession) {
    const query = this.contract.countDocuments({
      customerId: userId,
      status: {
        $in: [
          ContractStatusEnum.DRAFT,
          ContractStatusEnum.ACTIVE,
          ContractStatusEnum.OVERDUE,
        ],
      },
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async countActiveByOfferingId(offeringId: string, session?: ClientSession) {
    const query = this.contract.countDocuments({
      facilityUnitTypeOfferingId: offeringId,
      status: {
        $in: [
          ContractStatusEnum.DRAFT,
          ContractStatusEnum.ACTIVE,
          ContractStatusEnum.OVERDUE,
        ],
      },
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async softDelete(id: string, deletedBy?: string, session?: ClientSession) {
    const doc = await this.contract.findById(id).exec();
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
}
