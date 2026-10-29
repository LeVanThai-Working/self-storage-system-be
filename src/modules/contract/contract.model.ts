import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import {
  ContractAddendumStatusEnum,
  ContractAddendumTypeEnum,
  ContractCancellationTypeEnum,
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
  ContractTerminationTypeEnum,
  ViolationCategoryEnum,
} from '../../common/enums/contract.enum.ts';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';

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
// Addendum and Renewal interfaces are defined below
export interface IContractAddendum {
  _id?: Types.ObjectId;
  addendumCode: string;
  type: ContractAddendumTypeEnum;
  previousEndDate?: Date | null;
  newEndDate?: Date | null;
  previousStorageUnitId?: Types.ObjectId | null;
  newStorageUnitId?: Types.ObjectId | null;
  amenities: IContractAmenity[];
  totalPeriodicPrice: number;
  damageFee: number;
  status: ContractAddendumStatusEnum;
  requestedBy: Types.ObjectId;
  requestedAt: Date;
  approvedBy?: Types.ObjectId | null;
  approvedAt?: Date | null;
  assignedStaffId?: Types.ObjectId | null;
  customerSigned: boolean;
  customerSignedAt?: Date | null;
  staffSigned: boolean;
  staffSignedAt?: Date | null;
  completedAt?: Date | null;
  rejectionReason?: string | null;
  rejectedBy?: Types.ObjectId | null;
  rejectedAt?: Date | null;
  cancellationReason?: string | null;
  cancelledBy?: Types.ObjectId | null;
  cancelledAt?: Date | null;
  notes?: string | null;
}

export interface IContractRenewal {
  previousEndDate: Date;
  newEndDate: Date;
  renewedAt: Date;
  renewedBy: Types.ObjectId;
  note?: string | null;
}

export interface IContractSignatureHistory {
  party: 'customer' | 'staff';
  signedAt: Date;
  previousStartDate: Date;
  previousEndDate: Date;
  resetAt: Date;
  resetReason: string;
}

export interface IContractTerminationFile {
  url: string;
  fileHash?: string;
  uploadedAt: Date;
}

export interface IContractTerminationHistory {
  terminationType: ContractTerminationTypeEnum;
  violationCategory?: ViolationCategoryEnum | null;
  reason: string;
  reportFiles: IContractTerminationFile[];
  evidenceFiles: IContractTerminationFile[];
  terminatedBy: Types.ObjectId;
  terminatedAt: Date;
  storageUnitStatus: StorageUnitStatusEnum;
  depositStatus: ContractDepositStatusEnum;
  forfeitedAmount: number;
}

export interface IContract extends SoftDeleteDocument {
  _id: Types.ObjectId;
  contractCode: string;
  source: ContractSourceEnum;
  reservationId?: Types.ObjectId | null;
  customerId: Types.ObjectId;
  facilityId: Types.ObjectId;
  storageUnitId: Types.ObjectId;
  rentedRackIds?: Types.ObjectId[];
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
  firstPeriodPaidAt?: Date | null;
  firstPeriodPaymentId?: Types.ObjectId | null;
  totalPeriodicPrice: number;

  amenities: IContractAmenity[];
  addendums: IContractAddendum[];
  renewals: IContractRenewal[];
  renewalCount: number;

  inspectedBy?: Types.ObjectId | null;
  damageFee: number;
  overdueFee: number;
  refundAmount: number;
  forfeitedAmount?: number;
  additionalPaymentRequired: number;
  inspectionNotes?: string | null;
  inspectionPhotos?: string[];
  depositStatus?: ContractDepositStatusEnum | null;
  settlementConfirmedAt?: Date | null;
  disputedAt?: Date | null;
  disputeReason?: string | null;

  cancellationType?: ContractCancellationTypeEnum | null;
  cancellationReason?: string | null;
  cancelledBy?: Types.ObjectId | null;
  cancelledAt?: Date | null;

  terminationType?: ContractTerminationTypeEnum | null;
  violationCategory?: ViolationCategoryEnum | null;
  terminationReason?: string | null;
  terminatedBy?: Types.ObjectId | null;
  terminatedAt?: Date | null;
  reportFiles?: IContractTerminationFile[];
  evidenceFiles?: IContractTerminationFile[];
  terminationHistory?: IContractTerminationHistory[];

