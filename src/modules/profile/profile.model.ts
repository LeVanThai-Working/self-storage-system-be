import mongoose from 'mongoose';
import { GenderEnum } from '../../common/enums/user.enum.ts';
import type { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete';
import MongooseDelete from 'mongoose-delete';

export interface IProfile extends SoftDeleteDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  avatarUrl?: string;
  dateOfBirth?: Date;
  address?: string;
  gender?: GenderEnum;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new mongoose.Schema<IProfile>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    avatarUrl: { type: String },
    dateOfBirth: { type: Date },
    address: { type: String, maxlength: 200 },
    gender: {
      type: String,
      enum: Object.values(GenderEnum),
    },
  },
  {
    timestamps: true,
  }
);

profileSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const Profile = mongoose.model<IProfile, SoftDeleteModel<IProfile>>(
  'Profile',
  profileSchema
);
