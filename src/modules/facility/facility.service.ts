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
    // When completing related modules, add deletion guard conditions & cascading logic:
    // 1. [GUARD DELETION] Check if facility has occupied storage units (StorageUnit.status === 'OCCUPIED') -> Throw error to prevent deletion.
    // 2. [GUARD DELETION] Check if facility has active contracts (Contract) or pending reservations (Reservation) -> Throw error.
    // 3. [CASCADE SOFT-DELETE] Automatically soft-delete dependent records within the same transaction:
    //    - FacilityUnitTypeOffering: Soft-delete all pricing offerings for this facility.
    //    - StorageUnit: Soft-delete all physical storage units (AVAILABLE/MAINTENANCE) belonging to this facility.
    //    - User (Staff): Unassign assignedFacilityId for staff members assigned to this facility.

    await this.facilityRepository.softDelete(id, deletedBy);
  }

  @Transactional()
  async assignManager(
    facilityId: string,
    data: AssignManagerRequest
  ): Promise<FacilityResponse> {
    const facility = await this.facilityRepository.findById(facilityId);

    // 1. Check if facility exists and is ACTIVE
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status === FacilityStatusEnum.INACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Facility']);
    }

    // 2. Check if manager exists, has the correct role, and is ACTIVE
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

    // 3. Check if new manager is already managing another facility -> unlink manager from old facility
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

    // 4. Check if current facility already has a manager -> unlink old manager
    const oldManagerId = facility.managerId ? String(facility.managerId) : null;
    if (oldManagerId && oldManagerId !== data.managerId) {
      await this.userRepository.updateUser(oldManagerId, {
        assignedFacilityId: null as unknown as Types.ObjectId,
      });
    }

    // 5. Update Facility.managerId (side 1)
    const updatedFacility = await this.facilityRepository.update(facilityId, {
      managerId: newManager._id as unknown as Types.ObjectId,
    });

    // 6. Update User.assignedFacilityId (side 2)
    await this.userRepository.updateUser(data.managerId, {
      assignedFacilityId: facility._id as unknown as Types.ObjectId,
    });

    return validateResponse(
      facilityResponseSchema,
      this.formatFacility(updatedFacility)
    );
  }

  @Transactional()
  async restoreFacility(id: string): Promise<FacilityResponse> {
    const facility = await this.facilityRepository.findByIdIncludeDeleted(id);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (!facility.deleted) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    await this.facilityRepository.restore(id);

    const restored = await this.facilityRepository.findById(id);
    return validateResponse(
      facilityResponseSchema,
      this.formatFacility(restored)
    );
  }
}
