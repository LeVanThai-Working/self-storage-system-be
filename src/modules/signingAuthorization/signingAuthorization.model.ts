import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';

export interface ISigningAuthorization extends SoftDeleteDocument {
  _id: Types.ObjectId;
  legalEntityId: Types.ObjectId;
  authorizedUserId: Types.ObjectId;
  facilityIds: Types.ObjectId[];
  authorizationNumber: string;
  issuedDate: Date;
  validFrom: Date;
  validTo: Date;
  documentUrl: string;
  fileHash?: string | null;
  status: 'active' | 'revoked' | 'expired';
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const signingAuthorizationSchema = new Schema<ISigningAuthorization>(
  {
    legalEntityId: {
      type: Schema.Types.ObjectId,
      ref: 'LegalEntity',
      required: true,
    },
    authorizedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    facilityIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Facility',
        required: true,
      },
    ],
    authorizationNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    issuedDate: {
      type: Date,
      required: true,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
      required: true,
    },
    documentUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileHash: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      required: true,
    },
    notes: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

signingAuthorizationSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

signingAuthorizationSchema.index({ authorizedUserId: 1, status: 1 });
signingAuthorizationSchema.index({ legalEntityId: 1 });
signingAuthorizationSchema.index({ facilityIds: 1 });
signingAuthorizationSchema.index({ validFrom: 1, validTo: 1 });

export const SigningAuthorization = mongoose.model<
  ISigningAuthorization,
  SoftDeleteModel<ISigningAuthorization>
>('SigningAuthorization', signingAuthorizationSchema);
