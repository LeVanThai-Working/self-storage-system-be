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
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';

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

  async deleteFacility(id: string, deletedBy?: string): Promise<void> {
    const facility = await this.facilityRepository.findById(id);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }

    await this.facilityRepository.softDelete(id, deletedBy);
  }

  async assignManager(
    facilityId: string,
    data: AssignManagerRequest
  ): Promise<FacilityResponse> {
    const facility = await this.facilityRepository.findById(facilityId);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }

    const manager = await this.userRepository.findById(data.managerId);
    if (!manager) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Manager']);
    }

    if (manager.role !== RoleEnum.FACILITY_MANAGER) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    const updatedFacility = await this.facilityRepository.update(facilityId, {
      managerId: manager._id as unknown as Types.ObjectId,
    });

    return validateResponse(
      facilityResponseSchema,
      this.formatFacility(updatedFacility)
    );
  }
}
