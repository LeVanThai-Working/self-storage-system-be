import mongoose from 'mongoose';
import {
  AuthProviderEnum,
  RoleEnum,
  UserStatusEnum,
} from '../../common/enums/user.enum.ts';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';

export interface IUser extends SoftDeleteDocument {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: string;
  authProvider: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 6, maxlength: 100 },
    phoneNumber: { type: String, minlength: 10, maxlength: 11 },
    role: {
      type: String,
      enum: Object.values(RoleEnum),
      default: RoleEnum.CUSTOMER,
    },
    authProvider: { type: String, enum: Object.values(AuthProviderEnum) },
    status: { type: String, enum: Object.values(UserStatusEnum) },
  },
  {
    timestamps: true,
  }
);

userSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const User = mongoose.model<IUser, SoftDeleteModel<IUser>>(
  'User',
  userSchema
);
