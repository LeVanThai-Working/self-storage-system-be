import crypto from 'node:crypto';
import { Types, type ClientSession } from 'mongoose';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { ContractStatusEnum } from '../../common/enums/contract.enum.ts';
import {
  InventoryRequestTypeEnum,
  InventoryRequestStatusEnum,
  MovementTypeEnum,
  InventoryItemStatusEnum,
} from '../../common/enums/customerInventory.enum.ts';
import { RackTierStatusEnum } from '../../common/enums/storageRack.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { InventoryRequestRepository } from './inventoryRequest.repository.ts';
import type { CustomerInventoryRepository } from './customerInventory.repository.ts';
import type { InventoryMovementRepository } from './inventoryMovement.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { StorageRackRepository } from '../storageRack/storageRack.repository.ts';
import type { RackTierRepository } from '../storageRack/rackTier.repository.ts';
import type { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { IInventoryRequest } from './inventoryRequest.model.ts';
import { inventoryRequestQueue } from './inventoryRequest.queue.ts';
import {
  inventoryRequestResponseSchema,
  verifiedHandoverDetailsResponseSchema,
  type InventoryRequestResponse,
  type VerifiedHandoverDetailsResponse,
  type PaginatedInventoryRequestResponse,
} from './schemas/inventoryRequest.response.schema.ts';
import type {
  CreateOutboundRequest,
  VerifyPickupCodeRequest,
  CompleteOutboundHandoverRequest,
  CreateInboundRequest,
  PutawayInboundRequest,
  InventoryRequestQuery,
} from './schemas/inventoryRequest.request.schema.ts';

export interface CallerContext {
  id: string;
  role?: string;
  assignedFacilityId?: string;
}

function toId(ref: unknown): string {
  if (typeof ref === 'object' && ref !== null && '_id' in ref) {
    return String((ref as { _id: unknown })._id);
  }
  return String(ref || '');
}

export class InventoryRequestService {
  constructor(
    private readonly inventoryRequestRepository: InventoryRequestRepository,
    private readonly customerInventoryRepository: CustomerInventoryRepository,
    private readonly inventoryMovementRepository: InventoryMovementRepository,
    private readonly contractRepository: ContractRepository,
    private readonly storageRackRepository: StorageRackRepository,
    private readonly rackTierRepository: RackTierRepository,
    private readonly storageUnitRepository: StorageUnitRepository,
    private readonly userRepository?: UserRepository,
    private readonly auditLogService?: AuditLogService
  ) {}

  private validateRoleAccess(caller: CallerContext) {
    if (!caller.id) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }
  }

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
        caller.assignedFacilityId = String(user.assignedFacilityId);
        return caller.assignedFacilityId;
      }
    }
    return undefined;
  }

  private hashOtp(otp: string): string {
    const secret =
      process.env.JWT_SECRET || 'inventory-dual-handshake-secret-2026';
    return crypto.createHmac('sha256', secret).update(otp.trim()).digest('hex');
  }

  /**
   * 1. Customer creates an Outbound (Stock Out) Request
   */
  async createOutboundRequest(
    data: CreateOutboundRequest,
    caller: CallerContext
  ): Promise<InventoryRequestResponse> {
    this.validateRoleAccess(caller);

    // Contract validation
    const contract = await this.contractRepository.findById(data.contractId);
    if (!contract || contract.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }
    if (String(contract.customerId?._id || contract.customerId) !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }
    if (contract.status !== ContractStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_622);
    }

    const facilityId = contract.facilityId?._id || contract.facilityId;
    const storageUnitId = contract.storageUnitId?._id || contract.storageUnitId;

    // Validate inventory availability for each requested item
    for (const item of data.items) {
      if (!item.storageRackId || !item.rackTierId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_635);
      }
      const inventory = await this.customerInventoryRepository.findByPosition(
        data.contractId,
        item.skuId,
        String(storageUnitId),
        item.rackTierId
      );
      if (!inventory || inventory.quantity < item.quantity) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_621);
      }
      if (
        inventory.status &&
        inventory.status !== InventoryItemStatusEnum.NORMAL
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_644);
      }
    }

    // Generate Request Code
    const countToday = await this.inventoryRequestRepository.countRequestsToday(
      InventoryRequestTypeEnum.OUTBOUND
    );
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const requestCode = `REQ-OUT-${dateStr}-${String(countToday + 1).padStart(4, '0')}`;

    // Security Credentials
    const rawOtpCode = String(crypto.randomInt(100000, 999999));
    const otpHash = this.hashOtp(rawOtpCode);
    const pickupQrToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const createdDoc = await this.inventoryRequestRepository.create({
      requestCode,
      type: InventoryRequestTypeEnum.OUTBOUND,
      status: InventoryRequestStatusEnum.PENDING,
      customerId: new Types.ObjectId(caller.id),
      contractId: new Types.ObjectId(data.contractId),
      facilityId: new Types.ObjectId(String(facilityId)),
      storageUnitId: new Types.ObjectId(String(storageUnitId)),
      items: data.items.map((it) => ({
        skuId: new Types.ObjectId(it.skuId),
        quantity: it.quantity,
        storageRackId: new Types.ObjectId(it.storageRackId),
        rackTierId: new Types.ObjectId(it.rackTierId),
      })),
      pickupQrToken,
      otpHash,
      expiresAt,
      isVerified: false,
      transporterInfo: data.transporterInfo,
      staffNotes: data.notes?.trim(),
    });

    this.auditLogService?.record({
      action: AuditActionEnum.CREATE_INVENTORY_REQUEST,
      resourceType: AuditResourceEnum.INVENTORY_REQUEST,
      resourceId: String(createdDoc._id),
      after: createdDoc,
    });

    const populated = await this.inventoryRequestRepository.findById(
      String(createdDoc._id)
    );
    const formatted = this.formatRequest(populated || createdDoc);
    formatted.rawOtpCode = rawOtpCode;
    formatted.pickupQrPayload = `PICKUP:${requestCode}:${pickupQrToken}`;

    return validateResponse(inventoryRequestResponseSchema, formatted);
  }

  /**
   * 2. Staff verifies Pickup QR Code or OTP (Opens Handover Details & Transitions to PROCESSING)
   */
  async verifyPickupCode(
    data: VerifyPickupCodeRequest,
    caller: CallerContext
  ): Promise<VerifiedHandoverDetailsResponse> {
    this.validateRoleAccess(caller);

    const facilityId = await this.resolveCallerAssignedFacilityId(caller);
    if (!facilityId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const trimmedCode = data.pickupCode.trim();
    let request: IInventoryRequest | null;

    // Check if input is QR Payload ("PICKUP:REQ-...:UUID") or Raw UUID
    if (trimmedCode.startsWith('PICKUP:')) {
      const parts = trimmedCode.split(':');
      const token = parts[2] || parts[1];
      request =
        await this.inventoryRequestRepository.findByPickupQrToken(token);
    } else if (trimmedCode.length > 10) {
      // Direct UUID token
      request =
        await this.inventoryRequestRepository.findByPickupQrToken(trimmedCode);
    } else {
      // 6-digit OTP code
      const hash = this.hashOtp(trimmedCode);
      request =
        await this.inventoryRequestRepository.findPendingByCustomerAndOtpHash(
          hash,
          data.requestCode
        );
    }

    if (!request || request.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_631);
    }

    // Facility Scope Check (Rule 14)
    if (String(request.facilityId?._id || request.facilityId) !== facilityId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    // Expiry Check
    if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
      await this.inventoryRequestRepository.updateById(String(request._id), {
        status: InventoryRequestStatusEnum.EXPIRED,
      });
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_631);
    }

    if (request.status !== InventoryRequestStatusEnum.PENDING) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_632);
    }

    // Atomic one-time invalidation: transition to PROCESSING and invalidate OTP/QR
    const updated =
      await this.inventoryRequestRepository.conditionalUpdateStatus(
        String(request._id),
        InventoryRequestStatusEnum.PENDING,
        InventoryRequestStatusEnum.PROCESSING,
        {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: new Types.ObjectId(caller.id),
          pickupQrToken: null,
          otpHash: null,
        }
      );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_632);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.VERIFY_PICKUP_CODE,
      resourceType: AuditResourceEnum.INVENTORY_REQUEST,
      resourceId: String(request._id),
      before: request,
      after: updated,
    });

    const populated = await this.inventoryRequestRepository.findById(
      String(request._id)
    );
    const formatted = this.formatRequest(populated || updated);

    return validateResponse(verifiedHandoverDetailsResponseSchema, {
      id: formatted.id,
      requestCode: formatted.requestCode,
      type: formatted.type,
      status: formatted.status,
      customerId: formatted.customerId,
      customerName: (request.customerId as unknown as { name?: string })?.name,
      customerPhone: (request.customerId as unknown as { phoneNumber?: string })
        ?.phoneNumber,
      contractId: formatted.contractId,
      facilityId: formatted.facilityId,
      storageUnitId: formatted.storageUnitId,
      unitNumber: formatted.unitNumber,
      transporterInfo: formatted.transporterInfo,
      items: formatted.items,
      verifiedAt: updated.verifiedAt || new Date(),
      verifiedBy: caller.id,
    });
  }

  /**
   * 3. Staff completes Outbound Handover (Atomic deduction, movement logging, tier sync)
   */
  @Transactional()
  async completeOutboundHandover(
    id: string,
    data: CompleteOutboundHandoverRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<InventoryRequestResponse> {
    this.validateRoleAccess(caller);

    const facilityId = await this.resolveCallerAssignedFacilityId(caller);
    if (!facilityId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const request = await this.inventoryRequestRepository.findById(id, session);
    if (!request || request.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_630);
    }

    if (String(request.facilityId?._id || request.facilityId) !== facilityId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (request.status !== InventoryRequestStatusEnum.PROCESSING) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_632);
    }

    if (!data.evidenceImages || data.evidenceImages.length === 0) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_633);
    }

    const updatedItems = [];

    // Deduct inventory atomically for each item
    for (const reqItem of request.items) {
      const matchActual = data.actualItems?.find(
        (a) => String(a.skuId) === String(reqItem.skuId?._id || reqItem.skuId)
      );
      const actualQty =
        matchActual !== undefined
          ? matchActual.actualQuantity
          : reqItem.quantity;
      const discrepancyQty = Math.max(0, reqItem.quantity - actualQty);

      if (actualQty > 0) {
        const tierIdStr = String(reqItem.rackTierId?._id || reqItem.rackTierId);
        const skuIdStr = String(reqItem.skuId?._id || reqItem.skuId);

        const existingInv =
          await this.customerInventoryRepository.findByPosition(
            String(request.contractId?._id || request.contractId),
            skuIdStr,
            String(request.storageUnitId?._id || request.storageUnitId),
            tierIdStr,
            session
          );
        if (!existingInv || existingInv.quantity < actualQty) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_621);
        }

        if (
          existingInv.status &&
          existingInv.status !== InventoryItemStatusEnum.NORMAL
        ) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_644);
        }

        // Atomic decrement guard (prevents negative stock)
        const updatedInv =
          await this.customerInventoryRepository.incrementQuantity(
            String(existingInv._id),
            -actualQty,
            session
          );

        if (!updatedInv) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_621);
        }

        // Record immutable ledger movement
        const movementCode =
          await this.inventoryMovementRepository.generateMovementCode(session);

        await this.inventoryMovementRepository.create(
          {
            movementCode,
            type: MovementTypeEnum.OUT,
            customerInventoryId: updatedInv._id,
            customerId: request.customerId as unknown as Types.ObjectId,
            contractId: request.contractId as unknown as Types.ObjectId,
            facilityId: request.facilityId as unknown as Types.ObjectId,
            storageUnitId: request.storageUnitId as unknown as Types.ObjectId,
            skuId: new Types.ObjectId(skuIdStr),
            fromRackTierId: new Types.ObjectId(tierIdStr),
            toRackTierId: null,
            quantity: actualQty,
            previousQuantity: updatedInv.quantity + actualQty,
            newQuantity: updatedInv.quantity,
            performedBy: new Types.ObjectId(caller.id),
            requestId: request._id as unknown as Types.ObjectId,
            reason:
              discrepancyQty > 0
                ? `Partial Outbound Handover (${actualQty}/${reqItem.quantity}) - ${data.discrepancyReason || ''}`
                : 'Outbound Handover to Transporter',
          },
          session
        );

        // Check if shelf tier is now empty; if so, release back to AVAILABLE
        const activeItemsOnTier =
          await this.customerInventoryRepository.countActiveItemsOnTier(
            tierIdStr,
            session
          );
        if (activeItemsOnTier === 0) {
          await this.rackTierRepository.update(
            tierIdStr,
            { status: RackTierStatusEnum.AVAILABLE },
            session
          );
        }
      }

      updatedItems.push({
        skuId: reqItem.skuId,
        quantity: reqItem.quantity,
        actualQuantity: actualQty,
        discrepancyQuantity: discrepancyQty,
        storageRackId: reqItem.storageRackId,
        rackTierId: reqItem.rackTierId,
      });
    }

    const completed =
      await this.inventoryRequestRepository.conditionalUpdateStatus(
        id,
        InventoryRequestStatusEnum.PROCESSING,
        InventoryRequestStatusEnum.COMPLETED,
        {
          items: updatedItems,
          evidenceImages: data.evidenceImages,
          signatureUrl: data.signatureUrl || null,
          staffNotes: data.staffNotes || null,
          discrepancyReason: data.discrepancyReason || null,
          discrepancyImages: data.discrepancyImages || [],
          completedAt: new Date(),
          completedBy: new Types.ObjectId(caller.id),
        },
        session
      );

    this.auditLogService?.record({
      action: AuditActionEnum.COMPLETE_OUTBOUND_HANDOVER,
      resourceType: AuditResourceEnum.INVENTORY_REQUEST,
      resourceId: id,
      before: request,
      after: completed,
    });

    const populated = await this.inventoryRequestRepository.findById(
      id,
      session
    );
    return validateResponse(
      inventoryRequestResponseSchema,
      this.formatRequest(populated || (completed as IInventoryRequest))
    );
  }

  /**
   * 4. Customer cancels Outbound Request (Only allowed when PENDING)
   */
  async cancelOutboundRequest(
    id: string,
    caller: CallerContext,
    reason?: string
  ): Promise<InventoryRequestResponse> {
    this.validateRoleAccess(caller);

    const request = await this.inventoryRequestRepository.findById(id);
    if (!request || request.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_630);
    }

    if (String(request.customerId?._id || request.customerId) !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (request.status !== InventoryRequestStatusEnum.PENDING) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_634);
    }

    const cancelled =
      await this.inventoryRequestRepository.conditionalUpdateStatus(
        id,
        InventoryRequestStatusEnum.PENDING,
        InventoryRequestStatusEnum.CANCELLED,
        {
          cancelledAt: new Date(),
          staffNotes: reason?.trim()
            ? `Cancelled by customer: ${reason.trim()}`
            : 'Cancelled by customer',
          pickupQrToken: null,
          otpHash: null,
        }
      );

    if (!cancelled) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_634);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL_INVENTORY_REQUEST,
      resourceType: AuditResourceEnum.INVENTORY_REQUEST,
      resourceId: id,
      before: request,
      after: cancelled,
    });

    return validateResponse(
      inventoryRequestResponseSchema,
      this.formatRequest(cancelled)
    );
  }

  /**
   * 5. Staff assists Inbound delivery receipt (Creates request in Staging Area with 3 evidence images)
   */
  async createInboundRequest(
    data: CreateInboundRequest,
    caller: CallerContext
  ): Promise<InventoryRequestResponse> {
    this.validateRoleAccess(caller);

    const facilityId = await this.resolveCallerAssignedFacilityId(caller);
    if (!facilityId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const contract = await this.contractRepository.findById(data.contractId);
    if (!contract || contract.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    // Verify facility scope
    if (
      String(contract.facilityId?._id || contract.facilityId) !== facilityId
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (contract.status !== ContractStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_622);
    }

    // Require 3 evidence images for staff assisted inbound
    if (!data.evidenceImages || data.evidenceImages.length < 3) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_633);
    }

    const countToday = await this.inventoryRequestRepository.countRequestsToday(
      InventoryRequestTypeEnum.INBOUND
    );
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const requestCode = `REQ-IN-${dateStr}-${String(countToday + 1).padStart(4, '0')}`;

    const createdDoc = await this.inventoryRequestRepository.create({
      requestCode,
      type: InventoryRequestTypeEnum.INBOUND,
      status: InventoryRequestStatusEnum.PENDING_CUSTOMER_CONFIRMATION,
      customerId: contract.customerId as unknown as Types.ObjectId,
      contractId: new Types.ObjectId(data.contractId),
      facilityId: new Types.ObjectId(facilityId),
      storageUnitId: contract.storageUnitId as unknown as Types.ObjectId,
      items: data.items.map((it) => ({
        skuId: new Types.ObjectId(it.skuId),
        quantity: it.quantity,
        storageRackId: it.storageRackId
          ? new Types.ObjectId(it.storageRackId)
          : undefined,
        rackTierId: it.rackTierId
          ? new Types.ObjectId(it.rackTierId)
          : undefined,
      })),
      transporterInfo: data.transporterInfo,
      evidenceImages: data.evidenceImages,
      signatureUrl: data.signatureUrl || null,
      staffNotes: data.staffNotes || null,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: new Types.ObjectId(caller.id),
    });

    this.auditLogService?.record({
      action: AuditActionEnum.CREATE_INVENTORY_REQUEST,
      resourceType: AuditResourceEnum.INVENTORY_REQUEST,
      resourceId: String(createdDoc._id),
      after: createdDoc,
    });

    // Schedule 24h BullMQ delayed job for auto-accept
    void inventoryRequestQueue
      .addAutoAcceptSingleJob(String(createdDoc._id))
      .catch(() => {});

    const populated = await this.inventoryRequestRepository.findById(
      String(createdDoc._id)
    );
    return validateResponse(
      inventoryRequestResponseSchema,
      this.formatRequest(populated || createdDoc)
    );
  }

  /**
   * 6. Customer confirms Inbound receipt (or automatically transitions to READY_TO_PUTAWAY / COMPLETED)
   */
  @Transactional()
  async confirmInboundRequest(
    id: string,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<InventoryRequestResponse> {
    this.validateRoleAccess(caller);

    const request = await this.inventoryRequestRepository.findById(id, session);
    if (!request || request.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_630);
    }

    if (String(request.customerId?._id || request.customerId) !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (
      request.status !==
      InventoryRequestStatusEnum.PENDING_CUSTOMER_CONFIRMATION
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_632);
    }

    // Check if shelf tiers were pre-assigned during initial receipt
    const hasPreassignedTiers = request.items.every(
      (it) => it.storageRackId && it.rackTierId
    );

    if (hasPreassignedTiers) {
      // Automatically increment stock into preassigned tiers and complete
      for (const item of request.items) {
        const tierIdStr = String(item.rackTierId?._id || item.rackTierId);
        const skuIdStr = String(item.skuId?._id || item.skuId);

        const existingInv =
          await this.customerInventoryRepository.findByPosition(
            String(request.contractId?._id || request.contractId),
            skuIdStr,
            String(request.storageUnitId?._id || request.storageUnitId),
            tierIdStr,
            session
          );

        let finalInv;
        let prevQty = 0;
        if (!existingInv) {
          finalInv = await this.customerInventoryRepository.create(
            {
              customerId: request.customerId as unknown as Types.ObjectId,
              contractId: request.contractId as unknown as Types.ObjectId,
              facilityId: request.facilityId as unknown as Types.ObjectId,
              storageUnitId: request.storageUnitId as unknown as Types.ObjectId,
              storageRackId: item.storageRackId as unknown as Types.ObjectId,
              rackTierId: item.rackTierId as unknown as Types.ObjectId,
              skuId: new Types.ObjectId(skuIdStr),
              quantity: item.quantity,
              lastMovementAt: new Date(),
            },
            session
          );
        } else {
          prevQty = existingInv.quantity;
          finalInv = await this.customerInventoryRepository.incrementQuantity(
            String(existingInv._id),
            item.quantity,
            session
          );
        }

        const movementCode =
          await this.inventoryMovementRepository.generateMovementCode(session);

        await this.inventoryMovementRepository.create(
          {
            movementCode,
            type: MovementTypeEnum.IN,
            customerInventoryId: finalInv!._id,
            customerId: request.customerId as unknown as Types.ObjectId,
            contractId: request.contractId as unknown as Types.ObjectId,
            facilityId: request.facilityId as unknown as Types.ObjectId,
            storageUnitId: request.storageUnitId as unknown as Types.ObjectId,
            skuId: new Types.ObjectId(skuIdStr),
            fromRackTierId: null,
            toRackTierId: new Types.ObjectId(tierIdStr),
            quantity: item.quantity,
            previousQuantity: prevQty,
            newQuantity: prevQty + item.quantity,
            performedBy: new Types.ObjectId(caller.id),
            requestId: request._id as unknown as Types.ObjectId,
            reason: 'Inbound Confirmation (Pre-assigned Tiers)',
          },
          session
        );

        await this.rackTierRepository.update(
          tierIdStr,
          { status: RackTierStatusEnum.OCCUPIED },
          session
        );
      }

      const completed =
        await this.inventoryRequestRepository.conditionalUpdateStatus(
          id,
          InventoryRequestStatusEnum.PENDING_CUSTOMER_CONFIRMATION,
          InventoryRequestStatusEnum.COMPLETED,
          {
            completedAt: new Date(),
          },
          session
        );

      void inventoryRequestQueue.removeAutoAcceptSingleJob(id).catch(() => {});

      return validateResponse(
        inventoryRequestResponseSchema,
        this.formatRequest(completed || request)
      );
    } else {
      // Transition to READY_TO_PUTAWAY
      const ready =
        await this.inventoryRequestRepository.conditionalUpdateStatus(
          id,
          InventoryRequestStatusEnum.PENDING_CUSTOMER_CONFIRMATION,
          InventoryRequestStatusEnum.READY_TO_PUTAWAY,
          {},
          session
        );

      void inventoryRequestQueue.removeAutoAcceptSingleJob(id).catch(() => {});

      return validateResponse(
        inventoryRequestResponseSchema,
        this.formatRequest(ready || request)
      );
    }
  }

  /**
   * 7. Customer disputes Inbound delivery
   */
  async disputeInboundRequest(
    id: string,
    caller: CallerContext,
    disputeReason: string
  ): Promise<InventoryRequestResponse> {
    this.validateRoleAccess(caller);

    const request = await this.inventoryRequestRepository.findById(id);
    if (!request || request.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_630);
    }

    if (String(request.customerId?._id || request.customerId) !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (
      request.status !==
      InventoryRequestStatusEnum.PENDING_CUSTOMER_CONFIRMATION
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_632);
    }

    const disputed =
      await this.inventoryRequestRepository.conditionalUpdateStatus(
        id,
        InventoryRequestStatusEnum.PENDING_CUSTOMER_CONFIRMATION,
        InventoryRequestStatusEnum.DISPUTED,
        {
          customerFeedbackNotes: disputeReason.trim(),
        }
      );

    this.auditLogService?.record({
      action: AuditActionEnum.DISPUTE_INBOUND_REQUEST,
      resourceType: AuditResourceEnum.INVENTORY_REQUEST,
      resourceId: id,
      before: request,
      after: disputed,
    });

    void inventoryRequestQueue.removeAutoAcceptSingleJob(id).catch(() => {});

    return validateResponse(
      inventoryRequestResponseSchema,
      this.formatRequest(disputed || request)
    );
  }

  /**
   * 8. Staff performs Putaway (moves goods from staging area onto shelf tiers)
   */
  @Transactional()
  async putawayInboundRequest(
    id: string,
    data: PutawayInboundRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<InventoryRequestResponse> {
    this.validateRoleAccess(caller);

    const facilityId = await this.resolveCallerAssignedFacilityId(caller);
    if (!facilityId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const request = await this.inventoryRequestRepository.findById(id, session);
    if (!request || request.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_630);
    }

    if (String(request.facilityId?._id || request.facilityId) !== facilityId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (request.status !== InventoryRequestStatusEnum.READY_TO_PUTAWAY) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_632);
    }

    const updatedItems = [];

    // Increase stock into specified tiers
    for (const placement of data.placements) {
      // Verify rack tier belongs to the storage unit
      const tier = await this.rackTierRepository.findById(placement.rackTierId);
      if (!tier || tier.deleted) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_601);
      }
      if (
        String(tier.storageUnitId) !==
        String(request.storageUnitId?._id || request.storageUnitId)
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_624);
      }

      // Rack Ownership Guard (Rule 637)
      const storageRackId = toId(tier.storageRackId);
      const contract = await this.contractRepository.findById(
        toId(request.contractId),
        session
      );
      if (contract) {
        const rentedRackIds = (contract.rentedRackIds || []).map((id) =>
          toId(id)
        );
        if (
          rentedRackIds.length > 0 &&
          !rentedRackIds.includes(storageRackId)
        ) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_637);
        }
        const rack = await this.storageRackRepository.findById(storageRackId);
        if (
          rack?.currentContractId &&
          toId(rack.currentContractId) !== toId(contract._id)
        ) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_637);
        }
      }

      const existingInv = await this.customerInventoryRepository.findByPosition(
        String(request.contractId?._id || request.contractId),
        placement.skuId,
        String(request.storageUnitId?._id || request.storageUnitId),
        placement.rackTierId,
        session
      );

      let finalInv;
      let prevQty = 0;
      if (!existingInv) {
        finalInv = await this.customerInventoryRepository.create(
          {
            customerId: request.customerId as unknown as Types.ObjectId,
            contractId: request.contractId as unknown as Types.ObjectId,
            facilityId: request.facilityId as unknown as Types.ObjectId,
            storageUnitId: request.storageUnitId as unknown as Types.ObjectId,
            storageRackId: new Types.ObjectId(placement.storageRackId),
            rackTierId: new Types.ObjectId(placement.rackTierId),
            skuId: new Types.ObjectId(placement.skuId),
            quantity: placement.quantity,
            lastMovementAt: new Date(),
          },
          session
        );
      } else {
        prevQty = existingInv.quantity;
        finalInv = await this.customerInventoryRepository.incrementQuantity(
          String(existingInv._id),
          placement.quantity,
          session
        );
      }

      const movementCode =
        await this.inventoryMovementRepository.generateMovementCode(session);

      await this.inventoryMovementRepository.create(
        {
          movementCode,
          type: MovementTypeEnum.IN,
          customerInventoryId: finalInv!._id,
          customerId: request.customerId as unknown as Types.ObjectId,
          contractId: request.contractId as unknown as Types.ObjectId,
          facilityId: request.facilityId as unknown as Types.ObjectId,
          storageUnitId: request.storageUnitId as unknown as Types.ObjectId,
          skuId: new Types.ObjectId(placement.skuId),
          fromRackTierId: null,
          toRackTierId: new Types.ObjectId(placement.rackTierId),
          quantity: placement.quantity,
          previousQuantity: prevQty,
          newQuantity: prevQty + placement.quantity,
          performedBy: new Types.ObjectId(caller.id),
          requestId: request._id as unknown as Types.ObjectId,
          reason: 'Inbound Putaway to Shelf Tier',
        },
        session
      );

      await this.rackTierRepository.update(
        placement.rackTierId,
        { status: RackTierStatusEnum.OCCUPIED },
        session
      );

      updatedItems.push({
        skuId: new Types.ObjectId(placement.skuId),
        quantity: placement.quantity,
        actualQuantity: placement.quantity,
        storageRackId: new Types.ObjectId(placement.storageRackId),
        rackTierId: new Types.ObjectId(placement.rackTierId),
      });
    }

    const completed =
      await this.inventoryRequestRepository.conditionalUpdateStatus(
        id,
        InventoryRequestStatusEnum.READY_TO_PUTAWAY,
        InventoryRequestStatusEnum.COMPLETED,
        {
          items: updatedItems,
          completedAt: new Date(),
          completedBy: new Types.ObjectId(caller.id),
        },
        session
      );

    this.auditLogService?.record({
      action: AuditActionEnum.PUTAWAY_INBOUND_REQUEST,
      resourceType: AuditResourceEnum.INVENTORY_REQUEST,
      resourceId: id,
      before: request,
      after: completed,
    });

    const populated = await this.inventoryRequestRepository.findById(
      id,
      session
    );
    return validateResponse(
      inventoryRequestResponseSchema,
      this.formatRequest(populated || (completed as IInventoryRequest))
    );
  }

  /**
   * 9. Query Paginated Inventory Requests
   */
  async findPaginatedRequests(
    query: InventoryRequestQuery,
    caller: CallerContext
  ): Promise<PaginatedInventoryRequestResponse> {
    this.validateRoleAccess(caller);

    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const isStaffOrFm =
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER;

    if (isCustomer) {
      query.customerId = caller.id;
    } else if (isStaffOrFm) {
      const facilityId = await this.resolveCallerAssignedFacilityId(caller);
      if (!facilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
      query.facilityId = facilityId;
    }

    const result = await this.inventoryRequestRepository.findPaginated(query);

    return {
      items: result.items.map((it) =>
        validateResponse(inventoryRequestResponseSchema, this.formatRequest(it))
      ),
      pagination: result.pagination,
    };
  }

  /**
   * 10. Get Single Request Details
   */
  async getRequestById(
    id: string,
    caller: CallerContext
  ): Promise<InventoryRequestResponse> {
    this.validateRoleAccess(caller);

    const request = await this.inventoryRequestRepository.findById(id);
    if (!request || request.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_630);
    }

    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const isStaffOrFm =
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER;

    if (isCustomer) {
      if (String(request.customerId?._id || request.customerId) !== caller.id) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else if (isStaffOrFm) {
      const facilityId = await this.resolveCallerAssignedFacilityId(caller);
      if (
        String(request.facilityId?._id || request.facilityId) !== facilityId
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    return validateResponse(
      inventoryRequestResponseSchema,
      this.formatRequest(request)
    );
  }

  /**
   * Background Worker Job: Automatically confirms Inbound requests older than 24h
   */
  async autoAcceptInboundRequests(): Promise<number> {
    const thresholdDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pendingRequests =
      await this.inventoryRequestRepository.findPendingConfirmationOlderThan(
        thresholdDate
      );

    let processedCount = 0;
    for (const req of pendingRequests) {
      try {
        const dummyCaller: CallerContext = {
          id: String(req.customerId?._id || req.customerId),
          role: RoleEnum.CUSTOMER,
        };
        await this.confirmInboundRequest(String(req._id), dummyCaller);
        await this.inventoryRequestRepository.updateById(String(req._id), {
          isAutoConfirmed: true,
        });

        this.auditLogService?.record({
          action: AuditActionEnum.CONFIRM_INBOUND_REQUEST,
          resourceType: AuditResourceEnum.INVENTORY_REQUEST,
          resourceId: String(req._id),
          actor: { id: 'SYSTEM', role: 'SYSTEM', email: 'system@internal' },
          metadata: { reason: 'Auto-accepted after 24h expiration policy' },
        });

        processedCount++;
      } catch (err) {
        console.error(`Failed to auto-confirm request ${req._id}:`, err);
      }
    }

    return processedCount;
  }

  private formatRequest(doc: IInventoryRequest) {
    const raw = doc.toObject ? doc.toObject() : doc;

    return {
      id: String(raw._id),
      requestCode: raw.requestCode,
      type: raw.type,
      status: raw.status,
      customerId: String(raw.customerId?._id || raw.customerId),
      contractId: String(raw.contractId?._id || raw.contractId),
      facilityId: String(raw.facilityId?._id || raw.facilityId),
      facilityCode: (raw.facilityId as unknown as { code?: string })?.code,
      facilityName: (raw.facilityId as unknown as { name?: string })?.name,
      storageUnitId: String(raw.storageUnitId?._id || raw.storageUnitId),
      unitNumber: (raw.storageUnitId as unknown as { unitNumber?: string })
        ?.unitNumber,
      items: (raw.items || []).map(
        (it: {
          skuId?:
            | {
                _id?: Types.ObjectId;
                skuCode?: string;
                name?: string;
                barcode?: string;
                uom?: string;
              }
            | Types.ObjectId;
          storageRackId?:
            | {
                _id?: Types.ObjectId;
                rackCode?: string;
                aisle?: string;
                bay?: number;
                zone?: string;
              }
            | Types.ObjectId;
          rackTierId?:
            | {
                _id?: Types.ObjectId;
                tierNumber?: number;
              }
            | Types.ObjectId;
          quantity: number;
          actualQuantity?: number;
          discrepancyQuantity?: number;
        }) => ({
          skuId: String(
            (it.skuId as { _id?: Types.ObjectId })?._id || it.skuId
          ),
          skuCode: (it.skuId as { skuCode?: string })?.skuCode,
          name: (it.skuId as { name?: string })?.name,
          barcode: (it.skuId as { barcode?: string })?.barcode,
          uom: (it.skuId as { uom?: string })?.uom,
          quantity: it.quantity,
          actualQuantity: it.actualQuantity,
          discrepancyQuantity: it.discrepancyQuantity,
          storageRackId: it.storageRackId
            ? String(
                (it.storageRackId as { _id?: Types.ObjectId })?._id ||
                  it.storageRackId
              )
            : undefined,
          rackCode: (it.storageRackId as { rackCode?: string })?.rackCode,
          aisle: (it.storageRackId as { aisle?: string })?.aisle,
          bay: (it.storageRackId as { bay?: number })?.bay,
          zone: (it.storageRackId as { zone?: string })?.zone,
          rackTierId: it.rackTierId
            ? String(
                (it.rackTierId as { _id?: Types.ObjectId })?._id ||
                  it.rackTierId
              )
            : undefined,
          tierNumber: (it.rackTierId as { tierNumber?: number })?.tierNumber,
        })
      ),
      pickupQrToken: raw.pickupQrToken || null,
      pickupQrPayload: raw.pickupQrToken
        ? `PICKUP:${raw.requestCode}:${raw.pickupQrToken}`
        : null,
      rawOtpCode: null as string | null,
      expiresAt: raw.expiresAt || null,
      isVerified: Boolean(raw.isVerified),
      transporterInfo: raw.transporterInfo,
      evidenceImages: raw.evidenceImages || [],
      signatureUrl: raw.signatureUrl || null,
      staffNotes: raw.staffNotes || null,
      discrepancyReason: raw.discrepancyReason || null,
      discrepancyImages: raw.discrepancyImages || [],
      customerFeedbackNotes: raw.customerFeedbackNotes || null,
      verifiedAt: raw.verifiedAt || null,
      verifiedBy: raw.verifiedBy ? String(raw.verifiedBy) : null,
      completedAt: raw.completedAt || null,
      completedBy: raw.completedBy ? String(raw.completedBy) : null,
      cancelledAt: raw.cancelledAt || null,
      isAutoConfirmed: Boolean(raw.isAutoConfirmed),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
