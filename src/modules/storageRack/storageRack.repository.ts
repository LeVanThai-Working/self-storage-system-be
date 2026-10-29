import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IStorageRack } from './storageRack.model.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import type { StorageRackQuery } from './schemas/storageRack.request.schema.ts';
import { RackStatusEnum } from '../../common/enums/storageRack.enum.ts';

const POPULATE_FACILITY = {
  path: 'facilityId',
  select: 'name city address status',
};

const POPULATE_STORAGE_UNIT = {
  path: 'storageUnitId',
  select: 'unitNumber floor zone status',
};

export class StorageRackRepository {
  constructor(private readonly storageRack: SoftDeleteModel<IStorageRack>) {}

  async findAll(
    query: StorageRackQuery = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IStorageRack>> {
    const filter: FilterQuery<IStorageRack> = {};

    if (query.facilityId) {
      filter.facilityId = query.facilityId;
    }

    if (query.storageUnitId) {
      filter.storageUnitId = query.storageUnitId;
    }

    if (query.status) {
      filter.status = query.status as RackStatusEnum;
    }

    if (query.rackCode) {
      filter.rackCode = { $regex: query.rackCode, $options: 'i' };
    }

    if (query.aisle) {
      filter.aisle = query.aisle.toUpperCase();
    }

    if (query.zone) {
      filter.zone = query.zone;
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<IStorageRack>(this.storageRack, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
      populate: [POPULATE_FACILITY, POPULATE_STORAGE_UNIT],
    });
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.storageRack
      .findById(id)
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_STORAGE_UNIT);
  }

