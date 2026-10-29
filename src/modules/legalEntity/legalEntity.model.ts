import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';

export interface ILegalRepresentative {
  name: string;
  title: string;
  idNumber?: string;
}

export interface ILegalEntityBankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface ILegalEntity extends SoftDeleteDocument {
  _id: Types.ObjectId;
  companyName: string;
  taxCode: string;
  registeredAddress: string;
  legalRepresentative: ILegalRepresentative;
  bankAccount: ILegalEntityBankAccount;
  phone?: string | null;
  email?: string | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const legalRepresentativeSchema = new Schema<ILegalRepresentative>(
  {
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    idNumber: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const legalEntityBankAccountSchema = new Schema<ILegalEntityBankAccount>(
  {
    bankName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    accountHolder: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const legalEntitySchema = new Schema<ILegalEntity>(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 255,
    },
    taxCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 10,
      maxlength: 14,
    },
    registeredAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    legalRepresentative: {
      type: legalRepresentativeSchema,
      required: true,
    },
    bankAccount: {
      type: legalEntityBankAccountSchema,
      required: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

legalEntitySchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

legalEntitySchema.index({ status: 1 });

export const LegalEntity = mongoose.model<
  ILegalEntity,
  SoftDeleteModel<ILegalEntity>
>('LegalEntity', legalEntitySchema);
