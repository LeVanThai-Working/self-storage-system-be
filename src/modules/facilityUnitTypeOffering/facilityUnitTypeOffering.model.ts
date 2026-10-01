import mongoose from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../../common/enums/facilityUnitTypeOffering.enum.ts';

export interface IFacilityUnitTypeOffering extends SoftDeleteDocument {
  facilityId: mongoose.Types.ObjectId;
  unitTypeId: mongoose.Types.ObjectId;
  billingUnit: BillingUnitEnum;
  pricePerUnit: number;
  depositMultiplier: number;
  minRentalDays: number;
  status: FacilityUnitTypeOfferingStatusEnum;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const facilityUnitTypeOfferingSchema =
  new mongoose.Schema<IFacilityUnitTypeOffering>(
    {
      facilityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facility',
        required: true,
      },
      unitTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UnitType',
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
      depositMultiplier: {
        type: Number,
        min: 0,
        default: 1,
      },
      minRentalDays: {
        type: Number,
        min: 1,
        default: 1,
      },
      status: {
        type: String,
        enum: Object.values(FacilityUnitTypeOfferingStatusEnum),
        default: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
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

// Compound unique index: each facility can only have one pricing offering per unit type
facilityUnitTypeOfferingSchema.index(
  { facilityId: 1, unitTypeId: 1 },
  { unique: true }
);

facilityUnitTypeOfferingSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const FacilityUnitTypeOffering = mongoose.model<
  IFacilityUnitTypeOffering,
  SoftDeleteModel<IFacilityUnitTypeOffering>
>('FacilityUnitTypeOffering', facilityUnitTypeOfferingSchema);
