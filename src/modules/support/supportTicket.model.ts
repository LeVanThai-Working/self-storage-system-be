import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import {
  SupportTicketCategoryEnum,
  SupportTicketPriorityEnum,
  SupportTicketStatusEnum,
} from '../../common/enums/supportTicket.enum.ts';

export interface ISupportTicketStaffResponse {
  responseMessage: string;
  attachments: string[];
  respondedBy: Types.ObjectId;
  respondedAt: Date;
}

export interface ISupportTicket extends SoftDeleteDocument {
  _id: Types.ObjectId;
  ticketCode: string;
  customerId: Types.ObjectId;
  facilityId?: Types.ObjectId;
  contractId?: Types.ObjectId;
  category: SupportTicketCategoryEnum;
  priority: SupportTicketPriorityEnum;
  title: string;
  description: string;
  attachments: string[];
  status: SupportTicketStatusEnum;
  assignedStaffId?: Types.ObjectId;
  staffResponse?: ISupportTicketStaffResponse;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketStaffResponseSchema =
  new Schema<ISupportTicketStaffResponse>(
    {
      responseMessage: {
        type: String,
        required: true,
        trim: true,
        maxlength: 3000,
      },
      attachments: {
        type: [String],
        default: [],
      },
      respondedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      respondedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
    { _id: false }
  );

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
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
      default: null,
      index: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(SupportTicketCategoryEnum),
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(SupportTicketPriorityEnum),
      default: SupportTicketPriorityEnum.MEDIUM,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    attachments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(SupportTicketStatusEnum),
      default: SupportTicketStatusEnum.PENDING,
      required: true,
      index: true,
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    staffResponse: {
      type: supportTicketStaffResponseSchema,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Soft delete plugin
supportTicketSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

// Partial Unique Index for ticketCode
supportTicketSchema.index(
  { ticketCode: 1 },
  { unique: true, partialFilterExpression: { deleted: false } }
);

// Compound queries
supportTicketSchema.index({ facilityId: 1, status: 1, deleted: 1 });
supportTicketSchema.index({ customerId: 1, status: 1, deleted: 1 });

export const SupportTicket = mongoose.model<
  ISupportTicket,
  SoftDeleteModel<ISupportTicket>
>('SupportTicket', supportTicketSchema);
