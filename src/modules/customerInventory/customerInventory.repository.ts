import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { ICustomerInventory } from './customerInventory.model.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';

export interface CustomerInventoryQueryFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customerId?: string;
  contractId?: string;
  facilityId?: string;
  storageUnitId?: string;
  storageRackId?: string;
  rackTierId?: string;
  skuId?: string;
  minQuantity?: number;
}

export class CustomerInventoryRepository {
  constructor(
    private readonly inventory: SoftDeleteModel<ICustomerInventory>
  ) {}

  async create(data: Partial<ICustomerInventory>, session?: ClientSession) {
    if (session) {
      const [created] = await this.inventory.create([data], { session });
      return created;
    }
    return this.inventory.create(data);
  }

  async findById(id: string, session?: ClientSession) {
    const query = this.inventory
      .findById(id)
      .populate('customerId', 'name email phoneNumber')
      .populate('contractId', 'contractCode status startDate endDate')
      .populate('facilityId', 'name city address')
      .populate('storageUnitId', 'unitNumber floor zone status')
      .populate('storageRackId', 'rackCode name status')
      .populate('rackTierId', 'tierNumber tierCode maxWeightKg status')
      .populate(
        'skuId',
        'skuCode name category barcode uom dimensions volume weightKg imageUrl status'
      );

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findByPosition(
    contractId: string | Types.ObjectId,
    skuId: string | Types.ObjectId,
    storageUnitId: string | Types.ObjectId,
    rackTierId?: string | Types.ObjectId | null,
    session?: ClientSession
  ) {
    const filter: FilterQuery<ICustomerInventory> = {
      contractId,
      skuId,
      storageUnitId,
      rackTierId: rackTierId || null,
    };

    const query = this.inventory.findOne(filter);
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async updateQuantity(id: string, quantity: number, session?: ClientSession) {
    const query = this.inventory.findByIdAndUpdate(
      id,
      {
        $set: {
          quantity,
          lastMovementAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Atomically increment or decrement inventory quantity.
   * When delta < 0 (stock out / transfer), applies Atomic Guard { quantity: { $gte: Math.abs(delta) } }
   * to prevent race conditions resulting in negative inventory. Returns null if stock is insufficient.
   */
  async incrementQuantity(id: string, delta: number, session?: ClientSession) {
    const filter: FilterQuery<ICustomerInventory> = {
      _id: new Types.ObjectId(id),
    };
    if (delta < 0) {
      filter.quantity = { $gte: Math.abs(delta) };
    }

    const query = this.inventory.findOneAndUpdate(
      filter,
      {
        $inc: { quantity: delta },
        $set: { lastMovementAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Calculate total inventory quantity of an SKU across the system (or filtered by query).
   * Supports Rule 613: Prevent deleting SKU when stock still exists.
   */
  async sumQuantityBySkuId(
    skuId: string,
    session?: ClientSession
  ): Promise<number> {
    const pipeline = [
      {
        $match: {
          skuId: new Types.ObjectId(skuId),
          deleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$quantity' },
        },
      },
    ];

    const result = session
      ? await this.inventory.aggregate(pipeline).session(session)
      : await this.inventory.aggregate(pipeline);

    return result[0]?.total || 0;
  }

  /**
   * Count the number of active inventory items (quantity > 0) on a specific rack tier.
   * Prevents multi-SKU algebraic cancellation.
   * A rack tier is truly empty (AVAILABLE) only when this count equals 0.
   */
  async countActiveItemsOnTier(
    rackTierId: string,
    session?: ClientSession
  ): Promise<number> {
    const query = this.inventory.countDocuments({
      rackTierId: new Types.ObjectId(rackTierId),
      quantity: { $gt: 0 },
      deleted: { $ne: true },
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Count inventory rows that still hold goods (quantity > 0) for a contract.
   * Used to block check-out / unit change while customer goods remain.
   */
  async countRemainingByContract(
    contractId: string,
    session?: ClientSession
  ): Promise<number> {
    const query = this.inventory.countDocuments({
      contractId: new Types.ObjectId(contractId),
      quantity: { $gt: 0 },
      deleted: { $ne: true },
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Count inventory rows that still hold goods (quantity > 0) inside a storage unit.
   * Used to block re-opening (AVAILABLE) a unit while customer goods remain.
   */
  async countRemainingByStorageUnit(
    storageUnitId: string,
    session?: ClientSession
  ): Promise<number> {
    const query = this.inventory.countDocuments({
      storageUnitId: new Types.ObjectId(storageUnitId),
      quantity: { $gt: 0 },
      deleted: { $ne: true },
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Count total item quantity (across all SKUs) located on a specific rack tier.
   * Supports RackTier State Machine transitions (AVAILABLE <-> OCCUPIED).
   */
  async countTotalItemsOnTier(
    rackTierId: string,
    session?: ClientSession
  ): Promise<number> {
    const pipeline = [
      {
        $match: {
          rackTierId: new Types.ObjectId(rackTierId),
          deleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$quantity' },
        },
      },
    ];

    const result = session
      ? await this.inventory.aggregate(pipeline).session(session)
      : await this.inventory.aggregate(pipeline);

    return result[0]?.total || 0;
  }

  async findPaginated(
    query: CustomerInventoryQueryFilter = {
      page: 1,
      limit: 10,
      sortBy: 'lastMovementAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<ICustomerInventory>> {
    const filter: FilterQuery<ICustomerInventory> = {};

    if (query.customerId) filter.customerId = query.customerId;
    if (query.contractId) filter.contractId = query.contractId;
    if (query.facilityId) filter.facilityId = query.facilityId;
    if (query.storageUnitId) filter.storageUnitId = query.storageUnitId;
    if (query.storageRackId) filter.storageRackId = query.storageRackId;
    if (query.rackTierId) filter.rackTierId = query.rackTierId;
    if (query.skuId) filter.skuId = query.skuId;
    if (query.minQuantity !== undefined) {
      filter.quantity = { $gte: query.minQuantity };
    } else {
      filter.quantity = { $gt: 0 };
    }

    const sortBy = query.sortBy || 'lastMovementAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<ICustomerInventory>(this.inventory, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
      populate: [
        { path: 'customerId', select: 'name email phoneNumber' },
        { path: 'contractId', select: 'contractCode status startDate endDate' },
        { path: 'facilityId', select: 'name city address' },
        { path: 'storageUnitId', select: 'unitNumber floor zone status' },
        { path: 'storageRackId', select: 'rackCode name status' },
        {
          path: 'rackTierId',
          select: 'tierNumber tierCode maxWeightKg status',
        },
        {
          path: 'skuId',
          select:
            'skuCode name category barcode uom dimensions volume weightKg imageUrl status',
        },
      ],
    });
  }

  /**
   * Retrieve all items in a storage unit (for rendering storage unit hierarchy tree).
   */
  async findItemsByStorageUnitId(
    storageUnitId: string,
    session?: ClientSession
  ) {
    const query = this.inventory
      .find({
        storageUnitId: new Types.ObjectId(storageUnitId),
        quantity: { $gt: 0 },
        deleted: { $ne: true },
      })
      .populate(
        'skuId',
        'skuCode name category barcode uom dimensions volume weightKg imageUrl status'
      )
      .populate('rackTierId', 'tierNumber tierCode maxWeightKg status')
      .populate('storageRackId', 'rackCode name status')
      .populate('contractId', 'contractCode status customerId')
      .populate('customerId', 'name email phoneNumber');

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Look up all storage locations of a specific SKU.
   */
  async findLocationsBySkuId(
    skuId: string,
    customerId?: string,
    session?: ClientSession
  ) {
    const filter: FilterQuery<ICustomerInventory> = {
      skuId: new Types.ObjectId(skuId),
      quantity: { $gt: 0 },
      deleted: { $ne: true },
    };
    if (customerId) {
      filter.customerId = new Types.ObjectId(customerId);
    }

    const query = this.inventory
      .find(filter)
      .populate('facilityId', 'name city address')
      .populate('contractId', 'contractCode status startDate endDate')
      .populate('storageUnitId', 'unitNumber floor zone status')
      .populate('storageRackId', 'rackCode name status')
      .populate('rackTierId', 'tierNumber tierCode maxWeightKg status')
      .sort({ lastMovementAt: -1 });

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Aggregate category breakdown statistics for the customer dashboard.
   */
  async getDashboardCategoryBreakdown(
    customerId: string,
    session?: ClientSession
  ): Promise<
    Array<{ category: string; skuCount: number; totalQuantity: number }>
  > {
    const pipeline = [
      {
        $match: {
          customerId: new Types.ObjectId(customerId),
          quantity: { $gt: 0 },
          deleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: 'customerskus',
          localField: 'skuId',
          foreignField: '_id',
          as: 'sku',
        },
      },
      { $unwind: '$sku' },
      {
        $group: {
          _id: { $ifNull: ['$sku.category', 'Khác'] },
          skuIds: { $addToSet: '$skuId' },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          skuCount: { $size: '$skuIds' },
          totalQuantity: 1,
        },
      },
      { $sort: { totalQuantity: -1 as const } },
    ];

    return session
      ? this.inventory.aggregate(pipeline).session(session)
      : this.inventory.aggregate(pipeline);
  }

  /**
   * Count the number of distinct storage units currently storing customer items.
   */
  async countDistinctStorageUnits(
    customerId: string,
    session?: ClientSession
  ): Promise<number> {
    const pipeline = [
      {
        $match: {
          customerId: new Types.ObjectId(customerId),
          quantity: { $gt: 0 },
          deleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: '$storageUnitId',
        },
      },
      {
        $count: 'total',
      },
    ];

    const result = session
      ? await this.inventory.aggregate(pipeline).session(session)
      : await this.inventory.aggregate(pipeline);

    return result[0]?.total || 0;
  }
}
