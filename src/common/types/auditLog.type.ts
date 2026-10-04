import type {
  AuditActionEnum,
  AuditResourceEnum,
  AuditStatusEnum,
} from '../enums/auditLog.enum.ts';

/**
 * Who performed the action. Snapshot at the time of the action
 * (user may later change email / role or be deleted).
 */
export interface AuditActor {
  id: string;
  role: string | null;
  email: string | null;
}

/**
 * Only the fields that actually changed are stored.
 * - CREATE  → only `after`
 * - DELETE  → only `before`
 * - UPDATE  → both, limited to changed keys
 */
export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/**
 * Broker-agnostic, JSON-serializable audit event.
 * Kept free of Mongoose documents so it can later be pushed to
 * Redis Streams / BullMQ / Kafka without changing its shape.
 */
export interface AuditEvent {
  version: 1;
  actorId: string | null;
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
  occurredAt: string;
}

/**
 * Input accepted by `AuditLogService.record()`.
 * Request info (ip, userAgent, actor…) is resolved automatically from the
 * request context; `actor` only needs to be passed explicitly when the user
 * is not authenticated yet (login, register, logout via refresh token…).
 */
export interface RecordAuditInput {
  action: AuditActionEnum;
  resourceType: AuditResourceEnum;
  resourceId?: unknown;
  status?: AuditStatusEnum;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  actor?: AuditActor | null;
}
