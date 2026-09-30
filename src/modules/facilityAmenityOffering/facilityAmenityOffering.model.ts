import mongoose from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import { FacilityAmenityOfferingStatusEnum } from '../../common/enums/facilityAmenityOffering.enum.ts';

export interface IFacilityAmenityOffering extends SoftDeleteDocument {
  facilityId: mongoose.Types.ObjectId;
  amenityId: mongoose.Types.ObjectId;
  billingUnit: BillingUnitEnum;
  pricePerUnit: number;
  totalQuantity: number;
  inUseQuantity: number;
  status: FacilityAmenityOfferingStatusEnum;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const facilityAmenityOfferingSchema =
  new mongoose.Schema<IFacilityAmenityOffering>(
    {
      facilityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facility',
        required: true,
      },
      amenityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Amenity',
        required: true,
      },
      billingUnit: {
        type: String,
        enum: Object.values(BillingUnitEnum),
        default: BillingUnitEnum.MONTH,
        required: true,
      },
      pricePerUnit: {
        type: Number,
        required: true,
        min: 0,
      },
      totalQuantity: {
        type: Number,
        min: 0,
        default: 0,
      },
      inUseQuantity: {
        type: Number,
        min: 0,
        default: 0,
      },
      status: {
        type: String,
        enum: Object.values(FacilityAmenityOfferingStatusEnum),
        default: FacilityAmenityOfferingStatusEnum.ACTIVE,
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

// Partial Unique Compound Index: 1 cơ sở chỉ có 1 bản ghi cấu hình active cho 1 tiện ích
facilityAmenityOfferingSchema.index(
  { facilityId: 1, amenityId: 1 },
  { unique: true, partialFilterExpression: { deleted: false } }
);

facilityAmenityOfferingSchema.index({ facilityId: 1, status: 1 });
facilityAmenityOfferingSchema.index({ facilityId: 1, billingUnit: 1 });

facilityAmenityOfferingSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const FacilityAmenityOffering = mongoose.model<
  IFacilityAmenityOffering,
  SoftDeleteModel<IFacilityAmenityOffering>
>('FacilityAmenityOffering', facilityAmenityOfferingSchema);
