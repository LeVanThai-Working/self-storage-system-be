import mongoose from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import {
  RackStatusEnum,
  RackZoneEnum,
} from '../../common/enums/storageRack.enum.ts';

export interface IStorageRack extends SoftDeleteDocument {
  facilityId: mongoose.Types.ObjectId;
  storageUnitId: mongoose.Types.ObjectId;
  rackCode: string;
  aisle: string;
  bay: number;
  zone: RackZoneEnum;
  customPrice?: number | null;
  currentContractId?: mongoose.Types.ObjectId | null;
  currentCustomerId?: mongoose.Types.ObjectId | null;
  name?: string;
  tierCount: number;
  status: RackStatusEnum;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const storageRackSchema = new mongoose.Schema<IStorageRack>(
  {
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
      index: true,
    },
    storageUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StorageUnit',
      required: true,
      index: true,
    },
    rackCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    aisle: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'A',
    },
    bay: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    zone: {
      type: String,
      enum: Object.values(RackZoneEnum),
      default: RackZoneEnum.STANDARD,
      required: true,
    },
    customPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    currentContractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      default: null,
      index: true,
    },
    currentCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    tierCount: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    status: {
      type: String,
      enum: Object.values(RackStatusEnum),
      default: RackStatusEnum.AVAILABLE,
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

// Partial Unique Index: Each storage unit has a unique rackCode among non-deleted records
storageRackSchema.index(
  { storageUnitId: 1, rackCode: 1 },
  { unique: true, partialFilterExpression: { deleted: false } }
);

// Compound index: Ensures unique aisle-bay coordinates within the same storage unit
storageRackSchema.index(
  { storageUnitId: 1, aisle: 1, bay: 1 },
  { unique: true, partialFilterExpression: { deleted: false } }
);

storageRackSchema.index({ facilityId: 1, storageUnitId: 1, status: 1 });
storageRackSchema.index({ facilityId: 1, status: 1 });

storageRackSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const StorageRack = mongoose.model<
  IStorageRack,
  SoftDeleteModel<IStorageRack>
>('StorageRack', storageRackSchema);
