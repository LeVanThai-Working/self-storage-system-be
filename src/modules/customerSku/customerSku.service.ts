import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { CustomerSkuStatusEnum } from '../../common/enums/customerSku.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import type { CustomerSkuRepository } from './customerSku.repository.ts';
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
    private readonly auditLogService?: AuditLogService
  ) {}

  /**
   * Helper kiểm tra quyền truy cập của caller
   */
  private validateRoleAccess(
    caller: CallerContext,
    requiresCustomerOnly = false
  ) {
    if (!caller.id) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    // Nhân viên phổ thông (FACILITY_STAFF) mặc định bị chặn để bảo vệ an toàn hàng hoá
    if (caller.role === RoleEnum.FACILITY_STAFF) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    // Nếu endpoint bắt buộc chỉ dành cho Customer (mutations: Create, Update, Delete, Restore)
    if (
      requiresCustomerOnly &&
      caller.role &&
      caller.role !== RoleEnum.CUSTOMER
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }
  }

  /**
   * Tính toán thể tích theo kích thước cm (ra cm3 hoặc m3 tương ứng)
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
   * Tạo mới mã hàng SKU
   * Chỉ dành riêng cho Customer tự tạo cho tài khoản của mình
   */
  async createSku(
    data: CreateCustomerSkuRequest,
    caller: CallerContext
  ): Promise<CustomerSkuResponse> {
    this.validateRoleAccess(caller, true);

    const customerId = caller.id;
    const formattedSkuCode = data.skuCode.trim().toUpperCase();

    // 1. Kiểm tra trùng skuCode trong cùng tài khoản khách
    const existingBySkuCode = await this.customerSkuRepository.findBySkuCode(
      customerId,
      formattedSkuCode
    );
    if (existingBySkuCode) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_611);
    }

    // 2. Kiểm tra trùng barcode nếu có khai báo
    if (data.barcode && data.barcode.trim()) {
      const existingByBarcode = await this.customerSkuRepository.findByBarcode(
        customerId,
        data.barcode.trim()
      );
      if (existingByBarcode) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_612);
      }
    }

    // 3. Tính toán volume nếu có dimensions
    const volume = this.calculateVolume(data.dimensions);

    // 4. Lưu vào database
    const createdDoc = await this.customerSkuRepository.create({
      customerId: customerId as unknown as ICustomerSku['customerId'],
      skuCode: formattedSkuCode,
      name: data.name.trim(),
      description: data.description?.trim(),
      category: data.category?.trim(),
      barcode: data.barcode?.trim(),
      uom: data.uom?.trim() || 'cái',
      dimensions: data.dimensions,
      volume,
      weightKg: data.weightKg,
      imageUrl: data.imageUrl?.trim(),
      status: data.status || CustomerSkuStatusEnum.ACTIVE,
      notes: data.notes?.trim(),
    });

    // 5. Ghi Audit Log
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
   * Lấy danh sách SKU có phân trang
   * - Nếu là CUSTOMER: Chỉ xem SKU của chính mình
   * - Nếu là FM/Admin: Xem theo customerId (hoặc tất cả nếu Admin)
   */
  async findAll(
    query: CustomerSkuQuery,
    caller: CallerContext
  ): Promise<PaginatedCustomerSkuResponse> {
    this.validateRoleAccess(caller, false);

    // Nếu caller là CUSTOMER, ép buộc lọc theo chính customerId đó
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const enforcedCustomerId = isCustomer ? caller.id : query.customerId;

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
   * Lấy chi tiết 1 SKU theo ID
   */
  async findById(
    id: string,
    caller: CallerContext
  ): Promise<CustomerSkuResponse> {
    this.validateRoleAccess(caller, false);

    const sku = await this.customerSkuRepository.findById(id);
    if (!sku) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    // Nếu là CUSTOMER, kiểm tra quyền sở hữu
    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    if (
      isCustomer &&
      String(sku.customerId?._id || sku.customerId) !== caller.id
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    return validateResponse(customerSkuResponseSchema, this.formatSku(sku));
  }

  /**
   * Tra cứu nhanh SKU qua mã barcode
   */
  async findByBarcode(
    barcode: string,
    caller: CallerContext,
    targetCustomerId?: string
  ): Promise<CustomerSkuResponse> {
    this.validateRoleAccess(caller, false);

    const isCustomer = !caller.role || caller.role === RoleEnum.CUSTOMER;
    const customerId = isCustomer ? caller.id : targetCustomerId || caller.id;

    const sku = await this.customerSkuRepository.findByBarcode(
      customerId,
      barcode
    );
    if (!sku) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    return validateResponse(customerSkuResponseSchema, this.formatSku(sku));
  }

  /**
   * Cập nhật thông tin SKU
   * Chỉ dành cho Customer sở hữu SKU
   */
  async updateSku(
    id: string,
    data: UpdateCustomerSkuRequest,
    caller: CallerContext
  ): Promise<CustomerSkuResponse> {
    this.validateRoleAccess(caller, true);

    const existing = await this.customerSkuRepository.findById(id);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    // Kiểm tra quyền sở hữu
    if (String(existing.customerId?._id || existing.customerId) !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const customerId = caller.id;
    const updateData: Partial<ICustomerSku> = {};

    // 1. Kiểm tra trùng skuCode nếu thay đổi
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

    // 2. Kiểm tra trùng barcode nếu thay đổi
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

    // 3. Cập nhật dimensions và tính lại volume
    if (data.dimensions) {
      updateData.dimensions = data.dimensions;
      updateData.volume = this.calculateVolume(data.dimensions);
    }

    const updated = await this.customerSkuRepository.update(id, updateData);
    if (!updated) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    // 4. Ghi Audit Log
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
   * Hook kiểm tra số lượng tồn kho của SKU
   * Được thiết kế sẵn sàng để Task 6C (CustomerInventory) liên kết
   */
  async getActiveInventoryQuantity(skuId: string): Promise<number> {
    // Khi triển khai Task 6C, hàm này sẽ truy vấn CustomerInventory.countActiveQuantityBySkuId(skuId)
    void skuId;
    return 0;
  }

  /**
   * Xoá mềm SKU
   * Bảo vệ không cho xoá khi SKU đang có tồn kho
   */
  async deleteSku(id: string, caller: CallerContext): Promise<void> {
    this.validateRoleAccess(caller, true);

    const existing = await this.customerSkuRepository.findById(id);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    // Kiểm tra quyền sở hữu
    if (String(existing.customerId?._id || existing.customerId) !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    // Quy tắc bảo vệ: Không cho xoá nếu còn tồn kho
    const activeInventoryQty = await this.getActiveInventoryQuantity(id);
    if (activeInventoryQty > 0) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_613);
    }

    await this.customerSkuRepository.softDelete(id, caller.id);

    // Ghi Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.DELETE,
      resourceType: AuditResourceEnum.CUSTOMER_SKU,
      resourceId: id,
      before: existing,
    });
  }

  /**
   * Khôi phục SKU đã xoá mềm
   */
  async restoreSku(
    id: string,
    caller: CallerContext
  ): Promise<CustomerSkuResponse> {
    this.validateRoleAccess(caller, true);

    const existing = await this.customerSkuRepository.findById(id, true);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    // Kiểm tra quyền sở hữu
    if (String(existing.customerId?._id || existing.customerId) !== caller.id) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    // Kiểm tra xem đã có SKU active nào cùng mã chưa
    const activeDuplicate = await this.customerSkuRepository.findBySkuCode(
      caller.id,
      existing.skuCode
    );
    if (activeDuplicate && String(activeDuplicate._id) !== id) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_611);
    }

    const restored = await this.customerSkuRepository.restore(id);
    if (!restored) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_610);
    }

    // Ghi Audit Log
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
   * Format Mongoose document thành Response Object
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
