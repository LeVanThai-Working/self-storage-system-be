import { z } from 'zod';
import {
  AuditActionEnum,
  AuditResourceEnum,
  AuditStatusEnum,
} from '../../../common/enums/auditLog.enum.ts';

const changesSchema = z
  .object({
    before: z.record(z.string(), z.unknown()).optional(),
    after: z.record(z.string(), z.unknown()).optional(),
  })
  .nullable();

export const auditLogResponseSchema = z.object({
  id: z.string(),
  version: z.number(),
  actorId: z.string().nullable().optional(),
  actorRole: z.string().nullable().optional(),
  actorEmail: z.string().nullable().optional(),
  action: z.enum(AuditActionEnum),
  resourceType: z.enum(AuditResourceEnum),
  resourceId: z.string().nullable().optional(),
  status: z.enum(AuditStatusEnum),
  changes: changesSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  ip: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  requestId: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  createdAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.iso.datetime(),
  ]),
});

export const auditLogListResponseSchema = z.array(auditLogResponseSchema);

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;
export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;
