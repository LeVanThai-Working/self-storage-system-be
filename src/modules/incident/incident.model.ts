import mongoose, { Schema, type Types } from 'mongoose';
import MongooseDelete, {
  type SoftDeleteDocument,
  type SoftDeleteModel,
} from 'mongoose-delete';
import {
  IncidentStatusEnum,
  IncidentCategoryEnum,
  IncidentSeverityEnum,
  IncidentLiablePartyEnum,
} from '../../common/enums/incident.enum.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';

export interface IIncidentResolution {
  investigationNotes?: string;
  staffEvidenceImages: string[];
  resolutionNotes: string;
  repairCost: number;
  liableParty: IncidentLiablePartyEnum;
  damageFee: number;
  resolvedBy: Types.ObjectId;
  resolvedAt: Date;
}

export interface IIncident extends SoftDeleteDocument {
  _id: Types.ObjectId;
  incidentCode: string;
  facilityId: Types.ObjectId;
  storageUnitId?: Types.ObjectId;
  storageRackId?: Types.ObjectId;
  rackTierId?: Types.ObjectId;
  contractId?: Types.ObjectId;
  reporterId: Types.ObjectId;
  reporterRole: RoleEnum;
  category: IncidentCategoryEnum;
  severity: IncidentSeverityEnum;
  title: string;
  description: string;
  images: string[];
  status: IncidentStatusEnum;
  assignedStaffId?: Types.ObjectId;
  putUnitUnderMaintenance: boolean;
  requiresRelocation: boolean;
  investigationNotes?: string;
  resolution?: IIncidentResolution;
  closedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const incidentResolutionSchema = new Schema<IIncidentResolution>(
  {
    investigationNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    staffEvidenceImages: {
      type: [String],
      default: [],
    },
    resolutionNotes: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    repairCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    liableParty: {
      type: String,
      enum: Object.values(IncidentLiablePartyEnum),
      required: true,
      default: IncidentLiablePartyEnum.FACILITY,
    },
    damageFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resolvedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const incidentSchema = new Schema<IIncident>(
  {
    incidentCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
      index: true,
    },
    storageUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageUnit',
      default: null,
      index: true,
    },
    storageRackId: {
      type: Schema.Types.ObjectId,
      ref: 'StorageRack',
      default: null,
      index: true,
    },
    rackTierId: {
      type: Schema.Types.ObjectId,
      ref: 'RackTier',
      default: null,
      index: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      default: null,
      index: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reporterRole: {
      type: String,
      enum: Object.values(RoleEnum),
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(IncidentCategoryEnum),
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(IncidentSeverityEnum),
      required: true,
      default: IncidentSeverityEnum.LOW,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: string[]) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one evidence image is required for incident report',
      },
    },
    status: {
      type: String,
      enum: Object.values(IncidentStatusEnum),
      required: true,
      default: IncidentStatusEnum.REPORTED,
      index: true,
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    putUnitUnderMaintenance: {
      type: Boolean,
      default: false,
    },
    requiresRelocation: {
      type: Boolean,
      default: false,
    },
    investigationNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    resolution: {
      type: incidentResolutionSchema,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Soft delete plugin
incidentSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});

// Partial Unique Index on incidentCode
incidentSchema.index(
  { incidentCode: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted: false },
  }
);

// Compound query indexes
incidentSchema.index({ facilityId: 1, status: 1 });
incidentSchema.index({ reporterId: 1, status: 1 });
incidentSchema.index({ assignedStaffId: 1, status: 1 });

export const Incident = mongoose.model<IIncident, SoftDeleteModel<IIncident>>(
  'Incident',
  incidentSchema
);
