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

  async incrementQuantity(id: string, delta: number, session?: ClientSession) {
    const query = this.inventory.findByIdAndUpdate(
      id,
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
   * Tính tổng tồn kho của SKU trên toàn hệ thống (hoặc theo filter)
   * Phục vụ Rule 613: Chặn xóa SKU khi còn tồn kho
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
   * Đếm tổng số lượng hàng (tất cả các SKU) đang nằm trên một tầng kệ cụ thể
   * Phục vụ State Machine của RackTier (AVAILABLE <-> OCCUPIED)
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
}
