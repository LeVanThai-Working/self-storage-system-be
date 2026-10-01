import type { AmenityRepository } from './amenity.repository.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  amenityListResponseSchema,
  amenityResponseSchema,
  type AmenityResponse,
} from './schemas/amenity.response.schema.ts';
import type {
  AmenityQuery,
  CreateAmenityRequest,
  UpdateAmenityRequest,
} from './schemas/amenity.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';

export class AmenityService {
  constructor(private readonly amenityRepository: AmenityRepository) {}

  private formatAmenity(amenity: unknown): unknown {
    if (!amenity) return amenity;
    const doc = amenity as {
      toObject?: (options?: unknown) => Record<string, unknown>;
      _id?: unknown;
      id?: string;
    };
    const obj =
      typeof doc.toObject === 'function'
        ? doc.toObject({ virtuals: true })
        : { ...doc };

    if (!obj.id && obj._id) {
      obj.id = String(obj._id);
    }
    return obj;
  }

  async getAmenities(
    query?: AmenityQuery
  ): Promise<PaginatedData<AmenityResponse>> {
    try {
      const result = await this.amenityRepository.findAll(query);
      const formattedItems = result.items.map((item) =>
        this.formatAmenity(item)
      );
      const validatedItems = validateResponse(
        amenityListResponseSchema,
        formattedItems
      );
      return {
        items: validatedItems,
        pagination: result.pagination,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error in getAmenities:', error);
      throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106);
    }
  }

  async getAmenityById(id: string): Promise<AmenityResponse> {
    const amenity = await this.amenityRepository.findById(id);
    if (!amenity) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Amenity']);
    }
    return validateResponse(amenityResponseSchema, this.formatAmenity(amenity));
  }

  @Transactional()
  async createAmenity(data: CreateAmenityRequest): Promise<AmenityResponse> {
    const trimmedName = data.name.trim();

    // Prevent duplicate amenity name (including soft-deleted records)
    const existing =
      await this.amenityRepository.findByNameIncludeDeleted(trimmedName);

    if (existing) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, ['Amenity Name']);
    }

    const created = await this.amenityRepository.create({
      ...data,
      name: trimmedName,
    });

    return validateResponse(amenityResponseSchema, this.formatAmenity(created));
  }

  @Transactional()
  async updateAmenity(
    id: string,
    data: UpdateAmenityRequest
  ): Promise<AmenityResponse> {
    const amenity = await this.amenityRepository.findById(id);
    if (!amenity) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Amenity']);
    }

    // If name is changed -> check for name duplicates
    if (data.name) {
      const trimmedName = data.name.trim();
      if (trimmedName.toLowerCase() !== amenity.name.toLowerCase()) {
        const duplicate =
          await this.amenityRepository.findByNameIncludeDeleted(trimmedName);
        if (duplicate && String(duplicate._id) !== id) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, [
            'Amenity Name',
          ]);
        }
      }
    }

    const updateData = {
      ...data,
      ...(data.name && { name: data.name.trim() }),
    };

    const updated = await this.amenityRepository.updateById(id, updateData);
    if (!updated) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Amenity']);
    }

    return validateResponse(amenityResponseSchema, this.formatAmenity(updated));
  }

  @Transactional()
  async deleteAmenity(id: string, deletedBy?: string): Promise<void> {
    const amenity = await this.amenityRepository.findById(id);
    if (!amenity) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Amenity']);
    }

    // TODO: When integrating FacilityAmenityOffering -> Prevent deletion if any facility is offering this amenity.

    await this.amenityRepository.deleteById(id, deletedBy);
  }
}
