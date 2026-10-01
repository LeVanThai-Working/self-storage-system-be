import mongoose from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';

export interface IStorageUnit extends SoftDeleteDocument {
  facilityId: mongoose.Types.ObjectId;
  unitTypeId: mongoose.Types.ObjectId;
  unitNumber: string;
  floor: number;
  zone?: string;
  status: StorageUnitStatusEnum;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const storageUnitSchema = new mongoose.Schema<IStorageUnit>(
  {
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
      index: true,
    },
    unitTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UnitType',
      required: true,
      index: true,
    },
    unitNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    floor: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    zone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(StorageUnitStatusEnum),
      default: StorageUnitStatusEnum.AVAILABLE,
      required: true,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Partial Unique Index: each facility can only have one unique unitNumber among non-deleted documents
// Allows re-creating a unit with the same number after soft-delete
storageUnitSchema.index(
  { facilityId: 1, unitNumber: 1 },
  { unique: true, partialFilterExpression: { deleted: { $ne: true } } }
);

// Compound Indexes for optimizing queries by facility
storageUnitSchema.index({ facilityId: 1, status: 1 });
storageUnitSchema.index({ facilityId: 1, unitTypeId: 1 });
storageUnitSchema.index({ facilityId: 1, floor: 1 });

storageUnitSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const StorageUnit = mongoose.model<
  IStorageUnit,
  SoftDeleteModel<IStorageUnit>
>('StorageUnit', storageUnitSchema);
