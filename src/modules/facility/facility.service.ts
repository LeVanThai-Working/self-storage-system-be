import type { Types } from 'mongoose';
import type { FacilityRepository } from './facility.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  facilityListResponseSchema,
  facilityResponseSchema,
  type FacilityResponse,
} from './schemas/facility.response.schema.ts';
import type {
  AssignManagerRequest,
  CreateFacilityRequest,
  FacilityQuery,
  UpdateFacilityRequest,
} from './schemas/facility.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { RoleEnum, UserStatusEnum } from '../../common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';

export class FacilityService {
  constructor(
    private readonly facilityRepository: FacilityRepository,
    private readonly userRepository: UserRepository
  ) {}

  private formatFacility(facility: unknown): unknown {
    if (!facility) return facility;
    const doc = facility as {
      toObject?: (options?: unknown) => Record<string, unknown>;
      _id?: unknown;
      id?: string;
      managerId?: unknown;
    };
    const obj =
      typeof doc.toObject === 'function'
        ? doc.toObject({ virtuals: true })
        : { ...doc };
    if (!obj.id && obj._id) {
      obj.id = String(obj._id);
    }
    if (obj.managerId) {
      obj.managerId = String(obj.managerId);
    }
    return obj;
  }

  async findAllFacility(
    query?: FacilityQuery
  ): Promise<PaginatedData<FacilityResponse>> {
    try {
      const result = await this.facilityRepository.findAll(query);
      const formattedItems = result.items.map((f) => this.formatFacility(f));
      const validatedItems = validateResponse(
        facilityListResponseSchema,
        formattedItems
      );
      return {
        items: validatedItems,
        pagination: result.pagination,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error in findAllFacility:', error);
      throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106);
    }
  }

  async findFacilityById(id: string): Promise<FacilityResponse> {
    const facility = await this.facilityRepository.findById(id);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    return validateResponse(
      facilityResponseSchema,
      this.formatFacility(facility)
    );
  }

  async createFacility(data: CreateFacilityRequest): Promise<FacilityResponse> {
    const existing = await this.facilityRepository.findByNameAndCity(
      data.name,
      data.city
    );
    if (existing) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, ['Facility']);
    }

    const newFacility = await this.facilityRepository.create({
      ...data,
      status: FacilityStatusEnum.ACTIVE,
    });

    return validateResponse(
      facilityResponseSchema,
      this.formatFacility(newFacility)
    );
  }

  async updateFacility(
    id: string,
    data: UpdateFacilityRequest
  ): Promise<FacilityResponse> {
    const facility = await this.facilityRepository.findById(id);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }

    const updatedFacility = await this.facilityRepository.update(id, data);
    return validateResponse(
      facilityResponseSchema,
      this.formatFacility(updatedFacility)
    );
  }

  @Transactional()
  async deleteFacility(id: string, deletedBy?: string): Promise<void> {
    const facility = await this.facilityRepository.findById(id);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }

    // TODO: [Module StorageUnit, Reservation & Contract Integration Reminder]
    // Khi hoàn thiện các module liên quan, cần bổ sung các điều kiện chặn xoá & cascade:
    // 1. [CHẶN XOÁ] Kiểm tra nếu cơ sở đang có ô kho có người thuê (StorageUnit.status === 'OCCUPIED') -> Báo lỗi không cho xoá.
    // 2. [CHẶN XOÁ] Kiểm tra nếu cơ sở đang có Hợp đồng hiệu lực (Contract) hoặc Đặt chỗ chờ nhận phòng (Reservation) -> Báo lỗi.
    // 3. [CASCADE SOFT-DELETE] Tự động xoá mềm các bản ghi phụ thuộc trong cùng Transaction:
    //    - FacilityUnitTypeOffering: Xoá mềm toàn bộ bảng giá thuộc cơ sở này.
    //    - StorageUnit: Xoá mềm toàn bộ phòng kho vật lý (AVAILABLE/MAINTENANCE) thuộc cơ sở này.
    //    - User (Staff): Huỷ liên kết assignedFacilityId của các nhân viên thuộc cơ sở này.

    await this.facilityRepository.softDelete(id, deletedBy);
  }

  @Transactional()
  async assignManager(
    facilityId: string,
    data: AssignManagerRequest
  ): Promise<FacilityResponse> {
    const facility = await this.facilityRepository.findById(facilityId);

    // 1. kiem tra facility ton tai va active  ?
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status === FacilityStatusEnum.INACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Facility']);
    }

    // 2. kiem tra manager ton tai, dung role va dang active ?
    const newManager = await this.userRepository.findById(data.managerId);
    if (!newManager) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Manager']);
    }
    if (newManager.role !== RoleEnum.FACILITY_MANAGER) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_121, [
        'Facility Manager',
      ]);
    }
    if (newManager.status !== UserStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, [
        'Facility Manager Account',
      ]);
    }

    // 3. kiem tra Manager moi co dang quan li co so khac khong -> go manager khoi co so cu
    if (
      newManager.assignedFacilityId &&
      String(newManager.assignedFacilityId) !== facilityId
    ) {
      await this.facilityRepository.update(
        String(newManager.assignedFacilityId),
        {
          managerId: null as unknown as Types.ObjectId,
        }
      );
    }

    //4. kiem tra co so hien tai co manager chua -> go lien ket
    const oldManagerId = facility.managerId ? String(facility.managerId) : null;
    if (oldManagerId && oldManagerId !== data.managerId) {
      await this.userRepository.updateUser(oldManagerId, {
        assignedFacilityId: null as unknown as Types.ObjectId,
      });
    }

    //5. cap nhat Facility.managerId (chieu 1)
    const updatedFacility = await this.facilityRepository.update(facilityId, {
      managerId: newManager._id as unknown as Types.ObjectId,
    });

    //6. Cap nhat User.assignedFacilityId (chieu 2)
    await this.userRepository.updateUser(data.managerId, {
      assignedFacilityId: facility._id as unknown as Types.ObjectId,
    });

    return validateResponse(
      facilityResponseSchema,
      this.formatFacility(updatedFacility)
    );
  }
}
