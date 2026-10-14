import mongoose from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { RackStatusEnum } from '../../common/enums/storageRack.enum.ts';

export interface IStorageRack extends SoftDeleteDocument {
  facilityId: mongoose.Types.ObjectId;
  storageUnitId: mongoose.Types.ObjectId;
  rackCode: string;
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
      default: RackStatusEnum.ACTIVE,
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

// Partial Unique Index: Mỗi storage unit chỉ có 1 rackCode duy nhất trong các record chưa bị xóa mềm
storageRackSchema.index(
  { storageUnitId: 1, rackCode: 1 },
  { unique: true, partialFilterExpression: { deleted: { $ne: true } } }
);

storageRackSchema.index({ facilityId: 1, storageUnitId: 1, status: 1 });

storageRackSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const StorageRack = mongoose.model<
  IStorageRack,
  SoftDeleteModel<IStorageRack>
>('StorageRack', storageRackSchema);
