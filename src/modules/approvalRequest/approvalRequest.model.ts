import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import {
  ApprovalRequestActionEnum,
  ApprovalRequestStatusEnum,
  ApprovalRequestTargetTypeEnum,
} from '../../common/enums/approvalRequest.enum.ts';

export interface IApprovalRequest extends SoftDeleteDocument {
  _id: Types.ObjectId;
  requesterId: Types.ObjectId;
  facilityId: Types.ObjectId;
  targetType: ApprovalRequestTargetTypeEnum;
  action: ApprovalRequestActionEnum;
  targetId?: Types.ObjectId | null;
  payload: Record<string, unknown>;
  reason: string;
  status: ApprovalRequestStatusEnum;
  approverId?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  rejectionReason?: string | null;
  reviewNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const approvalRequestSchema = new Schema<IApprovalRequest>(
  {
    requesterId: {
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
    targetType: {
      type: String,
      enum: Object.values(ApprovalRequestTargetTypeEnum),
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(ApprovalRequestActionEnum),
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: Object.values(ApprovalRequestStatusEnum),
      default: ApprovalRequestStatusEnum.PENDING,
      index: true,
    },
    approverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    reviewNotes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal queries
approvalRequestSchema.index({ facilityId: 1, status: 1, createdAt: -1 });
approvalRequestSchema.index({ requesterId: 1, status: 1, createdAt: -1 });
approvalRequestSchema.index({ targetType: 1, status: 1, createdAt: -1 });

// Soft delete plugin
approvalRequestSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const ApprovalRequest = mongoose.model<
  IApprovalRequest,
  SoftDeleteModel<IApprovalRequest>
>('ApprovalRequest', approvalRequestSchema);
