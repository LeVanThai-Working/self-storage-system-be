import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import {
  RefundRequestReasonEnum,
  RefundRequestStatusEnum,
} from '../../common/enums/refundRequest.enum.ts';

export interface IRefundRequest extends SoftDeleteDocument {
  _id: Types.ObjectId;
  refundCode: string;
  reservationId?: Types.ObjectId | null;
  contractId?: Types.ObjectId | null;
  paymentId?: Types.ObjectId | null;
  facilityId: Types.ObjectId;
  customerId: Types.ObjectId;
  amount: number;
  reason: RefundRequestReasonEnum;
  status: RefundRequestStatusEnum;

  // Sensitive bank details
  refundBankName?: string | null;
  refundAccountNumberEncrypted?: string | null;
  refundAccountNumberMasked?: string | null;
  refundAccountHolder?: string | null;

  // Verification & reconciliation details
  referenceCode?: string | null;
  proofImageUrl?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  note?: string | null;

  // Actors & Timestamps (Maker-Checker audit)
  requestedBy: Types.ObjectId;
  requestedAt: Date;
  approvedBy?: Types.ObjectId | null;
  approvedAt?: Date | null;
  rejectedBy?: Types.ObjectId | null;
  rejectedAt?: Date | null;
  paidBy?: Types.ObjectId | null;
  paidAt?: Date | null;
  cancelledBy?: Types.ObjectId | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const refundRequestSchema = new Schema<IRefundRequest>(
  {
    refundCode: { type: String, required: true, unique: true, index: true },
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
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      enum: Object.values(RefundRequestReasonEnum),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(RefundRequestStatusEnum),
      default: RefundRequestStatusEnum.PENDING_APPROVAL,
      index: true,
    },

    // Bank Details
    refundBankName: { type: String, default: null },
    refundAccountNumberEncrypted: { type: String, default: null },
    refundAccountNumberMasked: { type: String, default: null },
    refundAccountHolder: { type: String, default: null },

    // Reconciliation
    referenceCode: { type: String, default: null },
    proofImageUrl: { type: String, default: null },
    rejectionReason: { type: String, default: null },
    cancellationReason: { type: String, default: null },
    note: { type: String, default: null },

    // Audit tracking
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedAt: { type: Date, default: Date.now },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    paidAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

refundRequestSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const RefundRequest = mongoose.model<
  IRefundRequest,
  SoftDeleteModel<IRefundRequest>
>('RefundRequest', refundRequestSchema);
