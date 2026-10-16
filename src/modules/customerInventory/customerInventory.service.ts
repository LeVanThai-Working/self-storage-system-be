import { Types, type ClientSession } from 'mongoose';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { ContractStatusEnum } from '../../common/enums/contract.enum.ts';
import { MovementTypeEnum } from '../../common/enums/customerInventory.enum.ts';
import { RackTierStatusEnum } from '../../common/enums/storageRack.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { CustomerInventoryRepository } from './customerInventory.repository.ts';
import type { InventoryMovementRepository } from './inventoryMovement.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { CustomerSkuRepository } from '../customerSku/customerSku.repository.ts';
import type { StorageRackRepository } from '../storageRack/storageRack.repository.ts';
import type { RackTierRepository } from '../storageRack/rackTier.repository.ts';
import type { ICustomerInventory } from './customerInventory.model.ts';
import type { IInventoryMovement } from './inventoryMovement.model.ts';
import {
  customerInventoryResponseSchema,
  paginatedCustomerInventoryResponseSchema,
  paginatedInventoryMovementResponseSchema,
  type CustomerInventoryResponse,
  type PaginatedCustomerInventoryResponse,
  type PaginatedInventoryMovementResponse,
} from './schemas/customerInventory.response.schema.ts';
import type {
  CustomerInventoryQuery,
  InventoryMovementQuery,
  StockAdjustRequest,
  StockInRequest,
  StockMoveRequest,
  StockOutRequest,
} from './schemas/customerInventory.request.schema.ts';

export interface CallerContext {
  id: string;
  role?: string;
}

interface PopulatedRef {
  _id?: Types.ObjectId | string;
  name?: string;
  email?: string | null;
  phoneNumber?: string | null;
  contractCode?: string;
  status?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  city?: string | null;
  address?: string | null;
  unitNumber?: string;
  floor?: number | null;
  zone?: string | null;
  rackCode?: string;
  tierNumber?: number;
  tierCode?: string;
  maxWeightKg?: number | null;
  skuCode?: string;
  category?: string | null;
  barcode?: string | null;
  uom?: string;
  imageUrl?: string | null;
  role?: string | null;
}

