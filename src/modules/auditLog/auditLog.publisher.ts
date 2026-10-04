import type { AuditEvent } from '../../common/types/auditLog.type.ts';
import type {
  AuditLogCreateData,
  AuditLogRepository,
} from './auditLog.repository.ts';

/**
 * Extension point for audit event delivery.
 * Current implementation: MongoAuditLogPublisher (direct fire-and-forget).
 * Future roadmap: can be replaced by BatchingMongoPublisher, RedisStreamPublisher,
 * or KafkaPublisher without changing any business service code.
 */
export interface AuditLogPublisher {
  publish(events: AuditEvent[]): void;
}

export class MongoAuditLogPublisher implements AuditLogPublisher {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  publish(events: AuditEvent[]): void {
    if (events.length === 0) return;

    const docs: AuditLogCreateData[] = events.map((event) => ({
      version: event.version,
      actorId: event.actorId,
      actorRole: event.actorRole,
      actorEmail: event.actorEmail,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      status: event.status,
      changes: event.changes,
      metadata: event.metadata,
      ip: event.ip,
      userAgent: event.userAgent,
      requestId: event.requestId,
      method: event.method,
      path: event.path,
      createdAt: new Date(event.occurredAt),
    }));

    // Fire-and-forget: catch all errors, never bubble up to break caller request
    this.auditLogRepository.insertMany(docs).catch((error) => {
      console.error(
        '[MongoAuditLogPublisher] Failed to persist audit logs:',
        error
      );
    });
  }
}
