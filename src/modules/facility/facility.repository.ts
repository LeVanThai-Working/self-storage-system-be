import type { FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IFacility } from './facility.model.ts';
import type { FacilityQuery } from './schemas/facility.request.schema.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';

export class FacilityRepository {
  constructor(private readonly facility: SoftDeleteModel<IFacility>) {}

  async findAll(
    query: FacilityQuery & { facilityIds?: string[]; city?: string } = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IFacility>> {
    const filter: FilterQuery<IFacility> = {};

    if (query.facilityIds !== undefined) {
      filter._id = { $in: query.facilityIds };
    }

    if (query.city) {
      filter.city = { $regex: query.city, $options: 'i' };
    }

    if (query.search) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      filter.$or = [{ name: searchRegex }, { city: searchRegex }];
    }

    if (query.status) {
      filter.status = query.status as FacilityStatusEnum;
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<IFacility>(this.facility, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
    });
  }

  async findById(id: string) {
    return this.facility.findById(id);
  }

  async findByNameAndCity(name: string, city: string) {
    return this.facility.findOne({ name, city });
  }

  async findByManagerId(managerId: string) {
    return this.facility.findOne({ managerId });
  }

  async create(data: Partial<IFacility>) {
    return this.facility.create(data);
  }

  async update(id: string, data: Partial<IFacility>) {
    return this.facility.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
    });
  }

  async softDelete(id: string, deletedBy?: string) {
    return this.facility.deleteById(id, deletedBy);
  }

  async findByIdIncludeDeleted(id: string) {
    return this.facility.findOneWithDeleted({ _id: id });
  }

  async restore(id: string) {
    return this.facility.restore({ _id: id });
  }
}
