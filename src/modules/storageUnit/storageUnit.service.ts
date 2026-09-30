import type { ClientSession } from 'mongoose';
import type { StorageUnitRepository } from './storageUnit.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { UnitTypeRepository } from '../unitType/unitType.repository.ts';
import type { FacilityUnitTypeOfferingRepository } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import type { IStorageUnit } from './storageUnit.model.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  storageUnitListResponseSchema,
  storageUnitResponseSchema,
  type StorageUnitResponse,
} from './schemas/storageUnit.response.schema.ts';
import type {
  AvailableStorageUnitQuery,
  CreateStorageUnitRequest,
  StorageUnitQuery,
  ToggleMaintenanceRequest,
  UpdateStorageUnitRequest,
} from './schemas/storageUnit.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';
import { UnitTypeStatusEnum } from '../../common/enums/unitType.enum.ts';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../../common/enums/facilityUnitTypeOffering.enum.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';

export class StorageUnitService {
  constructor(
    private readonly storageUnitRepository: StorageUnitRepository,
    private readonly facilityRepository: FacilityRepository,
    private readonly unitTypeRepository: UnitTypeRepository,
    private readonly offeringRepository: FacilityUnitTypeOfferingRepository
  ) {}

  private formatStorageUnit(unit: unknown): unknown {
    if (!unit) return unit;
    const doc = unit as {
      toObject?: (options?: unknown) => Record<string, unknown>;
      _id?: unknown;
      id?: string;
      facilityId?: unknown;
      unitTypeId?: unknown;
    };
    const obj =
      typeof doc.toObject === 'function'
        ? doc.toObject({ virtuals: true })
        : { ...doc };

    if (!obj.id && obj._id) {
      obj.id = String(obj._id);
    }

    // Map populated facilityId -> facility
    if (obj.facilityId && typeof obj.facilityId === 'object') {
      const f = obj.facilityId as Record<string, unknown>;
      obj.facilityId = String(f._id || f.id);
      obj.facility = {
        id: f._id ? String(f._id) : f.id,
        name: f.name,
        city: f.city,
        address: f.address,
        status: f.status,
      };
    } else if (obj.facilityId) {
      obj.facilityId = String(obj.facilityId);
    }

    // Map populated unitTypeId -> unitType
    if (obj.unitTypeId && typeof obj.unitTypeId === 'object') {
      const u = obj.unitTypeId as Record<string, unknown>;
      obj.unitTypeId = String(u._id || u.id);
      obj.unitType = {
        id: u._id ? String(u._id) : u.id,
        name: u.name,
        category: u.category,
        area: u.area,
        volume: u.volume,
        status: u.status,
        dimensions: u.dimensions,
      };
    } else if (obj.unitTypeId) {
      obj.unitTypeId = String(obj.unitTypeId);
    }

    return obj;
  }

  async getStorageUnits(
    query?: StorageUnitQuery
  ): Promise<PaginatedData<StorageUnitResponse>> {
    try {
      const result = await this.storageUnitRepository.findAll(query);
      const formattedItems = result.items.map((item) =>
        this.formatStorageUnit(item)
      );
      const validatedItems = validateResponse(
        storageUnitListResponseSchema,
        formattedItems
      );
      return {
        items: validatedItems,
        pagination: result.pagination,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error in getStorageUnits:', error);
      throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106);
    }
  }

