import mongoose from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { RackTierStatusEnum } from '../../common/enums/storageRack.enum.ts';
import type { IDimensions } from '../unitType/unitType.model.ts';

export interface IRackTier extends SoftDeleteDocument {
  facilityId: mongoose.Types.ObjectId;
  storageUnitId: mongoose.Types.ObjectId;
  storageRackId: mongoose.Types.ObjectId;
  tierNumber: number;
  tierCode: string;
  maxWeightKg?: number;
  dimensions?: IDimensions;
  volume?: number;
  status: RackTierStatusEnum;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const dimensionsSchema = new mongoose.Schema<IDimensions>(
  {
    length: { type: Number, required: true, min: 0.1 },
    width: { type: Number, required: true, min: 0.1 },
    height: { type: Number, required: true, min: 0.1 },
  },
  { _id: false }
);

const rackTierSchema = new mongoose.Schema<IRackTier>(
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
    storageRackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StorageRack',
      required: true,
      index: true,
    },
    tierNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    tierCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    maxWeightKg: {
      type: Number,
      min: 0,
    },
    dimensions: {
      type: dimensionsSchema,
      required: false,
    },
    volume: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(RackTierStatusEnum),
      default: RackTierStatusEnum.AVAILABLE,
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

// Partial Unique Index: Mỗi kệ chỉ có 1 tierNumber duy nhất trong các record chưa bị xóa mềm
rackTierSchema.index(
  { storageRackId: 1, tierNumber: 1 },
  { unique: true, partialFilterExpression: { deleted: { $ne: true } } }
);

rackTierSchema.index({ storageUnitId: 1, status: 1 });
rackTierSchema.index({ facilityId: 1, status: 1 });

rackTierSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const RackTier = mongoose.model<IRackTier, SoftDeleteModel<IRackTier>>(
  'RackTier',
  rackTierSchema
);
