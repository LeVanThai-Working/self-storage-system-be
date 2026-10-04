import type { AuditLogRepository } from './auditLog.repository.ts';
import type { AuditLogPublisher } from './auditLog.publisher.ts';
import {
  AuditStatusEnum,
  type AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import type {
  AuditEvent,
  RecordAuditInput,
} from '../../common/types/auditLog.type.ts';
import { getRequestContext } from '../../utils/requestContext.util.ts';
import { registerAfterCommit } from '../../utils/transactionScope.util.ts';
import {
  buildAuditChanges,
  sanitizeAuditMetadata,
} from '../../utils/auditDiff.util.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  auditLogListResponseSchema,
  auditLogResponseSchema,
  type AuditLogResponse,
} from './schemas/auditLog.response.schema.ts';
import type { AuditLogQuery } from './schemas/auditLog.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

export class AuditLogService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly publisher: AuditLogPublisher
  ) {}

  /**
   * Main audit ingestion point.
   * Gathers request context, diffs + masks data, builds a serializable event,
   * and dispatches it immediately or defers it until the active transaction commits.
   * NEVER throws or blocks caller execution.
   */
  public record(input: RecordAuditInput): void {
    try {
      const context = getRequestContext();
      const actor =
        input.actor !== undefined ? input.actor : (context?.actor ?? null);

      const resourceId =
        input.resourceId !== undefined && input.resourceId !== null
          ? String(input.resourceId)
          : null;

      const changes = buildAuditChanges(input.before, input.after);
      const metadata = sanitizeAuditMetadata(input.metadata);

      const event: AuditEvent = {
        version: 1,
        actorId: actor?.id ?? null,
        actorRole: actor?.role ?? null,
        actorEmail: actor?.email ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId,
        status: input.status ?? AuditStatusEnum.SUCCESS,
        changes,
        metadata,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
        requestId: context?.requestId ?? null,
        method: context?.method ?? null,
        path: context?.path ?? null,
        occurredAt: new Date().toISOString(),
      };

      // If running inside a @Transactional() execution, buffer until successful commit
      const enqueuedInTx = registerAfterCommit(() => {
        this.publisher.publish([event]);
      });

      if (!enqueuedInTx) {
        this.publisher.publish([event]);
      }
    } catch (error) {
      console.error('[AuditLogService] Failed to record audit event:', error);
    }
  }

  private formatAuditLog(doc: unknown): unknown {
    if (!doc) return doc;
    const item = doc as {
      toObject?: (options?: unknown) => Record<string, unknown>;
      _id?: unknown;
      id?: string;
      actorId?: unknown;
    };

    const obj =
      typeof item.toObject === 'function'
        ? item.toObject({ virtuals: true })
        : { ...item };

    if (!obj.id && obj._id) {
      obj.id = String(obj._id);
    }
    if (obj.actorId && typeof obj.actorId === 'object') {
      obj.actorId = String(obj.actorId);
    }
    return obj;
  }

  public async findAll(
    query?: AuditLogQuery
  ): Promise<PaginatedData<AuditLogResponse>> {
    try {
      const result = await this.auditLogRepository.findAll(query);
      const formattedItems = result.items.map((item) =>
        this.formatAuditLog(item)
      );
      const validatedItems = validateResponse(
        auditLogListResponseSchema,
        formattedItems
      );

      return {
        items: validatedItems,
        pagination: result.pagination,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[AuditLogService] Error in findAll:', error);
      throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106);
    }
  }

  public async findById(id: string): Promise<AuditLogResponse> {
    const log = await this.auditLogRepository.findById(id);
    if (!log) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Audit Log']);
    }
    return validateResponse(auditLogResponseSchema, this.formatAuditLog(log));
  }

  public async findMine(
    userId: string,
    query?: AuditLogQuery
  ): Promise<PaginatedData<AuditLogResponse>> {
    const userQuery: AuditLogQuery = {
      page: query?.page ?? 1,
      limit: query?.limit ?? 10,
      sortBy: query?.sortBy ?? 'createdAt',
      sortOrder: query?.sortOrder ?? 'desc',
      search: query?.search,
      action: query?.action,
      resourceType: query?.resourceType,
      resourceId: query?.resourceId,
      status: query?.status,
      from: query?.from,
      to: query?.to,
      actorId: userId,
    };

    return this.findAll(userQuery);
  }

  public async findByResource(
    resourceType: AuditResourceEnum,
    resourceId: string,
    query?: AuditLogQuery
  ): Promise<PaginatedData<AuditLogResponse>> {
    const resourceQuery: AuditLogQuery = {
      page: query?.page ?? 1,
      limit: query?.limit ?? 10,
      sortBy: query?.sortBy ?? 'createdAt',
      sortOrder: query?.sortOrder ?? 'desc',
      search: query?.search,
      action: query?.action,
      status: query?.status,
      from: query?.from,
      to: query?.to,
      resourceType,
      resourceId,
    };

    return this.findAll(resourceQuery);
  }
}