  async getStorageUnitById(id: string): Promise<StorageUnitResponse> {
    const unit = await this.storageUnitRepository.findById(id);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }
    return validateResponse(
      storageUnitResponseSchema,
      this.formatStorageUnit(unit)
    );
  }

  async getAvailableUnits(
    facilityId: string,
    filters?: AvailableStorageUnitQuery
  ): Promise<StorageUnitResponse[]> {
    const facility = await this.facilityRepository.findById(facilityId);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status !== FacilityStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Facility']);
    }

    const units = await this.storageUnitRepository.findAvailableUnits(
      facilityId,
      filters
    );
    const formatted = units.map((u) => this.formatStorageUnit(u));
    return validateResponse(storageUnitListResponseSchema, formatted);
  }

  @Transactional()
  async createStorageUnit(
    data: CreateStorageUnitRequest
  ): Promise<StorageUnitResponse> {
    // Validate Facility tồn tại và ACTIVE
    const facility = await this.facilityRepository.findById(data.facilityId);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status !== FacilityStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Facility']);
    }

    // Validate UnitType tồn tại và ACTIVE
    const unitType = await this.unitTypeRepository.findById(data.unitTypeId);
    if (!unitType) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Unit Type']);
    }
    if (unitType.status !== UnitTypeStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Unit Type']);
    }

    // Validate Offering (Cấu hình giá cho cặp Facility + UnitType phải tồn tại và ACTIVE)
    const offering = await this.offeringRepository.findByFacilityAndUnitType(
      data.facilityId,
      data.unitTypeId
    );
    if (
      !offering ||
      offering.status !== FacilityUnitTypeOfferingStatusEnum.ACTIVE
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    const normalizedUnitNumber = data.unitNumber.toUpperCase().trim();

    // Kiểm tra duplicate (bao gồm bản ghi đã xóa mềm để Auto-Restore)
    const existing =
      await this.storageUnitRepository.findByFacilityAndUnitNumberIncludeDeleted(
        data.facilityId,
        normalizedUnitNumber
      );

    if (existing) {
      // Nếu bản ghi đang ACTIVE (chưa xoá mềm) -> Báo lỗi trùng
      if (!existing.deleted) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, [
          `Storage Unit Number "${normalizedUnitNumber}" in this Facility`,
        ]);
      }

      // Nếu bản ghi ĐÃ BỊ XOÁ MỀM -> Khôi phục và cập nhật thông tin mới
      await this.storageUnitRepository.restoreById(String(existing._id));
      const updated = await this.storageUnitRepository.updateById(
        String(existing._id),
        {
          ...data,
          facilityId: data.facilityId as unknown as IStorageUnit['facilityId'],
          unitTypeId: data.unitTypeId as unknown as IStorageUnit['unitTypeId'],
          unitNumber: normalizedUnitNumber,
          status: data.status ?? StorageUnitStatusEnum.AVAILABLE,
        }
      );

      const populated = await this.storageUnitRepository.findById(
        String(updated?._id ?? existing._id)
      );
      return validateResponse(
        storageUnitResponseSchema,
        this.formatStorageUnit(populated)
      );
    }

    const newUnit = await this.storageUnitRepository.create({
      ...data,
      facilityId: data.facilityId as unknown as IStorageUnit['facilityId'],
      unitTypeId: data.unitTypeId as unknown as IStorageUnit['unitTypeId'],
      unitNumber: normalizedUnitNumber,
      status: data.status ?? StorageUnitStatusEnum.AVAILABLE,
    });

    const populated = await this.storageUnitRepository.findById(
      String(newUnit._id)
    );
    return validateResponse(
      storageUnitResponseSchema,
      this.formatStorageUnit(populated)
    );
  }

  @Transactional()
  async updateStorageUnit(
    id: string,
    data: UpdateStorageUnitRequest
  ): Promise<StorageUnitResponse> {
    const unit = await this.storageUnitRepository.findById(id);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }

    // Nếu thay đổi unitTypeId: Chỉ cho phép khi phòng đang AVAILABLE
    if (
      data.unitTypeId &&
      String(unit.unitTypeId?._id || unit.unitTypeId) !== data.unitTypeId
    ) {
      if (
        unit.status === StorageUnitStatusEnum.OCCUPIED ||
        unit.status === StorageUnitStatusEnum.RESERVED
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
      }

      const unitType = await this.unitTypeRepository.findById(data.unitTypeId);
      if (!unitType || unitType.status !== UnitTypeStatusEnum.ACTIVE) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Unit Type']);
      }

      const facilityIdStr = String(unit.facilityId?._id || unit.facilityId);
      const offering = await this.offeringRepository.findByFacilityAndUnitType(
        facilityIdStr,
        data.unitTypeId
      );
      if (
        !offering ||
        offering.status !== FacilityUnitTypeOfferingStatusEnum.ACTIVE
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
      }
    }

    // Nếu thay đổi unitNumber: Kiểm tra trùng lặp tại cùng cơ sở
    if (data.unitNumber) {
      const normalizedUnitNumber = data.unitNumber.toUpperCase().trim();
      const facilityIdStr = String(unit.facilityId?._id || unit.facilityId);
      const duplicate =
        await this.storageUnitRepository.findByFacilityAndUnitNumberIncludeDeleted(
          facilityIdStr,
          normalizedUnitNumber
        );

      if (duplicate && String(duplicate._id) !== id) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, [
          `Storage Unit Number "${normalizedUnitNumber}" in this Facility`,
        ]);
      }
    }

    const { unitTypeId, unitNumber, ...otherData } = data;
    const updatePayload: Partial<IStorageUnit> = {
      ...otherData,
      ...(unitTypeId && {
        unitTypeId: unitTypeId as unknown as IStorageUnit['unitTypeId'],
      }),
      ...(unitNumber && {
        unitNumber: unitNumber.toUpperCase().trim(),
      }),
    };

    await this.storageUnitRepository.updateById(id, updatePayload);
    const updated = await this.storageUnitRepository.findById(id);

    return validateResponse(
      storageUnitResponseSchema,
      this.formatStorageUnit(updated)
    );
  }

  @Transactional()
  async toggleMaintenance(
    id: string,
    data: ToggleMaintenanceRequest
  ): Promise<StorageUnitResponse> {
    const unit = await this.storageUnitRepository.findById(id);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }

    if (data.isUnderMaintenance) {
      // Đưa vào bảo trì: Chặn nếu đang có người đặt (RESERVED) hoặc đang thuê (OCCUPIED)
      if (
        unit.status === StorageUnitStatusEnum.RESERVED ||
        unit.status === StorageUnitStatusEnum.OCCUPIED
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
      }
      unit.status = StorageUnitStatusEnum.UNDER_MAINTENANCE;
    } else {
      // Tắt bảo trì -> chuyển về AVAILABLE
      if (unit.status !== StorageUnitStatusEnum.UNDER_MAINTENANCE) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
      }
      unit.status = StorageUnitStatusEnum.AVAILABLE;
    }

    if (data.notes !== undefined) {
      unit.notes = data.notes;
    }

    await this.storageUnitRepository.updateById(id, {
      status: unit.status,
      notes: unit.notes,
    });

    const updated = await this.storageUnitRepository.findById(id);
    return validateResponse(
      storageUnitResponseSchema,
      this.formatStorageUnit(updated)
    );
  }

  @Transactional()
  async deleteStorageUnit(id: string): Promise<void> {
    const unit = await this.storageUnitRepository.findById(id);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }

    // Chặn xóa nếu phòng đang RESERVED hoặc OCCUPIED
    if (
      unit.status === StorageUnitStatusEnum.RESERVED ||
      unit.status === StorageUnitStatusEnum.OCCUPIED
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    await this.storageUnitRepository.deleteById(id);
  }

  // =========================================================================
  // INTERNAL SERVICE METHODS (Dành cho Module Reservation & Contract gọi)
  // =========================================================================

  async reserveUnit(
    unitId: string,
    session?: ClientSession
  ): Promise<IStorageUnit> {
    const unit = await this.storageUnitRepository.findById(unitId, session);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }
    if (unit.status !== StorageUnitStatusEnum.AVAILABLE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    const updated = await this.storageUnitRepository.updateById(
      unitId,
      { status: StorageUnitStatusEnum.RESERVED },
      session
    );
    return updated as IStorageUnit;
  }

  async releaseUnit(
    unitId: string,
    session?: ClientSession
  ): Promise<IStorageUnit> {
    const unit = await this.storageUnitRepository.findById(unitId, session);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }
    if (unit.status !== StorageUnitStatusEnum.RESERVED) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    const updated = await this.storageUnitRepository.updateById(
      unitId,
      { status: StorageUnitStatusEnum.AVAILABLE },
      session
    );
    return updated as IStorageUnit;
  }

  async occupyUnit(
    unitId: string,
    session?: ClientSession
  ): Promise<IStorageUnit> {
    const unit = await this.storageUnitRepository.findById(unitId, session);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }
    if (
      unit.status !== StorageUnitStatusEnum.RESERVED &&
      unit.status !== StorageUnitStatusEnum.AVAILABLE
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    const updated = await this.storageUnitRepository.updateById(
      unitId,
      { status: StorageUnitStatusEnum.OCCUPIED },
      session
    );
    return updated as IStorageUnit;
  }

  async vacateUnit(
    unitId: string,
    session?: ClientSession
  ): Promise<IStorageUnit> {
    const unit = await this.storageUnitRepository.findById(unitId, session);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }
    if (unit.status !== StorageUnitStatusEnum.OCCUPIED) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    // Bắt buộc chuyển sang bảo trì/dọn dẹp sau khi trả phòng
    const updated = await this.storageUnitRepository.updateById(
      unitId,
      { status: StorageUnitStatusEnum.UNDER_MAINTENANCE },
      session
    );
    return updated as IStorageUnit;
  }
}
