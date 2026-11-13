import mongoose, { Schema } from 'mongoose';

const systemSettingSchema = new Schema(
  {
    _id: { type: String, required: true },
    enabled: { type: Boolean, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const SystemSetting = mongoose.model(
  'SystemSetting',
  systemSettingSchema
);
