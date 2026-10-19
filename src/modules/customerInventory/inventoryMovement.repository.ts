import { type ClientSession, type FilterQuery, type Model } from 'mongoose';
import type { IInventoryMovement } from './inventoryMovement.model.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import type { MovementTypeEnum } from '../../common/enums/customerInventory.enum.ts';
import crypto from 'crypto';

export interface InventoryMovementQueryFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customerId?: string;
  contractId?: string;
  facilityId?: string;
  storageUnitId?: string;
  skuId?: string;
  rackTierId?: string;
  type?: MovementTypeEnum;
  startDate?: string | Date;
  endDate?: string | Date;
}

export class InventoryMovementRepository {
  constructor(private readonly movement: Model<IInventoryMovement>) {}

  async create(data: Partial<IInventoryMovement>, session?: ClientSession) {
    if (session) {
      const [created] = await this.movement.create([data], { session });
      return created;
    }
    return this.movement.create(data);
  }

  async findById(id: string, session?: ClientSession) {
    const query = this.movement
      .findById(id)
      .populate('customerId', 'name email phoneNumber')
      .populate('contractId', 'contractCode status startDate endDate')
      .populate('facilityId', 'name city address')
      .populate('storageUnitId', 'unitNumber floor zone status')
      .populate('skuId', 'skuCode name category barcode uom imageUrl')
      .populate('fromRackTierId', 'tierNumber tierCode status')
      .populate('toRackTierId', 'tierNumber tierCode status')
      .populate('performedBy', 'name email role');

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findByCode(code: string, session?: ClientSession) {
    const query = this.movement.findOne({
      movementCode: code.toUpperCase().trim(),
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async generateMovementCode(session?: ClientSession): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    let code = '';
    let exists = true;

    while (exists) {
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars
      code = `MOV-${dateStr}-${randomSuffix}`;
      const found = await this.findByCode(code, session);
      if (!found) {
        exists = false;
      }
    }

    return code;
  }

  async findPaginated(
    query: InventoryMovementQueryFilter = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IInventoryMovement>> {
    const filter: FilterQuery<IInventoryMovement> = {};

    if (query.customerId) filter.customerId = query.customerId;
    if (query.contractId) filter.contractId = query.contractId;
    if (query.facilityId) filter.facilityId = query.facilityId;
    if (query.storageUnitId) filter.storageUnitId = query.storageUnitId;
    if (query.skuId) filter.skuId = query.skuId;
    if (query.rackTierId) {
      filter.$or = [
        { fromRackTierId: query.rackTierId },
        { toRackTierId: query.rackTierId },
      ];
    }
    if (query.type) filter.type = query.type;

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.createdAt.$lte = new Date(query.endDate);
      }
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<IInventoryMovement>(this.movement, {
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
        {
          path: 'skuId',
          select: 'skuCode name category barcode uom imageUrl',
        },
        { path: 'fromRackTierId', select: 'tierNumber tierCode status' },
        { path: 'toRackTierId', select: 'tierNumber tierCode status' },
        { path: 'performedBy', select: 'name email role' },
      ],
    });
  }
}
