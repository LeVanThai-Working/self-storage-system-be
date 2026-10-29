import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import { RentalTargetTypeEnum } from '../../common/enums/rental.enum.ts';
import {
  RefundStatusEnum,
  ReservationCancelSourceEnum,
  ReservationStatusEnum,
} from '../../common/enums/reservation.enum.ts';

export interface IReservationAmenity {
  facilityAmenityOfferingId: Types.ObjectId;
  amenityId: Types.ObjectId;
  name: string;
  quantity: number;
  pricePerUnit: number;
  billingUnit: BillingUnitEnum;
  totalPrice: number;
}

export interface IReservationUnitChange {
  fromUnitId: Types.ObjectId;
  toUnitId: Types.ObjectId;
  fromOfferingId?: Types.ObjectId | null;
  toOfferingId?: Types.ObjectId | null;
  fromPrice?: number | null;
  toPrice?: number | null;
  reason: string;
  status?: 'pending' | 'accepted' | 'rejected';
  proposedBy?: Types.ObjectId | null;
  proposedAt?: Date | null;
  decisionBy?: Types.ObjectId | null;
  decisionAt?: Date | null;
  rejectReason?: string | null;
  changedBy?: Types.ObjectId;
  changedAt?: Date;
}

export interface IReservationPendingUnitChange {
  newStorageUnitId: Types.ObjectId;
  newFacilityUnitTypeOfferingId: Types.ObjectId;
  newPricePerUnit: number;
  reason: string;
  oldUnitStatus: 'under_maintenance' | 'available';
  proposedBy: Types.ObjectId;
  proposedAt: Date;
}

export interface IReservationPolicySnapshot {
  freeCancelHours: number;
  forfeitPercent: number;
  noShowGraceHours: number;
  cancellationMode?: 'slot_start' | 'calendar_day';
}

export interface IReservation extends SoftDeleteDocument {
  _id: Types.ObjectId;
  reservationCode: string;
  customerId: Types.ObjectId;
  facilityId: Types.ObjectId;
  facilityUnitTypeOfferingId: Types.ObjectId;
  storageUnitId: Types.ObjectId;
  rentalTargetType?: RentalTargetTypeEnum;
  rentedRackIds?: Types.ObjectId[];
  startDate: Date;
  checkInDate: Date;
  checkInTimeSlot: string;
  rentalDuration: number;
  billingUnit: BillingUnitEnum;
  basePrice: number;
  depositAmount: number;
  amenities: IReservationAmenity[];
  totalAmount: number;
  status: ReservationStatusEnum;
  expiresAt?: Date | null;
  graceExpiresAt?: Date | null;
  confirmedBy?: Types.ObjectId | null;
  confirmedAt?: Date | null;
  assignedStaffId?: Types.ObjectId | null;
  assignedStaffAt?: Date | null;
  cancellationReason?: string | null;
  cancelledBy?: Types.ObjectId | null;
  cancelledAt?: Date | null;
  cancellationSource?: ReservationCancelSourceEnum | null;
  incidentId?: Types.ObjectId | null;
  evidenceImages?: string[];
  forceCancelledBy?: Types.ObjectId | null;
  forceCancelledAt?: Date | null;
  arrivedAt?: Date | null;
  arrivedBy?: Types.ObjectId | null;
  graceExtendedAt?: Date | null;
  graceExtendedBy?: Types.ObjectId | null;
  graceExtensionReason?: string | null;
  refundAmount?: number;
  forfeitedAmount?: number;
  refundStatus: RefundStatusEnum;
  refundedAt?: Date | null;
  refundedBy?: Types.ObjectId | null;
  refundReference?: string | null;
  refundNote?: string | null;
  paidAt?: Date | null;
  paidAmount?: number;
  paymentId?: Types.ObjectId | null;
  termsAccepted: boolean;
  policyVersion?: string | null;
  acceptedAt?: Date | null;
  acceptedIp?: string | null;
  policySnapshot?: IReservationPolicySnapshot | null;
  immediateForfeitWarning?: boolean | null;
  earlyCheckIn?: boolean | null;
  outOfSlot?: boolean | null;
  pendingUnitChange?: IReservationPendingUnitChange | null;
  unitChangeHistory: IReservationUnitChange[];
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const reservationAmenitySchema = new Schema<IReservationAmenity>(
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
  },
  { _id: false }
);

const reservationPendingUnitChangeSchema =
  new Schema<IReservationPendingUnitChange>(
    {
      newStorageUnitId: {
        type: Schema.Types.ObjectId,
        ref: 'StorageUnit',
        required: true,
      },
      newFacilityUnitTypeOfferingId: {
        type: Schema.Types.ObjectId,
        ref: 'FacilityUnitTypeOffering',
        required: true,
      },
      newPricePerUnit: {
        type: Number,
        required: true,
        min: 0,
      },
      reason: {
        type: String,
        required: true,
        trim: true,
      },
      oldUnitStatus: {
        type: String,
        enum: ['under_maintenance', 'available'],
        default: 'under_maintenance',
      },
      proposedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      proposedAt: {
        type: Date,
        default: Date.now,
      },
    },
    { _id: false }
  );

