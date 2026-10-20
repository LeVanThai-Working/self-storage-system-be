import mongoose from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';

export interface IOperatingHours {
  open: string;
  close: string;
}

export interface IFacility extends SoftDeleteDocument {
  name: string;
  code?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  description?: string;
  status: FacilityStatusEnum;
  images?: string[];
  managerId?: mongoose.Types.ObjectId;
  operatingHours?: IOperatingHours;
  createdAt: Date;
  updatedAt: Date;
}

const operatingHoursSchema = new mongoose.Schema<IOperatingHours>(
  {
    open: { type: String, required: true },
    close: { type: String, required: true },
  },
  { _id: false }
);

const facilitySchema = new mongoose.Schema<IFacility>(
  {
    name: { type: String, required: true, minlength: 2, maxlength: 100 },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 20,
    },
    address: { type: String, required: true, maxlength: 255 },
    city: { type: String, required: true, maxlength: 100 },
    phone: { type: String, minlength: 10, maxlength: 11 },
    email: { type: String },
    description: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: Object.values(FacilityStatusEnum),
      default: FacilityStatusEnum.ACTIVE,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    operatingHours: { type: operatingHoursSchema, default: null },
  },
  {
    timestamps: true,
  }
);

// Partial Unique Index: Mã cơ sở là duy nhất trên toàn hệ thống trong các bản ghi chưa xóa mềm
facilitySchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted: { $ne: true },
      code: { $type: 'string' },
    },
  }
);

facilitySchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const Facility = mongoose.model<IFacility, SoftDeleteModel<IFacility>>(
  'Facility',
  facilitySchema
);