interface FormattableInventory {
  _id: Types.ObjectId | string;
  customerId: PopulatedRef | Types.ObjectId | string;
  contractId: PopulatedRef | Types.ObjectId | string;
  facilityId: PopulatedRef | Types.ObjectId | string;
  storageUnitId: PopulatedRef | Types.ObjectId | string;
  storageRackId?: PopulatedRef | Types.ObjectId | string | null;
  rackTierId?: PopulatedRef | Types.ObjectId | string | null;
  skuId: PopulatedRef | Types.ObjectId | string;
  quantity: number;
  lastMovementAt: Date | string;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface FormattableMovement {
  _id: Types.ObjectId | string;
  movementCode: string;
  type: MovementTypeEnum;
  customerInventoryId?: PopulatedRef | Types.ObjectId | string | null;
  customerId: PopulatedRef | Types.ObjectId | string;
  contractId: PopulatedRef | Types.ObjectId | string;
  facilityId: PopulatedRef | Types.ObjectId | string;
  storageUnitId: PopulatedRef | Types.ObjectId | string;
  skuId: PopulatedRef | Types.ObjectId | string;
  fromRackTierId?: PopulatedRef | Types.ObjectId | string | null;
  toRackTierId?: PopulatedRef | Types.ObjectId | string | null;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  performedBy: PopulatedRef | Types.ObjectId | string;
  reason?: string | null;
  referenceCode?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function toId(ref: unknown): string {
  if (typeof ref === 'object' && ref !== null && '_id' in ref) {
    return String((ref as { _id: unknown })._id);
  }
  return String(ref || '');
}

function toPopulated(ref: unknown): PopulatedRef | null {
  if (typeof ref === 'object' && ref !== null && '_id' in ref) {
    return ref as PopulatedRef;
  }
  return null;
}

export class CustomerInventoryService {
  constructor(
    private readonly inventoryRepository: CustomerInventoryRepository,
    private readonly movementRepository: InventoryMovementRepository,
    private readonly contractRepository: ContractRepository,
    private readonly skuRepository: CustomerSkuRepository,
    private readonly storageRackRepository: StorageRackRepository,
    private readonly rackTierRepository: RackTierRepository,
    private readonly auditLogService?: AuditLogService
  ) {}

  /**
   * Kiểm tra quyền truy cập:
   * - Mutations (IN, OUT, MOVE, ADJUST):
   *   + Chặn tuyệt đối FACILITY_STAFF và FACILITY_MANAGER (ném 403)
   *   + Chỉ cho phép CUSTOMER (sở hữu kho) hoặc Admin hệ thống
   */
  private validatePrivacy(caller: CallerContext, isMutation = false): void {
    if (isMutation) {
      if (
        caller.role === RoleEnum.FACILITY_STAFF ||
        caller.role === RoleEnum.FACILITY_MANAGER
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }
  }

  /**
   * Helper xác thực tính hợp lệ của Hợp đồng, SKU và Tầng kệ
   */
  private async validateEntities(
    contractId: string,
    skuId: string,
    rackTierId: string | null | undefined,
    caller: CallerContext,
    session?: ClientSession
  ) {
    // 1. Kiểm tra Hợp đồng
    const contract = await this.contractRepository.findById(
      contractId,
      session
    );
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    // Bắt buộc hợp đồng phải đang ACTIVE
    if (contract.status !== ContractStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_622);
    }

    // Kiểm tra quyền sở hữu Hợp đồng nếu là CUSTOMER
    const contractCustomerId = String(
      contract.customerId?._id || contract.customerId
    );
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (isCustomer && contractCustomerId !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    // 2. Kiểm tra SKU
    const sku = await this.skuRepository.findById(skuId);
    if (!sku) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    // SKU phải thuộc về khách hàng của hợp đồng
    const skuCustomerId = String(sku.customerId?._id || sku.customerId);
    if (skuCustomerId !== contractCustomerId) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_628);
    }

    // 3. Trích xuất thông tin phòng và cơ sở
    const storageUnitId = String(
      contract.storageUnitId?._id || contract.storageUnitId
    );
    const facilityId = String(contract.facilityId?._id || contract.facilityId);

    // 4. Kiểm tra Tầng kệ nếu có chỉ định
    let storageRackId: string | null = null;
    if (rackTierId) {
      const tier = await this.rackTierRepository.findById(rackTierId);
      if (!tier) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_601);
      }

      // Tầng kệ phải thuộc đúng phòng kho của hợp đồng
      if (toId(tier.storageUnitId) !== storageUnitId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_624);
      }

