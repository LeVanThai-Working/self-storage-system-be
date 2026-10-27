import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import {
  InventoryRequestTypeEnum,
  InventoryRequestStatusEnum,
} from '../../common/enums/customerInventory.enum.ts';

export interface IInventoryRequestItem {
  skuId: Types.ObjectId;
  quantity: number;
  actualQuantity?: number;
  discrepancyQuantity?: number;
  storageRackId?: Types.ObjectId;
  rackTierId?: Types.ObjectId;
}

export interface IInventoryRequestTransporterInfo {
  name: string;
  phoneNumber: string;
  vehiclePlate?: string;
  deliveryCompany?: string;
}

export interface IInventoryRequest extends SoftDeleteDocument {
  requestCode: string;
  type: InventoryRequestTypeEnum;
  status: InventoryRequestStatusEnum;
  customerId: Types.ObjectId;
  contractId: Types.ObjectId;
  facilityId: Types.ObjectId;
  storageUnitId: Types.ObjectId;

  items: IInventoryRequestItem[];

  pickupQrToken?: string | null;
  otpHash?: string | null;
  expiresAt?: Date | null;
  isVerified: boolean;

  transporterInfo?: IInventoryRequestTransporterInfo;

  evidenceImages?: string[];
  signatureUrl?: string | null;
  staffNotes?: string | null;
  discrepancyReason?: string | null;
  discrepancyImages?: string[];
  customerFeedbackNotes?: string | null;

  verifiedAt?: Date | null;
  verifiedBy?: Types.ObjectId | null;
  completedAt?: Date | null;
  completedBy?: Types.ObjectId | null;
  cancelledAt?: Date | null;
  isAutoConfirmed?: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const inventoryRequestItemSchema = new Schema<IInventoryRequestItem>(
  {
    skuId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerSku',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    actualQuantity: {
      type: Number,
      min: 0,
    },
    discrepancyQuantity: {
      type: Number,
      min: 0,
    },
    storageRackId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageRack',
    },
    rackTierId: {
      type: Schema.Types.ObjectId,
      ref: 'RackTier',
    },
  },
  { _id: false }
);

const transporterInfoSchema = new Schema<IInventoryRequestTransporterInfo>(
  {
    name: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    vehiclePlate: { type: String, trim: true },
    deliveryCompany: { type: String, trim: true },
  },
  { _id: false }
);

const inventoryRequestSchema = new Schema<IInventoryRequest>(
  {
    requestCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(InventoryRequestTypeEnum),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(InventoryRequestStatusEnum),
      default: InventoryRequestStatusEnum.PENDING,
      required: true,
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
    items: {
      type: [inventoryRequestItemSchema],
      required: true,
      validate: [
        (val: IInventoryRequestItem[]) => val.length > 0,
        'Request must have at least one item',
      ],
    },
    pickupQrToken: {
      type: String,
      trim: true,
      index: {
        unique: true,
        partialFilterExpression: { pickupQrToken: { $type: 'string' } },
      },
    },
    otpHash: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      required: true,
    },
    transporterInfo: {
      type: transporterInfoSchema,
    },
    evidenceImages: {
      type: [String],
      default: [],
    },
    signatureUrl: {
      type: String,
      trim: true,
    },
    staffNotes: {
      type: String,
      trim: true,
    },
    discrepancyReason: {
      type: String,
      trim: true,
    },
    discrepancyImages: {
      type: [String],
      default: [],
    },
    customerFeedbackNotes: {
      type: String,
      trim: true,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    isAutoConfirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

inventoryRequestSchema.index({ customerId: 1, type: 1, status: 1 });
inventoryRequestSchema.index({ facilityId: 1, status: 1 });
inventoryRequestSchema.index({ createdAt: 1, status: 1 });

inventoryRequestSchema.plugin(MongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: 'all',
});

export const InventoryRequest = mongoose.model<
  IInventoryRequest,
  SoftDeleteModel<IInventoryRequest>
>('InventoryRequest', inventoryRequestSchema);