  status: ContractStatusEnum;
  termsAccepted: boolean;
  customerSigned: boolean;
  customerSignedAt?: Date | null;
  staffSigned: boolean;
  staffSignedAt?: Date | null;
  signatureHistory: IContractSignatureHistory[];
  earlyCheckIn?: boolean | null;
  outOfSlot?: boolean | null;
  lastInventoryActivityAt?: Date | null;
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

const contractAddendumSchema = new Schema<IContractAddendum>(
  {
    addendumCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(ContractAddendumTypeEnum),
      default: ContractAddendumTypeEnum.RENEW,
      required: true,
    },
    previousEndDate: {
      type: Date,
      default: null,
    },
    newEndDate: {
      type: Date,
      default: null,
    },
    previousStorageUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageUnit',
      default: null,
    },
    newStorageUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageUnit',
      default: null,
    },
    amenities: {
      type: [contractAmenitySchema],
      default: [],
    },
    totalPeriodicPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    damageFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(ContractAddendumStatusEnum),
      default: ContractAddendumStatusEnum.PENDING_APPROVAL,
      required: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customerSigned: {
      type: Boolean,
      default: false,
    },
    customerSignedAt: {
      type: Date,
      default: null,
    },
    staffSigned: {
      type: Boolean,
      default: false,
    },
    staffSignedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectedAt: {
      type: Date,
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
    notes: {
      type: String,
      default: null,
    },
  },
  { _id: true }
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

const contractSignatureHistorySchema = new Schema<IContractSignatureHistory>(
  {
    party: {
      type: String,
      enum: ['customer', 'staff'],
      required: true,
    },
    signedAt: {
      type: Date,
      required: true,
    },
    previousStartDate: {
      type: Date,
      required: true,
    },
    previousEndDate: {
      type: Date,
      required: true,
    },
    resetAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    resetReason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const contractTerminationFileSchema = new Schema<IContractTerminationFile>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    fileHash: {
      type: String,
      default: null,
      trim: true,
    },
    uploadedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const contractTerminationHistorySchema =
  new Schema<IContractTerminationHistory>(
    {
      terminationType: {
        type: String,
        enum: Object.values(ContractTerminationTypeEnum),
        required: true,
      },
      violationCategory: {
        type: String,
        enum: Object.values(ViolationCategoryEnum),
        default: null,
      },
      reason: {
        type: String,
        required: true,
        trim: true,
      },
      reportFiles: {
        type: [contractTerminationFileSchema],
        default: [],
      },
      evidenceFiles: {
        type: [contractTerminationFileSchema],
        default: [],
      },
      terminatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      terminatedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
      storageUnitStatus: {
        type: String,
        enum: Object.values(StorageUnitStatusEnum),
        required: true,
      },
      depositStatus: {
        type: String,
        enum: Object.values(ContractDepositStatusEnum),
        required: true,
      },
      forfeitedAmount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
    },
    { _id: true }
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
    rentedRackIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'StorageRack',
        },
      ],
      default: [],
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
    firstPeriodPaidAt: {
      type: Date,
      default: null,
    },
    firstPeriodPaymentId: {
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
    addendums: {
      type: [contractAddendumSchema],
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
    forfeitedAmount: {
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
    inspectionPhotos: {
      type: [String],
      default: [],
    },
    depositStatus: {
      type: String,
      enum: Object.values(ContractDepositStatusEnum),
      default: null,
    },
    settlementConfirmedAt: {
      type: Date,
      default: null,
    },
    disputedAt: {
      type: Date,
      default: null,
    },
    disputeReason: {
      type: String,
      default: null,
    },
    cancellationType: {
      type: String,
      enum: Object.values(ContractCancellationTypeEnum),
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
    terminationType: {
      type: String,
      enum: Object.values(ContractTerminationTypeEnum),
      default: null,
    },
    violationCategory: {
      type: String,
      enum: Object.values(ViolationCategoryEnum),
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
    reportFiles: {
      type: [contractTerminationFileSchema],
      default: [],
    },
    evidenceFiles: {
      type: [contractTerminationFileSchema],
      default: [],
    },
    terminationHistory: {
      type: [contractTerminationHistorySchema],
      default: [],
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
    customerSigned: {
      type: Boolean,
      default: false,
    },
    customerSignedAt: {
      type: Date,
      default: null,
    },
    staffSigned: {
      type: Boolean,
      default: false,
    },
    staffSignedAt: {
      type: Date,
      default: null,
    },
    signatureHistory: {
      type: [contractSignatureHistorySchema],
      default: [],
    },
    earlyCheckIn: {
      type: Boolean,
      default: null,
    },
    outOfSlot: {
      type: Boolean,
      default: null,
    },
    lastInventoryActivityAt: {
      type: Date,
      default: null,
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
