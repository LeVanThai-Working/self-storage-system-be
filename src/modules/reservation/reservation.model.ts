import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import { ReservationStatusEnum } from '../../common/enums/reservation.enum.ts';

export interface IReservationAmenity {
  facilityAmenityOfferingId: Types.ObjectId;
  amenityId: Types.ObjectId;
  name: string;
  quantity: number;
  pricePerUnit: number;
  billingUnit: BillingUnitEnum;
  totalPrice: number;
}

export interface IReservation extends SoftDeleteDocument {
  _id: Types.ObjectId;
  reservationCode: string;
  customerId: Types.ObjectId;
  facilityId: Types.ObjectId;
  facilityUnitTypeOfferingId: Types.ObjectId;
  storageUnitId?: Types.ObjectId | null;
  startDate: Date;
  rentalDuration: number;
  billingUnit: BillingUnitEnum;
  basePrice: number;
  depositAmount: number;
  amenities: IReservationAmenity[];
  totalAmount: number;
  status: ReservationStatusEnum;
  expiresAt?: Date | null;
  receivedBy?: Types.ObjectId | null;
  receivedAt?: Date | null;
  assignedBy?: Types.ObjectId | null;
  assignedAt?: Date | null;
  confirmedBy?: Types.ObjectId | null;
  confirmedAt?: Date | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: Types.ObjectId | null;
  cancelledAt?: Date | null;
  refundAmount?: number;
  lastPaymentError?: string | null;
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
      default: null,
    },
    startDate: {
      type: Date,
      required: true,
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
      default: ReservationStatusEnum.PENDING,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
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
    rejectionReason: {
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
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPaymentError: {
      type: String,
      default: null,
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
reservationSchema.index({ storageUnitId: 1, status: 1 }, { sparse: true });
reservationSchema.index({ status: 1, expiresAt: 1 });

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
