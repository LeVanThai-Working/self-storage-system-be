import {
  Types,
  type ClientSession,
  type FilterQuery,
  type PipelineStage,
} from 'mongoose';
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

  async findFacilityIdsByAmenityIds(
    amenityIds: string[],
    matchAll: boolean = true
  ): Promise<string[]> {
    if (amenityIds.length === 0) return [];

    const amenityObjectIds = amenityIds.map((id) => new Types.ObjectId(id));

    const pipeline: PipelineStage[] = [
      {
        $match: {
          amenityId: { $in: amenityObjectIds },
          status: FacilityAmenityOfferingStatusEnum.ACTIVE,
          deleted: false,
        },
      },
      {
        $group: {
          _id: '$facilityId',
          matchedAmenities: { $addToSet: '$amenityId' },
        },
      },
    ];

    if (matchAll) {
      pipeline.push({
        $match: {
          $expr: {
            $gte: [{ $size: '$matchedAmenities' }, amenityObjectIds.length],
          },
        },
      });
    }

    const results = await this.offering.aggregate<{ _id: Types.ObjectId }>(
      pipeline
    );
    return results.map((r) => r._id.toString());
  }

  async getOfferingSummaryByFacilityId(facilityId: string): Promise<{
    totalOfferings: number;
    totalQuantity: number;
    inUseQuantity: number;
    availableQuantity: number;
    outOfStockOfferingsCount: number;
  }> {
    const results = await this.offering.aggregate<{
      totalOfferings: number;
      totalQuantity: number;
      inUseQuantity: number;
      availableQuantity: number;
      outOfStockOfferingsCount: number;
    }>([
      {
        $match: {
          facilityId: new Types.ObjectId(facilityId),
          deleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalOfferings: { $sum: 1 },
          totalQuantity: { $sum: '$totalQuantity' },
          inUseQuantity: { $sum: '$inUseQuantity' },
          availableQuantity: {
            $sum: { $subtract: ['$totalQuantity', '$inUseQuantity'] },
          },
          outOfStockOfferingsCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    {
                      $eq: [
                        '$status',
                        FacilityAmenityOfferingStatusEnum.OUT_OF_STOCK,
                      ],
                    },
                    {
                      $lte: [
                        { $subtract: ['$totalQuantity', '$inUseQuantity'] },
                        0,
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    if (results.length === 0) {
      return {
        totalOfferings: 0,
        totalQuantity: 0,
        inUseQuantity: 0,
        availableQuantity: 0,
        outOfStockOfferingsCount: 0,
      };
    }

    return results[0];
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
