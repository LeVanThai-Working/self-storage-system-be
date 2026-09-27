import type { FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IUnitType } from './unitType.model.ts';
import type { UnitTypeQuery } from './schemas/unitType.request.schema.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import type {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../../common/enums/unitType.enum.ts';

export class UnitTypeRepository {
  constructor(private readonly unitType: SoftDeleteModel<IUnitType>) {}

  async findAll(
    query: UnitTypeQuery = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IUnitType>> {
    const filter: FilterQuery<IUnitType> = {};

    if (query.search) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      filter.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    if (query.status) {
      filter.status = query.status as UnitTypeStatusEnum;
    }

    if (query.category) {
      filter.category = query.category as UnitTypeCategoryEnum;
    }

    if (query.minArea !== undefined || query.maxArea !== undefined) {
      filter.area = {};
      if (query.minArea !== undefined) {
        filter.area.$gte = query.minArea;
      }
      if (query.maxArea !== undefined) {
        filter.area.$lte = query.maxArea;
      }
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.basePrice = {};
      if (query.minPrice !== undefined) {
        filter.basePrice.$gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        filter.basePrice.$lte = query.maxPrice;
      }
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<IUnitType>(this.unitType, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
    });
  }

  async findById(id: string) {
    return this.unitType.findById(id);
  }

  async findByName(name: string) {
    return this.unitType.findOne({ name });
  }

  async create(data: Partial<IUnitType>) {
    return this.unitType.create(data);
  }

  async update(id: string, data: Partial<IUnitType>) {
    return this.unitType.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
    });
  }

  async softDelete(id: string, deletedBy?: string) {
    return this.unitType.deleteById(id, deletedBy);
  }
}
