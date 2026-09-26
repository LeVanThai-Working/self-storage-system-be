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
  password?: string;
  phoneNumber?: string;
  googleId?: string;
  role: string;
  authProvider: AuthProviderEnum;
  status: UserStatusEnum;
  isEmailVerified: boolean;
  assignedFacilityId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function (this: IUser) {
        return this.authProvider === AuthProviderEnum.LOCAL;
      },
    },
    phoneNumber: { type: String, minlength: 10, maxlength: 11 },
    role: {
      type: String,
      enum: Object.values(RoleEnum),
      default: RoleEnum.CUSTOMER,
    },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: {
      type: String,
      enum: Object.values(AuthProviderEnum),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatusEnum),
      required: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    assignedFacilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      default: null,
    },
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
