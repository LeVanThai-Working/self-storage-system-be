import { AuditLog } from './auditLog.model.ts';
import { AuditLogRepository } from './auditLog.repository.ts';
import { MongoAuditLogPublisher } from './auditLog.publisher.ts';
import { AuditLogService } from './auditLog.service.ts';
import { AuditLogController } from './auditLog.controller.ts';

export const auditLogRepository = new AuditLogRepository(AuditLog);
export const auditLogPublisher = new MongoAuditLogPublisher(auditLogRepository);

// Single shared AuditLogService instance across the application
export const auditLogService = new AuditLogService(
  auditLogRepository,
  auditLogPublisher
);

export const auditLogController = new AuditLogController(auditLogService);
