import mongoose from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import {
  AmenityStatusEnum,
  AmenityTypeEnum,
} from '../../common/enums/amenity.enum.ts';

export interface IAmenity extends SoftDeleteDocument {
  name: string;
  description?: string;
  type: AmenityTypeEnum;
  status: AmenityStatusEnum;
  images?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const amenitySchema = new mongoose.Schema<IAmenity>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: Object.values(AmenityTypeEnum),
      default: AmenityTypeEnum.PHYSICAL,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AmenityStatusEnum),
      default: AmenityStatusEnum.ACTIVE,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

amenitySchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const Amenity = mongoose.model<IAmenity, SoftDeleteModel<IAmenity>>(
  'Amenity',
  amenitySchema
);
