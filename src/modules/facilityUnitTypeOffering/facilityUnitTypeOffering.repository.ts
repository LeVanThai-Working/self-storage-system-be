import type { FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IFacilityUnitTypeOffering } from './facilityUnitTypeOffering.model.ts';
import type { OfferingQuery } from './schemas/facilityUnitTypeOffering.request.schema.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import type { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import type { FacilityUnitTypeOfferingStatusEnum } from '../../common/enums/facilityUnitTypeOffering.enum.ts';

const POPULATE_FACILITY = {
  path: 'facilityId',
  select: 'name city address status',
};

const POPULATE_UNIT_TYPE = {
  path: 'unitTypeId',
  select: 'name category area volume status dimensions',
};

export class FacilityUnitTypeOfferingRepository {
  constructor(
    private readonly offering: SoftDeleteModel<IFacilityUnitTypeOffering>
  ) {}

  async findAll(
    query: OfferingQuery = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IFacilityUnitTypeOffering>> {
    const filter: FilterQuery<IFacilityUnitTypeOffering> = {};

    if (query.facilityId) {
      filter.facilityId = query.facilityId;
    }

    if (query.unitTypeId) {
      filter.unitTypeId = query.unitTypeId;
    }

    if (query.billingUnit) {
      filter.billingUnit = query.billingUnit as BillingUnitEnum;
    }

    if (query.status) {
      filter.status = query.status as FacilityUnitTypeOfferingStatusEnum;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.pricePerUnit = {};
      if (query.minPrice !== undefined) {
        filter.pricePerUnit.$gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        filter.pricePerUnit.$lte = query.maxPrice;
      }
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<IFacilityUnitTypeOffering>(this.offering, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
      populate: [POPULATE_FACILITY, POPULATE_UNIT_TYPE],
    });
  }

  async findById(id: string) {
    return this.offering
      .findById(id)
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_UNIT_TYPE);
  }

  async findByFacilityAndUnitType(facilityId: string, unitTypeId: string) {
    return this.offering
      .findOne({ facilityId, unitTypeId })
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_UNIT_TYPE);
  }

  // Kiểm tra duplicate bao gồm cả bản ghi đã xóa mềm
  async findByFacilityAndUnitTypeIncludeDeleted(
    facilityId: string,
    unitTypeId: string
  ) {
    return this.offering.findOneWithDeleted({ facilityId, unitTypeId });
  }

  async create(data: Partial<IFacilityUnitTypeOffering>) {
    return this.offering.create(data);
  }

  async updateById(id: string, data: Partial<IFacilityUnitTypeOffering>) {
    return this.offering
      .findByIdAndUpdate(id, data, { returnDocument: 'after' })
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_UNIT_TYPE);
  }

  async softDeleteById(id: string, deletedBy?: string) {
    return this.offering.deleteById(id, deletedBy);
  }
}
