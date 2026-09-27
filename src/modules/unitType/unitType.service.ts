import type { UnitTypeRepository } from './unitType.repository.ts';
import type { IDimensions, IUnitType } from './unitType.model.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  unitTypeListResponseSchema,
  unitTypeResponseSchema,
  type UnitTypeResponse,
} from './schemas/unitType.response.schema.ts';
import type {
  CreateUnitTypeRequest,
  UnitTypeQuery,
  UpdateUnitTypeRequest,
} from './schemas/unitType.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { UnitTypeStatusEnum } from '../../common/enums/unitType.enum.ts';

export class UnitTypeService {
  constructor(private readonly unitTypeRepository: UnitTypeRepository) {}

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

  private formatUnitType(unitType: unknown): unknown {
    if (!unitType) return unitType;
    const doc = unitType as {
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

  async findAllUnitType(
    query?: UnitTypeQuery
  ): Promise<PaginatedData<UnitTypeResponse>> {
    try {
      const result = await this.unitTypeRepository.findAll(query);
      const formattedItems = result.items.map((item) =>
        this.formatUnitType(item)
      );
      const validatedItems = validateResponse(
        unitTypeListResponseSchema,
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
      console.error('Error in findAllUnitType:', error);
      throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106);
    }
  }

  async findUnitTypeById(id: string): Promise<UnitTypeResponse> {
    const unitType = await this.unitTypeRepository.findById(id);
    if (!unitType) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Unit Type']);
    }
    return validateResponse(
      unitTypeResponseSchema,
      this.formatUnitType(unitType)
    );
  }

  async createUnitType(data: CreateUnitTypeRequest): Promise<UnitTypeResponse> {
    const existing = await this.unitTypeRepository.findByName(data.name);
    if (existing) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, ['Unit Type']);
    }

    const { area, volume } = this.calculateAreaAndVolume(data.dimensions);

    const newUnitType = await this.unitTypeRepository.create({
      ...data,
      area,
      volume,
      status: UnitTypeStatusEnum.ACTIVE,
    });

    return validateResponse(
      unitTypeResponseSchema,
      this.formatUnitType(newUnitType)
    );
  }

  async updateUnitType(
    id: string,
    data: UpdateUnitTypeRequest
  ): Promise<UnitTypeResponse> {
    const unitType = await this.unitTypeRepository.findById(id);
    if (!unitType) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Unit Type']);
    }

    if (data.name && data.name !== unitType.name) {
      const existing = await this.unitTypeRepository.findByName(data.name);
      if (existing && String(existing._id) !== id) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, ['Unit Type']);
      }
    }

    const updatePayload: Partial<IUnitType> = { ...data };

    if (data.dimensions) {
      const { area, volume } = this.calculateAreaAndVolume(data.dimensions);
      updatePayload.area = area;
      updatePayload.volume = volume;
    }

    const updatedUnitType = await this.unitTypeRepository.update(
      id,
      updatePayload
    );
    return validateResponse(
      unitTypeResponseSchema,
      this.formatUnitType(updatedUnitType)
    );
  }

  async deleteUnitType(id: string, deletedBy?: string): Promise<void> {
    const unitType = await this.unitTypeRepository.findById(id);
    if (!unitType) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Unit Type']);
    }

    await this.unitTypeRepository.softDelete(id, deletedBy);
  }
}