      // Tầng kệ không được ở trạng thái INACTIVE hoặc MAINTENANCE
      if (
        tier.status === RackTierStatusEnum.INACTIVE ||
        tier.status === RackTierStatusEnum.MAINTENANCE
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_625);
      }

      storageRackId = toId(tier.storageRackId);
    }

    return {
      contract,
      sku,
      contractCustomerId,
      storageUnitId,
      facilityId,
      storageRackId,
    };
  }

  /**
   * 1. Nhập hàng vào kho/tầng kệ (IN)
   */
  @Transactional()
  async stockIn(
    data: StockInRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<CustomerInventoryResponse> {
    this.validatePrivacy(caller, true);

    const { contractCustomerId, storageUnitId, facilityId, storageRackId } =
      await this.validateEntities(
        data.contractId,
        data.skuId,
        data.rackTierId,
        caller,
        session
      );

    // 1. Tìm hoặc tạo bản ghi CustomerInventory tại vị trí
    const existing = await this.inventoryRepository.findByPosition(
      data.contractId,
      data.skuId,
      storageUnitId,
      data.rackTierId || null,
      session
    );

    let inventoryId: string;
    let previousQuantity = 0;
    let newQuantity = data.quantity;

    if (!existing) {
      const created = await this.inventoryRepository.create(
        {
          customerId: new Types.ObjectId(contractCustomerId),
          contractId: new Types.ObjectId(data.contractId),
          facilityId: new Types.ObjectId(facilityId),
          storageUnitId: new Types.ObjectId(storageUnitId),
          storageRackId: storageRackId
            ? new Types.ObjectId(storageRackId)
            : null,
          rackTierId: data.rackTierId
            ? new Types.ObjectId(data.rackTierId)
            : null,
          skuId: new Types.ObjectId(data.skuId),
          quantity: data.quantity,
          lastMovementAt: new Date(),
          notes: data.notes?.trim() || null,
        },
        session
      );
      inventoryId = String(created._id);
    } else {
      previousQuantity = existing.quantity;
      newQuantity = existing.quantity + data.quantity;
      inventoryId = String(existing._id);
      await this.inventoryRepository.incrementQuantity(
        inventoryId,
        data.quantity,
        session
      );
    }

    // 2. Ghi nhận sổ cái InventoryMovement
    const movementCode =
      await this.movementRepository.generateMovementCode(session);
    await this.movementRepository.create(
      {
        movementCode,
        type: MovementTypeEnum.IN,
        customerInventoryId: new Types.ObjectId(inventoryId),
        customerId: new Types.ObjectId(contractCustomerId),
        contractId: new Types.ObjectId(data.contractId),
        facilityId: new Types.ObjectId(facilityId),
        storageUnitId: new Types.ObjectId(storageUnitId),
        skuId: new Types.ObjectId(data.skuId),
        fromRackTierId: null,
        toRackTierId: data.rackTierId
          ? new Types.ObjectId(data.rackTierId)
          : null,
        quantity: data.quantity,
        previousQuantity,
        newQuantity,
        performedBy: new Types.ObjectId(caller.id),
        referenceCode: data.referenceCode?.trim() || null,
        notes: data.notes?.trim() || null,
      },
      session
    );

    // 3. Cập nhật State Machine cho Tầng kệ -> OCCUPIED
    if (data.rackTierId) {
      await this.rackTierRepository.update(
        data.rackTierId,
        { status: RackTierStatusEnum.OCCUPIED },
        session
      );
    }

    // 4. Ghi Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.INVENTORY_IN,
      resourceType: AuditResourceEnum.CUSTOMER_INVENTORY,
      resourceId: inventoryId,
      after: {
        movementCode,
        type: MovementTypeEnum.IN,
        quantity: data.quantity,
        previousQuantity,
        newQuantity,
      },
    });

    const populated = await this.inventoryRepository.findById(
      inventoryId,
      session
    );
    return validateResponse(
      customerInventoryResponseSchema,
      this.formatInventory(populated!)
    );
  }

  /**
   * 2. Xuất hàng khỏi kho/tầng kệ (OUT)
   */
  @Transactional()
  async stockOut(
    data: StockOutRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<CustomerInventoryResponse> {
    this.validatePrivacy(caller, true);

    const { contractCustomerId, storageUnitId, facilityId } =
      await this.validateEntities(
        data.contractId,
        data.skuId,
        data.rackTierId,
        caller,
        session
      );

    const existing = await this.inventoryRepository.findByPosition(
      data.contractId,
      data.skuId,
      storageUnitId,
      data.rackTierId || null,
      session
    );

    if (!existing || existing.quantity < data.quantity) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_621);
    }

    const inventoryId = String(existing._id);
    const previousQuantity = existing.quantity;
    const newQuantity = existing.quantity - data.quantity;

    // 1. Giảm số lượng tồn kho
    await this.inventoryRepository.incrementQuantity(
      inventoryId,
      -data.quantity,
      session
    );

    // 2. Ghi nhận sổ cái InventoryMovement
    const movementCode =
      await this.movementRepository.generateMovementCode(session);
    await this.movementRepository.create(
      {
        movementCode,
        type: MovementTypeEnum.OUT,
        customerInventoryId: new Types.ObjectId(inventoryId),
        customerId: new Types.ObjectId(contractCustomerId),
        contractId: new Types.ObjectId(data.contractId),
        facilityId: new Types.ObjectId(facilityId),
        storageUnitId: new Types.ObjectId(storageUnitId),
        skuId: new Types.ObjectId(data.skuId),
        fromRackTierId: data.rackTierId
          ? new Types.ObjectId(data.rackTierId)
          : null,
        toRackTierId: null,
        quantity: data.quantity,
        previousQuantity,
        newQuantity,
        performedBy: new Types.ObjectId(caller.id),
        reason: data.reason?.trim() || null,
        referenceCode: data.referenceCode?.trim() || null,
        notes: data.notes?.trim() || null,
      },
      session
    );

    // 3. Cập nhật State Machine cho Tầng kệ -> Nếu hết hàng thì về AVAILABLE
    if (data.rackTierId) {
      const remainingOnTier =
        await this.inventoryRepository.countTotalItemsOnTier(
          data.rackTierId,
          session
        );
      if (remainingOnTier <= 0) {
        await this.rackTierRepository.update(
          data.rackTierId,
          { status: RackTierStatusEnum.AVAILABLE },
          session
        );
      }
    }

    // 4. Ghi Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.INVENTORY_OUT,
      resourceType: AuditResourceEnum.CUSTOMER_INVENTORY,
      resourceId: inventoryId,
      after: {
        movementCode,
        type: MovementTypeEnum.OUT,
        quantity: data.quantity,
        previousQuantity,
        newQuantity,
      },
    });

    const populated = await this.inventoryRepository.findById(
      inventoryId,
      session
    );
    return validateResponse(
      customerInventoryResponseSchema,
      this.formatInventory(populated!)
    );
  }

  /**
   * 3. Chuyển vị trí nội bộ giữa các tầng kệ (MOVE)
   */
  @Transactional()
  async stockMove(
    data: StockMoveRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<CustomerInventoryResponse> {
    this.validatePrivacy(caller, true);

    const fromTierId = data.fromRackTierId || null;
    const toTierId = data.toRackTierId || null;

    if (fromTierId === toTierId) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_627);
    }

    // Xác thực tầng nguồn
    const { contractCustomerId, storageUnitId, facilityId } =
      await this.validateEntities(
        data.contractId,
        data.skuId,
        fromTierId,
        caller,
        session
      );

    // Xác thực tầng đích nếu có chỉ định
    let toStorageRackId: string | null = null;
    if (toTierId) {
      const destTier = await this.rackTierRepository.findById(toTierId);
      if (!destTier) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_601);
      }
      if (toId(destTier.storageUnitId) !== storageUnitId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_624);
      }
      if (
        destTier.status === RackTierStatusEnum.INACTIVE ||
        destTier.status === RackTierStatusEnum.MAINTENANCE
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_625);
      }
      toStorageRackId = toId(destTier.storageRackId);
    }

    // Kiểm tra số lượng tồn tại vị trí nguồn
    const sourceInventory = await this.inventoryRepository.findByPosition(
      data.contractId,
      data.skuId,
      storageUnitId,
      fromTierId,
      session
    );

    if (!sourceInventory || sourceInventory.quantity < data.quantity) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_621);
    }

    const fromPrev = sourceInventory.quantity;
    const fromNew = sourceInventory.quantity - data.quantity;

    // 1. Trừ tồn tại vị trí nguồn
    await this.inventoryRepository.incrementQuantity(
      String(sourceInventory._id),
      -data.quantity,
      session
    );

    // 2. Cộng tồn tại vị trí đích
    const destInventory = await this.inventoryRepository.findByPosition(
      data.contractId,
      data.skuId,
      storageUnitId,
      toTierId,
      session
    );

    let destInventoryId: string;
    if (!destInventory) {
      const createdDest = await this.inventoryRepository.create(
        {
          customerId: new Types.ObjectId(contractCustomerId),
          contractId: new Types.ObjectId(data.contractId),
          facilityId: new Types.ObjectId(facilityId),
          storageUnitId: new Types.ObjectId(storageUnitId),
          storageRackId: toStorageRackId
            ? new Types.ObjectId(toStorageRackId)
            : null,
          rackTierId: toTierId ? new Types.ObjectId(toTierId) : null,
          skuId: new Types.ObjectId(data.skuId),
          quantity: data.quantity,
          lastMovementAt: new Date(),
          notes: data.notes?.trim() || null,
        },
        session
      );
      destInventoryId = String(createdDest._id);
    } else {
      destInventoryId = String(destInventory._id);
      await this.inventoryRepository.incrementQuantity(
        destInventoryId,
        data.quantity,
        session
      );
    }

    // 3. Ghi nhận sổ cái InventoryMovement
    const movementCode =
      await this.movementRepository.generateMovementCode(session);
    await this.movementRepository.create(
      {
        movementCode,
        type: MovementTypeEnum.MOVE,
        customerInventoryId: new Types.ObjectId(destInventoryId),
        customerId: new Types.ObjectId(contractCustomerId),
        contractId: new Types.ObjectId(data.contractId),
        facilityId: new Types.ObjectId(facilityId),
        storageUnitId: new Types.ObjectId(storageUnitId),
        skuId: new Types.ObjectId(data.skuId),
        fromRackTierId: fromTierId ? new Types.ObjectId(fromTierId) : null,
        toRackTierId: toTierId ? new Types.ObjectId(toTierId) : null,
        quantity: data.quantity,
        previousQuantity: fromPrev,
        newQuantity: fromNew,
        performedBy: new Types.ObjectId(caller.id),
        reason: data.reason?.trim() || null,
        notes: data.notes?.trim() || null,
      },
      session
    );

    // 4. Đồng bộ State Machine tầng kệ
    if (fromTierId) {
      const remainingOnSource =
        await this.inventoryRepository.countTotalItemsOnTier(
          fromTierId,
          session
        );
      if (remainingOnSource <= 0) {
        await this.rackTierRepository.update(
          fromTierId,
          { status: RackTierStatusEnum.AVAILABLE },
          session
        );
      }
    }

    if (toTierId) {
      await this.rackTierRepository.update(
        toTierId,
        { status: RackTierStatusEnum.OCCUPIED },
        session
      );
    }

    // 5. Ghi Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.INVENTORY_MOVE,
      resourceType: AuditResourceEnum.CUSTOMER_INVENTORY,
      resourceId: destInventoryId,
      after: {
        movementCode,
        type: MovementTypeEnum.MOVE,
        fromTierId,
        toTierId,
        quantity: data.quantity,
      },
    });

    const populatedDest = await this.inventoryRepository.findById(
      destInventoryId,
      session
    );
    return validateResponse(
      customerInventoryResponseSchema,
      this.formatInventory(populatedDest!)
    );
  }

  /**
   * 4. Kiểm kê / Điều chỉnh tồn kho (ADJUST)
   */
  @Transactional()
  async stockAdjust(
    data: StockAdjustRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<CustomerInventoryResponse> {
    this.validatePrivacy(caller, true);

    const { contractCustomerId, storageUnitId, facilityId, storageRackId } =
      await this.validateEntities(
        data.contractId,
        data.skuId,
        data.rackTierId,
        caller,
        session
      );

    const existing = await this.inventoryRepository.findByPosition(
      data.contractId,
      data.skuId,
      storageUnitId,
      data.rackTierId || null,
      session
    );

    let inventoryId: string;
    let previousQuantity = 0;
    const newQuantity = data.newQuantity;

    if (!existing) {
      const created = await this.inventoryRepository.create(
        {
          customerId: new Types.ObjectId(contractCustomerId),
          contractId: new Types.ObjectId(data.contractId),
          facilityId: new Types.ObjectId(facilityId),
          storageUnitId: new Types.ObjectId(storageUnitId),
          storageRackId: storageRackId
            ? new Types.ObjectId(storageRackId)
            : null,
          rackTierId: data.rackTierId
            ? new Types.ObjectId(data.rackTierId)
            : null,
          skuId: new Types.ObjectId(data.skuId),
          quantity: newQuantity,
          lastMovementAt: new Date(),
          notes: data.notes?.trim() || null,
        },
        session
      );
      inventoryId = String(created._id);
    } else {
      previousQuantity = existing.quantity;
      inventoryId = String(existing._id);
      await this.inventoryRepository.updateQuantity(
        inventoryId,
        newQuantity,
        session
      );
    }

    const deltaQuantity = Math.abs(newQuantity - previousQuantity);

    // 2. Ghi nhận sổ cái InventoryMovement
    const movementCode =
      await this.movementRepository.generateMovementCode(session);
    await this.movementRepository.create(
      {
        movementCode,
        type: MovementTypeEnum.ADJUST,
        customerInventoryId: new Types.ObjectId(inventoryId),
        customerId: new Types.ObjectId(contractCustomerId),
        contractId: new Types.ObjectId(data.contractId),
        facilityId: new Types.ObjectId(facilityId),
        storageUnitId: new Types.ObjectId(storageUnitId),
        skuId: new Types.ObjectId(data.skuId),
        fromRackTierId: data.rackTierId
          ? new Types.ObjectId(data.rackTierId)
          : null,
        toRackTierId: data.rackTierId
          ? new Types.ObjectId(data.rackTierId)
          : null,
        quantity: deltaQuantity || 1,
        previousQuantity,
        newQuantity,
        performedBy: new Types.ObjectId(caller.id),
        reason: data.reason.trim(),
        notes: data.notes?.trim() || null,
      },
      session
    );

    // 3. Cập nhật State Machine cho Tầng kệ
    if (data.rackTierId) {
      const remainingOnTier =
        await this.inventoryRepository.countTotalItemsOnTier(
          data.rackTierId,
          session
        );
      if (remainingOnTier <= 0) {
        await this.rackTierRepository.update(
          data.rackTierId,
          { status: RackTierStatusEnum.AVAILABLE },
          session
        );
      } else {
        await this.rackTierRepository.update(
          data.rackTierId,
          { status: RackTierStatusEnum.OCCUPIED },
          session
        );
      }
    }

    // 4. Ghi Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.INVENTORY_ADJUST,
      resourceType: AuditResourceEnum.CUSTOMER_INVENTORY,
      resourceId: inventoryId,
      after: {
        movementCode,
        type: MovementTypeEnum.ADJUST,
        previousQuantity,
        newQuantity,
        reason: data.reason,
      },
    });

    const populated = await this.inventoryRepository.findById(
      inventoryId,
      session
    );
    return validateResponse(
      customerInventoryResponseSchema,
      this.formatInventory(populated!)
    );
  }

  /**
   * 5. Tra cứu danh sách tồn kho hiện hành
   */
  async findAllInventories(
    query: CustomerInventoryQuery,
    caller: CallerContext
  ): Promise<PaginatedCustomerInventoryResponse> {
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const enforcedQuery = { ...query };

    // Khách hàng chỉ xem tồn kho của chính mình
    if (isCustomer) {
      enforcedQuery.customerId = caller.id;
    }

    const result = await this.inventoryRepository.findPaginated(enforcedQuery);

    return validateResponse(paginatedCustomerInventoryResponseSchema, {
      items: result.items.map((item) => this.formatInventory(item)),
      pagination: result.pagination,
    });
  }

  /**
   * 6. Chi tiết 1 bản ghi tồn kho
   */
  async findInventoryById(
    id: string,
    caller: CallerContext
  ): Promise<CustomerInventoryResponse> {
    const item = await this.inventoryRepository.findById(id);
    if (!item) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_620);
    }

    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const itemCustomerId = String(item.customerId?._id || item.customerId);
    if (isCustomer && itemCustomerId !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    return validateResponse(
      customerInventoryResponseSchema,
      this.formatInventory(item)
    );
  }

  /**
   * 7. Tra cứu nhật ký sổ cái biến động kho (InventoryMovement)
   */
  async findAllMovements(
    query: InventoryMovementQuery,
    caller: CallerContext
  ): Promise<PaginatedInventoryMovementResponse> {
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const enforcedQuery = { ...query };

    // Khách hàng chỉ xem lịch sử của chính mình
    if (isCustomer) {
      enforcedQuery.customerId = caller.id;
    }

    const result = await this.movementRepository.findPaginated(enforcedQuery);

    return validateResponse(paginatedInventoryMovementResponseSchema, {
      items: result.items.map((m) => this.formatMovement(m)),
      pagination: result.pagination,
    });
  }

  // --- Helper formatting ---
  private formatInventory(item: ICustomerInventory) {
    const doc = item as unknown as FormattableInventory;
    const cust = toPopulated(doc.customerId);
    const contract = toPopulated(doc.contractId);
    const facility = toPopulated(doc.facilityId);
    const unit = toPopulated(doc.storageUnitId);
    const rack = toPopulated(doc.storageRackId);
    const tier = toPopulated(doc.rackTierId);
    const sku = toPopulated(doc.skuId);

    return {
      id: String(doc._id),
      customerId: toId(doc.customerId),
      contractId: toId(doc.contractId),
      facilityId: toId(doc.facilityId),
      storageUnitId: toId(doc.storageUnitId),
      storageRackId: doc.storageRackId ? toId(doc.storageRackId) : null,
      rackTierId: doc.rackTierId ? toId(doc.rackTierId) : null,
      skuId: toId(doc.skuId),
      quantity: doc.quantity,
      lastMovementAt: doc.lastMovementAt,
      notes: doc.notes || null,
      customer: cust
        ? {
            id: String(cust._id),
            name: cust.name || '',
            email: cust.email || null,
            phoneNumber: cust.phoneNumber || null,
          }
        : null,
      contract: contract
        ? {
            id: String(contract._id),
            contractCode: contract.contractCode || '',
            status: contract.status || '',
            startDate: contract.startDate
              ? new Date(contract.startDate).toISOString()
              : null,
            endDate: contract.endDate
              ? new Date(contract.endDate).toISOString()
              : null,
          }
        : null,
      facility: facility
        ? {
            id: String(facility._id),
            name: facility.name || '',
            city: facility.city || null,
            address: facility.address || null,
          }
        : null,
      storageUnit: unit
        ? {
            id: String(unit._id),
            unitNumber: unit.unitNumber || '',
            floor: unit.floor ?? null,
            zone: unit.zone || null,
            status: unit.status || null,
          }
        : null,
      storageRack: rack
        ? {
            id: String(rack._id),
            rackCode: rack.rackCode || '',
            name: rack.name || null,
            status: rack.status || null,
          }
        : null,
      rackTier: tier
        ? {
            id: String(tier._id),
            tierNumber: tier.tierNumber ?? 0,
            tierCode: tier.tierCode || '',
            maxWeightKg: tier.maxWeightKg ?? null,
            status: tier.status || null,
          }
        : null,
      sku: sku
        ? {
            id: String(sku._id),
            skuCode: sku.skuCode || '',
            name: sku.name || '',
            category: sku.category || null,
            barcode: sku.barcode || null,
            uom: sku.uom || '',
            imageUrl: sku.imageUrl || null,
          }
        : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private formatMovement(m: IInventoryMovement) {
    const doc = m as unknown as FormattableMovement;
    const cust = toPopulated(doc.customerId);
    const contract = toPopulated(doc.contractId);
    const facility = toPopulated(doc.facilityId);
    const unit = toPopulated(doc.storageUnitId);
    const sku = toPopulated(doc.skuId);
    const fromTier = toPopulated(doc.fromRackTierId);
    const toTier = toPopulated(doc.toRackTierId);
    const performer = toPopulated(doc.performedBy);

    return {
      id: String(doc._id),
      movementCode: doc.movementCode,
      type: doc.type,
      customerInventoryId: doc.customerInventoryId
        ? toId(doc.customerInventoryId)
        : null,
      customerId: toId(doc.customerId),
      contractId: toId(doc.contractId),
      facilityId: toId(doc.facilityId),
      storageUnitId: toId(doc.storageUnitId),
      skuId: toId(doc.skuId),
      fromRackTierId: doc.fromRackTierId ? toId(doc.fromRackTierId) : null,
      toRackTierId: doc.toRackTierId ? toId(doc.toRackTierId) : null,
      quantity: doc.quantity,
      previousQuantity: doc.previousQuantity,
      newQuantity: doc.newQuantity,
      performedBy: toId(doc.performedBy),
      reason: doc.reason || null,
      referenceCode: doc.referenceCode || null,
      notes: doc.notes || null,
      customer: cust
        ? {
            id: String(cust._id),
            name: cust.name || '',
            email: cust.email || null,
            phoneNumber: cust.phoneNumber || null,
          }
        : null,
      contract: contract
        ? {
            id: String(contract._id),
            contractCode: contract.contractCode || '',
            status: contract.status || '',
            startDate: contract.startDate
              ? new Date(contract.startDate).toISOString()
              : null,
            endDate: contract.endDate
              ? new Date(contract.endDate).toISOString()
              : null,
          }
        : null,
      facility: facility
        ? {
            id: String(facility._id),
            name: facility.name || '',
            city: facility.city || null,
            address: facility.address || null,
          }
        : null,
      storageUnit: unit
        ? {
            id: String(unit._id),
            unitNumber: unit.unitNumber || '',
            floor: unit.floor ?? null,
            zone: unit.zone || null,
            status: unit.status || null,
          }
        : null,
      sku: sku
        ? {
            id: String(sku._id),
            skuCode: sku.skuCode || '',
            name: sku.name || '',
            category: sku.category || null,
            barcode: sku.barcode || null,
            uom: sku.uom || '',
            imageUrl: sku.imageUrl || null,
          }
        : null,
      fromRackTier: fromTier
        ? {
            id: String(fromTier._id),
            tierNumber: fromTier.tierNumber ?? 0,
            tierCode: fromTier.tierCode || '',
            maxWeightKg: fromTier.maxWeightKg ?? null,
            status: fromTier.status || null,
          }
        : null,
      toRackTier: toTier
        ? {
            id: String(toTier._id),
            tierNumber: toTier.tierNumber ?? 0,
            tierCode: toTier.tierCode || '',
            maxWeightKg: toTier.maxWeightKg ?? null,
            status: toTier.status || null,
          }
        : null,
      performer: performer
        ? {
            id: String(performer._id),
            name: performer.name || '',
            email: performer.email || null,
            role: performer.role || null,
          }
        : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
