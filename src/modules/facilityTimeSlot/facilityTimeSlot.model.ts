import mongoose from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';

export interface IFacilityTimeSlot extends SoftDeleteDocument {
  facilityId: mongoose.Types.ObjectId;
  slotName: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const facilityTimeSlotSchema = new mongoose.Schema<IFacilityTimeSlot>(
  {
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
      index: true,
    },
    slotName: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    maxCapacity: {
      type: Number,
      required: true,
      min: 1,
      default: 2,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: A facility cannot have duplicate slotName among active records
facilityTimeSlotSchema.index(
  { facilityId: 1, slotName: 1 },
  { unique: true, partialFilterExpression: { deleted: { $ne: true } } }
);

facilityTimeSlotSchema.index({ facilityId: 1, isActive: 1 });

facilityTimeSlotSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

export const FacilityTimeSlot = mongoose.model<
  IFacilityTimeSlot,
  SoftDeleteModel<IFacilityTimeSlot>
>('FacilityTimeSlot', facilityTimeSlotSchema);
