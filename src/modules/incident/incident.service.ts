import { Types, type ClientSession } from 'mongoose';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import {
  IncidentLiablePartyEnum,
  IncidentSeverityEnum,
  IncidentStatusEnum,
} from '../../common/enums/incident.enum.ts';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import {
  NotificationChannelEnum,
  NotificationPriorityEnum,
  NotificationTypeEnum,
} from '../../common/enums/notification.enum.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { IncidentRepository } from './incident.repository.ts';
import type { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { NotificationService } from '../notification/notification.service.ts';
import type { IIncident } from './incident.model.ts';
import {
  incidentResponseSchema,
  paginatedIncidentResponseSchema,
  type IncidentResponse,
  type PaginatedIncidentResponse,
} from './schemas/incident.response.schema.ts';
import type {
  AssignIncidentRequest,
  CancelIncidentRequest,
  CloseIncidentRequest,
  IncidentQuery,
  InvestigateIncidentRequest,
  ReportIncidentRequest,
  ResolveIncidentRequest,
} from './schemas/incident.request.schema.ts';

export interface CallerContext {
  id: string;
  role?: string;
  assignedFacilityId?: string;
}

function toId(ref: unknown): string {
  if (typeof ref === 'object' && ref !== null && '_id' in ref) {
    return String((ref as { _id: unknown })._id);
  }
  return String(ref || '');
}

export class IncidentService {
  constructor(
    private readonly incidentRepository: IncidentRepository,
    private readonly storageUnitRepository?: StorageUnitRepository,
    private readonly contractRepository?: ContractRepository,
    private readonly userRepository?: UserRepository,
    private readonly notificationService?: NotificationService,
    private readonly auditLogService?: AuditLogService
  ) {}

  private async resolveCallerAssignedFacilityId(
    caller: CallerContext
  ): Promise<string | undefined> {
    if (caller.assignedFacilityId) {
      return caller.assignedFacilityId;
    }
    if (
      (caller.role === RoleEnum.FACILITY_STAFF ||
        caller.role === RoleEnum.FACILITY_MANAGER) &&
      this.userRepository
    ) {
      const user = await this.userRepository.findById(caller.id);
      if (user?.assignedFacilityId) {
        caller.assignedFacilityId = String(user.assignedFacilityId);
        return caller.assignedFacilityId;
      }
    }
    return undefined;
  }

  private formatIncident(doc: unknown): unknown {
    if (!doc) return doc;
    const raw =
      typeof (doc as { toObject?: () => Record<string, unknown> }).toObject ===
      'function'
        ? (doc as { toObject: () => Record<string, unknown> }).toObject()
        : { ...(doc as Record<string, unknown>) };

    const id = raw.id || (raw._id ? String(raw._id) : undefined);

    const formatRef = (ref: unknown): unknown => {
      if (!ref) return null;
      if (ref instanceof Types.ObjectId || typeof ref === 'string') {
        return { id: String(ref) };
      }
      if (typeof ref === 'object') {
        const obj = ref as Record<string, unknown>;
        const rawId = obj.id || obj._id;
        const res: Record<string, unknown> = {
          ...obj,
          id: rawId ? String(rawId) : String(obj),
        };
        if (res._id) {
          res._id = String(res._id);
        }
        return res;
      }
      return { id: String(ref) };
    };

    const resolutionObj = raw.resolution as Record<string, unknown> | null;

    return {
      ...raw,
      id,
      facility: formatRef(raw.facilityId),
      storageUnit: formatRef(raw.storageUnitId),
      storageRack: formatRef(raw.storageRackId),
      rackTier: formatRef(raw.rackTierId),
      contract: formatRef(raw.contractId),
      reporter: formatRef(raw.reporterId),
      assignedStaff: formatRef(raw.assignedStaffId),
      resolution: resolutionObj
        ? {
            ...resolutionObj,
            resolvedBy: formatRef(resolutionObj.resolvedBy),
            resolvedAt:
              resolutionObj.resolvedAt instanceof Date
                ? resolutionObj.resolvedAt.toISOString()
                : String(resolutionObj.resolvedAt || ''),
          }
        : null,
      closedAt:
        raw.closedAt instanceof Date
          ? raw.closedAt.toISOString()
          : raw.closedAt
            ? String(raw.closedAt)
            : null,
      cancelledAt:
        raw.cancelledAt instanceof Date
          ? raw.cancelledAt.toISOString()
          : raw.cancelledAt
            ? String(raw.cancelledAt)
            : null,
      cancellationReason: raw.cancellationReason || null,
      createdAt:
        raw.createdAt instanceof Date
          ? raw.createdAt.toISOString()
          : String(raw.createdAt || ''),
      updatedAt:
        raw.updatedAt instanceof Date
          ? raw.updatedAt.toISOString()
          : String(raw.updatedAt || ''),
    };
  }

  private async generateIncidentCode(
    facilityId: string | Types.ObjectId
  ): Promise<string> {
    const todayCount =
      await this.incidentRepository.countIncidentsToday(facilityId);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sequenceStr = String(todayCount + 1).padStart(4, '0');
    return `INC-${dateStr}-${sequenceStr}`;
  }

  /**
   * 1. Report an Incident (Customer or Staff/FM)
   */
  @Transactional()
  async reportIncident(
    caller: CallerContext,
    data: ReportIncidentRequest,
    session?: ClientSession
  ): Promise<IncidentResponse> {
    const callerRole = (caller.role || RoleEnum.CUSTOMER) as RoleEnum;
    let reporterRole = callerRole;

    // A. Validate Customer Scope
    if (callerRole === RoleEnum.CUSTOMER) {
      reporterRole = RoleEnum.CUSTOMER;
      if (data.contractId && this.contractRepository) {
        const contract = await this.contractRepository.findById(
          data.contractId,
          session
        );
        if (!contract || contract.deleted) {
          throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
        }
        if (toId(contract.customerId) !== caller.id) {
          throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
        }
        if (toId(contract.facilityId) !== data.facilityId) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_407);
        }
      }
    } else if (
      callerRole === RoleEnum.FACILITY_STAFF ||
      callerRole === RoleEnum.FACILITY_MANAGER
    ) {
      // B. Validate Staff/FM Facility Scope
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!assignedFacilityId || assignedFacilityId !== data.facilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
      }
    }

    // C. Check storage unit maintenance rule (Rule D5A.5)
    let shouldPutUnderMaintenance = Boolean(data.putUnitUnderMaintenance);
    if (
      shouldPutUnderMaintenance &&
      data.storageUnitId &&
      this.storageUnitRepository
    ) {
      const unit = await this.storageUnitRepository.findById(
        data.storageUnitId,
        session
      );
      if (!unit || unit.deleted) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['StorageUnit']);
      }

      // If unit is occupied by customer, keep it occupied and do not switch to maintenance
      if (unit.status === StorageUnitStatusEnum.OCCUPIED) {
        shouldPutUnderMaintenance = false;
      } else if (unit.status === StorageUnitStatusEnum.AVAILABLE) {
        await this.storageUnitRepository.updateById(
          data.storageUnitId,
          { status: StorageUnitStatusEnum.UNDER_MAINTENANCE },
          session
        );
      }
    }

    // D. Generate Code & Create Incident
    const incidentCode = await this.generateIncidentCode(data.facilityId);
    const incidentData: Partial<IIncident> = {
      incidentCode,
      facilityId: new Types.ObjectId(data.facilityId),
      storageUnitId: data.storageUnitId
        ? new Types.ObjectId(data.storageUnitId)
        : undefined,
      storageRackId: data.storageRackId
        ? new Types.ObjectId(data.storageRackId)
        : undefined,
      rackTierId: data.rackTierId
        ? new Types.ObjectId(data.rackTierId)
        : undefined,
      contractId: data.contractId
        ? new Types.ObjectId(data.contractId)
        : undefined,
      reporterId: new Types.ObjectId(caller.id),
      reporterRole,
      category: data.category,
      severity: data.severity,
      title: data.title,
      description: data.description,
      images: data.images,
      status: IncidentStatusEnum.REPORTED,
      putUnitUnderMaintenance: shouldPutUnderMaintenance,
      requiresRelocation: Boolean(data.requiresRelocation),
    };

    const createdIncident = await this.incidentRepository.create(
      incidentData,
      session
    );

    // E. Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.REPORT_INCIDENT,
      resourceType: AuditResourceEnum.INCIDENT,
      resourceId: String(createdIncident._id),
      after: createdIncident,
    });

    // F. Non-blocking Notification to Facility Staff/Manager
    if (this.notificationService && this.userRepository) {
      this.userRepository
        .findStaffsByFacilityId(data.facilityId, { limit: 100 })
        .then((staffPaginated) => {
          const staffIds = staffPaginated.items.map((staff) =>
            String(staff._id)
          );
          if (staffIds.length > 0) {
            this.notificationService?.sendNotificationToUsers(staffIds, {
              facilityId: data.facilityId,
              title: `[Sự cố mới] ${data.title}`,
              content: `Mã sự cố ${incidentCode} vừa được báo cáo tại cơ sở. Vui lòng kiểm tra và xử lý.`,
              type: NotificationTypeEnum.INCIDENT,
              priority:
                data.severity === IncidentSeverityEnum.CRITICAL
                  ? NotificationPriorityEnum.URGENT
                  : NotificationPriorityEnum.NORMAL,
              channels: [NotificationChannelEnum.IN_APP],
              metadata: {
                incidentId: String(createdIncident._id),
                incidentCode,
              },
            });
          }
        })
        .catch((err: unknown) => {
          console.warn('Failed to dispatch incident notification:', err);
        });
    }

    const fullDoc = await this.incidentRepository.findById(
      createdIncident._id,
      session
    );
    return validateResponse(
      incidentResponseSchema,
      this.formatIncident(fullDoc || createdIncident)
    );
  }

  /**
   * 2. FM Assigns Staff to Incident
   */
  async assignStaff(
    caller: CallerContext,
    id: string,
    data: AssignIncidentRequest,
    session?: ClientSession
  ): Promise<IncidentResponse> {
    const incident = await this.incidentRepository.findById(id, session);
    if (!incident || incident.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
    }

    // Scope check: only FM of facility, or Ops/Admin
    if (
      caller.role === RoleEnum.FACILITY_MANAGER ||
      caller.role === RoleEnum.FACILITY_STAFF
    ) {
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (
        !assignedFacilityId ||
        assignedFacilityId !== toId(incident.facilityId)
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
      }
    }

    // Validate assigned staff belongs to facility
    if (this.userRepository) {
      const staffUser = await this.userRepository.findById(
        data.assignedStaffId
      );
      if (
        !staffUser ||
        staffUser.deleted ||
        toId(staffUser.assignedFacilityId) !== toId(incident.facilityId)
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_708);
      }
    }

    const updated = await this.incidentRepository.atomicUpdateStatus(
      id,
      [IncidentStatusEnum.REPORTED, IncidentStatusEnum.ASSIGNED],
      {
        $set: {
          assignedStaffId: new Types.ObjectId(data.assignedStaffId),
          status: IncidentStatusEnum.ASSIGNED,
        },
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_701);
    }

    // Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.ASSIGN_INCIDENT,
      resourceType: AuditResourceEnum.INCIDENT,
      resourceId: id,
      before: incident,
      after: updated,
    });

    // Notify assigned staff
    if (this.notificationService) {
      this.notificationService.sendNotification({
        recipientId: data.assignedStaffId,
        facilityId: toId(incident.facilityId),
        title: `[Giao việc] Phân công xử lý sự cố ${incident.incidentCode}`,
        content: `Bạn được phân công xử lý sự cố "${incident.title}". Vui lòng khảo sát hiện trường và cập nhật tiến độ.`,
        type: NotificationTypeEnum.INCIDENT,
        priority: NotificationPriorityEnum.HIGH,
        channels: [NotificationChannelEnum.IN_APP],
        metadata: { incidentId: id, incidentCode: incident.incidentCode },
      });
    }

    return validateResponse(
      incidentResponseSchema,
      this.formatIncident(updated)
    );
  }

  /**
   * 3. Staff Investigates Incident
   */
  @Transactional()
  async investigateIncident(
    caller: CallerContext,
    id: string,
    data: InvestigateIncidentRequest,
    session?: ClientSession
  ): Promise<IncidentResponse> {
    const incident = await this.incidentRepository.findById(id, session);
    if (!incident || incident.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
    }

    // Scope check: Assignee, or FM of facility, or Ops/Admin
    const isAssignee = toId(incident.assignedStaffId) === caller.id;
    const isFM = caller.role === RoleEnum.FACILITY_MANAGER;
    const isOpsOrAdmin =
      caller.role === RoleEnum.BUSINESS_OPS_MANAGER ||
      caller.role === RoleEnum.SYSTEM_ADMIN;

    if (!isAssignee && !isFM && !isOpsOrAdmin) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_707);
    }

    // Check storage unit maintenance request
    let putUnitUnderMaintenance = incident.putUnitUnderMaintenance;
    if (
      data.putUnitUnderMaintenance !== undefined &&
      incident.storageUnitId &&
      this.storageUnitRepository
    ) {
      const unit = await this.storageUnitRepository.findById(
        toId(incident.storageUnitId),
        session
      );
      if (
        unit &&
        unit.status === StorageUnitStatusEnum.AVAILABLE &&
        data.putUnitUnderMaintenance
      ) {
        await this.storageUnitRepository.updateById(
          toId(incident.storageUnitId),
          { status: StorageUnitStatusEnum.UNDER_MAINTENANCE },
          session
        );
        putUnitUnderMaintenance = true;
      }
    }

    const updated = await this.incidentRepository.atomicUpdateStatus(
      id,
      [IncidentStatusEnum.ASSIGNED, IncidentStatusEnum.INVESTIGATING],
      {
        $set: {
          status: IncidentStatusEnum.INVESTIGATING,
          investigationNotes: data.investigationNotes,
          putUnitUnderMaintenance,
          requiresRelocation:
            data.requiresRelocation !== undefined
              ? data.requiresRelocation
              : incident.requiresRelocation,
        },
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_701);
    }

    // Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.INVESTIGATE_INCIDENT,
      resourceType: AuditResourceEnum.INCIDENT,
      resourceId: id,
      before: incident,
      after: updated,
    });

    return validateResponse(
      incidentResponseSchema,
      this.formatIncident(updated)
    );
  }

  /**
   * 4. Staff Resolves Incident & Submits Resolution Report
   */
  @Transactional()
  async resolveIncident(
    caller: CallerContext,
    id: string,
    data: ResolveIncidentRequest,
    session?: ClientSession
  ): Promise<IncidentResponse> {
    const incident = await this.incidentRepository.findById(id, session);
    if (!incident || incident.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
    }

    // Scope check: Assignee, FM of facility, or Ops/Admin
    const isAssignee = toId(incident.assignedStaffId) === caller.id;
    const isFM = caller.role === RoleEnum.FACILITY_MANAGER;
    const isOpsOrAdmin =
      caller.role === RoleEnum.BUSINESS_OPS_MANAGER ||
      caller.role === RoleEnum.SYSTEM_ADMIN;

    if (!isAssignee && !isFM && !isOpsOrAdmin) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_707);
    }

    // If unit was under maintenance, return it to AVAILABLE
    if (
      incident.putUnitUnderMaintenance &&
      incident.storageUnitId &&
      this.storageUnitRepository
    ) {
      const unit = await this.storageUnitRepository.findById(
        toId(incident.storageUnitId),
        session
      );
      if (unit && unit.status === StorageUnitStatusEnum.UNDER_MAINTENANCE) {
        await this.storageUnitRepository.updateById(
          toId(incident.storageUnitId),
          { status: StorageUnitStatusEnum.AVAILABLE },
          session
        );
      }
    }

    // Enforce damageFee = 0 if liable party is not CUSTOMER
    const damageFee =
      data.liableParty === IncidentLiablePartyEnum.CUSTOMER
        ? data.damageFee
        : 0;

    const resolutionDoc = {
      investigationNotes:
        incident.investigationNotes ||
        incident.resolution?.investigationNotes ||
        undefined,
      staffEvidenceImages: data.staffEvidenceImages,
      resolutionNotes: data.resolutionNotes,
      repairCost: data.repairCost,
      liableParty: data.liableParty,
      damageFee,
      resolvedBy: new Types.ObjectId(caller.id),
      resolvedAt: new Date(),
    };

    const updated = await this.incidentRepository.atomicUpdateStatus(
      id,
      [
        IncidentStatusEnum.INVESTIGATING,
        IncidentStatusEnum.IN_PROGRESS,
        IncidentStatusEnum.ASSIGNED,
      ],
      {
        $set: {
          status: IncidentStatusEnum.RESOLVED,
          resolution: resolutionDoc,
        },
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_701);
    }

    // Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.RESOLVE_INCIDENT,
      resourceType: AuditResourceEnum.INCIDENT,
      resourceId: id,
      before: incident,
      after: updated,
    });

    // Notify Reporter (Customer or Staff)
    if (this.notificationService) {
      this.notificationService.sendNotification({
        recipientId: toId(incident.reporterId),
        facilityId: toId(incident.facilityId),
        title: `[Đã giải quyết] Sự cố ${incident.incidentCode} đã được khắc phục`,
        content: `Sự cố "${incident.title}" đã được nhân viên hoàn tất sửa chữa. Vui lòng kiểm tra và nghiệm thu đóng hồ sơ.`,
        type: NotificationTypeEnum.INCIDENT,
        priority: NotificationPriorityEnum.HIGH,
        channels: [
          NotificationChannelEnum.IN_APP,
          NotificationChannelEnum.EMAIL,
        ],
        metadata: {
          incidentId: id,
          incidentCode: incident.incidentCode,
          repairCost: data.repairCost,
          damageFee,
        },
      });
    }

    return validateResponse(
      incidentResponseSchema,
      this.formatIncident(updated)
    );
  }

  /**
   * 5. Close Incident (Customer or FM)
   */
  async closeIncident(
    caller: CallerContext,
    id: string,
    data?: CloseIncidentRequest,
    session?: ClientSession
  ): Promise<IncidentResponse> {
    const incident = await this.incidentRepository.findById(id, session);
    if (!incident || incident.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
    }

    // Scope check: Customer who reported, FM of facility, or Ops/Admin
    if (caller.role === RoleEnum.CUSTOMER) {
      if (toId(incident.reporterId) !== caller.id) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else if (
      caller.role === RoleEnum.FACILITY_MANAGER ||
      caller.role === RoleEnum.FACILITY_STAFF
    ) {
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (
        !assignedFacilityId ||
        assignedFacilityId !== toId(incident.facilityId)
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
      }
    }

    const updated = await this.incidentRepository.atomicUpdateStatus(
      id,
      IncidentStatusEnum.RESOLVED,
      {
        $set: {
          status: IncidentStatusEnum.CLOSED,
          closedAt: new Date(),
        },
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_701);
    }

    // Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.CLOSE_INCIDENT,
      resourceType: AuditResourceEnum.INCIDENT,
      resourceId: id,
      before: incident,
      after: updated,
    });

    // Notify assigned staff if present
    if (this.notificationService && incident.assignedStaffId) {
      this.notificationService.sendNotification({
        recipientId: toId(incident.assignedStaffId),
        facilityId: toId(incident.facilityId),
        title: `[Nghiệm thu hoàn tất] Hồ sơ sự cố ${incident.incidentCode} đã đóng`,
        content: `Sự cố "${incident.title}" đã được nghiệm thu và đóng hồ sơ thành công.`,
        type: NotificationTypeEnum.INCIDENT,
        priority: NotificationPriorityEnum.NORMAL,
        channels: [NotificationChannelEnum.IN_APP],
        metadata: { incidentId: id, incidentCode: incident.incidentCode },
      });
    }

    return validateResponse(
      incidentResponseSchema,
      this.formatIncident(updated)
    );
  }

  /**
   * 6. Cancel Incident (Customer or FM)
   */
  async cancelIncident(
    caller: CallerContext,
    id: string,
    data: CancelIncidentRequest,
    session?: ClientSession
  ): Promise<IncidentResponse> {
    const incident = await this.incidentRepository.findById(id, session);
    if (!incident || incident.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
    }

    // Scope check:
    if (caller.role === RoleEnum.CUSTOMER) {
      if (toId(incident.reporterId) !== caller.id) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
      if (incident.status !== IncidentStatusEnum.REPORTED) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_706);
      }
    } else if (
      caller.role === RoleEnum.FACILITY_MANAGER ||
      caller.role === RoleEnum.FACILITY_STAFF
    ) {
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (
        !assignedFacilityId ||
        assignedFacilityId !== toId(incident.facilityId)
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
      }
      if (
        incident.status !== IncidentStatusEnum.REPORTED &&
        incident.status !== IncidentStatusEnum.ASSIGNED
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_706);
      }
    }

    const updated = await this.incidentRepository.atomicUpdateStatus(
      id,
      [IncidentStatusEnum.REPORTED, IncidentStatusEnum.ASSIGNED],
      {
        $set: {
          status: IncidentStatusEnum.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: data.cancellationReason,
        },
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_706);
    }

    // Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL_INCIDENT,
      resourceType: AuditResourceEnum.INCIDENT,
      resourceId: id,
      before: incident,
      after: updated,
    });

    return validateResponse(
      incidentResponseSchema,
      this.formatIncident(updated)
    );
  }

  /**
   * 7. Get Incident By ID
   */
  async getIncidentById(
    caller: CallerContext,
    id: string
  ): Promise<IncidentResponse> {
    const incident = await this.incidentRepository.findById(id);
    if (!incident || incident.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
    }

    // Scope check:
    if (caller.role === RoleEnum.CUSTOMER) {
      if (toId(incident.reporterId) !== caller.id) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (
        !assignedFacilityId ||
        assignedFacilityId !== toId(incident.facilityId)
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
      }
    }

    return validateResponse(
      incidentResponseSchema,
      this.formatIncident(incident)
    );
  }

  /**
   * 8. Query Incidents (Paginated with Scope Filtering)
   */
  async getIncidents(
    caller: CallerContext,
    query: IncidentQuery
  ): Promise<PaginatedIncidentResponse> {
    const filter = { ...query };

    // Enforce Scope:
    if (caller.role === RoleEnum.CUSTOMER) {
      filter.reporterId = caller.id;
    } else if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (assignedFacilityId) {
        filter.facilityId = assignedFacilityId;
      }
    }

    const paginated = await this.incidentRepository.findPaginated(filter);
    const formattedItems = paginated.items.map((item) =>
      this.formatIncident(item)
    );

    return validateResponse(paginatedIncidentResponseSchema, {
      items: formattedItems,
      pagination: paginated.pagination,
    });
  }
}
