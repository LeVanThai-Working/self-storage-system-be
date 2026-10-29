import { Types, type ClientSession } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IRackTier } from './rackTier.model.ts';

const POPULATE_STORAGE_RACK = {
  path: 'storageRackId',
  select: 'rackCode name tierCount status',
};

export class RackTierRepository {
  constructor(private readonly rackTier: SoftDeleteModel<IRackTier>) {}

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.rackTier.findById(id).populate(POPULATE_STORAGE_RACK);
  }

  async findByIdIncludeDeleted(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return (
      this.rackTier as unknown as {
        findWithDeleted: (filter: unknown) => {
          populate: (p: unknown) => Promise<IRackTier[]>;
        };
      }
    )
      .findWithDeleted({ _id: new Types.ObjectId(id) })
      .populate(POPULATE_STORAGE_RACK)
      .then((docs) => docs?.[0] ?? null);
  }

  async findByRackId(storageRackId: string) {
    if (!Types.ObjectId.isValid(storageRackId)) return [];
    return this.rackTier
      .find({ storageRackId: new Types.ObjectId(storageRackId) })
      .sort({ tierNumber: 1 });
  }

  async findByStorageUnitId(storageUnitId: string) {
    if (!Types.ObjectId.isValid(storageUnitId)) return [];
    return this.rackTier
      .find({ storageUnitId: new Types.ObjectId(storageUnitId) })
      .sort({ tierNumber: 1 });
  }

  async findByRackAndTierNumber(storageRackId: string, tierNumber: number) {
    if (!Types.ObjectId.isValid(storageRackId)) return null;
    return this.rackTier.findOne({
      storageRackId: new Types.ObjectId(storageRackId),
      tierNumber,
    });
  }

  async create(data: Partial<IRackTier>, session?: ClientSession) {
    const [created] = await this.rackTier.create([data], { session });
    return created;
  }

  async createMany(data: Partial<IRackTier>[], session?: ClientSession) {
    return this.rackTier.create(data, { session, ordered: true });
  }

  async update(id: string, data: Partial<IRackTier>, session?: ClientSession) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.rackTier
      .findByIdAndUpdate(id, data, { returnDocument: 'after', session })
      .populate(POPULATE_STORAGE_RACK);
  }

  async softDelete(id: string, deletedBy?: string, session?: ClientSession) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.rackTier.findById(id).session(session ?? null);
    if (!doc) return null;
    await (
      doc as unknown as { delete: (by?: string) => Promise<unknown> }
    ).delete(deletedBy);
    return doc;
  }

  async softDeleteByRackId(
    storageRackId: string,
    deletedBy?: string,
    session?: ClientSession
  ) {
    if (!Types.ObjectId.isValid(storageRackId)) return;
    const docs = await this.rackTier
      .find({ storageRackId: new Types.ObjectId(storageRackId) })
      .session(session ?? null);
    for (const doc of docs) {
      await (
        doc as unknown as { delete: (by?: string) => Promise<unknown> }
      ).delete(deletedBy);
    }
  }

  async softDeleteByStorageUnitId(
    storageUnitId: string,
    deletedBy?: string,
    session?: ClientSession
  ) {
    if (!Types.ObjectId.isValid(storageUnitId)) return;
    const docs = await this.rackTier
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
      this.rackTier as unknown as {
        findWithDeleted: (filter: unknown) => {
          session: (s: ClientSession | null) => Promise<IRackTier[]>;
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

  async restoreByRackId(storageRackId: string, session?: ClientSession) {
    if (!Types.ObjectId.isValid(storageRackId)) return;
    const docs = await (
      this.rackTier as unknown as {
        findWithDeleted: (filter: unknown) => {
          session: (s: ClientSession | null) => Promise<IRackTier[]>;
        };
      }
    )
      .findWithDeleted({ storageRackId: new Types.ObjectId(storageRackId) })
      .session(session ?? null);
    for (const doc of docs) {
      await (doc as unknown as { restore: () => Promise<unknown> }).restore();
    }
  }

  async restoreByStorageUnitId(storageUnitId: string, session?: ClientSession) {
    if (!Types.ObjectId.isValid(storageUnitId)) return;
    const docs = await (
      this.rackTier as unknown as {
        findWithDeleted: (filter: unknown) => {
          session: (s: ClientSession | null) => Promise<IRackTier[]>;
        };
      }
    )
      .findWithDeleted({ storageUnitId: new Types.ObjectId(storageUnitId) })
      .session(session ?? null);
    for (const doc of docs) {
      await (doc as unknown as { restore: () => Promise<unknown> }).restore();
    }
  }
}