  async findByIdIncludeDeleted(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return (
      this.storageRack as unknown as {
        findWithDeleted: (filter: unknown) => {
          populate: (p: unknown) => {
            populate: (p2: unknown) => Promise<IStorageRack[]>;
          };
        };
      }
    )
      .findWithDeleted({ _id: new Types.ObjectId(id) })
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_STORAGE_UNIT)
      .then((docs) => docs?.[0] ?? null);
  }

  async findByStorageUnitId(storageUnitId: string) {
    if (!Types.ObjectId.isValid(storageUnitId)) return [];
    return this.storageRack
      .find({ storageUnitId: new Types.ObjectId(storageUnitId) })
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_STORAGE_UNIT)
      .sort({ rackCode: 1 });
  }

  async findByUnitAndRackCode(storageUnitId: string, rackCode: string) {
    if (!Types.ObjectId.isValid(storageUnitId)) return null;
    return this.storageRack.findOne({
      storageUnitId: new Types.ObjectId(storageUnitId),
      rackCode: rackCode.toUpperCase().trim(),
    });
  }

  async findByUnitAndRackCodeIncludeDeleted(
    storageUnitId: string,
    rackCode: string
  ) {
    if (!Types.ObjectId.isValid(storageUnitId)) return null;
    return (
      this.storageRack as unknown as {
        findWithDeleted: (filter: unknown) => Promise<IStorageRack[]>;
      }
    )
      .findWithDeleted({
        storageUnitId: new Types.ObjectId(storageUnitId),
        rackCode: rackCode.toUpperCase().trim(),
      })
      .then((docs) => docs?.[0] ?? null);
  }

  async create(data: Partial<IStorageRack>, session?: ClientSession) {
    const [created] = await this.storageRack.create([data], { session });
    return created;
  }

  async createMany(data: Partial<IStorageRack>[], session?: ClientSession) {
    return this.storageRack.create(data, { session });
  }

  async update(
    id: string,
    data: Partial<IStorageRack>,
    session?: ClientSession
  ) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.storageRack
      .findByIdAndUpdate(id, data, { returnDocument: 'after', session })
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_STORAGE_UNIT);
  }

  async softDelete(id: string, deletedBy?: string, session?: ClientSession) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.storageRack.findById(id).session(session ?? null);
    if (!doc) return null;
    await (
      doc as unknown as { delete: (by?: string) => Promise<unknown> }
    ).delete(deletedBy);
    return doc;
  }

  async softDeleteByStorageUnitId(
    storageUnitId: string,
    deletedBy?: string,
    session?: ClientSession
  ) {
    if (!Types.ObjectId.isValid(storageUnitId)) return;
    const docs = await this.storageRack
      .find({ storageUnitId: new Types.ObjectId(storageUnitId) })
      .session(session ?? null);
    for (const doc of docs) {
      await (
        doc as unknown as { delete: (by?: string) => Promise<unknown> }
      ).delete(deletedBy);
    }
  }

  async restore(id: string, session?: ClientSession) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await (
      this.storageRack as unknown as {
        findWithDeleted: (filter: unknown) => {
          session: (s: ClientSession | null) => Promise<IStorageRack[]>;
        };
      }
    )
      .findWithDeleted({ _id: new Types.ObjectId(id) })
      .session(session ?? null)
      .then((docs) => docs?.[0] ?? null);
    if (!doc) return null;
    await (doc as unknown as { restore: () => Promise<unknown> }).restore();
    return this.findById(id);
  }

  async restoreByStorageUnitId(storageUnitId: string, session?: ClientSession) {
    if (!Types.ObjectId.isValid(storageUnitId)) return;
    const docs = await (
      this.storageRack as unknown as {
        findWithDeleted: (filter: unknown) => {
          session: (s: ClientSession | null) => Promise<IStorageRack[]>;
        };
      }
    )
      .findWithDeleted({ storageUnitId: new Types.ObjectId(storageUnitId) })
      .session(session ?? null);
    for (const doc of docs) {
      await (doc as unknown as { restore: () => Promise<unknown> }).restore();
    }
  }

  async findByIds(
    rackIds: string[],
    session?: ClientSession
  ): Promise<IStorageRack[]> {
    const validIds = rackIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) return [];
    return this.storageRack
      .find({ _id: { $in: validIds } })
      .session(session ?? null)
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_STORAGE_UNIT);
  }

  async findAndReserveRacksAtomic(
    rackIds: string[],
    facilityId: string,
    storageUnitId: string,
    session?: ClientSession
  ): Promise<IStorageRack[] | null> {
    if (!rackIds.length) return [];
    const validIds = rackIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length !== rackIds.length) return null;

    // Check availability of all requested racks within the same facility and unit
    const availableRacks = await this.storageRack
      .find({
        _id: { $in: validIds },
        facilityId: new Types.ObjectId(facilityId),
        storageUnitId: new Types.ObjectId(storageUnitId),
        status: RackStatusEnum.AVAILABLE,
        deleted: false,
      })
      .session(session ?? null);

    if (availableRacks.length !== rackIds.length) {
      return null;
    }

    // Atomically transition them to RESERVED
    await this.storageRack.updateMany(
      {
        _id: { $in: validIds },
        status: RackStatusEnum.AVAILABLE,
      },
      {
        $set: { status: RackStatusEnum.RESERVED },
      },
      { session }
    );

    return this.storageRack
      .find({ _id: { $in: validIds } })
      .session(session ?? null)
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_STORAGE_UNIT);
  }

  async releaseRacksAtomic(
    rackIds: string[],
    session?: ClientSession
  ): Promise<void> {
    const validIds = rackIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) return;

    await this.storageRack.updateMany(
      {
        _id: { $in: validIds },
        status: RackStatusEnum.RESERVED,
      },
      {
        $set: { status: RackStatusEnum.AVAILABLE },
      },
      { session }
    );
  }

  async occupyRacksAtomic(
    rackIds: string[],
    contractId: string,
    customerId: string,
    session?: ClientSession
  ): Promise<void> {
    const validIds = rackIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) return;

    await this.storageRack.updateMany(
      {
        _id: { $in: validIds },
      },
      {
        $set: {
          status: RackStatusEnum.RENTED,
          currentContractId: new Types.ObjectId(contractId),
          currentCustomerId: new Types.ObjectId(customerId),
        },
      },
      { session }
    );
  }

  async vacateRacksAtomic(
    rackIds: string[],
    contractId: string,
    session?: ClientSession
  ): Promise<void> {
    const validIds = rackIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) return;

    await this.storageRack.updateMany(
      {
        _id: { $in: validIds },
        currentContractId: new Types.ObjectId(contractId),
      },
      {
        $set: {
          status: RackStatusEnum.AVAILABLE,
          currentContractId: null,
          currentCustomerId: null,
        },
      },
      { session }
    );
  }
}
