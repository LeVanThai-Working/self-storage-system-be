import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IStorageUnit } from './storageUnit.model.ts';
import type {
  AvailableStorageUnitQuery,
  StorageUnitQuery,
} from './schemas/storageUnit.request.schema.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';

const POPULATE_FACILITY = {
  path: 'facilityId',
  select: 'name city address status',
};

const POPULATE_UNIT_TYPE = {
  path: 'unitTypeId',
  select: 'name category area volume status dimensions',
};

export class StorageUnitRepository {
  constructor(private readonly storageUnit: SoftDeleteModel<IStorageUnit>) {}

  async findAll(
    query: StorageUnitQuery = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IStorageUnit>> {
    const filter: FilterQuery<IStorageUnit> = {};

    if (query.facilityId) {
      filter.facilityId = query.facilityId;
    }

    if (query.unitTypeId) {
      filter.unitTypeId = query.unitTypeId;
    }

    if (query.status) {
      filter.status = query.status as StorageUnitStatusEnum;
    }

    if (query.floor !== undefined) {
      filter.floor = query.floor;
    }

    if (query.zone) {
      filter.zone = { $regex: query.zone, $options: 'i' };
    }

    if (query.unitNumber) {
      filter.unitNumber = { $regex: query.unitNumber, $options: 'i' };
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<IStorageUnit>(this.storageUnit, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
      populate: [POPULATE_FACILITY, POPULATE_UNIT_TYPE],
    });
  }

  async findById(id: string, session?: ClientSession) {
    const q = this.storageUnit
      .findById(id)
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_UNIT_TYPE);
    if (session) q.session(session);
    return q;
  }

  async findByFacilityAndUnitNumber(
    facilityId: string,
    unitNumber: string,
    session?: ClientSession
  ) {
    const q = this.storageUnit
      .findOne({
        facilityId,
        unitNumber: unitNumber.toUpperCase(),
      })
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_UNIT_TYPE);
    if (session) q.session(session);
    return q;
  }

  // Find storage unit including soft-deleted records (for Auto-Restore)
  async findByFacilityAndUnitNumberIncludeDeleted(
    facilityId: string,
    unitNumber: string
  ) {
    return this.storageUnit.findOneWithDeleted({
      facilityId,
      unitNumber: unitNumber.toUpperCase(),
    });
  }

  // Find available storage units in a facility
  async findAvailableUnits(
    facilityId: string,
    filters?: AvailableStorageUnitQuery
  ) {
    const filter: FilterQuery<IStorageUnit> = {
      facilityId,
      status: StorageUnitStatusEnum.AVAILABLE,
    };

    if (filters?.unitTypeId) {
      filter.unitTypeId = filters.unitTypeId;
    }

    if (filters?.floor !== undefined) {
      filter.floor = filters.floor;
    }

    if (filters?.zone) {
      filter.zone = { $regex: filters.zone, $options: 'i' };
    }

    return this.storageUnit
      .find(filter)
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_UNIT_TYPE)
      .sort({ unitNumber: 1 });
  }

  async countByFacilityId(facilityId: string): Promise<number> {
    return this.storageUnit.countDocuments({ facilityId });
  }

  async countAvailableUnitsGroupedByUnitType(
    facilityId: string
  ): Promise<Record<string, number>> {
    const counts = await this.storageUnit.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      {
        $match: {
          facilityId: new Types.ObjectId(facilityId),
          status: StorageUnitStatusEnum.AVAILABLE,
          deleted: false,
        },
      },
      {
        $group: {
          _id: '$unitTypeId',
          count: { $sum: 1 },
        },
      },
    ]);

    const result: Record<string, number> = {};
    for (const item of counts) {
      if (item._id) {
        result[item._id.toString()] = item.count;
      }
    }
    return result;
  }

  async countByUnitTypeId(unitTypeId: string): Promise<number> {
    return this.storageUnit.countDocuments({ unitTypeId });
  }

  async create(data: Partial<IStorageUnit>, session?: ClientSession) {
    if (session) {
      const created = await this.storageUnit.create([data], { session });
      return created[0];
    }
    return this.storageUnit.create(data);
  }

  async countUnitsByStatusGrouped(
    facilityId: string
  ): Promise<Record<string, number>> {
    const counts = await this.storageUnit.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $match: {
          facilityId: new Types.ObjectId(facilityId),
          deleted: false,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result: Record<string, number> = {};
    for (const item of counts) {
      if (item._id) {
        result[item._id] = item.count;
      }
    }
    return result;
  }

  async updateById(
    id: string,
    data: Partial<IStorageUnit>,
    session?: ClientSession
  ) {
    const q = this.storageUnit.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
    });
    if (session) q.session(session);
    return q;
  }

  async deleteById(id: string, deletedBy?: string) {
    return this.storageUnit.deleteById(id, deletedBy);
  }

  async findByIdIncludeDeleted(id: string) {
    return this.storageUnit
      .findOneWithDeleted({ _id: id })
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_UNIT_TYPE);
  }

  async restoreById(id: string) {
    return this.storageUnit.restore({ _id: id });
  }
}
