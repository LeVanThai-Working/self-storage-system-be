import type { FacilityUnitTypeOfferingRepository } from './facilityUnitTypeOffering.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { UnitTypeRepository } from '../unitType/unitType.repository.ts';
import type { IFacilityUnitTypeOffering } from './facilityUnitTypeOffering.model.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  facilityUnitTypeOfferingListResponseSchema,
  facilityUnitTypeOfferingResponseSchema,
  type FacilityUnitTypeOfferingResponse,
} from './schemas/facilityUnitTypeOffering.response.schema.ts';
import type {
  CreateOfferingRequest,
  OfferingQuery,
  UpdateOfferingRequest,
} from './schemas/facilityUnitTypeOffering.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';
import { UnitTypeStatusEnum } from '../../common/enums/unitType.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../../common/enums/facilityUnitTypeOffering.enum.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';

export class FacilityUnitTypeOfferingService {
  constructor(
    private readonly offeringRepository: FacilityUnitTypeOfferingRepository,
    private readonly facilityRepository: FacilityRepository,
    private readonly unitTypeRepository: UnitTypeRepository
  ) {}

  private formatOffering(offering: unknown): unknown {
    if (!offering) return offering;
    const doc = offering as {
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
      obj.facility = {
        id: f._id ? String(f._id) : f.id,
        name: f.name,
        city: f.city,
        address: f.address,
        status: f.status,
      };
    }

    // Map populated unitTypeId -> unitType
    if (obj.unitTypeId && typeof obj.unitTypeId === 'object') {
      const u = obj.unitTypeId as Record<string, unknown>;
      obj.unitType = {
        id: u._id ? String(u._id) : u.id,
        name: u.name,
        category: u.category,
        area: u.area,
        volume: u.volume,
        status: u.status,
        dimensions: u.dimensions,
      };
    }

    return obj;
  }

  async getOfferings(
    query?: OfferingQuery
  ): Promise<PaginatedData<FacilityUnitTypeOfferingResponse>> {
    try {
      const result = await this.offeringRepository.findAll(query);
      const formattedItems = result.items.map((item) =>
        this.formatOffering(item)
      );
      const validatedItems = validateResponse(
        facilityUnitTypeOfferingListResponseSchema,
        formattedItems
      );
      return {
        items: validatedItems,
        pagination: result.pagination,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error in getOfferings:', error);
      throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106);
    }
  }

  async getOfferingById(id: string): Promise<FacilityUnitTypeOfferingResponse> {
    const offering = await this.offeringRepository.findById(id);
    if (!offering) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Facility Unit Type Offering',
      ]);
    }
    return validateResponse(
      facilityUnitTypeOfferingResponseSchema,
      this.formatOffering(offering)
    );
  }

  async getOfferingByFacilityAndUnitType(
    facilityId: string,
    unitTypeId: string
  ): Promise<FacilityUnitTypeOfferingResponse> {
    const offering = await this.offeringRepository.findByFacilityAndUnitType(
      facilityId,
      unitTypeId
    );
    if (!offering) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Facility Unit Type Offering',
      ]);
    }
    return validateResponse(
      facilityUnitTypeOfferingResponseSchema,
      this.formatOffering(offering)
    );
  }

  @Transactional()
  async createOffering(
    data: CreateOfferingRequest
  ): Promise<FacilityUnitTypeOfferingResponse> {
    // Validate Facility tồn tại và ACTIVE
    const facility = await this.facilityRepository.findById(data.facilityId);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status !== FacilityStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    // Validate UnitType tồn tại và ACTIVE
    const unitType = await this.unitTypeRepository.findById(data.unitTypeId);
    if (!unitType) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Unit Type']);
    }
    if (unitType.status !== UnitTypeStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    // Kiểm tra duplicate (bao gồm bản ghi đã xóa mềm)
    const existing =
      await this.offeringRepository.findByFacilityAndUnitTypeIncludeDeleted(
        data.facilityId,
        data.unitTypeId
      );

    if (existing) {
      // Nếu bản ghi đang ACTIVE (chưa xoá mềm) -> Báo lỗi trùng
      if (!existing.deleted) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, [
          'Offering for this Facility and Unit Type',
        ]);
      }

      // Nếu bản ghi ĐÃ BỊ XOÁ MỀM -> Khôi phục và cập nhật thông tin mới
      await this.offeringRepository.restoreById(String(existing._id));
      const updated = await this.offeringRepository.updateById(
        String(existing._id),
        {
          ...data,
          facilityId:
            data.facilityId as unknown as IFacilityUnitTypeOffering['facilityId'],
          unitTypeId:
            data.unitTypeId as unknown as IFacilityUnitTypeOffering['unitTypeId'],
          status: data.status ?? FacilityUnitTypeOfferingStatusEnum.ACTIVE,
        }
      );

      return validateResponse(
        facilityUnitTypeOfferingResponseSchema,
        this.formatOffering(updated)
      );
    }

    const newOffering = await this.offeringRepository.create({
      ...data,
      facilityId:
        data.facilityId as unknown as IFacilityUnitTypeOffering['facilityId'],
      unitTypeId:
        data.unitTypeId as unknown as IFacilityUnitTypeOffering['unitTypeId'],
      status: data.status ?? FacilityUnitTypeOfferingStatusEnum.ACTIVE,
    });

    // Fetch lại với populate để trả về response đầy đủ
    const populated = await this.offeringRepository.findById(
      String(newOffering._id)
    );

    return validateResponse(
      facilityUnitTypeOfferingResponseSchema,
      this.formatOffering(populated)
    );
  }

  async updateOffering(
    id: string,
    data: UpdateOfferingRequest
  ): Promise<FacilityUnitTypeOfferingResponse> {
    const offering = await this.offeringRepository.findById(id);
    if (!offering) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Facility Unit Type Offering',
      ]);
    }

    const updated = await this.offeringRepository.updateById(id, data);

    return validateResponse(
      facilityUnitTypeOfferingResponseSchema,
      this.formatOffering(updated)
    );
  }

  @Transactional()
  async deleteOffering(id: string, deletedBy?: string): Promise<void> {
    const offering = await this.offeringRepository.findById(id);
    if (!offering) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Facility Unit Type Offering',
      ]);
    }

    // TODO: [Module Reservation & Contract Integration Reminder]
    // Khi hoàn thiện các module liên quan, cần bổ sung các điều kiện chặn xoá:
    // 1. [CHẶN XOÁ] Kiểm tra nếu cặp (facilityId, unitTypeId) này đang có Hợp đồng hiệu lực (Contract.status === 'ACTIVE') -> Chặn xoá.
    // 2. [CHẶN XOÁ] Kiểm tra nếu đang có Đặt chỗ (Reservation) chờ nhận phòng sử dụng bảng giá này -> Chặn xoá.

    await this.offeringRepository.softDeleteById(id, deletedBy);
  }
}
