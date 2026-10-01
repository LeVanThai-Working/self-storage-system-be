// import type { ClientSession } from 'mongoose';
import type { FacilityAmenityOfferingRepository } from './facilityAmenityOffering.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { AmenityRepository } from '../amenity/amenity.repository.ts';
import type { IFacilityAmenityOffering } from './facilityAmenityOffering.model.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  facilityAmenityOfferingListResponseSchema,
  facilityAmenityOfferingResponseSchema,
  type FacilityAmenityOfferingResponse,
} from './schemas/facilityAmenityOffering.response.schema.ts';
import type {
  CreateFacilityAmenityOfferingRequest,
  FacilityAmenityOfferingQuery,
  UpdateFacilityAmenityOfferingRequest,
} from './schemas/facilityAmenityOffering.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';
import { AmenityStatusEnum } from '../../common/enums/amenity.enum.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';

export class FacilityAmenityOfferingService {
  constructor(
    private readonly offeringRepository: FacilityAmenityOfferingRepository,
    private readonly facilityRepository: FacilityRepository,
    private readonly amenityRepository: AmenityRepository
  ) {}

  private formatOffering(offering: unknown): unknown {
    if (!offering) return offering;
    const doc = offering as {
      toObject?: (options?: unknown) => Record<string, unknown>;
      _id?: unknown;
      id?: string;
      facilityId?: unknown;
      amenityId?: unknown;
      totalQuantity?: number;
      inUseQuantity?: number;
    };
    const obj: Record<string, unknown> =
      typeof doc.toObject === 'function'
        ? doc.toObject({ virtuals: true })
        : { ...doc };

    if (!obj.id && obj._id) {
      obj.id = String(obj._id);
    }

    const total = typeof obj.totalQuantity === 'number' ? obj.totalQuantity : 0;
    const inUse = typeof obj.inUseQuantity === 'number' ? obj.inUseQuantity : 0;
    obj.availableQuantity = Math.max(0, total - inUse);

    // Map populated facilityId -> facility
    if (obj.facilityId && typeof obj.facilityId === 'object') {
      const f = obj.facilityId as Record<string, unknown>;
      const facilityObj = {
        id: f._id ? String(f._id) : String(f.id),
        name: f.name,
        city: f.city,
        address: f.address,
        status: f.status,
      };
      obj.facility = facilityObj;
      obj.facilityId = facilityObj.id;
    } else if (obj.facilityId) {
      obj.facilityId = String(obj.facilityId);
    }

    // Map populated amenityId -> amenity
    if (obj.amenityId && typeof obj.amenityId === 'object') {
      const a = obj.amenityId as Record<string, unknown>;
      const amenityObj = {
        id: a._id ? String(a._id) : String(a.id),
        name: a.name,
        description: a.description,
        type: a.type,
        status: a.status,
        images: a.images ?? [],
        tags: a.tags ?? [],
      };
      obj.amenity = amenityObj;
      obj.amenityId = amenityObj.id;
    } else if (obj.amenityId) {
      obj.amenityId = String(obj.amenityId);
    }

    return obj;
  }

  async getOfferings(
    query?: FacilityAmenityOfferingQuery
  ): Promise<PaginatedData<FacilityAmenityOfferingResponse>> {
    try {
      const result = await this.offeringRepository.findAll(query);
      const formattedItems = result.items.map((item) =>
        this.formatOffering(item)
      );
      const validatedItems = validateResponse(
        facilityAmenityOfferingListResponseSchema,
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

  async getOfferingById(id: string): Promise<FacilityAmenityOfferingResponse> {
    const offering = await this.offeringRepository.findById(id);
    if (!offering) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Facility Amenity Offering',
      ]);
    }
    return validateResponse(
      facilityAmenityOfferingResponseSchema,
      this.formatOffering(offering)
    );
  }

