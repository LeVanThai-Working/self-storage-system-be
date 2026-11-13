import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import { AccessScheduleStatusEnum } from '../../common/enums/customerInventory.enum.ts';

export interface ITimeSlotSnapshot {
  slotName: string;
  startTime: string;
  endTime: string;
}

export interface IAccessSchedule extends SoftDeleteDocument {
  scheduleCode: string;
  status: AccessScheduleStatusEnum;
  customerId: Types.ObjectId;
  contractId: Types.ObjectId;
  facilityId: Types.ObjectId;
  timeSlotId: Types.ObjectId;
  scheduledDate: Date;
  timeSlotSnapshot: ITimeSlotSnapshot;
  numberOfPeople: number;
  vehicleType?: string | null;
  vehiclePlate?: string | null;
  purpose?: string | null;

  otpEncrypted?: string | null;
  assignedStaffId?: Types.ObjectId | null;
  assignedStaffNameSnapshot?: string | null;
  assignedAt?: Date | null;
  assignedBy?: Types.ObjectId | null;
  assignmentVersion: number;
  otpHash?: string | null;
  expiresAt: Date;

  checkedInAt?: Date | null;
  checkedInBy?: Types.ObjectId | null;
  checkedOutAt?: Date | null;
  checkedOutBy?: Types.ObjectId | null;
  cancelledAt?: Date | null;
  cancelledReason?: string | null;
  staffNotes?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const timeSlotSnapshotSchema = new Schema<ITimeSlotSnapshot>(
  {
    slotName: { type: String, required: true, trim: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const accessScheduleSchema = new Schema<IAccessSchedule>(
  {
    scheduleCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(AccessScheduleStatusEnum),
      default: AccessScheduleStatusEnum.PENDING,
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
      index: true,
    },
    timeSlotId: {
      type: Schema.Types.ObjectId,
      ref: 'FacilityTimeSlot',
      required: true,
      index: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },
    timeSlotSnapshot: {
      type: timeSlotSnapshotSchema,
      required: true,
    },
    numberOfPeople: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 1,
    },
    vehicleType: {
      type: String,
      trim: true,
      default: null,
    },
    vehiclePlate: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    purpose: {
      type: String,
      trim: true,
      default: null,
    },
    otpEncrypted: { type: String, default: null },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedStaffNameSnapshot: { type: String, default: null },
    assignedAt: { type: Date, default: null },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assignmentVersion: { type: Number, default: 0 },
    otpHash: {
      type: String,
      trim: true,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkedInBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    checkedOutAt: {
      type: Date,
      default: null,
    },
    checkedOutBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledReason: {
      type: String,
      trim: true,
      default: null,
    },
    staffNotes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Staff workload serialization across schedules inside transactions.
export const AccessScheduleStaffLock = mongoose.model(
  'AccessScheduleStaffLock',
  new Schema({
    _id: { type: Schema.Types.ObjectId, required: true },
    revision: { type: Number, default: 0 },
  })
);
accessScheduleSchema.index(
  { facilityId: 1, otpHash: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: AccessScheduleStatusEnum.PENDING,
      otpHash: { $type: 'string' },
      deleted: false,
    },
  }
);
accessScheduleSchema.index({ assignedStaffId: 1, scheduledDate: 1, status: 1 });
// Indexes for fast capacity checking and query scoping
accessScheduleSchema.index({
  facilityId: 1,
  scheduledDate: 1,
  timeSlotId: 1,
  status: 1,
});
accessScheduleSchema.index({ customerId: 1, status: 1 });
accessScheduleSchema.index({ facilityId: 1, status: 1 });
accessScheduleSchema.index({ status: 1, expiresAt: 1 });

accessScheduleSchema.plugin(MongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: 'all',
});

export const AccessSchedule = mongoose.model<
  IAccessSchedule,
  SoftDeleteModel<IAccessSchedule>
>('AccessSchedule', accessScheduleSchema);
