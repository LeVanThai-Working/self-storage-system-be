import { Types, type ClientSession, type FilterQuery } from 'mongoose';
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
      .populate('renewals.renewedBy', 'name email role')
      .populate('addendums.requestedBy', 'name email role phoneNumber')
      .populate('addendums.approvedBy', 'name email role')
      .populate('addendums.assignedStaffId', 'name email role phoneNumber')
      .populate('addendums.rejectedBy', 'name email role')
      .populate('addendums.cancelledBy', 'name email role')
      .populate(
        'addendums.previousStorageUnitId',
        'unitNumber floor zone status'
      )
      .populate('addendums.newStorageUnitId', 'unitNumber floor zone status');

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

  /**
   * Finds the latest active (non-cancelled) contract linked to a reservation.
   * Used to allow creating a new contract after an earlier DRAFT contract was VOIDed.
   */
  async findActiveByReservationId(
    reservationId: string,
    session?: ClientSession
  ) {
    const query = this.contract
      .findOne({
        reservationId,
        status: { $ne: ContractStatusEnum.CANCELLED },
      })
      .sort({ createdAt: -1 });
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
        {
          path: 'addendums.requestedBy',
          select: 'name email role phoneNumber',
        },
        { path: 'addendums.approvedBy', select: 'name email role' },
        {
          path: 'addendums.assignedStaffId',
          select: 'name email role phoneNumber',
        },
        {
          path: 'addendums.previousStorageUnitId',
          select: 'unitNumber floor zone status',
        },
        {
          path: 'addendums.newStorageUnitId',
          select: 'unitNumber floor zone status',
        },
      ],
    });
  }

  async update(id: string, data: Partial<IContract>, session?: ClientSession) {
    const query = this.contract.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
    });
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
      returnDocument: 'after',
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Conditionally touch `lastInventoryActivityAt` when the contract is in one of
   * `allowedStatuses`. Writes to the Contract document within the caller's session
   * so any concurrent check-out / termination triggers a WiredTiger WriteConflict
   * instead of allowing write-skew between inventory mutations and contract closure.
   */
  async touchIfStatusAtomic(
    id: string,
    allowedStatuses: readonly ContractStatusEnum[],
    session?: ClientSession
  ) {
    const query = this.contract.findOneAndUpdate(
      {
        _id: id,
        status: { $in: allowedStatuses },
      },
      {
        $set: { lastInventoryActivityAt: new Date() },
      },
      {
        returnDocument: 'after',
      }
    );
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Atomically accumulate customer-liable incident `damageFee` and `staffEvidenceImages`
   * onto an operational contract (`ACTIVE` or `OVERDUE`).
   * Returns `null` if the contract does not exist or is no longer in `ACTIVE`/`OVERDUE`.
   */
  async accumulateIncidentDamageAtomic(
    id: string,
    addedDamageFee: number,
    evidenceImages: string[] = [],
    session?: ClientSession
  ) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateDoc: Record<string, unknown> = {
      $inc: { damageFee: addedDamageFee },
    };

    if (evidenceImages.length > 0) {
      updateDoc.$addToSet = {
        inspectionPhotos: { $each: evidenceImages },
      };
    }

    const query = this.contract.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        status: {
          $in: [ContractStatusEnum.ACTIVE, ContractStatusEnum.OVERDUE],
        },
      },
      updateDoc,
      {
        returnDocument: 'after',
      }
    );

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

  async findActiveByStorageUnitId(
    storageUnitId: string,
    session?: ClientSession
  ) {
    const query = this.contract
      .findOne({
        storageUnitId: Types.ObjectId.isValid(storageUnitId)
          ? new Types.ObjectId(storageUnitId)
          : storageUnitId,
        status: ContractStatusEnum.ACTIVE,
      })
      .populate('customerId', 'name email phoneNumber');
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Find the current operational contract (ACTIVE or OVERDUE) occupying a storage unit.
   * Used by `getStorageUnitTree` so customers and facility managers can still inspect
   * goods while a contract is OVERDUE.
   */
  async findCurrentByStorageUnitId(
    storageUnitId: string,
    session?: ClientSession
  ) {
    const query = this.contract
      .findOne({
        storageUnitId: Types.ObjectId.isValid(storageUnitId)
          ? new Types.ObjectId(storageUnitId)
          : storageUnitId,
        status: {
          $in: [ContractStatusEnum.ACTIVE, ContractStatusEnum.OVERDUE],
        },
      })
      .populate('customerId', 'name email phoneNumber');
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Find the current operational contract (ACTIVE or OVERDUE) occupying a storage unit for a specific customer.
   * Supports multi-tenant shared warehouse units (e.g. WAREHOUSE_RACK) where multiple customers rent racks in the same room.
   */
  async findCurrentByStorageUnitAndCustomerId(
    storageUnitId: string,
    customerId: string,
    session?: ClientSession
  ) {
    const query = this.contract
      .findOne({
        storageUnitId: Types.ObjectId.isValid(storageUnitId)
          ? new Types.ObjectId(storageUnitId)
          : storageUnitId,
        customerId: Types.ObjectId.isValid(customerId)
          ? new Types.ObjectId(customerId)
          : customerId,
        status: {
          $in: [ContractStatusEnum.ACTIVE, ContractStatusEnum.OVERDUE],
        },
      })
      .populate('customerId', 'name email phoneNumber');
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
      storageUnitId: Types.ObjectId.isValid(storageUnitId)
        ? new Types.ObjectId(storageUnitId)
        : storageUnitId,
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
      facilityId: Types.ObjectId.isValid(facilityId)
        ? new Types.ObjectId(facilityId)
        : facilityId,
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

  async countActiveByUserId(
    userId: string,
    includeDraft: boolean = false,
    session?: ClientSession
  ) {
    const statuses = includeDraft
      ? [
          ContractStatusEnum.DRAFT,
          ContractStatusEnum.ACTIVE,
          ContractStatusEnum.OVERDUE,
        ]
      : [ContractStatusEnum.ACTIVE, ContractStatusEnum.OVERDUE];

    const query = this.contract.countDocuments({
      customerId: Types.ObjectId.isValid(userId)
        ? new Types.ObjectId(userId)
        : userId,
      status: {
        $in: statuses,
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

  /**
   * Check if a customer has any valid/active contract (DRAFT, ACTIVE, OVERDUE) at a specific facility.
   * Used for resource scope verification (Rule 14) during staff delegation.
   */
  async hasActiveContractAtFacility(
    customerId: string,
    facilityId: string,
    session?: ClientSession
  ): Promise<boolean> {
    if (
      !Types.ObjectId.isValid(customerId) ||
      !Types.ObjectId.isValid(facilityId)
    ) {
      return false;
    }

    const query = this.contract.countDocuments({
      customerId: new Types.ObjectId(customerId),
      facilityId: new Types.ObjectId(facilityId),
      status: {
        $in: [
          ContractStatusEnum.DRAFT,
          ContractStatusEnum.ACTIVE,
          ContractStatusEnum.OVERDUE,
        ],
      },
      deleted: false,
    });

    if (session) {
      query.session(session);
    }

    const count = await query.exec();
    return count > 0;
  }
}
