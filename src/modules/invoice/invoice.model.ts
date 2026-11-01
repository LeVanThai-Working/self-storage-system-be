import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
} from '../../common/enums/billing.enum.ts';
import { PaymentMethodEnum } from '../../common/enums/payment.enum.ts';

export interface IInvoiceItem {
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  itemType: InvoiceItemTypeEnum;
}

export type InvoiceReminderMilestone = 'T-3' | 'T-1' | 'T-0';

export interface IInvoiceReminderLog {
  milestone: InvoiceReminderMilestone;
  sentAt: Date;
}

export interface IInvoice extends SoftDeleteDocument {
  _id: Types.ObjectId;
  invoiceCode: string;
  contractId: Types.ObjectId;
  customerId: Types.ObjectId;
  facilityId: Types.ObjectId;
  type: InvoiceTypeEnum;
  status: InvoiceStatusEnum;
  billingPeriodIndex: number;
  periodStartDate: Date;
  periodEndDate: Date;
  dueDate: Date;
  items: IInvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  paidAt?: Date | null;
  paymentId?: Types.ObjectId | null;
  paymentMethod?: PaymentMethodEnum | null;
  notes?: string | null;
  issuedAt?: Date | null;
  createdBy?: Types.ObjectId | null;
  confirmedBy?: Types.ObjectId | null;
  confirmedAt?: Date | null;
  proofImageUrl?: string | null;
  cancelledBy?: Types.ObjectId | null;
  cancelledAt?: Date | null;
  cancelReason?: string | null;
  remindersSent?: IInvoiceReminderLog[];
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    itemType: {
      type: String,
      enum: Object.values(InvoiceItemTypeEnum),
      required: true,
    },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
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
    type: {
      type: String,
      enum: Object.values(InvoiceTypeEnum),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(InvoiceStatusEnum),
      default: InvoiceStatusEnum.ISSUED,
      index: true,
    },
    billingPeriodIndex: {
      type: Number,
      default: 1,
      min: 1,
    },
    periodStartDate: {
      type: Date,
      required: true,
    },
    periodEndDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    items: {
      type: [invoiceItemSchema],
      required: true,
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethodEnum),
      default: null,
    },
    notes: {
      type: String,
      default: null,
      trim: true,
    },
    issuedAt: {
      type: Date,
      default: () => new Date(),
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    proofImageUrl: {
      type: String,
      default: null,
      trim: true,
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
    cancelReason: {
      type: String,
      default: null,
      trim: true,
    },
    remindersSent: {
      type: [
        {
          milestone: {
            type: String,
            enum: ['T-3', 'T-1', 'T-0'],
            required: true,
          },
          sentAt: {
            type: Date,
            default: () => new Date(),
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Soft-delete plugin
invoiceSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

// Partial Unique Index: only 1 active RECURRING invoice per billing period on a contract
invoiceSchema.index(
  { contractId: 1, billingPeriodIndex: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: InvoiceTypeEnum.RECURRING,
      deleted: false,
    },
  }
);

export const Invoice = mongoose.model<IInvoice, SoftDeleteModel<IInvoice>>(
  'Invoice',
  invoiceSchema
);