  async getOfferingByFacilityAndAmenity(
    facilityId: string,
    amenityId: string
  ): Promise<FacilityAmenityOfferingResponse> {
    const offering = await this.offeringRepository.findByFacilityAndAmenity(
      facilityId,
      amenityId
    );
    if (!offering) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Facility Amenity Offering',
      ]);
    }
    return validateResponse(
      facilityAmenityOfferingResponseSchema,
      this.formatOffering(offering)
    );
  }

  async getAvailableOfferings(
    facilityId: string
  ): Promise<FacilityAmenityOfferingResponse[]> {
    const facility = await this.facilityRepository.findById(facilityId);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status !== FacilityStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Facility']);
    }

    const offerings =
      await this.offeringRepository.findAvailableOfferings(facilityId);
    const formatted = offerings.map((item) => this.formatOffering(item));
    return validateResponse(
      facilityAmenityOfferingListResponseSchema,
      formatted
    );
  }

  @Transactional()
  async createOffering(
    data: CreateFacilityAmenityOfferingRequest
  ): Promise<FacilityAmenityOfferingResponse> {
    // Validate Facility exists and is ACTIVE
    const facility = await this.facilityRepository.findById(data.facilityId);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status !== FacilityStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Facility']);
    }

    // Validate Amenity exists and is ACTIVE
    const amenity = await this.amenityRepository.findById(data.amenityId);
    if (!amenity) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Amenity']);
    }
    if (amenity.status !== AmenityStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Amenity']);
    }

    // Check duplicate (only for active records based on Partial Unique Index)
    const existing = await this.offeringRepository.findByFacilityAndAmenity(
      data.facilityId,
      data.amenityId
    );
    if (existing) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, [
        'Offering for this Facility and Amenity',
      ]);
    }

    const created = await this.offeringRepository.create({
      ...data,
      facilityId:
        data.facilityId as unknown as IFacilityAmenityOffering['facilityId'],
      amenityId:
        data.amenityId as unknown as IFacilityAmenityOffering['amenityId'],
      inUseQuantity: 0,
    });

    const populated = await this.offeringRepository.findById(
      String(created._id)
    );
    return validateResponse(
      facilityAmenityOfferingResponseSchema,
      this.formatOffering(populated)
    );
  }

  @Transactional()
  async updateOffering(
    id: string,
    data: UpdateFacilityAmenityOfferingRequest
  ): Promise<FacilityAmenityOfferingResponse> {
    const offering = await this.offeringRepository.findById(id);
    if (!offering) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Facility Amenity Offering',
      ]);
    }

    // Inventory validation rule: totalQuantity cannot be less than inUseQuantity
    if (data.totalQuantity !== undefined) {
      if (data.totalQuantity < offering.inUseQuantity) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
          `Total quantity (${data.totalQuantity}) cannot be less than currently in-use quantity (${offering.inUseQuantity})`,
        ]);
      }
    }

    const updated = await this.offeringRepository.updateById(id, data);
    const populated = await this.offeringRepository.findById(
      String(updated?._id ?? id)
    );
    return validateResponse(
      facilityAmenityOfferingResponseSchema,
      this.formatOffering(populated)
    );
  }

  @Transactional()
  async deleteOffering(id: string, deletedBy?: string): Promise<void> {
    const offering = await this.offeringRepository.findById(id);
    if (!offering) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Facility Amenity Offering',
      ]);
    }

    // Guard against deletion if units are currently in use
    if (offering.inUseQuantity > 0) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        `Cannot delete offering while ${offering.inUseQuantity} items are currently in use`,
      ]);
    }

    await this.offeringRepository.deleteById(id, deletedBy);
  }

  // =========================================================================
  // INTERNAL SERVICE METHODS (For Reservation & Contract modules)
  // =========================================================================
  //
  // async reserveAmenity(
  //   offeringId: string,
  //   quantity: number,
  //   session?: ClientSession
  // ): Promise<IFacilityAmenityOffering> {
  //   const offering = await this.offeringRepository.findById(
  //     offeringId,
  //     session
  //   );
  //   if (!offering) {
  //     throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
  //       'Facility Amenity Offering',
  //     ]);
  //   }

  //   const available = offering.totalQuantity - offering.inUseQuantity;
  //   if (offering.totalQuantity > 0 && available < quantity) {
  //     throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
  //       `Insufficient amenity quantity (Available: ${available}, Requested: ${quantity})`,
  //     ]);
  //   }

  //   const updated = await this.offeringRepository.updateById(
  //     offeringId,
  //     { inUseQuantity: offering.inUseQuantity + quantity },
  //     session
  //   );
  //   return updated as IFacilityAmenityOffering;
  // }

  // async releaseAmenity(
  //   offeringId: string,
  //   quantity: number,
  //   session?: ClientSession
  // ): Promise<IFacilityAmenityOffering> {
  //   const offering = await this.offeringRepository.findById(
  //     offeringId,
  //     session
  //   );
  //   if (!offering) {
  //     throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
  //       'Facility Amenity Offering',
  //     ]);
  //   }

  //   const newInUse = Math.max(0, offering.inUseQuantity - quantity);
  //   const updated = await this.offeringRepository.updateById(
  //     offeringId,
  //     { inUseQuantity: newInUse },
  //     session
  //   );
  //   return updated as IFacilityAmenityOffering;
  // }
}
