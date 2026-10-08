import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import {
  PaymentMethodEnum,
  PaymentPurposeEnum,
  PaymentStatusEnum,
  PaymentTransactionResultEnum,
} from '../../common/enums/payment.enum.ts';

export interface IPayment extends SoftDeleteDocument {
  _id: Types.ObjectId;
  paymentCode: string;
  purpose: PaymentPurposeEnum;
  reservationId?: Types.ObjectId | null;
  contractId?: Types.ObjectId | null;
  customerId: Types.ObjectId;
  facilityId: Types.ObjectId;
  amount: number;
  paidAmount: number;
  overpaidAmount: number;
  method: PaymentMethodEnum;
  status: PaymentStatusEnum;
  expiresAt?: Date | null;
  paidAt?: Date | null;
  sepayTransactionId?: number | null;
  referenceCode?: string | null;
  confirmedBy?: Types.ObjectId | null;
  confirmedAt?: Date | null;
  cancelledBy?: Types.ObjectId | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentTransaction {
  _id: Types.ObjectId;
  sepayId: number;
  gateway?: string | null;
  transactionDate?: string | null;
  accountNumber?: string | null;
  subAccount?: string | null;
  code?: string | null;
  content?: string | null;
  transferType?: string | null;
  transferAmount?: number | null;
  accumulated?: number | null;
  referenceCode?: string | null;
  description?: string | null;
  matchedPaymentId?: Types.ObjectId | null;
  result: PaymentTransactionResultEnum;
  rawPayload?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    paymentCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      enum: Object.values(PaymentPurposeEnum),
      required: true,
      index: true,
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
      index: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      default: null,
      index: true,
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    overpaidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethodEnum),
      default: PaymentMethodEnum.SEPAY_QR,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatusEnum),
      default: PaymentStatusEnum.PENDING,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    sepayTransactionId: {
      type: Number,
      default: null,
    },
    referenceCode: {
      type: String,
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
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      maxlength: 1000,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ reservationId: 1, status: 1 });
paymentSchema.index({ contractId: 1, status: 1 });
paymentSchema.index({ status: 1, expiresAt: 1 });

paymentSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const Payment = mongoose.model<IPayment, SoftDeleteModel<IPayment>>(
  'Payment',
  paymentSchema
);

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    sepayId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    gateway: {
      type: String,
      default: null,
    },
    transactionDate: {
      type: String,
      default: null,
    },
    accountNumber: {
      type: String,
      default: null,
    },
    subAccount: {
      type: String,
      default: null,
    },
    code: {
      type: String,
      default: null,
      index: true,
    },
    content: {
      type: String,
      default: null,
    },
    transferType: {
      type: String,
      default: null,
    },
    transferAmount: {
      type: Number,
      default: 0,
    },
    accumulated: {
      type: Number,
      default: null,
    },
    referenceCode: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    matchedPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
      index: true,
    },
    result: {
      type: String,
      enum: Object.values(PaymentTransactionResultEnum),
      default: PaymentTransactionResultEnum.RECEIVED,
      required: true,
      index: true,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentTransactionSchema.index({ createdAt: -1 });

export const PaymentTransaction = mongoose.model<IPaymentTransaction>(
  'PaymentTransaction',
  paymentTransactionSchema
);
