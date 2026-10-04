import mongoose from 'mongoose';
import {
  AuditActionEnum,
  AuditResourceEnum,
  AuditStatusEnum,
} from '../../common/enums/auditLog.enum.ts';
import type { AuditChanges } from '../../common/types/auditLog.type.ts';

/**
 * Audit logs are append-only & immutable:
 * - NO soft-delete plugin, NO update operations.
 * - Old records are purged automatically by a MongoDB TTL index.
 */
export interface IAuditLog extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  version: number;
  actorId: mongoose.Types.ObjectId | null;
  actorRole: string | null;
  actorEmail: string | null;
  action: AuditActionEnum;
  resourceType: AuditResourceEnum;
  resourceId: string | null;
  status: AuditStatusEnum;
  changes: AuditChanges | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  method: string | null;
  path: string | null;
  createdAt: Date;
}

const DEFAULT_RETENTION_DAYS = 90;
const SECONDS_PER_DAY = 24 * 60 * 60;

const parsedRetentionDays = Number(process.env.AUDIT_LOG_RETENTION_DAYS);
export const AUDIT_LOG_RETENTION_DAYS =
  Number.isFinite(parsedRetentionDays) && parsedRetentionDays > 0
    ? Math.floor(parsedRetentionDays)
    : DEFAULT_RETENTION_DAYS;

const auditLogSchema = new mongoose.Schema<IAuditLog>(
  {
    version: { type: Number, default: 1 },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorRole: { type: String, default: null },
    actorEmail: { type: String, default: null },
    action: {
      type: String,
      enum: Object.values(AuditActionEnum),
      required: true,
    },
    resourceType: {
      type: String,
      enum: Object.values(AuditResourceEnum),
      required: true,
    },
    resourceId: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(AuditStatusEnum),
      default: AuditStatusEnum.SUCCESS,
    },
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    requestId: { type: String, default: null },
    method: { type: String, default: null },
    path: { type: String, default: null },
    // Set explicitly from the event's `occurredAt` (not mongoose timestamps)
    // so the stored time is when the action happened, not when it was flushed.
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  {
    timestamps: false,
    minimize: false,
  }
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

// Periodic purge handled by MongoDB itself (TTL monitor runs ~every 60s).
// NOTE: Mongoose does NOT update `expireAfterSeconds` on an existing index.
// After changing AUDIT_LOG_RETENTION_DAYS, run on the database:
//   db.runCommand({ collMod: 'auditlogs',
//     index: { keyPattern: { createdAt: 1 }, expireAfterSeconds: <days * 86400> } })
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: AUDIT_LOG_RETENTION_DAYS * SECONDS_PER_DAY }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
