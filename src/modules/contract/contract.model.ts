import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import {
  ContractSourceEnum,
  ContractStatusEnum,
} from '../../common/enums/contract.enum.ts';

export interface IContractAmenity {
  facilityAmenityOfferingId: Types.ObjectId;
  amenityId: Types.ObjectId;
  name: string;
  quantity: number;
  pricePerUnit: number;
  billingUnit: BillingUnitEnum;
  totalPrice: number;
  addedAt: Date;
}

export interface IContractRenewal {
  previousEndDate: Date;
  newEndDate: Date;
  renewedAt: Date;
  renewedBy: Types.ObjectId;
  note?: string | null;
}

export interface IContract extends SoftDeleteDocument {
  _id: Types.ObjectId;
  contractCode: string;
  source: ContractSourceEnum;
  reservationId?: Types.ObjectId | null;
  customerId: Types.ObjectId;
  facilityId: Types.ObjectId;
  storageUnitId: Types.ObjectId;
  facilityUnitTypeOfferingId: Types.ObjectId;
  assignedStaffId?: Types.ObjectId | null;

  startDate: Date;
  endDate: Date;
  actualCheckInDate?: Date | null;
  actualCheckOutDate?: Date | null;

  billingUnit: BillingUnitEnum;
  rentalPrice: number;
  depositAmount: number;
  depositPaidAt?: Date | null;
  depositPaymentId?: Types.ObjectId | null;
  totalPeriodicPrice: number;

  amenities: IContractAmenity[];
  renewals: IContractRenewal[];
  renewalCount: number;

  inspectedBy?: Types.ObjectId | null;
  damageFee: number;
  overdueFee: number;
  refundAmount: number;
  additionalPaymentRequired: number;
  inspectionNotes?: string | null;

  cancellationReason?: string | null;
  cancelledBy?: Types.ObjectId | null;
  cancelledAt?: Date | null;

  terminationReason?: string | null;
  terminatedBy?: Types.ObjectId | null;
  terminatedAt?: Date | null;

  status: ContractStatusEnum;
  termsAccepted: boolean;
  notes?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const contractAmenitySchema = new Schema<IContractAmenity>(
  {
    facilityAmenityOfferingId: {
      type: Schema.Types.ObjectId,
      ref: 'FacilityAmenityOffering',
      required: true,
    },
    amenityId: {
      type: Schema.Types.ObjectId,
      ref: 'Amenity',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    billingUnit: {
      type: String,
      enum: Object.values(BillingUnitEnum),
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const contractRenewalSchema = new Schema<IContractRenewal>(
  {
    previousEndDate: {
      type: Date,
      required: true,
    },
    newEndDate: {
      type: Date,
      required: true,
    },
    renewedAt: {
      type: Date,
      default: Date.now,
    },
    renewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const contractSchema = new Schema<IContract>(
  {
    contractCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    source: {
      type: String,
      enum: Object.values(ContractSourceEnum),
      required: true,
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
    },
    storageUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageUnit',
      required: true,
    },
    facilityUnitTypeOfferingId: {
      type: Schema.Types.ObjectId,
      ref: 'FacilityUnitTypeOffering',
      required: true,
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    actualCheckInDate: {
      type: Date,
      default: null,
    },
    actualCheckOutDate: {
      type: Date,
      default: null,
    },
    billingUnit: {
      type: String,
      enum: Object.values(BillingUnitEnum),
      required: true,
    },
    rentalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    depositPaidAt: {
      type: Date,
      default: null,
    },
    depositPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    totalPeriodicPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    amenities: {
      type: [contractAmenitySchema],
      default: [],
    },
    renewals: {
      type: [contractRenewalSchema],
      default: [],
    },
    renewalCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    inspectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    damageFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    overdueFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    additionalPaymentRequired: {
      type: Number,
      default: 0,
      min: 0,
    },
    inspectionNotes: {
      type: String,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    terminationReason: {
      type: String,
      default: null,
    },
    terminatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    terminatedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(ContractStatusEnum),
      default: ContractStatusEnum.DRAFT,
      required: true,
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
contractSchema.index({ customerId: 1, status: 1 });
contractSchema.index({ facilityId: 1, status: 1 });
contractSchema.index({ storageUnitId: 1, status: 1 });
contractSchema.index({ reservationId: 1 }, { sparse: true });
contractSchema.index({ status: 1, endDate: 1 });

contractSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const Contract = mongoose.model<IContract, SoftDeleteModel<IContract>>(
  'Contract',
  contractSchema
);
