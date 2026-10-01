import type { ClientSession, FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IFacilityAmenityOffering } from './facilityAmenityOffering.model.ts';
import type { FacilityAmenityOfferingQuery } from './schemas/facilityAmenityOffering.request.schema.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import { FacilityAmenityOfferingStatusEnum } from '../../common/enums/facilityAmenityOffering.enum.ts';
import type { BillingUnitEnum } from '../../common/enums/billing.enum.ts';

const POPULATE_FACILITY = {
  path: 'facilityId',
  select: 'name city address status',
};

const POPULATE_AMENITY = {
  path: 'amenityId',
  select: 'name description type status images tags',
};

export class FacilityAmenityOfferingRepository {
  constructor(
    private readonly offering: SoftDeleteModel<IFacilityAmenityOffering>
  ) {}

  async findAll(
    query: FacilityAmenityOfferingQuery = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IFacilityAmenityOffering>> {
    const filter: FilterQuery<IFacilityAmenityOffering> = {};

    if (query.facilityId) {
      filter.facilityId = query.facilityId;
    }

    if (query.amenityId) {
      filter.amenityId = query.amenityId;
    }

    if (query.billingUnit) {
      filter.billingUnit = query.billingUnit as BillingUnitEnum;
    }

    if (query.status) {
      filter.status = query.status as FacilityAmenityOfferingStatusEnum;
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

    return paginate<IFacilityAmenityOffering>(this.offering, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
      populate: [POPULATE_FACILITY, POPULATE_AMENITY],
    });
  }

  async findById(id: string, session?: ClientSession) {
    const q = this.offering
      .findById(id)
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_AMENITY);
    if (session) q.session(session);
    return q;
  }

  async findByFacilityAndAmenity(
    facilityId: string,
    amenityId: string,
    session?: ClientSession
  ) {
    const q = this.offering
      .findOne({ facilityId, amenityId })
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_AMENITY);
    if (session) q.session(session);
    return q;
  }

  async findAvailableOfferings(facilityId: string) {
    return this.offering
      .find({
        facilityId,
        status: FacilityAmenityOfferingStatusEnum.ACTIVE,
      })
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_AMENITY);
  }

  async create(
    data: Partial<IFacilityAmenityOffering>,
    session?: ClientSession
  ) {
    if (session) {
      const docs = await this.offering.create([data], { session });
      return docs[0];
    }
    return this.offering.create(data);
  }

  async updateById(
    id: string,
    data: Partial<IFacilityAmenityOffering>,
    session?: ClientSession
  ) {
    const q = this.offering.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
    });
    if (session) q.session(session);
    return q;
  }

  async deleteById(id: string, deletedBy?: string) {
    return this.offering.deleteById(id, deletedBy);
  }

  async findByIdIncludeDeleted(id: string) {
    return this.offering
      .findOneWithDeleted({ _id: id })
      .populate(POPULATE_FACILITY)
      .populate(POPULATE_AMENITY);
  }

  async restoreById(id: string) {
    return this.offering.restore({ _id: id });
  }
}
