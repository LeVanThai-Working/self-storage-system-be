import mongoose, { Schema, type Types } from 'mongoose';
import { MovementTypeEnum } from '../../common/enums/customerInventory.enum.ts';

export interface IInventoryMovement {
  _id: Types.ObjectId;
  movementCode: string;
  type: MovementTypeEnum;
  customerInventoryId?: Types.ObjectId | null;
  customerId: Types.ObjectId;
  contractId: Types.ObjectId;
  facilityId: Types.ObjectId;
  storageUnitId: Types.ObjectId;
  skuId: Types.ObjectId;
  fromRackTierId?: Types.ObjectId | null;
  toRackTierId?: Types.ObjectId | null;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  performedBy: Types.ObjectId;
  reason?: string | null;
  referenceCode?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    movementCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(MovementTypeEnum),
      required: true,
      index: true,
    },
    customerInventoryId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerInventory',
      required: false,
      default: null,
      index: true,
    },
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
    skuId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerSku',
      required: true,
      index: true,
    },
    fromRackTierId: {
      type: Schema.Types.ObjectId,
      ref: 'RackTier',
      required: false,
      default: null,
    },
    toRackTierId: {
      type: Schema.Types.ObjectId,
      ref: 'RackTier',
      required: false,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    newQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    referenceCode: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes cho sổ cái lịch sử giao dịch
inventoryMovementSchema.index({ customerId: 1, createdAt: -1 });
inventoryMovementSchema.index({ contractId: 1, createdAt: -1 });
inventoryMovementSchema.index({ skuId: 1, createdAt: -1 });
inventoryMovementSchema.index({ storageUnitId: 1, createdAt: -1 });
inventoryMovementSchema.index({ facilityId: 1, createdAt: -1 });

export const InventoryMovement = mongoose.model<IInventoryMovement>(
  'InventoryMovement',
  inventoryMovementSchema
);
