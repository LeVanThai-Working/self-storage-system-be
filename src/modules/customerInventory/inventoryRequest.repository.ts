import {
  Types,
  type ClientSession,
  type FilterQuery,
  type UpdateQuery,
} from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import {
  InventoryRequest,
  type IInventoryRequest,
} from './inventoryRequest.model.ts';
import {
  InventoryRequestTypeEnum,
  InventoryRequestStatusEnum,
} from '../../common/enums/customerInventory.enum.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';

export interface InventoryRequestQueryFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customerId?: string;
  facilityId?: string;
  contractId?: string;
  type?: InventoryRequestTypeEnum;
  status?: InventoryRequestStatusEnum;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export class InventoryRequestRepository {
  constructor(
    private readonly model: SoftDeleteModel<IInventoryRequest> = InventoryRequest
  ) {}

  async create(
    data: Partial<IInventoryRequest>,
    session?: ClientSession
  ): Promise<IInventoryRequest> {
    const docs = await this.model.create([data], { session });
    return docs[0];
  }

  async findById(
    id: string,
    session?: ClientSession
  ): Promise<IInventoryRequest | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const q = this.model
      .findById(id)
      .populate(
        'items.skuId',
        'skuCode name barcode uom volume weightKg imageUrl'
      )
      .populate('items.storageRackId', 'rackCode aisle bay zone')
      .populate('items.rackTierId', 'tierNumber maxWeightKg status')
      .populate('customerId', 'name email phoneNumber')
      .populate('facilityId', 'code name address')
      .populate('storageUnitId', 'unitNumber floor zone');
    if (session) q.session(session);
    return q.exec();
  }

  async findByRequestCode(
    requestCode: string,
    session?: ClientSession
  ): Promise<IInventoryRequest | null> {
    const q = this.model
      .findOne({ requestCode: requestCode.trim().toUpperCase() })
      .populate(
        'items.skuId',
        'skuCode name barcode uom volume weightKg imageUrl'
      )
      .populate('items.storageRackId', 'rackCode aisle bay zone')
      .populate('items.rackTierId', 'tierNumber maxWeightKg status')
      .populate('customerId', 'name email phoneNumber')
      .populate('facilityId', 'code name address')
      .populate('storageUnitId', 'unitNumber floor zone');
    if (session) q.session(session);
    return q.exec();
  }

  async findByPickupQrToken(
    token: string,
    session?: ClientSession
  ): Promise<IInventoryRequest | null> {
    const q = this.model
      .findOne({
        pickupQrToken: token.trim(),
        deleted: false,
      })
      .populate(
        'items.skuId',
        'skuCode name barcode uom volume weightKg imageUrl'
      )
      .populate('items.storageRackId', 'rackCode aisle bay zone')
      .populate('items.rackTierId', 'tierNumber maxWeightKg status')
      .populate('customerId', 'name email phoneNumber')
      .populate('facilityId', 'code name address')
      .populate('storageUnitId', 'unitNumber floor zone');
    if (session) q.session(session);
    return q.exec();
  }

  async findPendingByCustomerAndOtpHash(
    otpHash: string,
    requestCode?: string,
    session?: ClientSession
  ): Promise<IInventoryRequest | null> {
    const filter: FilterQuery<IInventoryRequest> = {
      otpHash,
      deleted: false,
    };
    if (requestCode) {
      filter.requestCode = requestCode.trim().toUpperCase();
    }
    const q = this.model
      .findOne(filter)
      .populate(
        'items.skuId',
        'skuCode name barcode uom volume weightKg imageUrl'
      )
      .populate('items.storageRackId', 'rackCode aisle bay zone')
      .populate('items.rackTierId', 'tierNumber maxWeightKg status')
      .populate('customerId', 'name email phoneNumber')
      .populate('facilityId', 'code name address')
      .populate('storageUnitId', 'unitNumber floor zone');
    if (session) q.session(session);
    return q.exec();
  }

  async updateById(
    id: string,
    update: UpdateQuery<IInventoryRequest>,
    session?: ClientSession
  ): Promise<IInventoryRequest | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const q = this.model.findByIdAndUpdate(id, update, { new: true });
    if (session) q.session(session);
    return q.exec();
  }

  async conditionalUpdateStatus(
    id: string,
    expectedStatus: InventoryRequestStatusEnum | InventoryRequestStatusEnum[],
    newStatus: InventoryRequestStatusEnum,
    additionalUpdates: UpdateQuery<IInventoryRequest> = {},
    session?: ClientSession
  ): Promise<IInventoryRequest | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const statusFilter = Array.isArray(expectedStatus)
      ? { $in: expectedStatus }
      : expectedStatus;

    const q = this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), status: statusFilter, deleted: false },
      { $set: { status: newStatus, ...additionalUpdates } },
      { new: true }
    );
    if (session) q.session(session);
    return q.exec();
  }

  async findPendingConfirmationOlderThan(
    thresholdDate: Date,
    session?: ClientSession
  ): Promise<IInventoryRequest[]> {
    const q = this.model.find({
      type: InventoryRequestTypeEnum.INBOUND,
      status: InventoryRequestStatusEnum.PENDING_CUSTOMER_CONFIRMATION,
      createdAt: { $lte: thresholdDate },
      deleted: false,
    });
    if (session) q.session(session);
    return q.exec();
  }

  async countRequestsToday(
    type: InventoryRequestTypeEnum,
    session?: ClientSession
  ): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const q = this.model.countDocuments({
      type,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });
    if (session) q.session(session);
    return q.exec();
  }

  async findPaginated(
    query: InventoryRequestQueryFilter
  ): Promise<PaginateResult<IInventoryRequest>> {
    const filter: FilterQuery<IInventoryRequest> = { deleted: false };

    if (query.customerId && Types.ObjectId.isValid(query.customerId)) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.facilityId && Types.ObjectId.isValid(query.facilityId)) {
      filter.facilityId = new Types.ObjectId(query.facilityId);
    }
    if (query.contractId && Types.ObjectId.isValid(query.contractId)) {
      filter.contractId = new Types.ObjectId(query.contractId);
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }
    if (query.search) {
      filter.requestCode = { $regex: query.search.trim(), $options: 'i' };
    }

    return paginate<IInventoryRequest>(this.model, {
      page: query.page || 1,
      limit: query.limit || 10,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
      filter,
      populate: [
        {
          path: 'items.skuId',
          select: 'skuCode name barcode uom volume weightKg imageUrl',
        },
        { path: 'items.storageRackId', select: 'rackCode aisle bay zone' },
        { path: 'items.rackTierId', select: 'tierNumber maxWeightKg status' },
        { path: 'customerId', select: 'name email phoneNumber' },
        { path: 'facilityId', select: 'code name address' },
        { path: 'storageUnitId', select: 'unitNumber floor zone' },
      ],
    });
  }
}
