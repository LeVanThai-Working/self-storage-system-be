import crypto from 'node:crypto';
import { Types, type ClientSession } from 'mongoose';
import type { InvoiceRepository } from './invoice.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { PaymentRepository } from '../payment/payment.repository.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { NotificationService } from '../notification/notification.service.ts';
import type {
  IInvoice,
  IInvoiceItem,
  InvoiceReminderMilestone,
} from './invoice.model.ts';
import type { IContract } from '../contract/contract.model.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
  BillingUnitEnum,
} from '../../common/enums/billing.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import {
  NotificationTypeEnum,
  NotificationPriorityEnum,
  NotificationChannelEnum,
} from '../../common/enums/notification.enum.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import {
  PaymentMethodEnum,
  PaymentPurposeEnum,
  PaymentStatusEnum,
} from '../../common/enums/payment.enum.ts';
import { ContractStatusEnum } from '../../common/enums/contract.enum.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { billingConfig } from '../../config/billing.config.ts';
import {
  startOfDayVN,
  endOfDayVN,
  addDays,
  getVNDateString,
} from '../../utils/date.util.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import {
  invoiceResponseSchema,
  type InvoiceResponse,
  type RecurringInvoiceScanResult,
  type OverdueInvoiceScanResult,
  type RemindInvoicesScanResult,
} from './schemas/invoice.response.schema.ts';
import type {
  CreateManualInvoiceRequest,
  ConfirmManualInvoicePaymentRequest,
  InvoiceQuery,
} from './schemas/invoice.request.schema.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import { InvoicePdfService } from './services/invoicePdf.service.ts';
import type { IFacility } from '../facility/facility.model.ts';
import type { IUser } from '../user/user.model.ts';
import type { IPayment } from '../payment/payment.model.ts';