const reservationUnitChangeSchema = new Schema<IReservationUnitChange>(
  {
    fromUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageUnit',
      required: true,
    },
    toUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageUnit',
      required: true,
    },
    fromOfferingId: {
      type: Schema.Types.ObjectId,
      ref: 'FacilityUnitTypeOffering',
      default: null,
    },
    toOfferingId: {
      type: Schema.Types.ObjectId,
      ref: 'FacilityUnitTypeOffering',
      default: null,
    },
    fromPrice: {
      type: Number,
      default: null,
    },
    toPrice: {
      type: Number,
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'accepted',
    },
    proposedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    proposedAt: {
      type: Date,
      default: null,
    },
    decisionBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decisionAt: {
      type: Date,
      default: null,
    },
    rejectReason: {
      type: String,
      default: null,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const reservationPolicySnapshotSchema = new Schema<IReservationPolicySnapshot>(
  {
    freeCancelHours: {
      type: Number,
      required: true,
      min: 0,
    },
    forfeitPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    noShowGraceHours: {
      type: Number,
      required: true,
      min: 0,
    },
    cancellationMode: {
      type: String,
      enum: ['slot_start', 'calendar_day'],
      default: 'slot_start',
    },
  },
  { _id: false }
);

const reservationSchema = new Schema<IReservation>(
  {
    reservationCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
      index: true,
    },
    facilityUnitTypeOfferingId: {
      type: Schema.Types.ObjectId,
      ref: 'FacilityUnitTypeOffering',
      required: true,
      index: true,
    },
    storageUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageUnit',
      required: true,
    },
    rentalTargetType: {
      type: String,
      enum: Object.values(RentalTargetTypeEnum),
      default: RentalTargetTypeEnum.STORAGE_UNIT,
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
    startDate: {
      type: Date,
      required: true,
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    checkInTimeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    rentalDuration: {
      type: Number,
      required: true,
      min: 1,
    },
    billingUnit: {
      type: String,
      enum: Object.values(BillingUnitEnum),
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amenities: {
      type: [reservationAmenitySchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(ReservationStatusEnum),
      default: ReservationStatusEnum.PENDING_PAYMENT,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    graceExpiresAt: {
      type: Date,
      default: null,
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedStaffAt: {
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
    cancellationSource: {
      type: String,
      enum: Object.values(ReservationCancelSourceEnum),
      default: null,
    },
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },
    evidenceImages: {
      type: [String],
      default: [],
    },
    forceCancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    forceCancelledAt: {
      type: Date,
      default: null,
    },
    arrivedAt: {
      type: Date,
      default: null,
    },
    arrivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    graceExtendedAt: {
      type: Date,
      default: null,
    },
    graceExtendedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    graceExtensionReason: {
      type: String,
      default: null,
      trim: true,
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
    refundStatus: {
      type: String,
      enum: Object.values(RefundStatusEnum),
      default: RefundStatusEnum.NONE,
      required: true,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    refundedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    refundReference: {
      type: String,
      default: null,
      trim: true,
    },
    refundNote: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    policyVersion: {
      type: String,
      default: null,
      trim: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    acceptedIp: {
      type: String,
      default: null,
      trim: true,
    },
    policySnapshot: {
      type: reservationPolicySnapshotSchema,
      default: null,
    },
    immediateForfeitWarning: {
      type: Boolean,
      default: false,
    },
    earlyCheckIn: {
      type: Boolean,
      default: null,
    },
    outOfSlot: {
      type: Boolean,
      default: null,
    },
    pendingUnitChange: {
      type: reservationPendingUnitChangeSchema,
      default: null,
    },
    unitChangeHistory: {
      type: [reservationUnitChangeSchema],
      default: [],
    },
    notes: {
      type: String,
      maxlength: 1000,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal queries
reservationSchema.index({ customerId: 1, status: 1, createdAt: -1 });
reservationSchema.index({ facilityId: 1, status: 1, createdAt: -1 });
reservationSchema.index({ status: 1, expiresAt: 1 });
reservationSchema.index({ status: 1, graceExpiresAt: 1 });
reservationSchema.index({ facilityId: 1, checkInDate: 1, checkInTimeSlot: 1 });

// Partial Unique Index: Only ONE active reservation can lock a storageUnit at any time (for standard STORAGE_UNIT rentals)
reservationSchema.index(
  { storageUnitId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      storageUnitId: { $type: 'objectId' },
      rentalTargetType: RentalTargetTypeEnum.STORAGE_UNIT,
      status: {
        $in: [
          ReservationStatusEnum.PENDING_PAYMENT,
          ReservationStatusEnum.PAYMENT_SUCCESSFUL,
          ReservationStatusEnum.CONFIRMED,
          ReservationStatusEnum.OVERDUE,
        ],
      },
      deleted: false,
    },
  }
);

// Soft delete plugin
reservationSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const Reservation = mongoose.model<
  IReservation,
  SoftDeleteModel<IReservation>
>('Reservation', reservationSchema);
