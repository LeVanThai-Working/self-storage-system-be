import {
  Types,
  type ClientSession,
  type FilterQuery,
  type UpdateQuery,
} from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import { Incident, type IIncident } from './incident.model.ts';
import {
  IncidentStatusEnum,
  IncidentCategoryEnum,
  IncidentSeverityEnum,
} from '../../common/enums/incident.enum.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';

export interface IncidentQueryFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  facilityId?: string;
  storageUnitId?: string;
  storageRackId?: string;
  contractId?: string;
  reporterId?: string;
  assignedStaffId?: string;
  status?: IncidentStatusEnum;
  category?: IncidentCategoryEnum;
  severity?: IncidentSeverityEnum;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class IncidentRepository {
  constructor(private readonly model: SoftDeleteModel<IIncident> = Incident) {}

  async create(
    data: Partial<IIncident>,
    session?: ClientSession
  ): Promise<IIncident> {
    const docs = await this.model.create([data], { session });
    return docs[0];
  }

  async findById(
    id: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IIncident | null> {
    if (typeof id === 'string' && !Types.ObjectId.isValid(id)) return null;
    const q = this.model
      .findById(id)
      .populate('facilityId', 'code name address')
      .populate('storageUnitId', 'unitNumber floor zone status')
      .populate('storageRackId', 'rackCode aisle bay zone status')
      .populate('rackTierId', 'tierNumber status')
      .populate('contractId', 'contractCode status startDate endDate')
      .populate('reporterId', 'name email phoneNumber role')
      .populate('assignedStaffId', 'name email phoneNumber role')
      .populate('resolution.resolvedBy', 'name email phoneNumber role');

    if (session) q.session(session);
    return q.exec();
  }

  async findByCode(
    incidentCode: string,
    session?: ClientSession
  ): Promise<IIncident | null> {
    const q = this.model
      .findOne({ incidentCode: incidentCode.toUpperCase() })
      .populate('facilityId', 'code name address')
      .populate('storageUnitId', 'unitNumber floor zone status')
      .populate('storageRackId', 'rackCode aisle bay zone status')
      .populate('rackTierId', 'tierNumber status')
      .populate('contractId', 'contractCode status startDate endDate')
      .populate('reporterId', 'name email phoneNumber role')
      .populate('assignedStaffId', 'name email phoneNumber role')
      .populate('resolution.resolvedBy', 'name email phoneNumber role');

    if (session) q.session(session);
    return q.exec();
  }

  async findPaginated(
    filter: IncidentQueryFilter
  ): Promise<PaginateResult<IIncident>> {
    const mongoFilter: FilterQuery<IIncident> = { deleted: false };

    if (filter.facilityId && Types.ObjectId.isValid(filter.facilityId)) {
      mongoFilter.facilityId = new Types.ObjectId(filter.facilityId);
    }
    if (filter.storageUnitId && Types.ObjectId.isValid(filter.storageUnitId)) {
      mongoFilter.storageUnitId = new Types.ObjectId(filter.storageUnitId);
    }
    if (filter.storageRackId && Types.ObjectId.isValid(filter.storageRackId)) {
      mongoFilter.storageRackId = new Types.ObjectId(filter.storageRackId);
    }
    if (filter.contractId && Types.ObjectId.isValid(filter.contractId)) {
      mongoFilter.contractId = new Types.ObjectId(filter.contractId);
    }
    if (filter.reporterId && Types.ObjectId.isValid(filter.reporterId)) {
      mongoFilter.reporterId = new Types.ObjectId(filter.reporterId);
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
    if (filter.severity) {
      mongoFilter.severity = filter.severity;
    }

    if (filter.search?.trim()) {
      const regex = new RegExp(filter.search.trim(), 'i');
      mongoFilter.$or = [
        { incidentCode: regex },
        { title: regex },
        { description: regex },
      ];
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

    return paginate<IIncident>(this.model, {
      page: filter.page,
      limit: filter.limit,
      sortBy: filter.sortBy || 'createdAt',
      sortOrder: filter.sortOrder || 'desc',
      filter: mongoFilter,
      populate: [
        { path: 'facilityId', select: 'code name address' },
        { path: 'storageUnitId', select: 'unitNumber floor zone status' },
        { path: 'storageRackId', select: 'rackCode aisle bay zone status' },
        { path: 'rackTierId', select: 'tierNumber status' },
        { path: 'reporterId', select: 'name email phoneNumber role' },
        { path: 'assignedStaffId', select: 'name email phoneNumber role' },
      ],
    });
  }

  async countIncidentsToday(
    facilityId: string | Types.ObjectId
  ): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.model.countDocuments({
      facilityId: new Types.ObjectId(facilityId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });
  }

  async atomicUpdateStatus(
    id: string | Types.ObjectId,
    currentStatus: IncidentStatusEnum | IncidentStatusEnum[],
    updateData: UpdateQuery<IIncident>,
    session?: ClientSession
  ): Promise<IIncident | null> {
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
          new: true,
          session,
        }
      )
      .populate('facilityId', 'code name address')
      .populate('storageUnitId', 'unitNumber floor zone status')
      .populate('storageRackId', 'rackCode aisle bay zone status')
      .populate('rackTierId', 'tierNumber status')
      .populate('contractId', 'contractCode status startDate endDate')
      .populate('reporterId', 'name email phoneNumber role')
      .populate('assignedStaffId', 'name email phoneNumber role')
      .populate('resolution.resolvedBy', 'name email phoneNumber role')
      .exec();
  }

  async update(
    id: string | Types.ObjectId,
    updateData: UpdateQuery<IIncident>,
    session?: ClientSession
  ): Promise<IIncident | null> {
    if (typeof id === 'string' && !Types.ObjectId.isValid(id)) return null;

    return this.model
      .findByIdAndUpdate(id, updateData, { new: true, session })
      .populate('facilityId', 'code name address')
      .populate('storageUnitId', 'unitNumber floor zone status')
      .populate('storageRackId', 'rackCode aisle bay zone status')
      .populate('rackTierId', 'tierNumber status')
      .populate('contractId', 'contractCode status startDate endDate')
      .populate('reporterId', 'name email phoneNumber role')
      .populate('assignedStaffId', 'name email phoneNumber role')
      .populate('resolution.resolvedBy', 'name email phoneNumber role')
      .exec();
  }

  async findActiveIncidentsByStorageUnit(
    storageUnitId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IIncident[]> {
    if (
      typeof storageUnitId === 'string' &&
      !Types.ObjectId.isValid(storageUnitId)
    ) {
      return [];
    }

    const q = this.model.find({
      storageUnitId: new Types.ObjectId(storageUnitId),
      status: {
        $in: [
          IncidentStatusEnum.REPORTED,
          IncidentStatusEnum.ASSIGNED,
          IncidentStatusEnum.INVESTIGATING,
          IncidentStatusEnum.IN_PROGRESS,
        ],
      },
      deleted: false,
    });

    if (session) q.session(session);
    return q.exec();
  }
}
