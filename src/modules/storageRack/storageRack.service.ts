import { Types, type ClientSession } from 'mongoose';
import { StorageRackRepository } from './storageRack.repository.ts';
import { RackTierRepository } from './rackTier.repository.ts';
import type { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
  RackZoneEnum,
} from '../../common/enums/storageRack.enum.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import type {
  CreateStorageRackRequest,
  StorageRackQuery,
  UpdateRackTierRequest,
  UpdateStorageRackRequest,
} from './schemas/storageRack.request.schema.ts';
import {
  rackTierResponseSchema,
  storageRackListResponseSchema,
  storageRackResponseSchema,
  type RackTierResponse,
  type StorageRackResponse,
} from './schemas/storageRack.response.schema.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import {
  UnitType,
  type IDefaultRackConfig,
  type IDimensions,
} from '../unitType/unitType.model.ts';
import type { IStorageRack } from './storageRack.model.ts';
import type { IRackTier } from './rackTier.model.ts';

export class StorageRackService {
  constructor(
    private readonly storageRackRepository: StorageRackRepository,
    private readonly rackTierRepository: RackTierRepository,
    private readonly storageUnitRepository: StorageUnitRepository,
    private readonly facilityRepository: FacilityRepository,
    private readonly auditLogService?: AuditLogService
  ) {}

  private calculateVolume(dimensions?: IDimensions): number | undefined {
    if (!dimensions) return undefined;
    return (
      Math.round(
        dimensions.length * dimensions.width * dimensions.height * 1000
      ) / 1000
    );
  }

  private formatRackTier(tier: unknown): Record<string, unknown> {
    if (!tier) return {};
    const doc = tier as {
      toObject?: () => Record<string, unknown>;
      _id?: unknown;
      id?: string;
      facilityId?: unknown;
      storageUnitId?: unknown;
      storageRackId?: unknown;
    };
    const obj =
      typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

    obj.id = String(obj._id || obj.id);
    obj.facilityId = String(obj.facilityId);
    obj.storageUnitId = String(obj.storageUnitId);
    obj.storageRackId = String(obj.storageRackId);
    return obj;
  }

  private formatStorageRack(
    rack: unknown,
    tiers?: unknown[]
  ): Record<string, unknown> {
    if (!rack) return {};
    const doc = rack as {
      toObject?: () => Record<string, unknown>;
      _id?: unknown;
      id?: string;
      facilityId?: unknown;
      storageUnitId?: unknown;
      tiers?: unknown[];
    };
    const obj =
      typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

    obj.id = String(obj._id || obj.id);

    // Map populated facility
    if (
      obj.facilityId &&
      typeof obj.facilityId === 'object' &&
      'name' in (obj.facilityId as object) &&
      (obj.facilityId as { name?: unknown }).name
    ) {
      const f = obj.facilityId as Record<string, unknown>;
      obj.facilityId = String(f._id || f.id);
      obj.facility = {
        id: String(f._id || f.id),
        name: f.name,
        city: f.city,
        address: f.address,
        status: f.status,
      };
    } else if (obj.facilityId) {
      obj.facilityId = String(obj.facilityId);
    }

    // Map populated storageUnit
    if (
      obj.storageUnitId &&
      typeof obj.storageUnitId === 'object' &&
      'unitNumber' in (obj.storageUnitId as object) &&
      (obj.storageUnitId as { unitNumber?: unknown }).unitNumber
    ) {
      const u = obj.storageUnitId as Record<string, unknown>;
      obj.storageUnitId = String(u._id || u.id);
      obj.storageUnit = {
        id: String(u._id || u.id),
        unitNumber: u.unitNumber,
        floor: u.floor,
        zone: u.zone,
        status: u.status,
      };
    } else if (obj.storageUnitId) {
      obj.storageUnitId = String(obj.storageUnitId);
    }

    if (tiers) {
      obj.tiers = tiers.map((t) => this.formatRackTier(t));
    }

    if (obj.currentContractId) {
      obj.currentContractId = String(obj.currentContractId);
    }
    if (obj.currentCustomerId) {
      obj.currentCustomerId = String(obj.currentCustomerId);
    }

    return obj;
  }

