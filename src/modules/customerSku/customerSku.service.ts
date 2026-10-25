import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { CustomerSkuStatusEnum } from '../../common/enums/customerSku.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import type { CustomerSkuRepository } from './customerSku.repository.ts';
import type { CustomerInventoryRepository } from '../customerInventory/customerInventory.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type {
  CreateCustomerSkuRequest,
  UpdateCustomerSkuRequest,
  CustomerSkuQuery,
} from './schemas/customerSku.request.schema.ts';
import {
  customerSkuResponseSchema,
  type CustomerSkuResponse,
  type PaginatedCustomerSkuResponse,
} from './schemas/customerSku.response.schema.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import type { ICustomerSku } from './customerSku.model.ts';

export interface CallerContext {
  id: string;
  role?: string;
  assignedFacilityId?: string;
}

export class CustomerSkuService {
  constructor(
    private readonly customerSkuRepository: CustomerSkuRepository,
    private readonly auditLogService?: AuditLogService,
    private readonly customerInventoryRepository?: CustomerInventoryRepository,
    private readonly contractRepository?: ContractRepository,
    private readonly userRepository?: UserRepository
  ) {}

  /**
   * Helper to validate basic caller identity
   */
  private validateRoleAccess(caller: CallerContext) {
    if (!caller.id) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
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
        caller.assignedFacilityId = String(user.assignedFacilityId);
        return caller.assignedFacilityId;
      }
    }
    return undefined;
  }

  /**
   * Helper to resolve and assert the customerId owning the SKU (Rule 14 & Task 7C Delegation)
   * - CUSTOMER: Always restricted to their own account (caller.id)
   * - STAFF / FM / OPS / ADMIN: Must provide requestedCustomerId
   * - STAFF / FM: The customer must have a contract (DRAFT, ACTIVE, OVERDUE) at the staff's assigned facility
   */
  private async resolveAndAssertCustomerId(
    caller: CallerContext,
    requestedCustomerId?: string
  ): Promise<string> {
    this.validateRoleAccess(caller);

    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (isCustomer) {
      return caller.id;
    }

    if (!requestedCustomerId || !requestedCustomerId.trim()) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_200, ['Customer ID']);
    }

    const targetCustomerId = requestedCustomerId.trim();

    // Facility Staff or Facility Manager: verify resource scope in assigned facility
    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const facilityId = await this.resolveCallerAssignedFacilityId(caller);
      if (!facilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }

      if (this.contractRepository) {
        const hasContract =
          await this.contractRepository.hasActiveContractAtFacility(
            targetCustomerId,
            facilityId
          );
        if (!hasContract) {
          throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
        }
      }
    }

    return targetCustomerId;
  }

  /**
   * Helper to verify permission to view or manipulate a specific SKU (Rule 14)
   */
  private async assertCanAccessCustomerSku(
    caller: CallerContext,
    skuCustomerId: string
  ): Promise<void> {
    this.validateRoleAccess(caller);

    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (isCustomer) {
      if (skuCustomerId !== caller.id) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
      return;
    }

    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const facilityId = await this.resolveCallerAssignedFacilityId(caller);
      if (!facilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }

      if (this.contractRepository) {
        const hasContract =
          await this.contractRepository.hasActiveContractAtFacility(
            skuCustomerId,
            facilityId
          );
        if (!hasContract) {
          throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
        }
      }
      return;
    }

    // BUSINESS_OPS_MANAGER & SYSTEM_ADMIN: Allowed
  }

  /**
   * Calculate volume in cubic centimeters based on dimensions in cm
   */
  private calculateVolume(dimensions?: {
    length: number;
    width: number;
    height: number;
  }): number | undefined {
    if (!dimensions) return undefined;
    return Number(
      (dimensions.length * dimensions.width * dimensions.height).toFixed(2)
    );
  }

  /**
   * Create a new SKU
   * - Customer creates for their own account
   * - Staff / FM / Ops / Admin creates on behalf of specified customer (Task 7C Staff Delegation)
   */
  async createSku(
    data: CreateCustomerSkuRequest,
    caller: CallerContext
  ): Promise<CustomerSkuResponse> {
    this.validateRoleAccess(caller);

    const customerId = await this.resolveAndAssertCustomerId(
      caller,
      data.customerId
    );
    const formattedSkuCode = data.skuCode.trim().toUpperCase();

    // 1. Check for duplicate skuCode within the same customer
    const existingBySkuCode = await this.customerSkuRepository.findBySkuCode(
      customerId,
      formattedSkuCode
    );
    if (existingBySkuCode) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_611);
    }

    // 2. Check for duplicate barcode if provided
    if (data.barcode && data.barcode.trim()) {
      const existingByBarcode = await this.customerSkuRepository.findByBarcode(
        customerId,
        data.barcode.trim()
      );
      if (existingByBarcode) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_612);
      }
    }

    // 3. Compute volume if dimensions are provided
    const volume = this.calculateVolume(data.dimensions);

    // 4. Persist to database
    const createdDoc = await this.customerSkuRepository.create({
      customerId: customerId as unknown as ICustomerSku['customerId'],
      skuCode: formattedSkuCode,
      name: data.name.trim(),
      description: data.description?.trim(),
      category: data.category?.trim(),
      barcode: data.barcode?.trim(),
      uom: data.uom?.trim() || 'piece',
      dimensions: data.dimensions,
      volume,
      weightKg: data.weightKg,
      imageUrl: data.imageUrl?.trim(),
      status: data.status || CustomerSkuStatusEnum.ACTIVE,
      notes: data.notes?.trim(),
    });

    // 5. Record Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.CREATE,
      resourceType: AuditResourceEnum.CUSTOMER_SKU,
      resourceId: String(createdDoc._id),
      after: createdDoc,
    });

    const populated = await this.customerSkuRepository.findById(
      String(createdDoc._id)
    );
    return validateResponse(
      customerSkuResponseSchema,
      this.formatSku(populated || createdDoc)
    );
  }

  /**
   * Get paginated SKU list
   * - CUSTOMER: Only views their own SKUs
   * - Staff / FM: Must specify a customerId under their assigned facility
   * - Ops / Admin: Views by customerId or entire system
   */
  async findAll(
    query: CustomerSkuQuery,
    caller: CallerContext
  ): Promise<PaginatedCustomerSkuResponse> {
    this.validateRoleAccess(caller);

    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    let enforcedCustomerId: string | undefined;

    if (isCustomer) {
      enforcedCustomerId = caller.id;
    } else if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      if (!query.customerId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_200, ['Customer ID']);
      }
      await this.assertCanAccessCustomerSku(caller, query.customerId);
      enforcedCustomerId = query.customerId;
    } else {
      enforcedCustomerId = query.customerId;
    }

    const result = await this.customerSkuRepository.findAll(
      query,
      enforcedCustomerId
    );

    return {
      items: result.items.map((item) =>
        validateResponse(customerSkuResponseSchema, this.formatSku(item))
      ),
      pagination: result.pagination,
    };
  }

  /**
   * Get SKU details by ID
   */
  async findById(
    id: string,
    caller: CallerContext
  ): Promise<CustomerSkuResponse> {
    this.validateRoleAccess(caller);

    const sku = await this.customerSkuRepository.findById(id);
    if (!sku) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    const skuCustomerId = String(sku.customerId?._id || sku.customerId);
    await this.assertCanAccessCustomerSku(caller, skuCustomerId);

    return validateResponse(customerSkuResponseSchema, this.formatSku(sku));
  }

  /**
   * Quick lookup SKU by barcode
   */
  async findByBarcode(
    barcode: string,
    caller: CallerContext,
    targetCustomerId?: string
  ): Promise<CustomerSkuResponse> {
    this.validateRoleAccess(caller);

    const customerId = await this.resolveAndAssertCustomerId(
      caller,
      targetCustomerId
    );

    const sku = await this.customerSkuRepository.findByBarcode(
      customerId,
      barcode.trim()
    );
    if (!sku) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    return validateResponse(customerSkuResponseSchema, this.formatSku(sku));
  }

  /**
   * Update SKU details
   * - Customer updates their own SKU
   * - Staff / FM updates SKU on behalf of customer under their assigned facility
   */
  async updateSku(
    id: string,
    data: UpdateCustomerSkuRequest,
    caller: CallerContext
  ): Promise<CustomerSkuResponse> {
    this.validateRoleAccess(caller);

    const existing = await this.customerSkuRepository.findById(id);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    const skuCustomerId = String(
      existing.customerId?._id || existing.customerId
    );
    await this.assertCanAccessCustomerSku(caller, skuCustomerId);

    const customerId = skuCustomerId;
    const updateData: Partial<ICustomerSku> = {};

    // 1. Check duplicate skuCode if changed
    if (data.skuCode) {
      const formattedSkuCode = data.skuCode.trim().toUpperCase();
      if (formattedSkuCode !== existing.skuCode) {
        const duplicate = await this.customerSkuRepository.findBySkuCode(
          customerId,
          formattedSkuCode
        );
        if (duplicate && String(duplicate._id) !== id) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_611);
        }
        updateData.skuCode = formattedSkuCode;
      }
    }

    // 2. Check duplicate barcode if changed
    if (data.barcode !== undefined) {
      const trimmedBarcode = data.barcode?.trim() || undefined;
      if (trimmedBarcode && trimmedBarcode !== existing.barcode) {
        const duplicateBarcode = await this.customerSkuRepository.findByBarcode(
          customerId,
          trimmedBarcode
        );
        if (duplicateBarcode && String(duplicateBarcode._id) !== id) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_612);
        }
      }
      updateData.barcode = trimmedBarcode;
    }

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined)
      updateData.description = data.description.trim();
    if (data.category !== undefined) updateData.category = data.category.trim();
    if (data.uom !== undefined) updateData.uom = data.uom.trim();
    if (data.weightKg !== undefined) updateData.weightKg = data.weightKg;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl.trim();
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes.trim();

    // 3. Update dimensions and recalculate volume
    if (data.dimensions) {
      updateData.dimensions = data.dimensions;
      updateData.volume = this.calculateVolume(data.dimensions);
    }

    const updated = await this.customerSkuRepository.update(id, updateData);
    if (!updated) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    // 4. Record Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.UPDATE,
      resourceType: AuditResourceEnum.CUSTOMER_SKU,
      resourceId: id,
      before: existing,
      after: updated,
    });

    return validateResponse(customerSkuResponseSchema, this.formatSku(updated));
  }

  /**
   * Hook to check active inventory quantity of SKU
   * Linked with CustomerInventory (Task 6C)
   */
  async getActiveInventoryQuantity(skuId: string): Promise<number> {
    if (!this.customerInventoryRepository) return 0;
    return this.customerInventoryRepository.sumQuantityBySkuId(skuId);
  }

  /**
   * Soft-delete SKU
   * Guard: Only owning Customer or Ops/Admin can delete; blocked if inventory exists
   */
  async deleteSku(id: string, caller: CallerContext): Promise<void> {
    this.validateRoleAccess(caller);

    const existing = await this.customerSkuRepository.findById(id);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const isOpsOrAdmin =
      caller.role === RoleEnum.BUSINESS_OPS_MANAGER ||
      caller.role === RoleEnum.SYSTEM_ADMIN;

    if (!isCustomer && !isOpsOrAdmin) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (
      isCustomer &&
      String(existing.customerId?._id || existing.customerId) !== caller.id
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    // Guard rule: Block delete if active inventory exists
    const activeInventoryQty = await this.getActiveInventoryQuantity(id);
    if (activeInventoryQty > 0) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_613);
    }

    await this.customerSkuRepository.softDelete(id, caller.id);

    // Record Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.DELETE,
      resourceType: AuditResourceEnum.CUSTOMER_SKU,
      resourceId: id,
      before: existing,
    });
  }

  /**
   * Restore soft-deleted SKU
   */
  async restoreSku(
    id: string,
    caller: CallerContext
  ): Promise<CustomerSkuResponse> {
    this.validateRoleAccess(caller);

    const existing = await this.customerSkuRepository.findById(id, true);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const isOpsOrAdmin =
      caller.role === RoleEnum.BUSINESS_OPS_MANAGER ||
      caller.role === RoleEnum.SYSTEM_ADMIN;

    if (!isCustomer && !isOpsOrAdmin) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const skuCustomerId = String(
      existing.customerId?._id || existing.customerId
    );
    if (isCustomer && skuCustomerId !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    // Check if an active SKU with same skuCode already exists
    const activeDuplicate = await this.customerSkuRepository.findBySkuCode(
      skuCustomerId,
      existing.skuCode
    );
    if (activeDuplicate && String(activeDuplicate._id) !== id) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_611);
    }

    const restored = await this.customerSkuRepository.restore(id);
    if (!restored) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    // Record Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.RESTORE,
      resourceType: AuditResourceEnum.CUSTOMER_SKU,
      resourceId: id,
      before: { deleted: true },
      after: { deleted: false },
    });

    return validateResponse(
      customerSkuResponseSchema,
      this.formatSku(restored)
    );
  }

  /**
   * Format Mongoose document to Response Object
   */
  private formatSku(doc: ICustomerSku) {
    const raw = doc.toObject ? doc.toObject() : doc;

    let customerObj = undefined;
    if (
      raw.customerId &&
      typeof raw.customerId === 'object' &&
      'name' in raw.customerId
    ) {
      const c = raw.customerId as unknown as {
        _id: string;
        name: string;
        email?: string;
        phoneNumber?: string;
        role?: string;
        status?: string;
      };
      customerObj = {
        id: String(c._id),
        name: c.name,
        email: c.email,
        phoneNumber: c.phoneNumber,
        role: c.role,
        status: c.status,
      };
    }

    return {
      id: String(raw._id),
      customerId: String(
        typeof raw.customerId === 'object' &&
          raw.customerId !== null &&
          '_id' in raw.customerId
          ? (raw.customerId as { _id: string })._id
          : raw.customerId
      ),
      skuCode: raw.skuCode,
      name: raw.name,
      description: raw.description,
      category: raw.category,
      barcode: raw.barcode,
      uom: raw.uom,
      dimensions: raw.dimensions
        ? {
            length: raw.dimensions.length,
            width: raw.dimensions.width,
            height: raw.dimensions.height,
          }
        : undefined,
      volume: raw.volume,
      weightKg: raw.weightKg,
      imageUrl: raw.imageUrl,
      status: raw.status,
      notes: raw.notes,
      customer: customerObj,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
