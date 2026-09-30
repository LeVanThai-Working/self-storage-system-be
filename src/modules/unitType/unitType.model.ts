import mongoose from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../../common/enums/unitType.enum.ts';

export interface IDimensions {
  length: number;
  width: number;
  height: number;
}

export interface IUnitType extends SoftDeleteDocument {
  name: string;
  description?: string;
  dimensions: IDimensions;
  area: number;
  volume: number;
  category?: UnitTypeCategoryEnum;
  status: UnitTypeStatusEnum;
  images?: string[];
  features?: string[];
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

const unitTypeSchema = new mongoose.Schema<IUnitType>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: { type: String, maxlength: 1000 },
    dimensions: { type: dimensionsSchema, required: true },
    area: { type: Number, required: true, min: 0 },
    volume: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: Object.values(UnitTypeCategoryEnum),
      default: UnitTypeCategoryEnum.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(UnitTypeStatusEnum),
      default: UnitTypeStatusEnum.ACTIVE,
      required: true,
    },
    images: { type: [String], default: [] },
    features: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

unitTypeSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const UnitType = mongoose.model<IUnitType, SoftDeleteModel<IUnitType>>(
  'UnitType',
  unitTypeSchema
);
