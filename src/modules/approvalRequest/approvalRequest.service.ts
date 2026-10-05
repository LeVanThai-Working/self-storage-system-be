import type { Types } from 'mongoose';
import type { ApprovalRequestRepository } from './approvalRequest.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { UnitTypeRepository } from '../unitType/unitType.repository.ts';
import type { FacilityUnitTypeOfferingRepository } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import type { AmenityRepository } from '../amenity/amenity.repository.ts';
import type { FacilityAmenityOfferingRepository } from '../facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import type { IDimensions, IUnitType } from '../unitType/unitType.model.ts';
import type { IFacilityUnitTypeOffering } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import type { IFacilityAmenityOffering } from '../facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  approvalRequestListResponseSchema,
  approvalRequestResponseSchema,
  type ApprovalRequestResponse,
} from './schemas/approvalRequest.response.schema.ts';
import type {
  ApprovalRequestQuery,
  CreateApprovalRequest,
  ReviewApprovalRequest,
} from './schemas/approvalRequest.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import {
  ApprovalRequestActionEnum,
  ApprovalRequestStatusEnum,
  ApprovalRequestTargetTypeEnum,
  ApprovalReviewDecisionEnum,
} from '../../common/enums/approvalRequest.enum.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';
import { UnitTypeStatusEnum } from '../../common/enums/unitType.enum.ts';
import { AmenityStatusEnum } from '../../common/enums/amenity.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../../common/enums/facilityUnitTypeOffering.enum.ts';
import { FacilityAmenityOfferingStatusEnum } from '../../common/enums/facilityAmenityOffering.enum.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';

export class ApprovalRequestService {
  constructor(
    private readonly approvalRequestRepository: ApprovalRequestRepository,
    private readonly facilityRepository: FacilityRepository,
    private readonly userRepository: UserRepository,
    private readonly unitTypeRepository: UnitTypeRepository,
    private readonly unitTypeOfferingRepository: FacilityUnitTypeOfferingRepository,
    private readonly amenityRepository: AmenityRepository,
    private readonly amenityOfferingRepository: FacilityAmenityOfferingRepository,
    private readonly auditLogService?: AuditLogService
  ) {}

  private calculateAreaAndVolume(dimensions: IDimensions): {
    area: number;
    volume: number;
  } {
    const area = Math.round(dimensions.length * dimensions.width * 100) / 100;
    const volume =
      Math.round(
        dimensions.length * dimensions.width * dimensions.height * 100
      ) / 100;
    return { area, volume };
  }

  private formatApprovalRequest(
    doc: unknown,
    currentData?: Record<string, unknown> | null
  ): unknown {
    if (!doc) return doc;
    const item = doc as {
      toObject?: (options?: unknown) => Record<string, unknown>;
      _id?: unknown;
      id?: string;
      requesterId?: unknown;
      facilityId?: unknown;
      approverId?: unknown;
      targetId?: unknown;
      createdAt?: Date;
      updatedAt?: Date;
      reviewedAt?: Date;
    };

    const obj: Record<string, unknown> =
      typeof item.toObject === 'function'
        ? item.toObject({ virtuals: true })
        : { ...item };

    if (!obj.id && obj._id) {
      obj.id = String(obj._id);
    }
    if (obj.targetId) {
      obj.targetId = String(obj.targetId);
    }

    // Map populated requesterId -> requester
    if (obj.requesterId && typeof obj.requesterId === 'object') {
      const u = obj.requesterId as Record<string, unknown>;
      obj.requester = {
        id: u._id ? String(u._id) : u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phoneNumber: u.phoneNumber,
      };
      obj.requesterId = u._id ? String(u._id) : u.id;
    } else if (obj.requesterId) {
      obj.requesterId = String(obj.requesterId);
    }

    // Map populated facilityId -> facility
    if (obj.facilityId && typeof obj.facilityId === 'object') {
      const f = obj.facilityId as Record<string, unknown>;
      obj.facility = {
        id: f._id ? String(f._id) : f.id,
        name: f.name,
        city: f.city,
        address: f.address,
        status: f.status,
      };
      obj.facilityId = f._id ? String(f._id) : f.id;
    } else if (obj.facilityId) {
      obj.facilityId = String(obj.facilityId);
    }

    // Map populated approverId -> approver
    if (obj.approverId && typeof obj.approverId === 'object') {
      const a = obj.approverId as Record<string, unknown>;
      obj.approver = {
        id: a._id ? String(a._id) : a.id,
        name: a.name,
        email: a.email,
        role: a.role,
      };
      obj.approverId = a._id ? String(a._id) : a.id;
    } else if (obj.approverId) {
      obj.approverId = String(obj.approverId);
    }

    if (obj.createdAt instanceof Date) {
      obj.createdAt = obj.createdAt.toISOString();
    }
    if (obj.updatedAt instanceof Date) {
      obj.updatedAt = obj.updatedAt.toISOString();
    }
    if (obj.reviewedAt instanceof Date) {
      obj.reviewedAt = obj.reviewedAt.toISOString();
    }

    if (currentData !== undefined) {
      obj.targetCurrentData = currentData;
    }

    return obj;
  }

