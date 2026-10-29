import { Types, type ClientSession } from 'mongoose';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { ContractStatusEnum } from '../../common/enums/contract.enum.ts';
import {
  MovementTypeEnum,
  InventoryItemStatusEnum,
} from '../../common/enums/customerInventory.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
} from '../../common/enums/storageRack.enum.ts';
import { INVENTORY_OPS_BY_CONTRACT_STATUS } from '../../config/contract.config.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import {
  IncidentSeverityEnum,
  IncidentStatusEnum,
} from '../../common/enums/incident.enum.ts';
import {
  NotificationTypeEnum,
  NotificationPriorityEnum,
  NotificationChannelEnum,
} from '../../common/enums/notification.enum.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { NotificationService } from '../notification/notification.service.ts';
import type { IncidentRepository } from '../incident/incident.repository.ts';
import type { CustomerInventoryRepository } from './customerInventory.repository.ts';
import type { InventoryMovementRepository } from './inventoryMovement.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { CustomerSkuRepository } from '../customerSku/customerSku.repository.ts';
import type { StorageRackRepository } from '../storageRack/storageRack.repository.ts';
import type { RackTierRepository } from '../storageRack/rackTier.repository.ts';
import type { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { ICustomerInventory } from './customerInventory.model.ts';
import type { IInventoryMovement } from './inventoryMovement.model.ts';
import {
  customerInventoryResponseSchema,
  paginatedCustomerInventoryResponseSchema,
  paginatedInventoryMovementResponseSchema,
  storageUnitInventoryTreeResponseSchema,
  skuLocationsResponseSchema,
  customerInventorySummaryResponseSchema,
  batchMigrateRackResponseSchema,
  evacuateRackResponseSchema,
  type CustomerInventoryResponse,
  type PaginatedCustomerInventoryResponse,
  type PaginatedInventoryMovementResponse,
  type StorageUnitInventoryTreeResponse,
  type SkuLocationsResponse,
  type CustomerInventorySummaryResponse,
  type BatchMigrateRackResponse,
  type EvacuateRackResponse,
  type TreeTierItem,
  type TreeRack,
  type TreeTier,
} from './schemas/customerInventory.response.schema.ts';
import type {
  CustomerInventoryQuery,
  CustomerInventorySummaryQuery,
  InventoryMovementQuery,
  StockAdjustRequest,
  StockInRequest,
  StockMoveRequest,
  StockOutRequest,
  BatchMigrateRackRequest,
  EvacuateRackToHoldingRequest,
  UpdateInventoryStatusRequest,
} from './schemas/customerInventory.request.schema.ts';

export interface CallerContext {
  id: string;
  role?: string;
  assignedFacilityId?: string;
}

interface PopulatedRef {
  _id?: Types.ObjectId | string;
  name?: string;
  code?: string;
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
  status?: InventoryItemStatusEnum | string;
  holdingReason?: string | null;
  relatedIncidentId?: PopulatedRef | Types.ObjectId | string | null;
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
  if (ref instanceof Types.ObjectId) {
    return ref.toString();
  }
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

/**
 * State machine transition matrix for InventoryItemStatusEnum (Rule 646)
 */
const VALID_ITEM_STATUS_TRANSITIONS: Record<
  InventoryItemStatusEnum,
  InventoryItemStatusEnum[]
> = {
  [InventoryItemStatusEnum.NORMAL]: [
    InventoryItemStatusEnum.TEMPORARY_HOLDING,
    InventoryItemStatusEnum.DAMAGED,
    InventoryItemStatusEnum.DISPUTED,
  ],
  [InventoryItemStatusEnum.TEMPORARY_HOLDING]: [
    InventoryItemStatusEnum.NORMAL,
    InventoryItemStatusEnum.DAMAGED,
  ],
  [InventoryItemStatusEnum.DAMAGED]: [
    InventoryItemStatusEnum.NORMAL,
    InventoryItemStatusEnum.DISPUTED,
  ],
  [InventoryItemStatusEnum.DISPUTED]: [
    InventoryItemStatusEnum.NORMAL,
    InventoryItemStatusEnum.DAMAGED,
  ],
};

export class CustomerInventoryService {
  constructor(
    private readonly inventoryRepository: CustomerInventoryRepository,
    private readonly movementRepository: InventoryMovementRepository,
    private readonly contractRepository: ContractRepository,
    private readonly skuRepository: CustomerSkuRepository,
    private readonly storageRackRepository: StorageRackRepository,
    private readonly rackTierRepository: RackTierRepository,
    private readonly storageUnitRepository: StorageUnitRepository,
    private readonly auditLogService?: AuditLogService,
    private readonly userRepository?: UserRepository,
    private readonly incidentRepository?: IncidentRepository,
    private readonly notificationService?: NotificationService
  ) {}

  /**
   * Access control verification:
   * - Mutations (IN, OUT, MOVE, ADJUST):
   *   + Absolutely block FACILITY_STAFF and FACILITY_MANAGER (throw 403)
   *   + Only allow CUSTOMER (inventory owner) or system admins
   */
  /**
   * Block direct Stock In / Out for Customers and Staff;
   * Only Business Ops Manager and System Admin can call direct in/out.
   */
  private validateDirectStockInOutAccess(caller: CallerContext): void {
    if (
      caller.role !== RoleEnum.BUSINESS_OPS_MANAGER &&
      caller.role !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }
  }

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
   * Helper to validate and automatically populate assignedFacilityId from database if missing in token
   */
  private async resolveCallerAssignedFacilityId(
    caller: CallerContext
  ): Promise<string | undefined> {
    if (caller.assignedFacilityId) {
      return caller.assignedFacilityId;
    }
    if (
      (caller.role === RoleEnum.FACILITY_STAFF ||
        caller.role === RoleEnum.FACILITY_MANAGER) &&
      this.userRepository
    ) {
      const user = await this.userRepository.findById(caller.id);
      if (user?.assignedFacilityId) {
        caller.assignedFacilityId = toId(user.assignedFacilityId);
        return caller.assignedFacilityId;
      }
    }
    return undefined;
  }

  /**
   * Helper to validate Contract, SKU, and RackTier entities
   */
  private async validateEntities(
    contractId: string,
    skuId: string,
    rackTierId: string | null | undefined,
    caller: CallerContext,
    op: MovementTypeEnum,
    session?: ClientSession
  ) {
    // 1. Verify Contract
    const contract = await this.contractRepository.findById(
      contractId,
      session
    );
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    // Check contract status against allowed inventory operations matrix
    const allowedOps = INVENTORY_OPS_BY_CONTRACT_STATUS[contract.status] ?? [];
    if (allowedOps.length === 0) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_622);
    }
    if (!allowedOps.includes(op)) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_644);
    }

    // Check contract ownership if caller is CUSTOMER
    const contractCustomerId = String(
      contract.customerId?._id || contract.customerId
    );
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (isCustomer && contractCustomerId !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    // 2. Verify SKU
    const sku = await this.skuRepository.findById(skuId);
    if (!sku) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    // SKU must belong to the customer of the contract
    const skuCustomerId = String(sku.customerId?._id || sku.customerId);
    if (skuCustomerId !== contractCustomerId) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_628);
    }

    // 3. Extract storage unit and facility info
    const storageUnitId = String(
      contract.storageUnitId?._id || contract.storageUnitId
    );
    const facilityId = String(contract.facilityId?._id || contract.facilityId);

    // 4. Verify RackTier if specified
    let storageRackId: string | null = null;
    if (rackTierId) {
      const tier = await this.rackTierRepository.findById(rackTierId);
      if (!tier) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_601);
      }

      // RackTier must belong to the same storage unit as the contract
      if (toId(tier.storageUnitId) !== storageUnitId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_624);
      }

      // RackTier cannot be INACTIVE or in MAINTENANCE
      if (
        tier.status === RackTierStatusEnum.INACTIVE ||
        tier.status === RackTierStatusEnum.MAINTENANCE
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_625);
      }

      storageRackId = toId(tier.storageRackId);

      // 5. Rack Ownership Guard (Rule 637)
      if (storageRackId) {
        const rack = await this.storageRackRepository.findById(storageRackId);
        if (rack) {
          const rentedRackIds = (contract.rentedRackIds || []).map((id) =>
            toId(id)
          );
          if (
            rentedRackIds.length > 0 &&
            !rentedRackIds.includes(storageRackId)
          ) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_637);
          }
          if (
            rack.currentContractId &&
            toId(rack.currentContractId) !== toId(contract._id)
          ) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_637);
          }
        }
      }
    }

    // 5. Atomically touch contract in session to prevent write-skew with concurrent contract status transitions
    const allowedStatusesForOp = (
      Object.entries(INVENTORY_OPS_BY_CONTRACT_STATUS) as [
        ContractStatusEnum,
        readonly MovementTypeEnum[],
      ][]
    )
      .filter(([, ops]) => ops.includes(op))
      .map(([status]) => status);

    const touched = await this.contractRepository.touchIfStatusAtomic(
      contractId,
      allowedStatusesForOp,
      session
    );
    if (!touched) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_622);
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
   * 1. Stock In (IN)
   */
  @Transactional()
  async stockIn(
    data: StockInRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<CustomerInventoryResponse> {
    this.validateDirectStockInOutAccess(caller);

    const { contractCustomerId, storageUnitId, facilityId, storageRackId } =
      await this.validateEntities(
        data.contractId,
        data.skuId,
        data.rackTierId,
        caller,
        MovementTypeEnum.IN,
        session
      );

    // 1. Find or create CustomerInventory record at location
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

    // 2. Record in InventoryMovement ledger
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

    // 3. Update RackTier State Machine -> OCCUPIED
    if (data.rackTierId) {
      await this.rackTierRepository.update(
        data.rackTierId,
        { status: RackTierStatusEnum.OCCUPIED },
        session
      );
    }

    // 4. Record Audit Log
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
   * 2. Stock Out (OUT)
   */
  @Transactional()
  async stockOut(
    data: StockOutRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<CustomerInventoryResponse> {
    this.validateDirectStockInOutAccess(caller);

    const { contractCustomerId, storageUnitId, facilityId } =
      await this.validateEntities(
        data.contractId,
        data.skuId,
        data.rackTierId,
        caller,
        MovementTypeEnum.OUT,
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

    // Operation Guard: Item must be in NORMAL status to be stocked out
    if (existing.status && existing.status !== InventoryItemStatusEnum.NORMAL) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_645);
    }

    const inventoryId = String(existing._id);
    const previousQuantity = existing.quantity;
    const newQuantity = existing.quantity - data.quantity;

    // 1. Decrement inventory quantity (Atomic Guard)
    const updatedInventory = await this.inventoryRepository.incrementQuantity(
      inventoryId,
      -data.quantity,
      session
    );
    if (!updatedInventory) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_621);
    }

    // 2. Record in InventoryMovement ledger
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

    // 3. Update RackTier State Machine -> If empty, transition to AVAILABLE
    if (data.rackTierId) {
      const remainingActiveOnTier =
        await this.inventoryRepository.countActiveItemsOnTier(
          data.rackTierId,
          session
        );
      if (remainingActiveOnTier === 0) {
        await this.rackTierRepository.update(
          data.rackTierId,
          { status: RackTierStatusEnum.AVAILABLE },
          session
        );
      }
    }

    // 4. Record Audit Log
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
   * 3. Internal Stock Move between rack tiers (MOVE)
   */
  @Transactional()
  async stockMove(
    data: StockMoveRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<CustomerInventoryResponse> {
    // Rule D7G.1: Block CUSTOMER to prevent virtual data moves; only STAFF, FM, OPS, ADMIN are allowed
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (isCustomer) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const fromTierId = data.fromRackTierId || null;
    const toTierId = data.toRackTierId || null;

    if (fromTierId === toTierId) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_627);
    }

    // Validate source tier
    const { contract, contractCustomerId, storageUnitId, facilityId } =
      await this.validateEntities(
        data.contractId,
        data.skuId,
        fromTierId,
        caller,
        MovementTypeEnum.MOVE,
        session
      );

    // Facility Scope check for Staff/FM
    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const staffFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!staffFacilityId || String(staffFacilityId) !== String(facilityId)) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    // Validate destination tier if specified
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

      // Rack Ownership Guard for destination tier (Rule 637)
      if (toStorageRackId) {
        const destRack =
          await this.storageRackRepository.findById(toStorageRackId);
        if (destRack) {
          const rentedRackIds = (contract.rentedRackIds || []).map((id) =>
            toId(id)
          );
          if (
            rentedRackIds.length > 0 &&
            !rentedRackIds.includes(toStorageRackId)
          ) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_637);
          }
          if (
            destRack.currentContractId &&
            toId(destRack.currentContractId) !== toId(contract._id)
          ) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_637);
          }
        }
      }
    }

    // Check available stock at source location
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

    // Operation Guard: Cannot move DAMAGED or DISPUTED items
    if (
      sourceInventory.status === InventoryItemStatusEnum.DAMAGED ||
      sourceInventory.status === InventoryItemStatusEnum.DISPUTED
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_645);
    }

    const fromPrev = sourceInventory.quantity;
    const fromNew = sourceInventory.quantity - data.quantity;

    // 1. Deduct stock from source location (Atomic Guard)
    const updatedSource = await this.inventoryRepository.incrementQuantity(
      String(sourceInventory._id),
      -data.quantity,
      session
    );
    if (!updatedSource) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_621);
    }

    // 2. Add stock to destination location
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
          status: InventoryItemStatusEnum.NORMAL,
          holdingReason: null,
          relatedIncidentId: null,
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
      // Restore status to NORMAL when placing item onto rack tier
      if (toTierId && destInventory.status !== InventoryItemStatusEnum.NORMAL) {
        await this.inventoryRepository.updateItemStatus(
          destInventoryId,
          InventoryItemStatusEnum.NORMAL,
          null,
          null,
          session
        );
      }
    }

    // 3. Record in InventoryMovement ledger
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

    // 4. Synchronize RackTier State Machine
    if (fromTierId) {
      const remainingActiveOnSource =
        await this.inventoryRepository.countActiveItemsOnTier(
          fromTierId,
          session
        );
      if (remainingActiveOnSource === 0) {
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

    // 5. Record Audit Log
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

    if (this.notificationService) {
      this.notificationService
        .sendNotification({
          recipientId: toId(contractCustomerId),
          facilityId: facilityId ? toId(facilityId) : undefined,
          title: '[Vận chuyển nội bộ] Hàng hóa của bạn đã được thay đổi vị trí',
          content: `Nhân viên đã di dời số lượng ${data.quantity} của mã hàng thuộc hợp đồng sang vị trí mới. Lý do: "${data.reason}". Mã biến động: ${movementCode}.`,
          type: NotificationTypeEnum.CUSTOMER_INVENTORY,
          priority: NotificationPriorityEnum.NORMAL,
          channels: [NotificationChannelEnum.IN_APP],
          metadata: {
            movementCode,
            skuId: data.skuId,
            quantity: data.quantity,
            contractId: data.contractId,
            fromRackTierId: data.fromRackTierId || null,
            toRackTierId: data.toRackTierId || null,
          },
        })
        .catch((err) => {
          console.warn('Failed to dispatch stockMove notification:', err);
        });
    }

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
   * 4. Stock Adjust (ADJUST)
   */
  @Transactional()
  async stockAdjust(
    data: StockAdjustRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<CustomerInventoryResponse> {
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (isCustomer) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const { contractCustomerId, storageUnitId, facilityId, storageRackId } =
      await this.validateEntities(
        data.contractId,
        data.skuId,
        data.rackTierId,
        caller,
        MovementTypeEnum.ADJUST,
        session
      );

    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const staffFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!staffFacilityId || String(staffFacilityId) !== String(facilityId)) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

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

    // 2. Record in InventoryMovement ledger
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

    // 3. Update RackTier State Machine
    if (data.rackTierId) {
      const activeItemsOnTier =
        await this.inventoryRepository.countActiveItemsOnTier(
          data.rackTierId,
          session
        );
      if (activeItemsOnTier === 0) {
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

    // 4. Record Audit Log
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
   * 5. Query active inventory list
   */
  async findAllInventories(
    query: CustomerInventoryQuery,
    caller: CallerContext
  ): Promise<PaginatedCustomerInventoryResponse> {
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const enforcedQuery = { ...query };

    // Customers can only view their own inventory
    if (isCustomer) {
      enforcedQuery.customerId = caller.id;
    } else if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const staffFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!staffFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
      enforcedQuery.facilityId = staffFacilityId;
    }

    const result = await this.inventoryRepository.findPaginated(enforcedQuery);

    return validateResponse(paginatedCustomerInventoryResponseSchema, {
      items: result.items.map((item) => this.formatInventory(item)),
      pagination: result.pagination,
    });
  }

  /**
   * 6. Retrieve single inventory record details
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

    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const staffFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      const itemFacilityId = toId(item.facilityId);
      if (!staffFacilityId || staffFacilityId !== itemFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    return validateResponse(
      customerInventoryResponseSchema,
      this.formatInventory(item)
    );
  }

  /**
   * 7. Query inventory movement transaction ledger (InventoryMovement)
   */
  async findAllMovements(
    query: InventoryMovementQuery,
    caller: CallerContext
  ): Promise<PaginatedInventoryMovementResponse> {
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const enforcedQuery = { ...query };

    // Customers can only view their own history
    if (isCustomer) {
      enforcedQuery.customerId = caller.id;
    } else if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const staffFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!staffFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
      enforcedQuery.facilityId = staffFacilityId;
    }

    const result = await this.movementRepository.findPaginated(enforcedQuery);

    return validateResponse(paginatedInventoryMovementResponseSchema, {
      items: result.items.map((m) => this.formatMovement(m)),
      pagination: result.pagination,
    });
  }

  /**
   * 8. Multi-tier storage unit inventory tree (Storage Unit Inventory Tree)
   * Unit -> Racks -> Tiers -> SKUs + Unracked Items + Summary
   */
  async getStorageUnitTree(
    storageUnitId: string,
    caller: CallerContext
  ): Promise<StorageUnitInventoryTreeResponse> {
    const unit = await this.storageUnitRepository.findById(storageUnitId);
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }
    const unitFacilityId = String(unit.facilityId?._id || unit.facilityId);

    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const staffFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!staffFacilityId || staffFacilityId !== unitFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    const contract =
      await this.contractRepository.findCurrentByStorageUnitId(storageUnitId);

    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (isCustomer) {
      if (
        !contract ||
        String(contract.customerId?._id || contract.customerId) !== caller.id
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    const [racks, allTiers, items] = await Promise.all([
      this.storageRackRepository.findByStorageUnitId(storageUnitId),
      this.rackTierRepository.findByStorageUnitId(storageUnitId),
      this.inventoryRepository.findItemsByStorageUnitId(storageUnitId),
    ]);

    const itemsByTierMap = new Map<string, TreeTierItem[]>();
    const unrackedItems: TreeTierItem[] = [];

    for (const item of items) {
      const doc = item as unknown as FormattableInventory;
      const sku = toPopulated(doc.skuId);
      if (!sku) continue;

      const formattedItem: TreeTierItem = {
        inventoryId: String(doc._id),
        quantity: doc.quantity,
        lastMovementAt: new Date(doc.lastMovementAt).toISOString(),
        notes: doc.notes || null,
        status: doc.status || InventoryItemStatusEnum.NORMAL,
        holdingReason: doc.holdingReason || null,
        relatedIncidentId: doc.relatedIncidentId
          ? String(doc.relatedIncidentId)
          : null,
        sku: {
          id: String(sku._id),
          skuCode: sku.skuCode || '',
          name: sku.name || '',
          category: sku.category || null,
          barcode: sku.barcode || null,
          uom: sku.uom || '',
          dimensions:
            (
              sku as {
                dimensions?: { length: number; width: number; height: number };
              }
            ).dimensions || null,
          volume: (sku as { volume?: number }).volume ?? null,
          weightKg: (sku as { weightKg?: number }).weightKg ?? null,
          imageUrl: sku.imageUrl || null,
        },
      };

      if (doc.rackTierId) {
        const tierId = toId(doc.rackTierId);
        if (!itemsByTierMap.has(tierId)) {
          itemsByTierMap.set(tierId, []);
        }
        itemsByTierMap.get(tierId)!.push(formattedItem);
      } else {
        unrackedItems.push(formattedItem);
      }
    }

    const formattedRacks: TreeRack[] = racks.map((rack) => {
      const rackId = String(rack._id);
      const rackTiers = allTiers.filter(
        (t) => String(t.storageRackId) === rackId
      );

      const formattedTiers: TreeTier[] = rackTiers.map((tier) => {
        const tierId = String(tier._id);
        const tierItems = itemsByTierMap.get(tierId) || [];
        return {
          id: tierId,
          tierNumber: tier.tierNumber,
          tierCode: tier.tierCode,
          maxWeightKg: tier.maxWeightKg ?? null,
          dimensions: tier.dimensions
            ? {
                length: tier.dimensions.length,
                width: tier.dimensions.width,
                height: tier.dimensions.height,
              }
            : null,
          volume: tier.volume ?? null,
          status: tier.status || null,
          items: tierItems,
        };
      });

      const isMine =
        caller?.id && rack.currentCustomerId
          ? String(rack.currentCustomerId) === caller.id
          : false;

      return {
        id: rackId,
        rackCode: rack.rackCode,
        name: rack.name || null,
        status: rack.status || null,
        tierCount: rack.tierCount,
        aisle: rack.aisle || null,
        bay: rack.bay ?? null,
        zone: rack.zone || null,
        customPrice: rack.customPrice ?? null,
        currentContractId: rack.currentContractId
          ? String(rack.currentContractId)
          : null,
        isMine,
        tiers: formattedTiers,
      };
    });

    const totalRacks = racks.length;
    const totalTiers = allTiers.length;
    const occupiedTiers = allTiers.filter(
      (t) =>
        t.status === RackTierStatusEnum.OCCUPIED ||
        (itemsByTierMap.get(String(t._id))?.length || 0) > 0
    ).length;
    const availableTiers = Math.max(0, totalTiers - occupiedTiers);
    const distinctSkuIds = new Set(items.map((i) => toId(i.skuId)));
    const totalSkus = distinctSkuIds.size;
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

    let contractSummary = null;
    if (contract) {
      const cust = toPopulated(contract.customerId);
      contractSummary = {
        id: String(contract._id),
        contractCode: contract.contractCode,
        status: contract.status,
        startDate: contract.startDate
          ? new Date(contract.startDate).toISOString()
          : null,
        endDate: contract.endDate
          ? new Date(contract.endDate).toISOString()
          : null,
        customer: cust
          ? {
              id: String(cust._id),
              name: cust.name || '',
              email: cust.email || null,
              phoneNumber: cust.phoneNumber || null,
            }
          : null,
      };
    }

    const storageUnitSummary = {
      id: String(unit._id),
      unitNumber: unit.unitNumber,
      floor: unit.floor ?? null,
      zone: unit.zone || null,
      status: unit.status || null,
    };

    const fac = toPopulated(unit.facilityId);
    let facilitySummary = null;
    if (fac) {
      facilitySummary = {
        id: String(fac._id),
        name: fac.name || '',
        code: fac.code || null,
        city: fac.city || null,
        address: fac.address || null,
      };
    }

    return validateResponse(storageUnitInventoryTreeResponseSchema, {
      facility: facilitySummary,
      storageUnit: storageUnitSummary,
      contract: contractSummary,
      summary: {
        totalRacks,
        totalTiers,
        occupiedTiers,
        availableTiers,
        totalSkus,
        totalQuantity,
      },
      racks: formattedRacks,
      unrackedItems,
    });
  }

  /**
   * 9. Query SKU storage locations by SKU ID
   */
  async getSkuLocations(
    skuId: string,
    caller: CallerContext
  ): Promise<SkuLocationsResponse> {
    const sku = await this.skuRepository.findById(skuId);
    if (!sku) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }
    const skuCustomerId = String(sku.customerId?._id || sku.customerId);
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (isCustomer && skuCustomerId !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const items = await this.inventoryRepository.findLocationsBySkuId(skuId);

    let filteredItems = items;
    if (caller.role === RoleEnum.FACILITY_MANAGER) {
      if (!caller.assignedFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
      filteredItems = items.filter(
        (i) => toId(i.facilityId) === caller.assignedFacilityId
      );
      if (filteredItems.length === 0 && items.length > 0) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    const locations = filteredItems.map((item) => {
      const doc = item as unknown as FormattableInventory;
      const fac = toPopulated(doc.facilityId);
      const ctr = toPopulated(doc.contractId);
      const unt = toPopulated(doc.storageUnitId);
      const rck = toPopulated(doc.storageRackId);
      const tier = toPopulated(doc.rackTierId);

      return {
        inventoryId: String(doc._id),
        quantity: doc.quantity,
        lastMovementAt: new Date(doc.lastMovementAt).toISOString(),
        notes: doc.notes || null,
        facility: fac
          ? {
              id: String(fac._id),
              name: fac.name || '',
              city: fac.city || null,
              address: fac.address || null,
            }
          : null,
        contract: ctr
          ? {
              id: String(ctr._id),
              contractCode: ctr.contractCode || '',
              status: ctr.status || '',
              startDate: ctr.startDate
                ? new Date(ctr.startDate).toISOString()
                : null,
              endDate: ctr.endDate ? new Date(ctr.endDate).toISOString() : null,
            }
          : null,
        storageUnit: unt
          ? {
              id: String(unt._id),
              unitNumber: unt.unitNumber || '',
              floor: unt.floor ?? null,
              zone: unt.zone || null,
              status: unt.status || null,
            }
          : null,
        storageRack: rck
          ? {
              id: String(rck._id),
              rackCode: rck.rackCode || '',
              name: rck.name || null,
              status: rck.status || null,
            }
          : null,
        rackTier: tier
          ? {
              id: String(tier._id),
              tierCode: tier.tierCode || '',
              tierNumber: tier.tierNumber ?? 0,
              maxWeightKg: tier.maxWeightKg ?? null,
              status: tier.status || null,
            }
          : null,
      };
    });

    const totalQuantity = locations.reduce((sum, l) => sum + l.quantity, 0);

    return validateResponse(skuLocationsResponseSchema, {
      sku: {
        id: String(sku._id),
        skuCode: sku.skuCode,
        name: sku.name,
        category: sku.category || null,
        barcode: sku.barcode || null,
        uom: sku.uom,
        imageUrl: sku.imageUrl || null,
        totalQuantity,
      },
      locations,
    });
  }

  /**
   * 10. Look up SKU storage locations by barcode
   */
  async getSkuLocationsByBarcode(
    barcode: string,
    caller: CallerContext
  ): Promise<SkuLocationsResponse> {
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const sku = await this.skuRepository.findByBarcode(
      isCustomer ? caller.id : undefined,
      barcode
    );
    if (!sku) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    return this.getSkuLocations(String(sku._id), caller);
  }

  /**
   * 11. Customer Personal Inventory Dashboard Summary
   */
  async getCustomerSummary(
    caller: CallerContext,
    query?: CustomerInventorySummaryQuery
  ): Promise<CustomerInventorySummaryResponse> {
    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    let customerId = caller.id;
    const isPrivileged =
      caller.role === RoleEnum.BUSINESS_OPS_MANAGER ||
      caller.role === RoleEnum.SYSTEM_ADMIN;

    if (isPrivileged && (query?.customerId || query?.userId)) {
      customerId = (query.customerId || query.userId)!;
    }

    const [
      totalSkus,
      categoryBreakdown,
      distinctUnits,
      activeContracts,
      recentMovementsData,
    ] = await Promise.all([
      this.skuRepository.countByCustomerId(customerId),
      this.inventoryRepository.getDashboardCategoryBreakdown(customerId),
      this.inventoryRepository.countDistinctStorageUnits(customerId),
      this.contractRepository.countActiveByUserId(customerId),
      this.movementRepository.findPaginated({
        customerId,
        page: 1,
        limit: 5,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    ]);

    const totalQuantity = categoryBreakdown.reduce(
      (sum, c) => sum + c.totalQuantity,
      0
    );

    const formattedMovements = recentMovementsData.items.map((m) =>
      this.formatMovement(m)
    );

    return validateResponse(customerInventorySummaryResponseSchema, {
      totalSkus,
      totalQuantity,
      totalActiveContracts: activeContracts,
      totalStorageUnits: distinctUnits,
      categoryBreakdown,
      recentMovements: formattedMovements,
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
      status:
        (doc.status as InventoryItemStatusEnum) ||
        InventoryItemStatusEnum.NORMAL,
      holdingReason: doc.holdingReason || null,
      relatedIncidentId: doc.relatedIncidentId
        ? toId(doc.relatedIncidentId)
        : null,
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

  /**
   * Batch Rack Migration (Batch Rack Migration)
   * Internal warehouse operation for Staff/FM/Ops/Admin to migrate all active inventory
   * from source rack to an identical, vacant destination rack with valid legal basis.
   */
  @Transactional()
  async batchMigrateRack(
    data: BatchMigrateRackRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<BatchMigrateRackResponse> {
    // 1. Phân quyền: Chặn CUSTOMER (403)
    if (caller.role === RoleEnum.CUSTOMER || !caller.role) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    // 2. Kiểm tra căn cứ pháp lý bắt buộc: addendumId HOẶC emergencyReason HOẶC incidentId
    if (!data.addendumId && !data.emergencyReason && !data.incidentId) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_641);
    }

    // 3. Nếu có incidentId: xác thực tính hợp lệ của sự cố di dời khẩn cấp
    if (data.incidentId) {
      if (!this.incidentRepository) {
        throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106, [
          'IncidentRepository is not configured',
        ]);
      }

      const incident = await this.incidentRepository.findById(
        data.incidentId,
        session
      );
      if (!incident || incident.deleted) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
      }

      // Không cho phép dùng sự cố đã đóng hoặc đã huỷ
      if (
        incident.status === IncidentStatusEnum.CLOSED ||
        incident.status === IncidentStatusEnum.CANCELLED
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_643);
      }

      // Xác minh sự cố phải đủ điều kiện di dời khẩn cấp (requiresRelocation hoặc severity HIGH/CRITICAL)
      const isSevere =
        incident.severity === IncidentSeverityEnum.HIGH ||
        incident.severity === IncidentSeverityEnum.CRITICAL;
      if (!incident.requiresRelocation && !isSevere) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_643);
      }

      // Fallback emergencyReason nếu FE chưa truyền
      if (!data.emergencyReason) {
        data.emergencyReason = `Di dời khẩn cấp theo Sự cố [${incident.incidentCode}]: ${incident.title}`;
      }
    }

    // 3. Load và kiểm tra Kệ nguồn & Kệ đích
    const fromRack = await this.storageRackRepository.findById(data.fromRackId);
    if (!fromRack || (fromRack as unknown as { deleted?: boolean }).deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_600);
    }

    const toRack = await this.storageRackRepository.findById(data.toRackId);
    if (!toRack || (toRack as unknown as { deleted?: boolean }).deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_600);
    }

    // 4. Kiểm tra cùng cơ sở
    const facilityId = toId(fromRack.facilityId);
    if (toId(toRack.facilityId) !== facilityId) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_640);
    }

    // 4.1. Nếu có incidentId: xác minh facility và rack tương thích với sự cố
    if (data.incidentId) {
      const incident = await this.incidentRepository!.findById(
        data.incidentId,
        session
      );
      if (incident) {
        if (toId(incident.facilityId) !== facilityId) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_643);
        }
        if (
          incident.storageRackId &&
          toId(incident.storageRackId) !== data.fromRackId
        ) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_643);
        }
      }
    }

    // 5. Kiểm tra Staff / FM thuộc đúng cơ sở
    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      let callerFacilityId = caller.assignedFacilityId;
      if (!callerFacilityId && this.userRepository) {
        const u = await this.userRepository.findById(caller.id);
        if (u?.assignedFacilityId) {
          callerFacilityId = toId(u.assignedFacilityId);
        }
      }
      if (
        !callerFacilityId ||
        String(callerFacilityId) !== String(facilityId)
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    // 6. Kệ đích phải trống hoàn toàn (status: AVAILABLE)
    if (toRack.status !== RackStatusEnum.AVAILABLE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_639);
    }

    // 7. Kệ đích phải Y CHANG VỀ SỐ TẦNG (tierCount)
    if (toRack.tierCount !== fromRack.tierCount) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_642);
    }

    // 8. Tải các tầng của Kệ nguồn & Kệ đích
    const fromTiers = await this.rackTierRepository.findByRackId(
      data.fromRackId
    );
    const toTiers = await this.rackTierRepository.findByRackId(data.toRackId);

    const toTierMap = new Map<number, (typeof toTiers)[0]>();
    for (const t of toTiers) {
      toTierMap.set(t.tierNumber, t);
    }

    // 9. Lấy danh sách tồn kho trên Kệ nguồn (quantity > 0)
    const sourceInventories = await this.inventoryRepository.findActiveByRackId(
      data.fromRackId,
      session
    );
    if (!sourceInventories || sourceInventories.length === 0) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_638);
    }

    // 10. Contract resolution & validation
    const resolvedContractId =
      data.contractId ||
      toId(fromRack.currentContractId) ||
      toId(sourceInventories[0].contractId);
    const contract = await this.contractRepository.findById(
      resolvedContractId,
      session
    );
    if (!contract || contract.status !== ContractStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_622);
    }

    // 11. Migration loop: di dời tồn kho 1-1
    const movementsGenerated: string[] = [];
    let totalQuantityMigrated = 0;
    const destTiersOccupied = new Set<string>();

    for (const inv of sourceInventories) {
      const fromTierId = toId(inv.rackTierId);
      const fromTier = fromTiers.find((t) => toId(t._id) === fromTierId);
      const tierNumber = fromTier?.tierNumber || 1;
      const destTier = toTierMap.get(tierNumber);
      if (!destTier) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_642);
      }

      const destTierId = toId(destTier._id);
      destTiersOccupied.add(destTierId);

      // Cập nhật vị trí CustomerInventory sang toRack & destTier
      await this.inventoryRepository.update(
        toId(inv._id),
        {
          storageRackId: new Types.ObjectId(data.toRackId),
          rackTierId: new Types.ObjectId(destTierId),
        },
        session
      );

      // Ghi nhận sổ cái InventoryMovement (MOVE)
      const movementCode =
        await this.movementRepository.generateMovementCode(session);
      movementsGenerated.push(movementCode);
      totalQuantityMigrated += inv.quantity;

      await this.movementRepository.create(
        {
          movementCode,
          type: MovementTypeEnum.MOVE,
          customerInventoryId: new Types.ObjectId(toId(inv._id)),
          customerId: new Types.ObjectId(toId(contract.customerId)),
          contractId: new Types.ObjectId(resolvedContractId),
          facilityId: new Types.ObjectId(facilityId),
          storageUnitId: new Types.ObjectId(toId(contract.storageUnitId)),
          skuId: new Types.ObjectId(toId(inv.skuId)),
          fromRackTierId: fromTierId ? new Types.ObjectId(fromTierId) : null,
          toRackTierId: new Types.ObjectId(destTierId),
          quantity: inv.quantity,
          previousQuantity: inv.quantity,
          newQuantity: inv.quantity,
          performedBy: new Types.ObjectId(caller.id),
          reason: data.reason || data.emergencyReason || 'Batch Rack Migration',
          referenceCode: data.addendumId || data.emergencyReason || null,
          notes: data.notes || null,
        },
        session
      );
    }

    // 12. Cập nhật state machine các tầng kệ
    for (const ft of fromTiers) {
      await this.rackTierRepository.update(
        toId(ft._id),
        { status: RackTierStatusEnum.AVAILABLE },
        session
      );
    }
    for (const dtId of destTiersOccupied) {
      await this.rackTierRepository.update(
        dtId,
        { status: RackTierStatusEnum.OCCUPIED },
        session
      );
    }

    // 13. Cập nhật trạng thái 2 kệ
    // Rule: Nếu di dời do Sự cố khẩn cấp (có incidentId hoặc emergencyReason), Kệ cũ fromRack chuyển sang status: MAINTENANCE.
    // Nếu di dời theo Thỏa thuận dân sự (addendumId) và không có sự cố, Kệ cũ chuyển sang status: AVAILABLE.
    const isEmergencyOrIncident = Boolean(
      data.incidentId || data.emergencyReason
    );
    const fromRackTargetStatus = isEmergencyOrIncident
      ? RackStatusEnum.MAINTENANCE
      : RackStatusEnum.AVAILABLE;

    await this.storageRackRepository.update(
      data.fromRackId,
      {
        currentContractId: null,
        currentCustomerId: null,
        status: fromRackTargetStatus,
      },
      session
    );

    await this.storageRackRepository.update(
      data.toRackId,
      {
        currentContractId: new Types.ObjectId(resolvedContractId),
        currentCustomerId: new Types.ObjectId(toId(contract.customerId)),
        status: RackStatusEnum.RENTED,
      },
      session
    );

    // 14. Cập nhật contract.rentedRackIds (thay thế fromRackId bằng toRackId)
    const currentRentedRackIds = (contract.rentedRackIds || []).map((id) =>
      toId(id)
    );
    let updatedRentedRackIds: Types.ObjectId[];
    if (currentRentedRackIds.includes(data.fromRackId)) {
      updatedRentedRackIds = currentRentedRackIds.map((id) =>
        id === data.fromRackId
          ? new Types.ObjectId(data.toRackId)
          : new Types.ObjectId(id)
      );
    } else {
      updatedRentedRackIds = [
        ...currentRentedRackIds.map((id) => new Types.ObjectId(id)),
        new Types.ObjectId(data.toRackId),
      ];
    }
    await this.contractRepository.update(
      resolvedContractId,
      { rentedRackIds: updatedRentedRackIds },
      session
    );

    // 15. Ghi Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.BATCH_MIGRATE_RACK,
      resourceType: AuditResourceEnum.STORAGE_RACK,
      resourceId: data.fromRackId,
      before: {
        rackCode: fromRack.rackCode,
        status: fromRack.status,
        contractId: resolvedContractId,
      },
      after: {
        fromRackId: data.fromRackId,
        toRackId: data.toRackId,
        fromRackCode: fromRack.rackCode,
        toRackCode: toRack.rackCode,
        contractId: resolvedContractId,
        migratedItemsCount: sourceInventories.length,
        totalQuantityMigrated,
        legalBasis: {
          addendumId: data.addendumId || null,
          emergencyReason: data.emergencyReason || null,
        },
      },
    });

    if (this.notificationService) {
      this.notificationService
        .sendNotification({
          recipientId: toId(contract.customerId),
          facilityId: toId(fromRack.facilityId),
          title: `[Di dời kệ kho] Hàng hóa của bạn đã được chuyển từ Kệ ${fromRack.rackCode} sang Kệ ${toRack.rackCode}`,
          content: `Nhân viên đã hoàn tất di dời toàn bộ ${totalQuantityMigrated} sản phẩm trên Kệ ${fromRack.rackCode} sang Kệ ${toRack.rackCode}. Căn cứ: "${data.emergencyReason || 'Theo thỏa thuận phụ lục hợp đồng'}".`,
          type: NotificationTypeEnum.CUSTOMER_INVENTORY,
          priority: NotificationPriorityEnum.HIGH,
          channels: [
            NotificationChannelEnum.IN_APP,
            NotificationChannelEnum.EMAIL,
          ],
          metadata: {
            fromRackId: data.fromRackId,
            toRackId: data.toRackId,
            contractId: resolvedContractId,
            totalQuantityMigrated,
          },
        })
        .catch((err) => {
          console.warn(
            'Failed to dispatch batchMigrateRack notification:',
            err
          );
        });
    }

    // 16. Return validated response
    return validateResponse(batchMigrateRackResponseSchema, {
      fromRackId: data.fromRackId,
      toRackId: data.toRackId,
      fromRackCode: fromRack.rackCode,
      toRackCode: toRack.rackCode,
      contractId: resolvedContractId,
      migratedItemsCount: sourceInventories.length,
      totalQuantityMigrated,
      movementsGenerated,
      message: `Batch migrated ${sourceInventories.length} items (${totalQuantityMigrated} total quantity) from rack ${fromRack.rackCode} to rack ${toRack.rackCode} successfully`,
    });
  }

  /**
   * 13. Evacuate Rack To Holding Area (Task 7G)
   * When a rack suffers technical/structural breakdown and no compatible rack exists,
   * emergency evacuation moves all items on the rack to holding area (rackTierId: null, status: TEMPORARY_HOLDING)
   * and sets rack status to MAINTENANCE.
   */
  @Transactional()
  async evacuateRackToHolding(
    data: EvacuateRackToHoldingRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<EvacuateRackResponse> {
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (isCustomer) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const fromRack = await this.storageRackRepository.findById(data.fromRackId);
    if (!fromRack || (fromRack as unknown as { deleted?: boolean }).deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_600);
    }

    const facilityId = toId(fromRack.facilityId);

    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const staffFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!staffFacilityId || String(staffFacilityId) !== String(facilityId)) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    if (data.incidentId) {
      if (!this.incidentRepository) {
        throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106, [
          'IncidentRepository not injected',
        ]);
      }
      const incident = await this.incidentRepository.findById(
        data.incidentId,
        session
      );
      if (!incident || incident.deleted) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
      }
      if (
        incident.status === IncidentStatusEnum.CLOSED ||
        incident.status === IncidentStatusEnum.CANCELLED
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_643);
      }
      if (toId(incident.facilityId) !== facilityId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_643);
      }
      if (
        incident.storageRackId &&
        toId(incident.storageRackId) !== data.fromRackId
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_643);
      }
      if (!data.emergencyReason) {
        data.emergencyReason = `Hạ hàng khẩn cấp theo Sự cố [${incident.incidentCode}]: ${incident.title}`;
      }
    }

    if (!data.emergencyReason || data.emergencyReason.trim().length < 10) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_647);
    }

    const items = await this.inventoryRepository.findActiveByRackId(
      data.fromRackId,
      session
    );
    if (items.length === 0) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_638);
    }

    const movementsGenerated: string[] = [];
    let totalQuantityEvacuated = 0;

    for (const item of items) {
      totalQuantityEvacuated += item.quantity;
      const fromTierId = toId(item.rackTierId);

      const existingHolding = await this.inventoryRepository.findByPosition(
        toId(item.contractId),
        toId(item.skuId),
        toId(item.storageUnitId),
        null,
        session
      );

      let holdingInventoryId: string;
      if (!existingHolding) {
        const updated = await this.inventoryRepository.update(
          String(item._id),
          {
            storageRackId: null,
            rackTierId: null,
            status: InventoryItemStatusEnum.TEMPORARY_HOLDING,
            holdingReason: data.emergencyReason.trim(),
            relatedIncidentId: data.incidentId
              ? new Types.ObjectId(data.incidentId)
              : null,
          },
          session
        );
        holdingInventoryId = String(updated!._id);
      } else {
        await this.inventoryRepository.incrementQuantity(
          String(existingHolding._id),
          item.quantity,
          session
        );
        await this.inventoryRepository.update(
          String(existingHolding._id),
          {
            status: InventoryItemStatusEnum.TEMPORARY_HOLDING,
            holdingReason: data.emergencyReason.trim(),
            relatedIncidentId: data.incidentId
              ? new Types.ObjectId(data.incidentId)
              : null,
          },
          session
        );
        await this.inventoryRepository.updateQuantity(
          String(item._id),
          0,
          session
        );
        holdingInventoryId = String(existingHolding._id);
      }

      const movementCode =
        await this.movementRepository.generateMovementCode(session);
      await this.movementRepository.create(
        {
          movementCode,
          type: MovementTypeEnum.MOVE,
          customerInventoryId: new Types.ObjectId(holdingInventoryId),
          customerId: item.customerId as unknown as Types.ObjectId,
          contractId: item.contractId as unknown as Types.ObjectId,
          facilityId: item.facilityId as unknown as Types.ObjectId,
          storageUnitId: item.storageUnitId as unknown as Types.ObjectId,
          skuId: item.skuId as unknown as Types.ObjectId,
          fromRackTierId: fromTierId ? new Types.ObjectId(fromTierId) : null,
          toRackTierId: null,
          quantity: item.quantity,
          previousQuantity: item.quantity,
          newQuantity: item.quantity,
          performedBy: new Types.ObjectId(caller.id),
          reason: data.emergencyReason.trim(),
          notes: data.notes?.trim() || null,
        },
        session
      );
      movementsGenerated.push(movementCode);
    }

    const tiers = await this.rackTierRepository.findByRackId(data.fromRackId);
    for (const t of tiers) {
      await this.rackTierRepository.update(
        String(t._id),
        { status: RackTierStatusEnum.AVAILABLE },
        session
      );
    }

    await this.storageRackRepository.update(
      data.fromRackId,
      { status: RackStatusEnum.MAINTENANCE },
      session
    );

    this.auditLogService?.record({
      action: AuditActionEnum.EVACUATE_RACK_TO_HOLDING,
      resourceType: AuditResourceEnum.CUSTOMER_INVENTORY,
      resourceId: data.fromRackId,
      after: {
        fromRackId: data.fromRackId,
        fromRackCode: fromRack.rackCode,
        evacuatedItemsCount: items.length,
        totalQuantityEvacuated,
        emergencyReason: data.emergencyReason,
        incidentId: data.incidentId || null,
      },
    });

    if (this.notificationService) {
      const affectedCustomerIds = Array.from(
        new Set(items.map((it) => toId(it.customerId)).filter(Boolean))
      );
      for (const customerId of affectedCustomerIds) {
        this.notificationService
          .sendNotification({
            recipientId: customerId,
            facilityId: toId(fromRack.facilityId) || undefined,
            title: `[Sơ tán khẩn cấp] Hàng hóa trên Kệ ${fromRack.rackCode} đã được đưa về khu vực an toàn`,
            content: `Do sự cố kỹ thuật tại Kệ ${fromRack.rackCode}, nhân viên đã sơ tán khẩn cấp ${totalQuantityEvacuated} sản phẩm xuống khu vực lưu tạm (Temporary Holding) để đảm bảo an toàn. Lý do: "${data.emergencyReason || data.incidentId}".`,
            type: NotificationTypeEnum.CUSTOMER_INVENTORY,
            priority: NotificationPriorityEnum.URGENT,
            channels: [
              NotificationChannelEnum.IN_APP,
              NotificationChannelEnum.EMAIL,
            ],
            metadata: {
              rackId: data.fromRackId,
              totalQuantityEvacuated,
              emergencyReason: data.emergencyReason,
              incidentId: data.incidentId || null,
            },
          })
          .catch((err) => {
            console.warn(
              'Failed to dispatch evacuateRackToHolding notification:',
              err
            );
          });
      }
    }

    return validateResponse(evacuateRackResponseSchema, {
      fromRackId: data.fromRackId,
      fromRackCode: fromRack.rackCode || '',
      rackStatus: RackStatusEnum.MAINTENANCE,
      evacuatedItemsCount: items.length,
      totalQuantityEvacuated,
      movementsGenerated,
      message: 'Hạ hàng xuống khu lưu tạm khẩn cấp thành công',
    });
  }

  /**
   * 14. Update Inventory Item Status (Task 7G)
   * Allows Staff/FM/Ops/Admin to mark item as DAMAGED, DISPUTED, or restore to NORMAL.
   */
  @Transactional()
  async updateInventoryStatus(
    id: string,
    data: UpdateInventoryStatusRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<CustomerInventoryResponse> {
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (isCustomer) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const inventory = await this.inventoryRepository.findById(id, session);
    if (!inventory || (inventory as unknown as { deleted?: boolean }).deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_620);
    }

    const facilityId = toId(inventory.facilityId);

    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const staffFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!staffFacilityId || String(staffFacilityId) !== String(facilityId)) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    const currentStatus =
      (inventory.status as InventoryItemStatusEnum) ||
      InventoryItemStatusEnum.NORMAL;

    if (data.status !== currentStatus) {
      const allowedTransitions =
        VALID_ITEM_STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowedTransitions.includes(data.status)) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_646);
      }
    }

    if (data.status === InventoryItemStatusEnum.DAMAGED) {
      if (!data.incidentId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_700);
      }
      if (this.incidentRepository) {
        const incident = await this.incidentRepository.findById(
          data.incidentId,
          session
        );
        if (!incident || incident.deleted) {
          throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_700);
        }
      }
    }

    const updated = await this.inventoryRepository.updateItemStatus(
      id,
      data.status,
      data.holdingReason || data.reason,
      data.incidentId,
      session
    );

    this.auditLogService?.record({
      action: AuditActionEnum.UPDATE_INVENTORY_STATUS,
      resourceType: AuditResourceEnum.CUSTOMER_INVENTORY,
      resourceId: id,
      before: inventory,
      after: updated,
    });

    if (this.notificationService) {
      this.notificationService
        .sendNotification({
          recipientId: toId(inventory.customerId),
          facilityId: facilityId ? toId(facilityId) : undefined,
          title: `[Cập nhật trạng thái] Hàng hóa của bạn đã chuyển sang trạng thái "${data.status}"`,
          content: `Hàng hóa lưu kho đã được nhân viên cập nhật trạng thái sang "${data.status}". Lý do: "${data.reason}".`,
          type: NotificationTypeEnum.CUSTOMER_INVENTORY,
          priority: NotificationPriorityEnum.HIGH,
          channels: [NotificationChannelEnum.IN_APP],
          metadata: {
            inventoryId: id,
            status: data.status,
            reason: data.reason,
            incidentId: data.incidentId || null,
          },
        })
        .catch((err) => {
          console.warn(
            'Failed to dispatch updateInventoryStatus notification:',
            err
          );
        });
    }

    const populated = await this.inventoryRepository.findById(id, session);
    return validateResponse(
      customerInventoryResponseSchema,
      this.formatInventory(populated || updated!)
    );
  }
}