export class InvoiceService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly contractRepository: ContractRepository,
    private readonly userRepository?: UserRepository,
    private readonly auditLogService?: AuditLogService,
    private readonly paymentRepository?: PaymentRepository,
    private readonly notificationService?: NotificationService,
    private readonly invoicePdfService: InvoicePdfService = new InvoicePdfService()
  ) {}

  private generateInvoiceCode(): string {
    const dateStr = getVNDateString().replace(/-/g, '').slice(2);
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `INV-${dateStr}-${randomHex}`;
  }

  private extractIdStr(val: unknown): string {
    if (!val) return '';
    if (typeof val === 'object' && '_id' in (val as object)) {
      return String((val as { _id?: unknown })._id || '');
    }
    return String(val);
  }

  private async assertFacilityAccess(
    callerId: string,
    callerRole: string,
    targetFacilityId: string
  ): Promise<void> {
    if (
      callerRole === RoleEnum.SYSTEM_ADMIN ||
      callerRole === RoleEnum.BUSINESS_OPS_MANAGER
    ) {
      return;
    }

    if (callerRole === RoleEnum.CUSTOMER) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (!this.userRepository) {
      return;
    }

    const user = await this.userRepository.findById(callerId);
    if (!user || !user.assignedFacilityId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
    }

    const assignedId = String(
      (user.assignedFacilityId as { _id?: unknown })._id ||
        user.assignedFacilityId
    );

    if (assignedId !== String(targetFacilityId)) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
    }
  }

  formatInvoice(doc: IInvoice): InvoiceResponse {
    const raw = (
      typeof doc.toObject === 'function' ? doc.toObject() : doc
    ) as Record<string, unknown>;

    const formatEntitySnap = (entity: unknown) => {
      if (!entity || typeof entity !== 'object') return null;
      const rec = entity as Record<string, unknown>;
      return {
        id: String(rec._id || rec.id || ''),
        name: rec.name ? String(rec.name) : undefined,
        email: rec.email ? String(rec.email) : undefined,
        code: rec.code ? String(rec.code) : undefined,
      };
    };

    const items = Array.isArray(raw.items)
      ? (raw.items as Array<Record<string, unknown>>).map((item) => ({
          name: String(item.name || ''),
          description: item.description ? String(item.description) : null,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
          amount: Number(item.amount || 0),
          itemType: item.itemType as InvoiceItemTypeEnum,
        }))
      : [];

    const formatted: Record<string, unknown> = {
      id: String(raw._id),
      invoiceCode: String(raw.invoiceCode || ''),
      contractId: String(
        (raw.contractId as { _id?: unknown })?._id || raw.contractId || ''
      ),
      customerId: String(
        (raw.customerId as { _id?: unknown })?._id || raw.customerId || ''
      ),
      facilityId: String(
        (raw.facilityId as { _id?: unknown })?._id || raw.facilityId || ''
      ),
      facility: formatEntitySnap(raw.facilityId),
      customer: formatEntitySnap(raw.customerId),
      contract: formatEntitySnap(raw.contractId),
      type: raw.type as InvoiceTypeEnum,
      status: raw.status as InvoiceStatusEnum,
      billingPeriodIndex: Number(raw.billingPeriodIndex || 1),
      periodStartDate: raw.periodStartDate
        ? new Date(String(raw.periodStartDate)).toISOString()
        : '',
      periodEndDate: raw.periodEndDate
        ? new Date(String(raw.periodEndDate)).toISOString()
        : '',
      dueDate: raw.dueDate ? new Date(String(raw.dueDate)).toISOString() : '',
      items,
      subtotal: Number(raw.subtotal || 0),
      discountAmount: Number(raw.discountAmount || 0),
      taxAmount: Number(raw.taxAmount || 0),
      totalAmount: Number(raw.totalAmount || 0),
      paidAmount: Number(raw.paidAmount || 0),
      paidAt: raw.paidAt ? new Date(String(raw.paidAt)).toISOString() : null,
      paymentId: raw.paymentId
        ? String((raw.paymentId as { _id?: unknown })?._id || raw.paymentId)
        : null,
      paymentMethod: raw.paymentMethod ? String(raw.paymentMethod) : null,
      notes: raw.notes ? String(raw.notes) : null,
      issuedAt: raw.issuedAt
        ? new Date(String(raw.issuedAt)).toISOString()
        : null,
      createdBy: formatEntitySnap(raw.createdBy),
      confirmedBy: formatEntitySnap(raw.confirmedBy),
      confirmedAt: raw.confirmedAt
        ? new Date(String(raw.confirmedAt)).toISOString()
        : null,
      proofImageUrl: raw.proofImageUrl ? String(raw.proofImageUrl) : null,
      cancelledBy: formatEntitySnap(raw.cancelledBy),
      cancelledAt: raw.cancelledAt
        ? new Date(String(raw.cancelledAt)).toISOString()
        : null,
      cancelReason: raw.cancelReason ? String(raw.cancelReason) : null,
      createdAt: raw.createdAt
        ? new Date(String(raw.createdAt)).toISOString()
        : new Date().toISOString(),
      updatedAt: raw.updatedAt
        ? new Date(String(raw.updatedAt)).toISOString()
        : new Date().toISOString(),
    };

    return validateResponse(invoiceResponseSchema, formatted);
  }

  async generateFirstPeriodInvoice(
    contract: IContract,
    session?: ClientSession
  ): Promise<IInvoice> {
    const contractIdStr = this.extractIdStr(contract._id);
    const existing = await this.invoiceRepository.findActiveByContractAndPeriod(
      contractIdStr,
      1,
      InvoiceTypeEnum.FIRST_PERIOD,
      session
    );
    if (existing) {
      return existing;
    }

    const periodStartDate = startOfDayVN(contract.startDate);
    let periodEndDate: Date;
    let rentQuantity = 1;

    if (contract.billingUnit === BillingUnitEnum.DAY) {
      const durationDays = Math.max(
        1,
        Math.round(
          (contract.endDate.getTime() - contract.startDate.getTime()) /
            (24 * 60 * 60 * 1000)
        )
      );
      if (durationDays <= billingConfig.dailyRentalThresholdDays) {
        periodEndDate = endOfDayVN(contract.endDate);
        rentQuantity = durationDays;
      } else {
        periodEndDate = endOfDayVN(
          addDays(contract.startDate, billingConfig.dailyCycleDays - 1)
        );
        rentQuantity = billingConfig.dailyCycleDays;
      }
    } else {
      const candidateEnd = endOfDayVN(addDays(contract.startDate, 30 - 1));
      periodEndDate =
        candidateEnd.getTime() > contract.endDate.getTime()
          ? endOfDayVN(contract.endDate)
          : candidateEnd;
    }

    const items: IInvoiceItem[] = [
      {
        name: `Tiền thuê kỳ 1 (${contract.contractCode})`,
        description: `Thuê không gian lưu trữ (${contract.billingUnit})`,
        quantity: rentQuantity,
        unitPrice: contract.rentalPrice,
        amount: Math.round(rentQuantity * contract.rentalPrice),
        itemType: InvoiceItemTypeEnum.RENT,
      },
    ];

    if (Array.isArray(contract.amenities)) {
      for (const a of contract.amenities) {
        const amenityQtyMultiplier =
          contract.billingUnit === BillingUnitEnum.DAY &&
          a.billingUnit === BillingUnitEnum.DAY
            ? rentQuantity
            : 1;
        items.push({
          name: a.name,
          description: 'Tiện ích đi kèm kỳ 1',
          quantity: a.quantity * amenityQtyMultiplier,
          unitPrice: a.pricePerUnit,
          amount: Math.round(a.totalPrice * amenityQtyMultiplier),
          itemType: InvoiceItemTypeEnum.AMENITY,
        });
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = Math.round(subtotal);
    const dueDate = startOfDayVN(contract.startDate);
    const invoiceCode = this.generateInvoiceCode();

    const created = await this.invoiceRepository.create(
      {
        invoiceCode,
        contractId: new Types.ObjectId(contractIdStr),
        customerId: contract.customerId,
        facilityId: contract.facilityId,
        type: InvoiceTypeEnum.FIRST_PERIOD,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 1,
        periodStartDate,
        periodEndDate,
        dueDate,
        items,
        subtotal,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount,
        paidAmount: 0,
        issuedAt: new Date(),
      },
      session
    );

    this.auditLogService?.record({
      action: AuditActionEnum.GENERATE_INVOICE,
      resourceType: AuditResourceEnum.INVOICE,
      resourceId: String(created._id),
      after: created,
    });

    return created;
  }

  async generateRecurringInvoice(
    contract: IContract,
    cycleIndex: number,
    session?: ClientSession
  ): Promise<IInvoice | null> {
    if (cycleIndex < 2) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'Recurring invoice cycleIndex must be at least 2',
      ]);
    }

    const contractIdStr = this.extractIdStr(contract._id);

    const existing = await this.invoiceRepository.findActiveByContractAndPeriod(
      contractIdStr,
      cycleIndex,
      InvoiceTypeEnum.RECURRING,
      session
    );
    if (existing) {
      return existing;
    }

    const prevInvoice =
      await this.invoiceRepository.findActiveByContractAndPeriod(
        contractIdStr,
        cycleIndex - 1,
        undefined,
        session
      );

    let periodStartDate: Date;
    if (prevInvoice) {
      periodStartDate = startOfDayVN(addDays(prevInvoice.periodEndDate, 1));
    } else {
      periodStartDate = startOfDayVN(
        addDays(contract.startDate, (cycleIndex - 1) * 30)
      );
    }

    if (periodStartDate.getTime() >= contract.endDate.getTime()) {
      return null;
    }

    let periodEndDate: Date;
    let rentQuantity = 1;

    if (contract.billingUnit === BillingUnitEnum.DAY) {
      const candidateEnd = endOfDayVN(
        addDays(periodStartDate, billingConfig.dailyCycleDays - 1)
      );
      periodEndDate =
        candidateEnd.getTime() > contract.endDate.getTime()
          ? endOfDayVN(contract.endDate)
          : candidateEnd;
      rentQuantity = Math.max(
        1,
        Math.round(
          (periodEndDate.getTime() - periodStartDate.getTime()) /
            (24 * 60 * 60 * 1000)
        )
      );
    } else {
      const candidateEnd = endOfDayVN(addDays(periodStartDate, 30 - 1));
      periodEndDate =
        candidateEnd.getTime() > contract.endDate.getTime()
          ? endOfDayVN(contract.endDate)
          : candidateEnd;
    }

    const items: IInvoiceItem[] = [
      {
        name: `Tiền thuê kỳ ${cycleIndex} (${contract.contractCode})`,
        description: `Thuê không gian lưu trữ (${contract.billingUnit})`,
        quantity: rentQuantity,
        unitPrice: contract.rentalPrice,
        amount: Math.round(rentQuantity * contract.rentalPrice),
        itemType: InvoiceItemTypeEnum.RENT,
      },
    ];

    if (Array.isArray(contract.amenities)) {
      for (const a of contract.amenities) {
        // Skip one-time amenities for recurring cycles (only billed in first period)
        if (a.billingUnit === BillingUnitEnum.ONE_TIME) {
          continue;
        }
        const amenityQtyMultiplier =
          contract.billingUnit === BillingUnitEnum.DAY &&
          a.billingUnit === BillingUnitEnum.DAY
            ? rentQuantity
            : 1;
        items.push({
          name: a.name,
          description: `Tiện ích đi kèm kỳ ${cycleIndex}`,
          quantity: a.quantity * amenityQtyMultiplier,
          unitPrice: a.pricePerUnit,
          amount: Math.round(a.totalPrice * amenityQtyMultiplier),
          itemType: InvoiceItemTypeEnum.AMENITY,
        });
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = Math.round(subtotal);
    const dueDate = startOfDayVN(periodStartDate);
    const invoiceCode = this.generateInvoiceCode();

    const created = await this.invoiceRepository.create(
      {
        invoiceCode,
        contractId: new Types.ObjectId(contractIdStr),
        customerId: contract.customerId,
        facilityId: contract.facilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: cycleIndex,
        periodStartDate,
        periodEndDate,
        dueDate,
        items,
        subtotal,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount,
        paidAmount: 0,
        issuedAt: new Date(),
      },
      session
    );

    this.auditLogService?.record({
      action: AuditActionEnum.GENERATE_INVOICE,
      resourceType: AuditResourceEnum.INVOICE,
      resourceId: String(created._id),
      after: created,
    });

    return created;
  }

  @Transactional()
  async createManualInvoice(
    data: CreateManualInvoiceRequest,
    callerId: string,
    callerRole: string
  ): Promise<InvoiceResponse> {
    if (callerRole === RoleEnum.CUSTOMER) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const contract = await this.contractRepository.findById(data.contractId);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400, ['Contract']);
    }

    const contractFacilityId = String(
      (contract.facilityId as { _id?: unknown })?._id || contract.facilityId
    );

    await this.assertFacilityAccess(callerId, callerRole, contractFacilityId);

    const periodStartDate = startOfDayVN(data.periodStartDate);
    const periodEndDate = endOfDayVN(data.periodEndDate);
    const dueDate = startOfDayVN(data.dueDate);

    if (periodStartDate.getTime() > periodEndDate.getTime()) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'periodStartDate must be before or equal to periodEndDate',
      ]);
    }

    const items: IInvoiceItem[] = data.items.map((item) => {
      const amount =
        item.amount !== undefined
          ? item.amount
          : Math.round(item.quantity * item.unitPrice);
      return {
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount,
        itemType: item.itemType,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = data.discountAmount || 0;
    const taxAmount = data.taxAmount || 0;
    const totalAmount = Math.max(
      0,
      Math.round(subtotal - discountAmount + taxAmount)
    );
    const invoiceCode = this.generateInvoiceCode();

    const invoiceCustomerId = ((contract.customerId as { _id?: unknown })
      ?._id || contract.customerId) as IInvoice['customerId'];
    const invoiceFacilityId = ((contract.facilityId as { _id?: unknown })
      ?._id || contract.facilityId) as IInvoice['facilityId'];

    const created = await this.invoiceRepository.create({
      invoiceCode,
      contractId: contract._id,
      customerId: invoiceCustomerId,
      facilityId: invoiceFacilityId,
      type: InvoiceTypeEnum.INCIDENTAL,
      status: InvoiceStatusEnum.ISSUED,
      billingPeriodIndex: 1,
      periodStartDate,
      periodEndDate,
      dueDate,
      items,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      notes: data.notes || null,
      issuedAt: new Date(),
      createdBy: new Types.ObjectId(callerId),
    });

    this.auditLogService?.record({
      action: AuditActionEnum.GENERATE_INVOICE,
      resourceType: AuditResourceEnum.INVOICE,
      resourceId: String(created._id),
      after: created,
    });

    return this.formatInvoice(created);
  }

  async getInvoices(
    query: InvoiceQuery,
    callerId: string,
    callerRole: string
  ): Promise<PaginatedData<InvoiceResponse>> {
    const effectiveQuery: InvoiceQuery = { ...query };

    if (callerRole === RoleEnum.CUSTOMER) {
      effectiveQuery.customerId = callerId;
    } else if (
      callerRole === RoleEnum.FACILITY_MANAGER ||
      callerRole === RoleEnum.FACILITY_STAFF
    ) {
      if (!this.userRepository) {
        throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106, [
          'UserRepository not available',
        ]);
      }
      const user = await this.userRepository.findById(callerId);
      if (!user?.assignedFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, [
          'Assigned Facility',
        ]);
      }
      effectiveQuery.facilityId = String(user.assignedFacilityId);
    } else if (
      callerRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      callerRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const result = await this.invoiceRepository.findPaginated(effectiveQuery);

    return {
      items: result.items.map((inv) => this.formatInvoice(inv)),
      pagination: result.pagination,
    };
  }

  async getInvoiceById(
    id: string,
    callerId: string,
    callerRole: string
  ): Promise<InvoiceResponse> {
    const invoice = await this.invoiceRepository.findByIdWithDetails(id);
    if (!invoice) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_800, ['Invoice']);
    }

    const ownerCustomerId = String(
      (invoice.customerId as { _id?: unknown })?._id || invoice.customerId
    );

    if (callerRole === RoleEnum.CUSTOMER) {
      if (ownerCustomerId !== callerId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else {
      const facilityId = String(
        (invoice.facilityId as { _id?: unknown })?._id || invoice.facilityId
      );
      await this.assertFacilityAccess(callerId, callerRole, facilityId);
    }

    return this.formatInvoice(invoice);
  }

  async markInvoicePaid(
    invoiceId: string,
    params: {
      paymentId: string;
      paidAmount: number;
      paidAt?: Date;
      paymentMethod?: PaymentMethodEnum;
      confirmedBy?: Types.ObjectId | null;
      confirmedAt?: Date | null;
      proofImageUrl?: string | null;
    },
    session?: ClientSession
  ): Promise<IInvoice> {
    const invoice = await this.invoiceRepository.findById(invoiceId, session);
    if (!invoice) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_800, ['Invoice']);
    }

    if (invoice.status === InvoiceStatusEnum.PAID) {
      return invoice;
    }

    if (invoice.status === InvoiceStatusEnum.CANCELLED) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_803, ['Invoice']);
    }

    const paidAt = params.paidAt || new Date();
    const updateData: Partial<IInvoice> = {
      status: InvoiceStatusEnum.PAID,
      paidAmount: params.paidAmount,
      paidAt,
      paymentId: new Types.ObjectId(params.paymentId),
      paymentMethod: params.paymentMethod || PaymentMethodEnum.SEPAY_QR,
    };

    if (params.confirmedBy) {
      updateData.confirmedBy = params.confirmedBy;
    }
    if (params.confirmedAt) {
      updateData.confirmedAt = params.confirmedAt;
    }
    if (params.proofImageUrl) {
      updateData.proofImageUrl = params.proofImageUrl;
    }

    const updated = await this.invoiceRepository.atomicUpdateStatus(
      invoiceId,
      [InvoiceStatusEnum.ISSUED, InvoiceStatusEnum.OVERDUE],
      updateData,
      session
    );

    if (!updated) {
      const current = await this.invoiceRepository.findById(invoiceId, session);
      if (current && current.status === InvoiceStatusEnum.PAID) {
        return current;
      }
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_802, ['Invoice']);
    }

    // 1. Sync contract.firstPeriodPaidAt if FIRST_PERIOD
    if (invoice.type === InvoiceTypeEnum.FIRST_PERIOD) {
      await this.contractRepository.atomicUpdateStatus(
        String(invoice.contractId),
        [
          ContractStatusEnum.DRAFT,
          ContractStatusEnum.ACTIVE,
          ContractStatusEnum.OVERDUE,
        ],
        { firstPeriodPaidAt: paidAt },
        session
      );
    }

    // 2. If contract is OVERDUE, check if all invoices are now settled
    const contract = await this.contractRepository.findById(
      String(invoice.contractId),
      session
    );
    if (contract && contract.status === ContractStatusEnum.OVERDUE) {
      const unpaidCount = await this.invoiceRepository.countUnpaidByContract(
        String(invoice.contractId),
        session
      );
      if (unpaidCount === 0) {
        await this.contractRepository.atomicUpdateStatus(
          String(invoice.contractId),
          ContractStatusEnum.OVERDUE,
          { status: ContractStatusEnum.ACTIVE },
          session
        );
      }
    }

    this.auditLogService?.record({
      action: AuditActionEnum.RECEIVE_PAYMENT,
      resourceType: AuditResourceEnum.INVOICE,
      resourceId: String(updated._id),
      before: invoice,
      after: updated,
    });

    return updated;
  }

  @Transactional()
  async confirmManualPayment(
    invoiceId: string,
    data: ConfirmManualInvoicePaymentRequest,
    staffId: string,
    actorRole: string,
    session?: ClientSession
  ): Promise<InvoiceResponse> {
    const allowedRoles: string[] = [
      RoleEnum.FACILITY_STAFF,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ];
    if (!allowedRoles.includes(actorRole as RoleEnum)) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
        'FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN',
      ]);
    }

    if (!data.proofImageUrl) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_806);
    }

    const invoice = await this.invoiceRepository.findById(invoiceId, session);
    if (!invoice) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_800, ['Invoice']);
    }

    const facilityIdStr = String(
      (invoice.facilityId as { _id?: Types.ObjectId })?._id ||
        invoice.facilityId
    );
    await this.assertFacilityAccess(staffId, actorRole, facilityIdStr);

    if (invoice.status === InvoiceStatusEnum.PAID) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_802, ['Invoice']);
    }

    if (invoice.status === InvoiceStatusEnum.CANCELLED) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_803, ['Invoice']);
    }

    // Maker-Checker violation check for INCIDENTAL invoices
    if (invoice.type === InvoiceTypeEnum.INCIDENTAL && invoice.createdBy) {
      const creatorStr = String(
        (invoice.createdBy as { _id?: Types.ObjectId })?._id ||
          invoice.createdBy
      );
      if (creatorStr === staffId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_320, [
          'Confirmer must be different from Creator',
        ]);
      }
    }

    if (!this.paymentRepository) {
      throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106, [
        'PaymentRepository not available',
      ]);
    }

    const now = new Date();

    // Invalidate existing pending payment if any
    const existingPayment = await this.paymentRepository.findActiveByInvoice(
      invoiceId,
      session
    );
    if (existingPayment) {
      await this.paymentRepository.update(
        String(existingPayment._id),
        {
          status: PaymentStatusEnum.CANCELLED,
          cancellationReason:
            'Cancelled due to manual payment confirmation at facility counter',
          cancelledAt: now,
        },
        session
      );
    }

    // Generate unique payment code
    const dateStr = getVNDateString().replace(/-/g, '').slice(2);
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    const paymentCode = `PAY-${dateStr}-${randomHex}`;

    const payment = await this.paymentRepository.create(
      {
        paymentCode,
        purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
        invoiceId: invoice._id,
        contractId: invoice.contractId,
        customerId: invoice.customerId,
        facilityId: invoice.facilityId,
        amount: invoice.totalAmount,
        paidAmount: invoice.totalAmount,
        overpaidAmount: 0,
        method: data.paymentMethod,
        status: PaymentStatusEnum.PAID,
        paidAt: now,
        confirmedBy: new Types.ObjectId(staffId),
        confirmedAt: now,
        proofImageUrl: data.proofImageUrl,
        referenceCode: data.referenceCode || null,
        note: data.note || null,
      },
      session
    );

    const updatedInvoice = await this.markInvoicePaid(
      invoiceId,
      {
        paymentId: String(payment._id),
        paidAmount: invoice.totalAmount,
        paidAt: now,
        paymentMethod: data.paymentMethod,
        confirmedBy: new Types.ObjectId(staffId),
        confirmedAt: now,
        proofImageUrl: data.proofImageUrl,
      },
      session
    );

    const populated = await this.invoiceRepository.findByIdWithDetails(
      String(updatedInvoice._id),
      session
    );

    return this.formatInvoice(populated || updatedInvoice);
  }

  @Transactional()
  async cancelInvoice(
    id: string,
    reason: string,
    callerId: string,
    callerRole: string,
    session?: ClientSession
  ): Promise<InvoiceResponse> {
    const allowedRoles: string[] = [
      RoleEnum.FACILITY_STAFF,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ];
    if (!allowedRoles.includes(callerRole as RoleEnum)) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
        'FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN',
      ]);
    }

    const invoice = await this.invoiceRepository.findById(id, session);
    if (!invoice) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_800, ['Invoice']);
    }

    const facilityIdStr = String(
      (invoice.facilityId as { _id?: Types.ObjectId })?._id ||
        invoice.facilityId
    );
    await this.assertFacilityAccess(callerId, callerRole, facilityIdStr);

    if (invoice.status === InvoiceStatusEnum.PAID) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_809, ['Invoice']);
    }

    if (invoice.status === InvoiceStatusEnum.CANCELLED) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_803, ['Invoice']);
    }

    const now = new Date();

    // 1. Invalidate any active pending payment
    if (this.paymentRepository) {
      const activePayment = await this.paymentRepository.findActiveByInvoice(
        id,
        session
      );
      if (activePayment) {
        await this.paymentRepository.update(
          String(activePayment._id),
          {
            status: PaymentStatusEnum.CANCELLED,
            cancellationReason: `Hóa đơn bị hủy: ${reason}`,
            cancelledAt: now,
          },
          session
        );
      }
    }

    // 2. Atomic update invoice status to CANCELLED
    const updated = await this.invoiceRepository.atomicUpdateStatus(
      id,
      [InvoiceStatusEnum.ISSUED, InvoiceStatusEnum.OVERDUE],
      {
        status: InvoiceStatusEnum.CANCELLED,
        cancelledAt: now,
        cancelReason: reason,
        cancelledBy: new Types.ObjectId(callerId),
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_803, ['Invoice']);
    }

    // 3. If contract was OVERDUE, check if there are any remaining unpaid invoices
    const contract = await this.contractRepository.findById(
      String(invoice.contractId),
      session
    );
    if (contract && contract.status === ContractStatusEnum.OVERDUE) {
      const unpaidCount = await this.invoiceRepository.countUnpaidByContract(
        String(invoice.contractId),
        session
      );
      if (unpaidCount === 0) {
        await this.contractRepository.atomicUpdateStatus(
          String(invoice.contractId),
          ContractStatusEnum.OVERDUE,
          { status: ContractStatusEnum.ACTIVE },
          session
        );
      }
    }

    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL_INVOICE,
      resourceType: AuditResourceEnum.INVOICE,
      resourceId: String(updated._id),
      before: invoice,
      after: updated,
    });

    const populated = await this.invoiceRepository.findByIdWithDetails(
      String(updated._id),
      session
    );

    return this.formatInvoice(populated || updated);
  }

  @Transactional()
  async voidInvoicesByContract(
    contractId: string,
    reason: string,
    session?: ClientSession
  ): Promise<IInvoice[]> {
    const unpaidInvoices = await this.invoiceRepository.findUnpaidByContract(
      contractId,
      session
    );
    const now = new Date();
    const voidedInvoices: IInvoice[] = [];

    for (const invoice of unpaidInvoices) {
      // 1. Cancel active pending payments
      if (this.paymentRepository) {
        const activePayment = await this.paymentRepository.findActiveByInvoice(
          String(invoice._id),
          session
        );
        if (activePayment) {
          await this.paymentRepository.update(
            String(activePayment._id),
            {
              status: PaymentStatusEnum.CANCELLED,
              cancellationReason: `Hợp đồng bị hủy/chấm dứt: ${reason}`,
              cancelledAt: now,
            },
            session
          );
        }
      }

      // 2. Atomic update invoice status to CANCELLED
      const updated = await this.invoiceRepository.atomicUpdateStatus(
        String(invoice._id),
        [InvoiceStatusEnum.ISSUED, InvoiceStatusEnum.OVERDUE],
        {
          status: InvoiceStatusEnum.CANCELLED,
          cancelledAt: now,
          cancelReason: reason,
        },
        session
      );

      if (updated) {
        voidedInvoices.push(updated);
        this.auditLogService?.record({
          action: AuditActionEnum.VOID_INVOICE,
          resourceType: AuditResourceEnum.INVOICE,
          resourceId: String(updated._id),
          before: invoice,
          after: updated,
        });
      }
    }

    return voidedInvoices;
  }

  /**
   * Batch recurring invoice generation scan (T-7).
   * Scans active contracts, identifies next cycle, checks if within T-7 threshold,
   * generates recurring invoice with per-record fault isolation, and sends notifications.
   */
  async processRecurringInvoicesScan(options?: {
    now?: Date;
    limit?: number;
  }): Promise<RecurringInvoiceScanResult> {
    const now = options?.now || new Date();
    const limit = options?.limit || 100;

    const contracts =
      await this.contractRepository.findActiveContractsForBilling({
        limit,
      });

    let scannedCount = 0;
    let generatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const thresholdDate = addDays(
      startOfDayVN(now),
      billingConfig.invoiceLeadDays
    );

    for (const contract of contracts) {
      scannedCount++;
      try {
        const contractId = String(contract._id);
        const latestInvoice =
          await this.invoiceRepository.findLatestByContractId(contractId);

        let nextCycleIndex: number;
        let nextPeriodStartDate: Date;

        if (latestInvoice) {
          nextCycleIndex = latestInvoice.billingPeriodIndex + 1;
          nextPeriodStartDate = startOfDayVN(
            addDays(latestInvoice.periodEndDate, 1)
          );
        } else {
          // If contract doesn't have an invoice yet, cycle 1 starts at contract.startDate
          nextCycleIndex = 1;
          nextPeriodStartDate = startOfDayVN(contract.startDate);
        }

        // 1. If next period starts at or after contract.endDate, contract cycle has finished
        if (nextPeriodStartDate.getTime() >= contract.endDate.getTime()) {
          skippedCount++;
          continue;
        }

        // 2. Check if within T-7 window: nextPeriodStartDate must be <= thresholdDate
        if (nextPeriodStartDate.getTime() > thresholdDate.getTime()) {
          skippedCount++;
          continue;
        }

        // 3. Idempotency check: has recurring invoice already been generated for this cycle?
        const existing =
          await this.invoiceRepository.findActiveByContractAndPeriod(
            contractId,
            nextCycleIndex,
            InvoiceTypeEnum.RECURRING
          );
        if (existing) {
          skippedCount++;
          continue;
        }

        // 4. Generate recurring invoice (isolated transaction inside generateRecurringInvoice)
        const generated = await this.generateRecurringInvoice(
          contract,
          nextCycleIndex
        );

        if (!generated) {
          skippedCount++;
          continue;
        }

        generatedCount++;

        // 5. Send notification to customer
        if (this.notificationService) {
          const customerId = String(
            (contract.customerId as { _id?: unknown })?._id ||
              contract.customerId
          );
          const facilityId = String(
            (contract.facilityId as { _id?: unknown })?._id ||
              contract.facilityId
          );
          const customerEmail = (contract.customerId as { email?: string })
            ?.email;

          try {
            await this.notificationService.sendNotification({
              recipientId: customerId,
              facilityId,
              title: `Hóa đơn tiền thuê kỳ ${nextCycleIndex} - ${generated.invoiceCode}`,
              content: `Hóa đơn kỳ ${nextCycleIndex} cho hợp đồng ${contract.contractCode} đã được tạo với số tiền ${generated.totalAmount.toLocaleString('vi-VN')} VND. Hạn thanh toán: ${new Date(generated.dueDate).toLocaleDateString('vi-VN')}.`,
              type: NotificationTypeEnum.INVOICE,
              priority: NotificationPriorityEnum.NORMAL,
              channels: [
                NotificationChannelEnum.IN_APP,
                NotificationChannelEnum.EMAIL,
              ],
              metadata: {
                invoiceId: String(generated._id),
                invoiceCode: generated.invoiceCode,
                contractId,
                contractCode: contract.contractCode,
                amount: generated.totalAmount,
                dueDate: generated.dueDate,
                email: customerEmail,
              },
            });
          } catch (notifErr) {
            console.warn(
              `[InvoiceService] Failed to send invoice notification for ${generated.invoiceCode}:`,
              notifErr
            );
          }
        }
      } catch (err) {
        failedCount++;
        console.error(
          `[InvoiceService] Failed to generate recurring invoice for contract ${contract._id}:`,
          (err as Error).message
        );
      }
    }

    return {
      scannedCount,
      generatedCount,
      skippedCount,
      failedCount,
    };
  }

  /**
   * Batch scan overdue invoices past grace period (OPEN D-INV.3).
   * Finds ISSUED invoices past dueDate + invoiceGraceDays (3 days),
   * transitions Invoice -> OVERDUE, transitions Contract -> OVERDUE (lock),
   * dispatches HIGH priority urgent warning notifications, with per-record fault isolation.
   */
  async processOverdueInvoicesScan(options?: {
    now?: Date;
    limit?: number;
  }): Promise<OverdueInvoiceScanResult> {
    const now = options?.now || new Date();
    const limit = options?.limit || 100;

    const graceTargetDate = addDays(
      startOfDayVN(now),
      -billingConfig.invoiceGraceDays
    );

    const overdueInvoices = await this.invoiceRepository.findOverdueInvoices(
      graceTargetDate,
      limit
    );

    let scannedCount = 0;
    let markedOverdueCount = 0;
    let contractsLockedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const invoice of overdueInvoices) {
      scannedCount++;
      try {
        // 1. Atomic conditional update Invoice status: ISSUED -> OVERDUE
        const updatedInvoice = await this.invoiceRepository.atomicUpdateStatus(
          String(invoice._id),
          InvoiceStatusEnum.ISSUED,
          {
            status: InvoiceStatusEnum.OVERDUE,
          }
        );

        if (!updatedInvoice) {
          // Invoice was paid or cancelled concurrently, skip safely
          skippedCount++;
          continue;
        }

        markedOverdueCount++;

        this.auditLogService?.record({
          action: AuditActionEnum.MARK_OVERDUE,
          resourceType: AuditResourceEnum.INVOICE,
          resourceId: String(updatedInvoice._id),
          before: invoice,
          after: updatedInvoice,
        });

        // 2. Lock Contract: Transition ACTIVE -> OVERDUE
        const contractId = String(
          (invoice.contractId as { _id?: unknown })?._id || invoice.contractId
        );

        const updatedContract =
          await this.contractRepository.atomicUpdateStatus(
            contractId,
            ContractStatusEnum.ACTIVE,
            {
              status: ContractStatusEnum.OVERDUE,
            }
          );

        if (updatedContract) {
          contractsLockedCount++;
          this.auditLogService?.record({
            action: AuditActionEnum.MARK_OVERDUE,
            resourceType: AuditResourceEnum.CONTRACT,
            resourceId: contractId,
            after: updatedContract,
          });
        }

        // 3. Dispatch high-priority urgent payment notification
        if (this.notificationService) {
          const customerId = String(
            (invoice.customerId as { _id?: unknown })?._id || invoice.customerId
          );
          const facilityId = String(
            (invoice.facilityId as { _id?: unknown })?._id || invoice.facilityId
          );
          const customerEmail = (invoice.customerId as { email?: string })
            ?.email;
          const contractCode =
            (invoice.contractId as { contractCode?: string })?.contractCode ||
            '';

          try {
            await this.notificationService.sendNotification({
              recipientId: customerId,
              facilityId,
              title: `Cảnh báo nợ quá hạn: Hóa đơn ${updatedInvoice.invoiceCode}`,
              content: `Hóa đơn ${updatedInvoice.invoiceCode} (kỳ ${updatedInvoice.billingPeriodIndex}) của hợp đồng ${contractCode} đã quá hạn thanh toán sau thời gian ân hạn 3 ngày. Hợp đồng của quý khách đã bị chuyển sang trạng thái QUÁ HẠN. Vui lòng thanh toán số tiền ${updatedInvoice.totalAmount.toLocaleString('vi-VN')} VND ngay để tránh bị niêm phong kho lưu trữ hoặc đình chỉ dịch vụ.`,
              type: NotificationTypeEnum.INVOICE,
              priority: NotificationPriorityEnum.HIGH,
              channels: [
                NotificationChannelEnum.IN_APP,
                NotificationChannelEnum.EMAIL,
              ],
              metadata: {
                invoiceId: String(updatedInvoice._id),
                invoiceCode: updatedInvoice.invoiceCode,
                contractId,
                contractCode,
                amount: updatedInvoice.totalAmount,
                dueDate: updatedInvoice.dueDate,
                email: customerEmail,
              },
            });
          } catch (notifErr) {
            console.warn(
              `[InvoiceService] Failed to send overdue notification for ${updatedInvoice.invoiceCode}:`,
              notifErr
            );
          }
        }
      } catch (err) {
        failedCount++;
        console.error(
          `[InvoiceService] Failed to process overdue invoice ${invoice._id}:`,
          (err as Error).message
        );
      }
    }

    return {
      scannedCount,
      markedOverdueCount,
      contractsLockedCount,
      skippedCount,
      failedCount,
    };
  }

  /**
   * Batch scan and dispatch payment reminders for ISSUED invoices (T-3, T-1, T-0).
   * Sends notifications via In-App (Socket.IO) and Email, records sent milestones to prevent spam,
   * and provides per-record fault isolation.
   */
  async processPaymentRemindersScan(options?: {
    now?: Date;
    limit?: number;
  }): Promise<RemindInvoicesScanResult> {
    const now = options?.now || new Date();
    const limit = options?.limit || 100;

    const startT0 = startOfDayVN(now);
    const endT0 = endOfDayVN(now);

    const targetDateT1 = addDays(startT0, 1);
    const startT1 = startOfDayVN(targetDateT1);
    const endT1 = endOfDayVN(targetDateT1);

    const targetDateT3 = addDays(startT0, 3);
    const startT3 = startOfDayVN(targetDateT3);
    const endT3 = endOfDayVN(targetDateT3);

    const milestonesConfig: Array<{
      milestone: InvoiceReminderMilestone;
      startDate: Date;
      endDate: Date;
      priority: NotificationPriorityEnum;
      title: (code: string) => string;
      content: (
        code: string,
        periodIndex: number,
        contractCode: string,
        amount: string,
        dueDateStr: string
      ) => string;
    }> = [
      {
        milestone: 'T-3',
        startDate: startT3,
        endDate: endT3,
        priority: NotificationPriorityEnum.NORMAL,
        title: (code) =>
          `Nhắc lịch thanh toán hóa đơn: ${code} (Hạn còn 3 ngày)`,
        content: (code, periodIndex, contractCode, amount, dueDateStr) =>
          `Hóa đơn ${code} (kỳ ${periodIndex}) của hợp đồng ${contractCode} có số tiền ${amount} VND sẽ đến hạn thanh toán vào ngày ${dueDateStr}. Quý khách vui lòng thanh toán đúng hạn.`,
      },
      {
        milestone: 'T-1',
        startDate: startT1,
        endDate: endT1,
        priority: NotificationPriorityEnum.HIGH,
        title: (code) =>
          `Sắp hết hạn thanh toán: Hóa đơn ${code} (Hạn còn 1 ngày)`,
        content: (code, periodIndex, contractCode, amount, dueDateStr) =>
          `Hóa đơn ${code} (kỳ ${periodIndex}) của hợp đồng ${contractCode} có số tiền ${amount} VND sẽ hết hạn vào ngày mai (${dueDateStr}). Vui lòng thanh toán để tránh phát sinh gián đoạn dịch vụ.`,
      },
      {
        milestone: 'T-0',
        startDate: startT0,
        endDate: endT0,
        priority: NotificationPriorityEnum.URGENT,
        title: (code) => `Hạn chót thanh toán hôm nay: Hóa đơn ${code}`,
        content: (code, periodIndex, contractCode, amount) =>
          `Hôm nay là hạn chót thanh toán hóa đơn ${code} số tiền ${amount} VND của hợp đồng ${contractCode}. Vui lòng thanh toán trước 23:59:59 hôm nay để tránh bị khóa hợp đồng sau thời gian ân hạn.`,
      },
    ];

    let scannedCount = 0;
    let remindedT3Count = 0;
    let remindedT1Count = 0;
    let remindedT0Count = 0;
    let totalRemindedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const conf of milestonesConfig) {
      const invoices = await this.invoiceRepository.findInvoicesForReminders(
        conf.startDate,
        conf.endDate,
        limit
      );

      for (const invoice of invoices) {
        scannedCount++;
        try {
          // Idempotency check: has this invoice already been reminded for this milestone?
          const alreadyReminded = invoice.remindersSent?.some(
            (r) => r.milestone === conf.milestone
          );

          if (alreadyReminded) {
            skippedCount++;
            continue;
          }

          if (this.notificationService) {
            const customerId = String(
              (invoice.customerId as { _id?: unknown })?._id ||
                invoice.customerId
            );
            const facilityId = String(
              (invoice.facilityId as { _id?: unknown })?._id ||
                invoice.facilityId
            );
            const customerEmail = (invoice.customerId as { email?: string })
              ?.email;
            const contractCode =
              (invoice.contractId as { contractCode?: string })?.contractCode ||
              '';
            const dueDateStr = new Date(invoice.dueDate).toLocaleDateString(
              'vi-VN'
            );
            const amountStr = invoice.totalAmount.toLocaleString('vi-VN');

            await this.notificationService.sendNotification({
              recipientId: customerId,
              facilityId,
              title: conf.title(invoice.invoiceCode),
              content: conf.content(
                invoice.invoiceCode,
                invoice.billingPeriodIndex,
                contractCode,
                amountStr,
                dueDateStr
              ),
              type: NotificationTypeEnum.INVOICE,
              priority: conf.priority,
              channels: [
                NotificationChannelEnum.IN_APP,
                NotificationChannelEnum.EMAIL,
              ],
              metadata: {
                invoiceId: String(invoice._id),
                invoiceCode: invoice.invoiceCode,
                contractId: String(
                  (invoice.contractId as { _id?: unknown })?._id ||
                    invoice.contractId
                ),
                contractCode,
                amount: invoice.totalAmount,
                dueDate: invoice.dueDate,
                milestone: conf.milestone,
                email: customerEmail,
              },
            });
          }

          // Record sent milestone on invoice
          await this.invoiceRepository.recordReminderSent(
            String(invoice._id),
            conf.milestone
          );

          totalRemindedCount++;
          if (conf.milestone === 'T-3') remindedT3Count++;
          if (conf.milestone === 'T-1') remindedT1Count++;
          if (conf.milestone === 'T-0') remindedT0Count++;
        } catch (err) {
          failedCount++;
          console.error(
            `[InvoiceService] Failed to send payment reminder for invoice ${invoice._id} (${conf.milestone}):`,
            (err as Error).message
          );
        }
      }
    }

    return {
      scannedCount,
      remindedT3Count,
      remindedT1Count,
      remindedT0Count,
      totalRemindedCount,
      skippedCount,
      failedCount,
    };
  }

  /**
   * Retrieves an invoice and exports it as an ISO A4 printable HTML document.
   * Enforces Rule 14 Scoping:
   * - CUSTOMER can only export their own invoice.
   * - FACILITY_STAFF / FACILITY_MANAGER can only export invoices of their assigned facility.
   * - BUSINESS_OPS_MANAGER / SYSTEM_ADMIN can export any invoice.
   */
  async getInvoicePdf(
    id: string,
    callerUserId: string,
    callerRole: string
  ): Promise<{ html: string; invoiceCode: string }> {
    const invoice = await this.invoiceRepository.findByIdWithDetails(id);
    if (!invoice) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_800);
    }

    const facilityIdStr = this.extractIdStr(invoice.facilityId);
    const customerIdStr = this.extractIdStr(invoice.customerId);

    if (callerRole === RoleEnum.CUSTOMER) {
      if (customerIdStr !== callerUserId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else if (
      callerRole === RoleEnum.FACILITY_STAFF ||
      callerRole === RoleEnum.FACILITY_MANAGER
    ) {
      await this.assertFacilityAccess(callerUserId, callerRole, facilityIdStr);
    } else if (
      callerRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      callerRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const contract =
      invoice.contractId && typeof invoice.contractId === 'object'
        ? (invoice.contractId as unknown as IContract)
        : await this.contractRepository.findById(String(invoice.contractId));

    const customer =
      invoice.customerId && typeof invoice.customerId === 'object'
        ? (invoice.customerId as unknown as IUser)
        : this.userRepository
          ? await this.userRepository.findById(customerIdStr)
          : null;

    let payment: IPayment | null = null;
    if (invoice.paymentId && this.paymentRepository) {
      const paymentIdStr = this.extractIdStr(invoice.paymentId);
      payment = await this.paymentRepository.findById(paymentIdStr);
    }

    const html = this.invoicePdfService.generateInvoiceHtml({
      invoice,
      contract,
      customer,
      facility: invoice.facilityId as unknown as IFacility,
      payment,
    });

    return {
      html,
      invoiceCode: invoice.invoiceCode,
    };
  }

  /**
   * Generates a CHECK_OUT_SETTLEMENT invoice during contract check-out.
   * Deducts damageFee and overdueFee against the security deposit:
   * - If deposit covers all deductions: status is PAID, remainder refunded via RefundRequest.
   * - If deposit is insufficient: status is ISSUED for additionalPaymentRequired.
   */
  @Transactional()
  async generateCheckOutSettlementInvoice(
    contract: IContract,
    settlementData: {
      damageFee: number;
      overdueFee: number;
      actualCheckOutDate: Date;
      notes?: string;
    },
    session?: ClientSession
  ): Promise<IInvoice> {
    const damageFee = Math.max(0, Math.round(settlementData.damageFee || 0));
    const overdueFee = Math.max(0, Math.round(settlementData.overdueFee || 0));
    const totalDeductions = damageFee + overdueFee;
    const depositAmount = Math.max(0, Math.round(contract.depositAmount || 0));

    const additionalPaymentRequired = Math.max(
      0,
      totalDeductions - depositAmount
    );
    const deductedFromDeposit = Math.min(depositAmount, totalDeductions);

    const items: IInvoiceItem[] = [];

    if (damageFee > 0) {
      items.push({
        name: 'Bồi thường hư hại tài sản kho bãi',
        description:
          settlementData.notes || 'Biên bản nghiệm thu hoàn trả mặt bằng',
        quantity: 1,
        unitPrice: damageFee,
        amount: damageFee,
        itemType: InvoiceItemTypeEnum.DAMAGE_FEE,
      });
    }

    if (overdueFee > 0) {
      items.push({
        name: 'Phí quá hạn trả kho trễ hạn',
        description: `Trả kho thực tế ngày ${getVNDateString(
          settlementData.actualCheckOutDate
        )}`,
        quantity: 1,
        unitPrice: overdueFee,
        amount: overdueFee,
        itemType: InvoiceItemTypeEnum.OVERDUE_FEE,
      });
    }

    if (items.length === 0) {
      items.push({
        name: 'Quyết toán hoàn tất hợp đồng thuê kho',
        description: 'Không phát sinh chi phí hư hại hoặc quá hạn',
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        itemType: InvoiceItemTypeEnum.DISCOUNT,
      });
    }

    const isFullyCovered = additionalPaymentRequired === 0;
    const now = new Date();
    const invoiceCode = this.generateInvoiceCode();
    const contractId = contract._id;
    const customerId = contract.customerId;
    const facilityId = contract.facilityId;

    const totalAmount = isFullyCovered
      ? totalDeductions
      : additionalPaymentRequired;
    const paidAmount = isFullyCovered ? totalDeductions : 0;
    const status = isFullyCovered
      ? InvoiceStatusEnum.PAID
      : InvoiceStatusEnum.ISSUED;

    const created = await this.invoiceRepository.create(
      {
        invoiceCode,
        contractId,
        customerId,
        facilityId,
        type: InvoiceTypeEnum.CHECK_OUT_SETTLEMENT,
        status,
        billingPeriodIndex: (contract.renewalCount || 0) + 1,
        periodStartDate: contract.startDate,
        periodEndDate: settlementData.actualCheckOutDate,
        dueDate: now,
        items,
        subtotal: totalDeductions,
        discountAmount: deductedFromDeposit,
        taxAmount: 0,
        totalAmount,
        paidAmount,
        paidAt: isFullyCovered ? now : null,
        paymentMethod: isFullyCovered ? PaymentMethodEnum.SEPAY_QR : null,
        notes: settlementData.notes || 'Quyết toán trả kho thanh lý hợp đồng',
        issuedAt: now,
      },
      session
    );

    this.auditLogService?.record({
      action: AuditActionEnum.GENERATE_INVOICE,
      resourceType: AuditResourceEnum.INVOICE,
      resourceId: String(created._id),
      after: created,
      metadata: {
        settlementType: 'check_out_settlement',
        contractId: String(contract._id),
        damageFee,
        overdueFee,
        totalDeductions,
        depositAmount,
        additionalPaymentRequired,
      },
    });

    return created;
  }

  /**
   * Handles contract renewal addendum activation: ensures recurring invoice generation continues.
   */
  @Transactional()
  async handleContractRenewal(
    contract: IContract,
    session?: ClientSession
  ): Promise<IInvoice | null> {
    const cycleIndex = (contract.renewalCount || 0) + 1;
    return this.generateRecurringInvoice(contract, cycleIndex, session);
  }

  /**
   * Handles unit change addendum activation: calculates mid-cycle pro-rata price difference.
   * If upgraded to a higher rate, generates an INCIDENTAL invoice for the remaining days.
   */
  @Transactional()
  async handleUnitChangeProRata(
    contract: IContract,
    addendum: {
      addendumCode: string;
      totalPeriodicPrice: number;
    },
    session?: ClientSession
  ): Promise<IInvoice | null> {
    const contractIdStr = this.extractIdStr(contract._id);
    const now = new Date();
    const periodEndDate = contract.endDate;
    const remainingDays = Math.max(
      1,
      Math.round(
        (periodEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      )
    );
    const dailyOld =
      (contract.rentalPrice || contract.totalPeriodicPrice || 0) / 30;
    const dailyNew = addendum.totalPeriodicPrice / 30;
    const diff = Math.round((dailyNew - dailyOld) * remainingDays);

    if (diff <= 0) {
      return null;
    }

    const invoiceCode = this.generateInvoiceCode();
    const created = await this.invoiceRepository.create(
      {
        invoiceCode,
        contractId: new Types.ObjectId(contractIdStr),
        customerId: contract.customerId,
        facilityId: contract.facilityId,
        type: InvoiceTypeEnum.INCIDENTAL,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: (contract.renewalCount || 0) + 1,
        periodStartDate: now,
        periodEndDate,
        dueDate: addDays(now, 3),
        items: [
          {
            name: `Điều chỉnh nâng hạng phòng kho theo Phụ lục ${addendum.addendumCode}`,
            description: `Chênh lệch giá thuê ${remainingDays} ngày còn lại của kỳ`,
            quantity: 1,
            unitPrice: diff,
            amount: diff,
            itemType: InvoiceItemTypeEnum.RENT,
          },
        ],
        subtotal: diff,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: diff,
        paidAmount: 0,
        issuedAt: now,
      },
      session
    );

    this.auditLogService?.record({
      action: AuditActionEnum.GENERATE_INVOICE,
      resourceType: AuditResourceEnum.INVOICE,
      resourceId: String(created._id),
      after: created,
      metadata: {
        reason: 'unit_change_pro_rata',
        addendumCode: addendum.addendumCode,
        diff,
        remainingDays,
      },
    });

    return created;
  }
}