  private async fetchTargetCurrentData(
    targetType: ApprovalRequestTargetTypeEnum,
    targetId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      let doc: unknown = null;
      switch (targetType) {
        case ApprovalRequestTargetTypeEnum.UNIT_TYPE:
          doc = await this.unitTypeRepository.findById(targetId);
          break;
        case ApprovalRequestTargetTypeEnum.FACILITY_UNIT_TYPE_OFFERING:
          doc = await this.unitTypeOfferingRepository.findById(targetId);
          break;
        case ApprovalRequestTargetTypeEnum.AMENITY:
          doc = await this.amenityRepository.findById(targetId);
          break;
        case ApprovalRequestTargetTypeEnum.FACILITY_AMENITY_OFFERING:
          doc = await this.amenityOfferingRepository.findById(targetId);
          break;
      }

      if (!doc) return null;
      const item = doc as {
        toObject?: (opts?: unknown) => Record<string, unknown>;
      };
      return typeof item.toObject === 'function'
        ? item.toObject()
        : { ...item };
    } catch {
      return null;
    }
  }

  @Transactional()
  async createRequest(
    userId: string,
    data: CreateApprovalRequest
  ): Promise<ApprovalRequestResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    let targetFacilityId: string;

    if (user.role === RoleEnum.FACILITY_MANAGER) {
      if (!user.assignedFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
      }
      targetFacilityId = String(user.assignedFacilityId);

      if (data.facilityId && data.facilityId !== targetFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
      }
    } else {
      if (!data.facilityId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_200, ['facilityId']);
      }
      targetFacilityId = data.facilityId;
    }

    const facility = await this.facilityRepository.findById(targetFacilityId);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status === FacilityStatusEnum.INACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Facility']);
    }

    if (data.action === ApprovalRequestActionEnum.UPDATE) {
      if (!data.targetId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_200, ['targetId']);
      }
      const existingTarget = await this.fetchTargetCurrentData(
        data.targetType,
        data.targetId
      );
      if (!existingTarget) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
          `Target ${data.targetType}`,
        ]);
      }
    }

    const newRequest = await this.approvalRequestRepository.create({
      requesterId: user._id as unknown as Types.ObjectId,
      facilityId: facility._id as unknown as Types.ObjectId,
      targetType: data.targetType,
      action: data.action,
      targetId: data.targetId
        ? (data.targetId as unknown as Types.ObjectId)
        : null,
      payload: data.payload,
      reason: data.reason,
      status: ApprovalRequestStatusEnum.PENDING,
    });

    const populated = await this.approvalRequestRepository.findById(
      String(newRequest._id)
    );

    this.auditLogService?.record({
      action: AuditActionEnum.CREATE,
      resourceType: AuditResourceEnum.APPROVAL_REQUEST,
      resourceId: String(newRequest._id),
      after:
        typeof populated?.toObject === 'function'
          ? populated.toObject()
          : populated,
    });

    return validateResponse(
      approvalRequestResponseSchema,
      this.formatApprovalRequest(populated)
    );
  }

  @Transactional()
  async cancelRequest(
    userId: string,
    requestId: string
  ): Promise<ApprovalRequestResponse> {
    const request = await this.approvalRequestRepository.findById(requestId);
    if (!request) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Approval Request',
      ]);
    }

    if (request.status !== ApprovalRequestStatusEnum.PENDING) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'Only pending requests can be cancelled',
      ]);
    }

    const requesterIdStr = String(
      (request.requesterId as { _id?: unknown })?._id || request.requesterId
    );
    const facilityIdStr = String(
      (request.facilityId as { _id?: unknown })?._id || request.facilityId
    );

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const isCreator = requesterIdStr === userId;
    const isAssignedFM =
      user.role === RoleEnum.FACILITY_MANAGER &&
      String(user.assignedFacilityId) === facilityIdStr;
    const isOpsOrAdmin =
      user.role === RoleEnum.BUSINESS_OPS_MANAGER ||
      user.role === RoleEnum.SYSTEM_ADMIN;

    if (!isCreator && !isAssignedFM && !isOpsOrAdmin) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const beforeStatus = request.status;
    await this.approvalRequestRepository.updateById(requestId, {
      status: ApprovalRequestStatusEnum.CANCELLED,
    });

    const populated = await this.approvalRequestRepository.findById(requestId);

    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL,
      resourceType: AuditResourceEnum.APPROVAL_REQUEST,
      resourceId: requestId,
      before: { status: beforeStatus },
      after: { status: ApprovalRequestStatusEnum.CANCELLED },
    });

    return validateResponse(
      approvalRequestResponseSchema,
      this.formatApprovalRequest(populated)
    );
  }

  async getMyRequests(
    userId: string,
    query?: ApprovalRequestQuery
  ): Promise<PaginatedData<ApprovalRequestResponse>> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const facilityId = user.assignedFacilityId
      ? String(user.assignedFacilityId)
      : undefined;

    const result = await this.approvalRequestRepository.findAll({
      ...query,
      facilityId: query?.facilityId || facilityId,
      requesterId: userId,
    });

    const formatted = result.items.map((item) =>
      this.formatApprovalRequest(item)
    );
    const validated = validateResponse(
      approvalRequestListResponseSchema,
      formatted
    );

    return {
      items: validated,
      pagination: result.pagination,
    };
  }

  async getAllRequests(
    query?: ApprovalRequestQuery
  ): Promise<PaginatedData<ApprovalRequestResponse>> {
    const result = await this.approvalRequestRepository.findAll(query);
    const formatted = result.items.map((item) =>
      this.formatApprovalRequest(item)
    );
    const validated = validateResponse(
      approvalRequestListResponseSchema,
      formatted
    );

    return {
      items: validated,
      pagination: result.pagination,
    };
  }

  async getRequestById(id: string): Promise<ApprovalRequestResponse> {
    const request = await this.approvalRequestRepository.findById(id);
    if (!request) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Approval Request',
      ]);
    }

    let targetCurrentData: Record<string, unknown> | null = null;
    if (
      request.action === ApprovalRequestActionEnum.UPDATE &&
      request.targetId
    ) {
      targetCurrentData = await this.fetchTargetCurrentData(
        request.targetType,
        String(request.targetId)
      );
    }

    return validateResponse(
      approvalRequestResponseSchema,
      this.formatApprovalRequest(request, targetCurrentData)
    );
  }

  @Transactional()
  async reviewRequest(
    approverId: string,
    requestId: string,
    data: ReviewApprovalRequest
  ): Promise<ApprovalRequestResponse> {
    const request = await this.approvalRequestRepository.findById(requestId);
    if (!request) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Approval Request',
      ]);
    }

    if (request.status !== ApprovalRequestStatusEnum.PENDING) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'This request has already been reviewed or cancelled',
      ]);
    }

    const approver = await this.userRepository.findById(approverId);
    if (!approver) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const reviewedAt = new Date();

    if (data.action === ApprovalReviewDecisionEnum.REJECT) {
      await this.approvalRequestRepository.updateById(requestId, {
        status: ApprovalRequestStatusEnum.REJECTED,
        approverId: approver._id as unknown as Types.ObjectId,
        reviewedAt,
        rejectionReason: data.rejectionReason,
      });

      const updated = await this.approvalRequestRepository.findById(requestId);

      this.auditLogService?.record({
        action: AuditActionEnum.REJECT,
        resourceType: AuditResourceEnum.APPROVAL_REQUEST,
        resourceId: requestId,
        before: { status: request.status },
        after: {
          status: ApprovalRequestStatusEnum.REJECTED,
          rejectionReason: data.rejectionReason,
        },
      });

      return validateResponse(
        approvalRequestResponseSchema,
        this.formatApprovalRequest(updated)
      );
    }

    // =========================================================================
    // EXECUTION ENGINE: Apply payload to target collection automatically
    // =========================================================================
    const facilityIdStr = String(
      (request.facilityId as { _id?: unknown })?._id || request.facilityId
    );
    const targetIdStr = request.targetId ? String(request.targetId) : null;
    const payload = request.payload;

    switch (request.targetType) {
      case ApprovalRequestTargetTypeEnum.UNIT_TYPE: {
        if (request.action === ApprovalRequestActionEnum.CREATE) {
          const dims = payload.dimensions as IDimensions | undefined;
          let area = typeof payload.area === 'number' ? payload.area : 0;
          let volume = typeof payload.volume === 'number' ? payload.volume : 0;
          if (dims) {
            const calculated = this.calculateAreaAndVolume(dims);
            area = calculated.area;
            volume = calculated.volume;
          }
          const created = await this.unitTypeRepository.create({
            ...(payload as Partial<IUnitType>),
            area,
            volume,
            status: UnitTypeStatusEnum.ACTIVE,
          });

          this.auditLogService?.record({
            action: AuditActionEnum.CREATE,
            resourceType: AuditResourceEnum.UNIT_TYPE,
            resourceId: String(created._id),
            after:
              typeof created.toObject === 'function'
                ? created.toObject()
                : created,
          });
        } else if (
          request.action === ApprovalRequestActionEnum.UPDATE &&
          targetIdStr
        ) {
          const updateData: Partial<IUnitType> = {
            ...(payload as Partial<IUnitType>),
          };
          if (payload.dimensions) {
            const calculated = this.calculateAreaAndVolume(
              payload.dimensions as IDimensions
            );
            updateData.area = calculated.area;
            updateData.volume = calculated.volume;
          }
          const beforeDoc = await this.unitTypeRepository.findById(targetIdStr);
          const updated = await this.unitTypeRepository.update(
            targetIdStr,
            updateData
          );

          this.auditLogService?.record({
            action: AuditActionEnum.UPDATE,
            resourceType: AuditResourceEnum.UNIT_TYPE,
            resourceId: targetIdStr,
            before:
              typeof beforeDoc?.toObject === 'function'
                ? beforeDoc.toObject()
                : beforeDoc,
            after:
              typeof updated?.toObject === 'function'
                ? updated.toObject()
                : updated,
          });
        }
        break;
      }

      case ApprovalRequestTargetTypeEnum.FACILITY_UNIT_TYPE_OFFERING: {
        if (request.action === ApprovalRequestActionEnum.CREATE) {
          const created = await this.unitTypeOfferingRepository.create({
            ...(payload as Partial<IFacilityUnitTypeOffering>),
            facilityId: facilityIdStr as unknown as Types.ObjectId,
            status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
          });

          this.auditLogService?.record({
            action: AuditActionEnum.CREATE,
            resourceType: AuditResourceEnum.FACILITY_UNIT_TYPE_OFFERING,
            resourceId: String(created._id),
            after:
              typeof created.toObject === 'function'
                ? created.toObject()
                : created,
          });
        } else if (
          request.action === ApprovalRequestActionEnum.UPDATE &&
          targetIdStr
        ) {
          const beforeDoc =
            await this.unitTypeOfferingRepository.findById(targetIdStr);
          const updated = await this.unitTypeOfferingRepository.updateById(
            targetIdStr,
            payload as Partial<IFacilityUnitTypeOffering>
          );

          this.auditLogService?.record({
            action: AuditActionEnum.UPDATE,
            resourceType: AuditResourceEnum.FACILITY_UNIT_TYPE_OFFERING,
            resourceId: targetIdStr,
            before:
              typeof beforeDoc?.toObject === 'function'
                ? beforeDoc.toObject()
                : beforeDoc,
            after:
              typeof updated?.toObject === 'function'
                ? updated.toObject()
                : updated,
          });
        }
        break;
      }

      case ApprovalRequestTargetTypeEnum.AMENITY: {
        if (request.action === ApprovalRequestActionEnum.CREATE) {
          const created = await this.amenityRepository.create({
            ...payload,
            status: AmenityStatusEnum.ACTIVE,
          });

          this.auditLogService?.record({
            action: AuditActionEnum.CREATE,
            resourceType: AuditResourceEnum.AMENITY,
            resourceId: String(created._id),
            after:
              typeof created.toObject === 'function'
                ? created.toObject()
                : created,
          });
        } else if (
          request.action === ApprovalRequestActionEnum.UPDATE &&
          targetIdStr
        ) {
          const beforeDoc = await this.amenityRepository.findById(targetIdStr);
          const updated = await this.amenityRepository.updateById(
            targetIdStr,
            payload
          );

          this.auditLogService?.record({
            action: AuditActionEnum.UPDATE,
            resourceType: AuditResourceEnum.AMENITY,
            resourceId: targetIdStr,
            before:
              typeof beforeDoc?.toObject === 'function'
                ? beforeDoc.toObject()
                : beforeDoc,
            after:
              typeof updated?.toObject === 'function'
                ? updated.toObject()
                : updated,
          });
        }
        break;
      }

      case ApprovalRequestTargetTypeEnum.FACILITY_AMENITY_OFFERING: {
        if (request.action === ApprovalRequestActionEnum.CREATE) {
          const created = await this.amenityOfferingRepository.create({
            ...(payload as Partial<IFacilityAmenityOffering>),
            facilityId: facilityIdStr as unknown as Types.ObjectId,
            inUseQuantity: 0,
            status: FacilityAmenityOfferingStatusEnum.ACTIVE,
          });

          this.auditLogService?.record({
            action: AuditActionEnum.CREATE,
            resourceType: AuditResourceEnum.FACILITY_AMENITY_OFFERING,
            resourceId: String(created._id),
            after:
              typeof created.toObject === 'function'
                ? created.toObject()
                : created,
          });
        } else if (
          request.action === ApprovalRequestActionEnum.UPDATE &&
          targetIdStr
        ) {
          const beforeDoc =
            await this.amenityOfferingRepository.findById(targetIdStr);
          const updated = await this.amenityOfferingRepository.updateById(
            targetIdStr,
            payload as Partial<IFacilityAmenityOffering>
          );

          this.auditLogService?.record({
            action: AuditActionEnum.UPDATE,
            resourceType: AuditResourceEnum.FACILITY_AMENITY_OFFERING,
            resourceId: targetIdStr,
            before:
              typeof beforeDoc?.toObject === 'function'
                ? beforeDoc.toObject()
                : beforeDoc,
            after:
              typeof updated?.toObject === 'function'
                ? updated.toObject()
                : updated,
          });
        }
        break;
      }
    }

    await this.approvalRequestRepository.updateById(requestId, {
      status: ApprovalRequestStatusEnum.APPROVED,
      approverId: approver._id as unknown as Types.ObjectId,
      reviewedAt,
      reviewNotes: data.notes,
    });

    const updatedRequest =
      await this.approvalRequestRepository.findById(requestId);

    this.auditLogService?.record({
      action: AuditActionEnum.APPROVE,
      resourceType: AuditResourceEnum.APPROVAL_REQUEST,
      resourceId: requestId,
      before: { status: request.status },
      after: {
        status: ApprovalRequestStatusEnum.APPROVED,
        reviewNotes: data.notes,
      },
    });

    return validateResponse(
      approvalRequestResponseSchema,
      this.formatApprovalRequest(updatedRequest)
    );
  }
}
