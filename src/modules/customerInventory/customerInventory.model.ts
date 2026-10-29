import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { InventoryItemStatusEnum } from '../../common/enums/customerInventory.enum.ts';

export interface ICustomerInventory extends SoftDeleteDocument {
  customerId: Types.ObjectId;
  contractId: Types.ObjectId;
  facilityId: Types.ObjectId;
  storageUnitId: Types.ObjectId;
  storageRackId?: Types.ObjectId | null;
  rackTierId?: Types.ObjectId | null;
  skuId: Types.ObjectId;
  quantity: number;
  pendingOutboundQuantity: number;
  status: InventoryItemStatusEnum;
  holdingReason?: string | null;
  relatedIncidentId?: Types.ObjectId | null;
  lastMovementAt: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const customerInventorySchema = new Schema<ICustomerInventory>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
      index: true,
    },
    storageUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageUnit',
      required: true,
      index: true,
    },
    storageRackId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageRack',
      required: false,
      default: null,
    },
    rackTierId: {
      type: Schema.Types.ObjectId,
      ref: 'RackTier',
      required: false,
      default: null,
      index: true,
    },
    skuId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerSku',
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    pendingOutboundQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(InventoryItemStatusEnum),
      default: InventoryItemStatusEnum.NORMAL,
      index: true,
    },
    holdingReason: {
      type: String,
      maxlength: 1000,
      trim: true,
      default: null,
    },
    relatedIncidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },
    lastMovementAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    notes: {
      type: String,
      maxlength: 1000,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Partial Unique Index: Each SKU at a position (contract + storageUnit + rackTier) is unique among non-soft-deleted records
customerInventorySchema.index(
  { contractId: 1, skuId: 1, storageUnitId: 1, rackTierId: 1 },
  { unique: true, partialFilterExpression: { deleted: { $ne: true } } }
);

// Compound indexes for fast lookup & filtering queries
customerInventorySchema.index({ customerId: 1, contractId: 1 });
customerInventorySchema.index({ storageUnitId: 1, rackTierId: 1 });
customerInventorySchema.index({ skuId: 1, quantity: 1 });
customerInventorySchema.index({ rackTierId: 1, quantity: 1 });

customerInventorySchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const CustomerInventory = mongoose.model<
  ICustomerInventory,
  SoftDeleteModel<ICustomerInventory>
>('CustomerInventory', customerInventorySchema);
