import mongoose from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { CustomerSkuStatusEnum } from '../../common/enums/customerSku.enum.ts';
import type { IDimensions } from '../unitType/unitType.model.ts';

export interface ICustomerSku extends SoftDeleteDocument {
  customerId: mongoose.Types.ObjectId;
  skuCode: string;
  name: string;
  description?: string;
  category?: string;
  barcode?: string;
  uom: string;
  dimensions?: IDimensions;
  volume?: number;
  weightKg?: number;
  imageUrl?: string;
  status: CustomerSkuStatusEnum;
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

const customerSkuSchema = new mongoose.Schema<ICustomerSku>(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    skuCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    uom: {
      type: String,
      required: true,
      trim: true,
      default: 'cái',
      maxlength: 30,
    },
    dimensions: {
      type: dimensionsSchema,
      required: false,
    },
    volume: {
      type: Number,
      min: 0,
    },
    weightKg: {
      type: Number,
      min: 0,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(CustomerSkuStatusEnum),
      default: CustomerSkuStatusEnum.ACTIVE,
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

// Partial Unique Index 1: Mỗi khách hàng có 1 skuCode duy nhất trong các record chưa bị xóa mềm
customerSkuSchema.index(
  { customerId: 1, skuCode: 1 },
  { unique: true, partialFilterExpression: { deleted: { $ne: true } } }
);

// Partial Unique Index 2: Mỗi khách hàng có 1 barcode duy nhất nếu có khai báo barcode trong các record chưa bị xóa mềm
customerSkuSchema.index(
  { customerId: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted: { $ne: true },
      barcode: { $type: 'string' },
    },
  }
);

// Compound Index phục vụ lọc và tìm kiếm
customerSkuSchema.index({ customerId: 1, status: 1, category: 1 });

customerSkuSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const CustomerSku = mongoose.model<
  ICustomerSku,
  SoftDeleteModel<ICustomerSku>
>('CustomerSku', customerSkuSchema);