  async getStorageRacks(
    query?: StorageRackQuery
  ): Promise<PaginatedData<StorageRackResponse>> {
    const result = await this.storageRackRepository.findAll(query);
    const formatted = result.items.map((item) => this.formatStorageRack(item));
    const validated = validateResponse(
      storageRackListResponseSchema,
      formatted
    );
    return {
      items: validated,
      pagination: result.pagination,
    };
  }

  async getStorageRackById(id: string): Promise<StorageRackResponse> {
    const rack = await this.storageRackRepository.findById(id);
    if (!rack) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_600);
    }
    const tiers = await this.rackTierRepository.findByRackId(id);
    const formatted = this.formatStorageRack(rack, tiers);
    return validateResponse(storageRackResponseSchema, formatted);
  }

  async getRacksByStorageUnit(
    storageUnitId: string
  ): Promise<StorageRackResponse[]> {
    const unit = await this.storageUnitRepository.findById(storageUnitId);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }

    const racks =
      await this.storageRackRepository.findByStorageUnitId(storageUnitId);
    const allTiers =
      await this.rackTierRepository.findByStorageUnitId(storageUnitId);

    const formattedRacks = racks.map((rack) => {
      const rackId = String(rack._id);
      const rackTiers = allTiers.filter(
        (t) => String(t.storageRackId) === rackId
      );
      return this.formatStorageRack(rack, rackTiers);
    });

    return validateResponse(storageRackListResponseSchema, formattedRacks);
  }

  @Transactional()
  async createStorageRack(
    data: CreateStorageRackRequest
  ): Promise<StorageRackResponse> {
    const unit = await this.storageUnitRepository.findById(data.storageUnitId);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }

    const normalizedRackCode = data.rackCode.toUpperCase().trim();

    // Check duplicate in the unit
    const existing =
      await this.storageRackRepository.findByUnitAndRackCodeIncludeDeleted(
        data.storageUnitId,
        normalizedRackCode
      );
    if (existing) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_603);
    }

    const newRack = await this.storageRackRepository.create({
      facilityId: unit.facilityId as unknown as IStorageRack['facilityId'],
      storageUnitId: new Types.ObjectId(
        data.storageUnitId
      ) as unknown as IStorageRack['storageUnitId'],
      rackCode: normalizedRackCode,
      aisle: data.aisle ?? 'A',
      bay: data.bay ?? 1,
      zone: data.zone ?? RackZoneEnum.STANDARD,
      customPrice: data.customPrice ?? null,
      name: data.name,
      tierCount: data.tierCount,
      status: data.status ?? RackStatusEnum.AVAILABLE,
      notes: data.notes,
    });

    // Auto-generate tiers
    const tiersToCreate: Partial<IRackTier>[] = [];
    const tierVolume = this.calculateVolume(data.defaultTierDimensions);

    for (let i = 1; i <= data.tierCount; i++) {
      const tierCode = `${normalizedRackCode}-T${String(i).padStart(2, '0')}`;
      tiersToCreate.push({
        facilityId: unit.facilityId as unknown as IRackTier['facilityId'],
        storageUnitId: new Types.ObjectId(
          data.storageUnitId
        ) as unknown as IRackTier['storageUnitId'],
        storageRackId: newRack._id as unknown as IRackTier['storageRackId'],
        tierNumber: i,
        tierCode,
        maxWeightKg: data.defaultTierMaxWeightKg,
        dimensions: data.defaultTierDimensions,
        volume: tierVolume,
        status: RackTierStatusEnum.AVAILABLE,
      });
    }

    const createdTiers =
      await this.rackTierRepository.createMany(tiersToCreate);

    this.auditLogService?.record({
      action: AuditActionEnum.CREATE,
      resourceType: AuditResourceEnum.STORAGE_RACK,
      resourceId: String(newRack._id),
      after:
        typeof newRack?.toObject === 'function' ? newRack.toObject() : newRack,
    });

    const populated = await this.storageRackRepository.findById(
      String(newRack._id)
    );
    const formatted = this.formatStorageRack(populated, createdTiers);
    return validateResponse(storageRackResponseSchema, formatted);
  }

  @Transactional()
  async provisionRacksForUnit(
    storageUnitId: string,
    facilityId: string,
    config: IDefaultRackConfig,
    session?: ClientSession
  ): Promise<void> {
    if (!config || config.rackCount <= 0 || config.tiersPerRack <= 0) {
      return;
    }

    const tierVolume = this.calculateVolume(config.tierDimensions);

    const resolvedFacilityId =
      typeof facilityId === 'object' &&
      facilityId !== null &&
      '_id' in (facilityId as object)
        ? String((facilityId as { _id: unknown })._id)
        : String(facilityId);

    const aisleLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let r = 1; r <= config.rackCount; r++) {
      const rackCode = `R${String(r).padStart(2, '0')}`;
      const aisleIndex = Math.floor((r - 1) / 10);
      const aisle = aisleLetters[aisleIndex] || 'A';
      const bay = ((r - 1) % 10) + 1;
      const zone =
        aisleIndex === 0
          ? RackZoneEnum.PRIME
          : aisleIndex === 1
            ? RackZoneEnum.STANDARD
            : RackZoneEnum.ECONOMY;

      // Check if rack code already exists
      const existing =
        await this.storageRackRepository.findByUnitAndRackCodeIncludeDeleted(
          storageUnitId,
          rackCode
        );
      if (existing) continue;

      const createdRack = await this.storageRackRepository.create(
        {
          facilityId: new Types.ObjectId(
            resolvedFacilityId
          ) as unknown as IStorageRack['facilityId'],
          storageUnitId: new Types.ObjectId(
            storageUnitId
          ) as unknown as IStorageRack['storageUnitId'],
          rackCode,
          aisle,
          bay,
          zone,
          name: `Standard Rack ${rackCode}`,
          tierCount: config.tiersPerRack,
          status: RackStatusEnum.AVAILABLE,
        },
        session
      );

      const tiers: Partial<IRackTier>[] = [];
      for (let t = 1; t <= config.tiersPerRack; t++) {
        const tierCode = `${rackCode}-T${String(t).padStart(2, '0')}`;
        tiers.push({
          facilityId: new Types.ObjectId(
            facilityId
          ) as unknown as IRackTier['facilityId'],
          storageUnitId: new Types.ObjectId(
            storageUnitId
          ) as unknown as IRackTier['storageUnitId'],
          storageRackId:
            createdRack._id as unknown as IRackTier['storageRackId'],
          tierNumber: t,
          tierCode,
          maxWeightKg: config.tierMaxWeightKg,
          dimensions: config.tierDimensions,
          volume: tierVolume,
          status: RackTierStatusEnum.AVAILABLE,
        });
      }

      await this.rackTierRepository.createMany(tiers, session);

      this.auditLogService?.record({
        action: AuditActionEnum.CREATE,
        resourceType: AuditResourceEnum.STORAGE_RACK,
        resourceId: String(createdRack._id),
        after:
          typeof createdRack?.toObject === 'function'
            ? createdRack.toObject()
            : createdRack,
      });
    }
  }

  @Transactional()
  async provisionRacksForUnitEndpoint(
    storageUnitId: string
  ): Promise<StorageRackResponse[]> {
    const unit = await this.storageUnitRepository.findById(storageUnitId);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }

    let config = (
      unit as unknown as {
        unitTypeId?: { defaultRackConfig?: IDefaultRackConfig };
      }
    ).unitTypeId?.defaultRackConfig;

    if (!config || !config.rackCount || config.rackCount <= 0) {
      const rawUnitTypeId =
        typeof unit.unitTypeId === 'object' &&
        unit.unitTypeId !== null &&
        '_id' in (unit.unitTypeId as object)
          ? (unit.unitTypeId as { _id: unknown })._id
          : unit.unitTypeId;
      const utDoc = await UnitType.findById(rawUnitTypeId);
      config = utDoc?.defaultRackConfig;
    }

    if (!config || config.rackCount <= 0 || config.tiersPerRack <= 0) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    const resolvedFacilityId =
      typeof unit.facilityId === 'object' &&
      unit.facilityId !== null &&
      '_id' in (unit.facilityId as object)
        ? String((unit.facilityId as { _id: unknown })._id)
        : String(unit.facilityId);

    await this.provisionRacksForUnit(storageUnitId, resolvedFacilityId, config);

    return this.getRacksByStorageUnit(storageUnitId);
  }

  @Transactional()
  async updateStorageRack(
    id: string,
    data: UpdateStorageRackRequest
  ): Promise<StorageRackResponse> {
    const oldRack = await this.storageRackRepository.findById(id);
    if (!oldRack) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_600);
    }

    const updated = await this.storageRackRepository.update(id, data);
    const tiers = await this.rackTierRepository.findByRackId(id);

    this.auditLogService?.record({
      action: AuditActionEnum.UPDATE,
      resourceType: AuditResourceEnum.STORAGE_RACK,
      resourceId: id,
      before:
        typeof oldRack?.toObject === 'function' ? oldRack.toObject() : oldRack,
      after:
        typeof updated?.toObject === 'function' ? updated.toObject() : updated,
    });

    const formatted = this.formatStorageRack(updated, tiers);
    return validateResponse(storageRackResponseSchema, formatted);
  }

  @Transactional()
  async updateRackTier(
    id: string,
    data: UpdateRackTierRequest
  ): Promise<RackTierResponse> {
    const oldTier = await this.rackTierRepository.findById(id);
    if (!oldTier) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_601);
    }

    const updatePayload: Partial<IRackTier> = {
      ...data,
    };

    if (data.dimensions) {
      updatePayload.volume = this.calculateVolume(data.dimensions);
    }

    const updated = await this.rackTierRepository.update(id, updatePayload);

    this.auditLogService?.record({
      action: AuditActionEnum.UPDATE,
      resourceType: AuditResourceEnum.RACK_TIER,
      resourceId: id,
      before:
        typeof oldTier?.toObject === 'function' ? oldTier.toObject() : oldTier,
      after:
        typeof updated?.toObject === 'function' ? updated.toObject() : updated,
    });

    const formatted = this.formatRackTier(updated);
    return validateResponse(rackTierResponseSchema, formatted);
  }

  @Transactional()
  async deleteStorageRack(id: string): Promise<void> {
    const rack = await this.storageRackRepository.findById(id);
    if (!rack) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_600);
    }

    await this.storageRackRepository.softDelete(id);
    await this.rackTierRepository.softDeleteByRackId(id);

    this.auditLogService?.record({
      action: AuditActionEnum.DELETE,
      resourceType: AuditResourceEnum.STORAGE_RACK,
      resourceId: id,
      before: typeof rack?.toObject === 'function' ? rack.toObject() : rack,
    });
  }

  @Transactional()
  async restoreStorageRack(id: string): Promise<StorageRackResponse> {
    const rack = await this.storageRackRepository.findByIdIncludeDeleted(id);
    if (!rack) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_600);
    }

    await this.storageRackRepository.restore(id);
    await this.rackTierRepository.restoreByRackId(id);

    this.auditLogService?.record({
      action: AuditActionEnum.RESTORE,
      resourceType: AuditResourceEnum.STORAGE_RACK,
      resourceId: id,
      after: typeof rack?.toObject === 'function' ? rack.toObject() : rack,
    });

    const restored = await this.storageRackRepository.findById(id);
    const tiers = await this.rackTierRepository.findByRackId(id);
    const formatted = this.formatStorageRack(restored, tiers);
    return validateResponse(storageRackResponseSchema, formatted);
  }

  async cascadeDeleteByUnitId(
    storageUnitId: string,
    session?: ClientSession
  ): Promise<void> {
    await this.storageRackRepository.softDeleteByStorageUnitId(
      storageUnitId,
      undefined,
      session
    );
    await this.rackTierRepository.softDeleteByStorageUnitId(
      storageUnitId,
      undefined,
      session
    );
  }

  async cascadeRestoreByUnitId(
    storageUnitId: string,
    session?: ClientSession
  ): Promise<void> {
    await this.storageRackRepository.restoreByStorageUnitId(
      storageUnitId,
      session
    );
    await this.rackTierRepository.restoreByStorageUnitId(
      storageUnitId,
      session
    );
  }
}
