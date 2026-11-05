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
import { ContractStatusEnum } from '../../common/enums/contract.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import {
  NotificationChannelEnum,
  NotificationPriorityEnum,
  NotificationTypeEnum,
} from '../../common/enums/notification.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
} from '../../common/enums/storageRack.enum.ts';
import {
  InventoryItemStatusEnum,
  MovementTypeEnum,
} from '../../common/enums/customerInventory.enum.ts';
import type { StorageRackRepository } from '../storageRack/storageRack.repository.ts';
import type { RackTierRepository } from '../storageRack/rackTier.repository.ts';
import type { InventoryMovementRepository } from '../customerInventory/inventoryMovement.repository.ts';
import type { CustomerSkuRepository } from '../customerSku/customerSku.repository.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { IncidentRepository } from './incident.repository.ts';
import type { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { NotificationService } from '../notification/notification.service.ts';
import type { CustomerInventoryRepository } from '../customerInventory/customerInventory.repository.ts';
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
  EvacuateIncidentRackRequest,
  UploadRestorationManifestRequest,
  CustomerAcknowledgeIncidentRequest,
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
    private readonly auditLogService?: AuditLogService,
    private readonly customerInventoryRepository?: CustomerInventoryRepository,
    private readonly storageRackRepository?: StorageRackRepository,
    private readonly rackTierRepository?: RackTierRepository,
    private readonly inventoryMovementRepository?: InventoryMovementRepository,
    private readonly customerSkuRepository?: CustomerSkuRepository
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
        const obj =
          typeof (ref as { toObject?: () => Record<string, unknown> })
            .toObject === 'function'
            ? (ref as { toObject: () => Record<string, unknown> }).toObject()
            : (ref as Record<string, unknown>);
        const rawId = obj.id || obj._id;
        const res: Record<string, unknown> = {
          ...obj,
          id: rawId ? String(rawId) : String(obj),
        };
        if (res._id) {
          res._id = String(res._id);
        }
        if (res.startDate instanceof Date) {
          res.startDate = res.startDate.toISOString();
        }
        if (res.endDate instanceof Date) {
          res.endDate = res.endDate.toISOString();
        }
        return res;
      }
      return { id: String(ref) };
    };

    const resolutionObj = raw.resolution as Record<string, unknown> | null;
    const manifestObj = raw.preEvacuationManifest as Record<
      string,
      unknown
    > | null;

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
      preEvacuationManifest: manifestObj
        ? {
            ...manifestObj,
            evacuatedBy: formatRef(manifestObj.evacuatedBy),
            evacuatedAt:
              manifestObj.evacuatedAt instanceof Date
                ? manifestObj.evacuatedAt.toISOString()
                : String(manifestObj.evacuatedAt || ''),
            items: Array.isArray(manifestObj.items)
              ? manifestObj.items.map((it: Record<string, unknown>) => ({
                  ...it,
                  skuId: String(it.skuId || ''),
                }))
              : [],
          }
        : null,
      restorationManifestDocUrl: raw.restorationManifestDocUrl || null,
      restorationUploadedAt:
        raw.restorationUploadedAt instanceof Date
          ? raw.restorationUploadedAt.toISOString()
          : raw.restorationUploadedAt
            ? String(raw.restorationUploadedAt)
            : null,
      restorationUploadedBy: formatRef(raw.restorationUploadedBy),
      customerAcknowledgedAt:
        raw.customerAcknowledgedAt instanceof Date
          ? raw.customerAcknowledgedAt.toISOString()
          : raw.customerAcknowledgedAt
            ? String(raw.customerAcknowledgedAt)
            : null,
      customerAcknowledgedBy: formatRef(raw.customerAcknowledgedBy),
      customerAcknowledgeNotes: raw.customerAcknowledgeNotes || null,
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

    // A. Validate Caller Scope
    if (callerRole === RoleEnum.CUSTOMER) {
      reporterRole = RoleEnum.CUSTOMER;
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

    // B2. Validate linked Contract (existence, facility match, customer ownership, and anti-write-skew touch)
    if (data.contractId && this.contractRepository) {
      const contract = await this.contractRepository.findById(
        data.contractId,
        session
      );
      if (!contract || contract.deleted) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
      }
      if (
        callerRole === RoleEnum.CUSTOMER &&
        toId(contract.customerId) !== caller.id
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
      if (toId(contract.facilityId) !== data.facilityId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_407);
      }
      if (
        contract.status === ContractStatusEnum.ACTIVE ||
        contract.status === ContractStatusEnum.OVERDUE
      ) {
        await this.contractRepository.touchIfStatusAtomic(
          data.contractId,
          [ContractStatusEnum.ACTIVE, ContractStatusEnum.OVERDUE],
          session
        );
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
      const unitId = toId(incident.storageUnitId);
      const unit = await this.storageUnitRepository.findById(unitId, session);
      if (unit && unit.status === StorageUnitStatusEnum.UNDER_MAINTENANCE) {
        if (this.customerInventoryRepository) {
          const remainingItems =
            await this.customerInventoryRepository.countRemainingByStorageUnit(
              unitId,
              session
            );
          if (remainingItems > 0) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_629);
          }
        }
        await this.storageUnitRepository.transitionStatusAtomic(
          unitId,
          [StorageUnitStatusEnum.UNDER_MAINTENANCE],
          StorageUnitStatusEnum.AVAILABLE,
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
  @Transactional()
  async closeIncident(
    caller: CallerContext,
    id: string,
    data?: CloseIncidentRequest,
    session?: ClientSession
  ): Promise<IncidentResponse> {
    let effectiveSession = session;
    let effectiveData = data;
    if (
      !effectiveSession &&
      effectiveData &&
      typeof (effectiveData as unknown as ClientSession).withTransaction ===
        'function'
    ) {
      effectiveSession = effectiveData as unknown as ClientSession;
      effectiveData = undefined;
    }

    const incident = await this.incidentRepository.findById(
      id,
      effectiveSession
    );
    if (!incident || incident.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
    }

    // Scope check: Customer (reporter or owner of linked contract), FM of facility, or Ops/Admin.
    // FACILITY_STAFF is explicitly barred from closing incidents (Maker-Checker).
    if (caller.role === RoleEnum.CUSTOMER) {
      let isAuthorizedCustomer = toId(incident.reporterId) === caller.id;
      if (
        !isAuthorizedCustomer &&
        incident.contractId &&
        this.contractRepository
      ) {
        const linkedContract = await this.contractRepository.findById(
          toId(incident.contractId),
          effectiveSession
        );
        if (linkedContract && toId(linkedContract.customerId) === caller.id) {
          isAuthorizedCustomer = true;
        }
      }
      if (!isAuthorizedCustomer) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else if (caller.role === RoleEnum.FACILITY_MANAGER) {
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (
        !assignedFacilityId ||
        assignedFacilityId !== toId(incident.facilityId)
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
      }
    } else if (
      caller.role !== RoleEnum.BUSINESS_OPS_MANAGER &&
      caller.role !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    // Two-Layer Acknowledgment verification if rack evacuation occurred
    if (incident.preEvacuationManifest) {
      if (!incident.restorationManifestDocUrl) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_712);
      }
      if (!incident.customerAcknowledgedAt) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_713);
      }
    }

    // Allowed previous statuses:
    // If requiresRelocation is true (unrepairable / rack change / cancellation), allow closing directly from IN_PROGRESS or RESOLVED.
    // If standard incident, require RESOLVED.
    const allowedPreviousStatuses = incident.requiresRelocation
      ? [IncidentStatusEnum.RESOLVED, IncidentStatusEnum.IN_PROGRESS]
      : [IncidentStatusEnum.RESOLVED];

    const updated = await this.incidentRepository.atomicUpdateStatus(
      id,
      allowedPreviousStatuses,
      {
        $set: {
          status: IncidentStatusEnum.CLOSED,
          closedAt: new Date(),
        },
      },
      effectiveSession
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_701);
    }

    // Sync customer-liable damageFee & staffEvidenceImages onto Contract when Incident closes ([CHỐT Q3])
    const resolution = incident.resolution;
    if (
      incident.contractId &&
      resolution?.liableParty === IncidentLiablePartyEnum.CUSTOMER &&
      (resolution.damageFee ?? 0) > 0
    ) {
      if (!this.contractRepository) {
        throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106);
      }
      const contractIdStr = toId(incident.contractId);
      const oldContract = await this.contractRepository.findById(
        contractIdStr,
        effectiveSession
      );
      if (!oldContract || oldContract.deleted) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
      }

      const updatedContract =
        await this.contractRepository.accumulateIncidentDamageAtomic(
          contractIdStr,
          resolution.damageFee,
          resolution.staffEvidenceImages || [],
          effectiveSession
        );

      if (!updatedContract) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
      }

      this.auditLogService?.record({
        action: AuditActionEnum.UPDATE,
        resourceType: AuditResourceEnum.CONTRACT,
        resourceId: contractIdStr,
        before: oldContract,
        after: updatedContract,
        metadata: {
          incidentId: id,
          incidentCode: incident.incidentCode,
          addedDamageFee: resolution.damageFee,
          totalDamageFee: updatedContract.damageFee,
        },
      });
    }

    // Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.CLOSE_INCIDENT,
      resourceType: AuditResourceEnum.INCIDENT,
      resourceId: id,
      before: incident,
      after: updated,
      metadata: effectiveData?.notes
        ? { notes: effectiveData.notes }
        : undefined,
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
      let isAuthorizedCustomer = toId(incident.reporterId) === caller.id;
      if (
        !isAuthorizedCustomer &&
        incident.contractId &&
        this.contractRepository
      ) {
        const linkedContract = await this.contractRepository.findById(
          toId(incident.contractId)
        );
        if (linkedContract && toId(linkedContract.customerId) === caller.id) {
          isAuthorizedCustomer = true;
        }
      }
      if (!isAuthorizedCustomer) {
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

  /**
   * 9. Emergency Rack Evacuation (Task T-SMR.3)
   */
  @Transactional()
  async evacuateRack(
    caller: CallerContext,
    id: string,
    data: EvacuateIncidentRackRequest,
    session?: ClientSession
  ): Promise<IncidentResponse> {
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (isCustomer) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const incident = await this.incidentRepository.findById(id, session);
    if (!incident || incident.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
    }

    if (
      incident.status === IncidentStatusEnum.CLOSED ||
      incident.status === IncidentStatusEnum.CANCELLED
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_716);
    }

    if (incident.preEvacuationManifest) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_710);
    }

    const fromRackId =
      data.fromRackId ||
      (incident.storageRackId ? toId(incident.storageRackId) : undefined);
    if (!fromRackId) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_711);
    }

    // Facility scope check
    const facilityId = toId(incident.facilityId);
    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const staffFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!staffFacilityId || String(staffFacilityId) !== String(facilityId)) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    if (!this.storageRackRepository || !this.customerInventoryRepository) {
      throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106, [
        'StorageRackRepository or CustomerInventoryRepository not injected',
      ]);
    }

    const fromRack = await this.storageRackRepository.findById(fromRackId);
    if (!fromRack || (fromRack as unknown as { deleted?: boolean }).deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_600);
    }

    const activeItems =
      await this.customerInventoryRepository.findActiveByRackId(
        fromRackId,
        session
      );
    if (activeItems.length === 0) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_638);
    }

    // Build preEvacuationManifest
    const manifestItems = [];
    let totalSystemQuantity = 0;
    let totalActualQuantity = 0;

    for (const item of activeItems) {
      const itemSkuId = toId(item.skuId);
      const reportedItem = data.items.find(
        (i) => String(i.skuId) === String(itemSkuId)
      );
      const actualQty =
        reportedItem !== undefined
          ? reportedItem.actualQuantity
          : item.quantity;
      const discrepancy = actualQty - item.quantity;

      totalSystemQuantity += item.quantity;
      totalActualQuantity += actualQty;

      let skuCode: string | undefined;
      let skuName: string | undefined;
      if (this.customerSkuRepository) {
        const skuDoc = await this.customerSkuRepository.findById(itemSkuId);
        if (skuDoc) {
          skuCode = skuDoc.skuCode;
          skuName = skuDoc.name;
        }
      }

      manifestItems.push({
        skuId: item.skuId as unknown as Types.ObjectId,
        skuCode,
        skuName,
        systemQuantity: item.quantity,
        actualQuantity: actualQty,
        discrepancy,
        condition: reportedItem?.condition,
        notes: reportedItem?.notes,
      });

      // Move inventory to holding
      const fromTierId = toId(item.rackTierId);
      const existingHolding =
        await this.customerInventoryRepository.findByPosition(
          toId(item.contractId),
          itemSkuId,
          toId(item.storageUnitId),
          null,
          session
        );

      let holdingInventoryId: string;
      if (!existingHolding) {
        const updated = await this.customerInventoryRepository.update(
          String(item._id),
          {
            storageRackId: null,
            rackTierId: null,
            status: InventoryItemStatusEnum.TEMPORARY_HOLDING,
            holdingReason: data.emergencyReason.trim(),
            relatedIncidentId: new Types.ObjectId(id),
          },
          session
        );
        holdingInventoryId = String(updated!._id);
      } else {
        await this.customerInventoryRepository.incrementQuantity(
          String(existingHolding._id),
          item.quantity,
          session
        );
        await this.customerInventoryRepository.update(
          String(existingHolding._id),
          {
            status: InventoryItemStatusEnum.TEMPORARY_HOLDING,
            holdingReason: data.emergencyReason.trim(),
            relatedIncidentId: new Types.ObjectId(id),
          },
          session
        );
        await this.customerInventoryRepository.updateQuantity(
          String(item._id),
          0,
          session
        );
        holdingInventoryId = String(existingHolding._id);
      }

      // Record movement
      if (this.inventoryMovementRepository) {
        const movementCode =
          await this.inventoryMovementRepository.generateMovementCode(session);
        await this.inventoryMovementRepository.create(
          {
            movementCode,
            type: MovementTypeEnum.MOVE,
            customerInventoryId: new Types.ObjectId(holdingInventoryId),
            customerId: item.customerId as unknown as Types.ObjectId,
            contractId: item.contractId as unknown as Types.ObjectId,
            facilityId: item.facilityId as unknown as Types.ObjectId,
            storageUnitId: item.storageUnitId as unknown as Types.ObjectId,
            skuId: item.skuId as unknown as Types.ObjectId,
            fromRackTierId: fromTierId ? new Types.ObjectId(fromTierId) : null,
            toRackTierId: null,
            quantity: item.quantity,
            previousQuantity: item.quantity,
            newQuantity: item.quantity,
            performedBy: new Types.ObjectId(caller.id),
            reason: data.emergencyReason.trim(),
            notes: data.notes?.trim() || null,
          },
          session
        );
      }
    }

    // Free rack tiers
    if (this.rackTierRepository) {
      const tiers = await this.rackTierRepository.findByRackId(fromRackId);
      for (const t of tiers) {
        await this.rackTierRepository.update(
          String(t._id),
          { status: RackTierStatusEnum.AVAILABLE },
          session
        );
      }
    }

    // Set rack to MAINTENANCE
    await this.storageRackRepository.update(
      fromRackId,
      { status: RackStatusEnum.MAINTENANCE },
      session
    );

    const requiresRelocation =
      data.requiresRelocation !== undefined
        ? data.requiresRelocation
        : incident.requiresRelocation;

    const preEvacuationManifest = {
      evacuatedAt: new Date(),
      evacuatedBy: new Types.ObjectId(caller.id),
      evidenceImages: data.evidenceImages,
      items: manifestItems,
      totalSystemQuantity,
      totalActualQuantity,
      totalDiscrepancy: totalActualQuantity - totalSystemQuantity,
      notes: data.notes?.trim() || undefined,
    };

    // Atomic update incident
    const updated = await this.incidentRepository.atomicUpdateStatus(
      id,
      [
        IncidentStatusEnum.REPORTED,
        IncidentStatusEnum.ASSIGNED,
        IncidentStatusEnum.INVESTIGATING,
        IncidentStatusEnum.IN_PROGRESS,
      ],
      {
        $set: {
          status: IncidentStatusEnum.IN_PROGRESS,
          preEvacuationManifest,
          storageRackId: new Types.ObjectId(fromRackId),
          requiresRelocation,
        },
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_716);
    }

    // Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.EVACUATE_RACK_TO_HOLDING,
      resourceType: AuditResourceEnum.INCIDENT,
      resourceId: id,
      before: incident,
      after: updated,
      metadata: {
        fromRackId,
        totalSystemQuantity,
        totalActualQuantity,
        requiresRelocation,
      },
    });

    // Notification to Customer
    if (this.notificationService) {
      const rackCode = fromRack.rackCode || 'Kệ kho';
      if (requiresRelocation) {
        this.notificationService.sendNotification({
          recipientId: toId(incident.reporterId),
          facilityId: toId(incident.facilityId),
          title: `[Khẩn cấp] Mời quý khách đến chi nhánh giải quyết sự cố Kệ ${rackCode}`,
          content: `Kệ ${rackCode} gặp sự cố kỹ thuật không thể tiếp tục sử dụng. Toàn bộ hàng hóa đã được sơ tán an toàn về Khu lưu tạm. Kính mời quý khách tạo lịch hẹn (AccessSchedule) đến chi nhánh gặp Quản lý để thống nhất phương án xử lý: Đổi sang Kệ mới tương đương HOẶC Thanh lý hợp đồng nhận lại 100% tiền cọc.`,
          type: NotificationTypeEnum.INCIDENT,
          priority: NotificationPriorityEnum.HIGH,
          channels: [
            NotificationChannelEnum.IN_APP,
            NotificationChannelEnum.EMAIL,
          ],
          metadata: {
            incidentId: id,
            incidentCode: incident.incidentCode,
            requiresRelocation: true,
          },
        });
      } else {
        this.notificationService.sendNotification({
          recipientId: toId(incident.reporterId),
          facilityId: toId(incident.facilityId),
          title: `[Khẩn cấp] Đã sơ tán hàng hóa tại Kệ ${rackCode} xuống khu lưu tạm`,
          content: `Do sự cố kỹ thuật tại Kệ ${rackCode}, nhân viên đã sơ tán khẩn cấp hàng hóa xuống khu vực lưu tạm để sửa chữa. Chúng tôi sẽ thông báo ngay khi hoàn tất.`,
          type: NotificationTypeEnum.INCIDENT,
          priority: NotificationPriorityEnum.HIGH,
          channels: [
            NotificationChannelEnum.IN_APP,
            NotificationChannelEnum.EMAIL,
          ],
          metadata: {
            incidentId: id,
            incidentCode: incident.incidentCode,
            requiresRelocation: false,
          },
        });
      }
    }

    return validateResponse(
      incidentResponseSchema,
      this.formatIncident(updated)
    );
  }

  /**
   * 10. Upload Restoration Manifest Document with Customer Ink Signature (Task T-SMR.3)
   */
  @Transactional()
  async uploadRestorationManifest(
    caller: CallerContext,
    id: string,
    data: UploadRestorationManifestRequest,
    session?: ClientSession
  ): Promise<IncidentResponse> {
    const isFM = caller.role === RoleEnum.FACILITY_MANAGER;
    const isOpsOrAdmin =
      caller.role === RoleEnum.BUSINESS_OPS_MANAGER ||
      caller.role === RoleEnum.SYSTEM_ADMIN;

    if (!isFM && !isOpsOrAdmin) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const incident = await this.incidentRepository.findById(id, session);
    if (!incident || incident.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
    }

    if (
      incident.status === IncidentStatusEnum.CLOSED ||
      incident.status === IncidentStatusEnum.CANCELLED
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_701);
    }

    if (isFM) {
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (
        !assignedFacilityId ||
        assignedFacilityId !== toId(incident.facilityId)
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
      }
    }

    const updated = await this.incidentRepository.update(
      id,
      {
        restorationManifestDocUrl: data.restorationManifestDocUrl,
        restorationUploadedAt: new Date(),
        restorationUploadedBy: new Types.ObjectId(caller.id),
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_701);
    }

    // Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.UPLOAD_RESTORATION_MANIFEST,
      resourceType: AuditResourceEnum.INCIDENT,
      resourceId: id,
      before: incident,
      after: updated,
      metadata: {
        restorationManifestDocUrl: data.restorationManifestDocUrl,
        notes: data.notes,
      },
    });

    // Notify Customer to acknowledge in App
    if (this.notificationService) {
      this.notificationService.sendNotification({
        recipientId: toId(incident.reporterId),
        facilityId: toId(incident.facilityId),
        title: `[Biên bản bàn giao] Quản lý đã tải lên biên bản kiểm kê sự cố ${incident.incidentCode}`,
        content: `Biên bản kiểm kê bàn giao hàng hóa đã được Quản lý tải lên. Kính mời quý khách mở ứng dụng kiểm tra và bấm nút [Xác nhận nghiệm thu].`,
        type: NotificationTypeEnum.INCIDENT,
        priority: NotificationPriorityEnum.HIGH,
        channels: [
          NotificationChannelEnum.IN_APP,
          NotificationChannelEnum.EMAIL,
        ],
        metadata: {
          incidentId: id,
          incidentCode: incident.incidentCode,
          restorationManifestDocUrl: data.restorationManifestDocUrl,
        },
      });
    }

    return validateResponse(
      incidentResponseSchema,
      this.formatIncident(updated)
    );
  }

  /**
   * 11. Customer Acknowledges Restoration on App (Task T-SMR.3)
   */
  @Transactional()
  async customerAcknowledge(
    caller: CallerContext,
    id: string,
    data?: CustomerAcknowledgeIncidentRequest,
    session?: ClientSession
  ): Promise<IncidentResponse> {
    const incident = await this.incidentRepository.findById(id, session);
    if (!incident || incident.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
    }

    if (
      incident.status === IncidentStatusEnum.CLOSED ||
      incident.status === IncidentStatusEnum.CANCELLED
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_701);
    }

    if (!incident.restorationManifestDocUrl) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_712);
    }

    if (incident.customerAcknowledgedAt) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_715);
    }

    // Scope check: Customer must be owner of contract or reporter
    if (caller.role === RoleEnum.CUSTOMER) {
      let isAuthorized = toId(incident.reporterId) === caller.id;
      if (!isAuthorized && incident.contractId && this.contractRepository) {
        const contract = await this.contractRepository.findById(
          toId(incident.contractId),
          session
        );
        if (contract && toId(contract.customerId) === caller.id) {
          isAuthorized = true;
        }
      }
      if (!isAuthorized) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else if (
      caller.role !== RoleEnum.BUSINESS_OPS_MANAGER &&
      caller.role !== RoleEnum.SYSTEM_ADMIN
    ) {
      // Staff/FM cannot acknowledge on behalf of customer
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const updated = await this.incidentRepository.update(
      id,
      {
        customerAcknowledgedAt: new Date(),
        customerAcknowledgedBy: new Types.ObjectId(caller.id),
        customerAcknowledgeNotes: data?.notes?.trim() || null,
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_701);
    }

    // Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.CUSTOMER_ACKNOWLEDGE_INCIDENT,
      resourceType: AuditResourceEnum.INCIDENT,
      resourceId: id,
      before: incident,
      after: updated,
      metadata: {
        notes: data?.notes,
      },
    });

    // Notify FM & Assigned Staff
    if (this.notificationService && incident.assignedStaffId) {
      this.notificationService.sendNotification({
        recipientId: toId(incident.assignedStaffId),
        facilityId: toId(incident.facilityId),
        title: `[Khách hàng xác nhận] Sự cố ${incident.incidentCode} đã được nghiệm thu`,
        content: `Khách hàng đã bấm xác nhận nghiệm thu trên ứng dụng cho sự cố ${incident.incidentCode}. Quản lý có thể tiến hành đóng hồ sơ.`,
        type: NotificationTypeEnum.INCIDENT,
        priority: NotificationPriorityEnum.NORMAL,
        channels: [NotificationChannelEnum.IN_APP],
        metadata: {
          incidentId: id,
          incidentCode: incident.incidentCode,
        },
      });
    }

    return validateResponse(
      incidentResponseSchema,
      this.formatIncident(updated)
    );
  }
}
