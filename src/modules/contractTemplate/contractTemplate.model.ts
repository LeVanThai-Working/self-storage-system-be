import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';

export interface IContractTemplate extends SoftDeleteDocument {
  _id: Types.ObjectId;
  templateCode: string;
  version: string;
  title: string;
  contentHtml: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contractTemplateSchema = new Schema<IContractTemplate>(
  {
    templateCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 100,
    },
    version: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    contentHtml: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

contractTemplateSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

contractTemplateSchema.index({ templateCode: 1, version: 1 }, { unique: true });
contractTemplateSchema.index({ isActive: 1 });

export const ContractTemplate = mongoose.model<
  IContractTemplate,
  SoftDeleteModel<IContractTemplate>
>('ContractTemplate', contractTemplateSchema);
