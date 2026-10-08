import { Types, type ClientSession } from 'mongoose';
import type { PaymentRepository } from './payment.repository.ts';
import type { SepayService } from './sepay.service.ts';
import type { ReservationRepository } from '../reservation/reservation.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { ReservationService } from '../reservation/reservation.service.ts';
import type { ContractService } from '../contract/contract.service.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { IPayment } from './payment.model.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  paymentResponseSchema,
  type PaymentResponse,
} from './schemas/payment.response.schema.ts';
import type {
  CancelPaymentRequest,
  ConfirmManualPaymentRequest,
  CreatePaymentRequest,
  PaymentQuery,
  SepayWebhookPayload,
} from './schemas/payment.request.schema.ts';
import {
  PaymentMethodEnum,
  PaymentPurposeEnum,
  PaymentStatusEnum,
  PaymentTransactionResultEnum,
} from '../../common/enums/payment.enum.ts';
import { ReservationStatusEnum } from '../../common/enums/reservation.enum.ts';
import { ContractStatusEnum } from '../../common/enums/contract.enum.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { getSepayConfig } from '../../config/sepay.config.ts';

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly sepayService: SepayService,
    private readonly reservationRepository: ReservationRepository,
    private readonly contractRepository: ContractRepository,
    private readonly reservationService: ReservationService,
    private readonly contractService: ContractService,
    private readonly auditLogService?: AuditLogService
  ) {}

  private formatPayment(doc: IPayment): PaymentResponse {
    const raw = (
      typeof doc.toObject === 'function' ? doc.toObject() : doc
    ) as Record<string, unknown>;

    const formatUserSnap = (u: unknown) => {
      if (!u || typeof u !== 'object' || !('name' in u)) return null;
      const ur = u as Record<string, unknown>;
      return {
        id: String(ur._id || ur.id),
        name: String(ur.name),
        email: String(ur.email),
        phoneNumber: (ur.phoneNumber as string) ?? null,
        role: (ur.role as string) ?? null,
      };
    };

    const formatFacilitySnap = (f: unknown) => {
      if (!f || typeof f !== 'object' || !('name' in f)) return null;
      const fr = f as Record<string, unknown>;
      return {
        id: String(fr._id || fr.id),
        name: String(fr.name),
        city: String(fr.city),
        address: String(fr.address),
        phone: (fr.phone as string) ?? null,
        email: (fr.email as string) ?? null,
        status: (fr.status as string) ?? null,
      };
    };

    const customer = formatUserSnap(raw.customerId);
    const facility = formatFacilitySnap(raw.facilityId);
    const confirmedBy = formatUserSnap(raw.confirmedBy);
    const cancelledBy = formatUserSnap(raw.cancelledBy);

    const customerIdStr =
      raw.customerId &&
      typeof raw.customerId === 'object' &&
      '_id' in (raw.customerId as Record<string, unknown>)
        ? String((raw.customerId as Record<string, unknown>)._id)
        : String(raw.customerId);

    const facilityIdStr =
      raw.facilityId &&
      typeof raw.facilityId === 'object' &&
      '_id' in (raw.facilityId as Record<string, unknown>)
        ? String((raw.facilityId as Record<string, unknown>)._id)
        : String(raw.facilityId);

    const config = getSepayConfig();
    const remainingAmount = Math.max(
      0,
      Number(raw.amount) - Number(raw.paidAmount || 0)
    );
    const qrUrl =
      raw.status === PaymentStatusEnum.PENDING ||
      raw.status === PaymentStatusEnum.PARTIALLY_PAID
        ? this.sepayService.buildQrUrl({
            amount: remainingAmount,
            paymentCode: String(raw.paymentCode),
          })
        : null;

    const bankInfo = {
      bankCode: config.bankCode,
      accountNumber: config.accountNumber,
      accountName: config.accountName,
    };

    return {
      id: String(raw._id),
      paymentCode: String(raw.paymentCode),
      purpose: raw.purpose as PaymentPurposeEnum,
      reservationId: raw.reservationId ? String(raw.reservationId) : null,
      contractId: raw.contractId ? String(raw.contractId) : null,
      customerId: customerIdStr,
      facilityId: facilityIdStr,
      amount: Number(raw.amount),
      paidAmount: Number(raw.paidAmount || 0),
      overpaidAmount: Number(raw.overpaidAmount || 0),
      method: raw.method as PaymentMethodEnum,
      status: raw.status as PaymentStatusEnum,
      qrUrl,
      bankInfo,
      expiresAt: raw.expiresAt
        ? raw.expiresAt instanceof Date
          ? raw.expiresAt.toISOString()
          : new Date(String(raw.expiresAt)).toISOString()
        : null,
      paidAt: raw.paidAt
        ? raw.paidAt instanceof Date
          ? raw.paidAt.toISOString()
          : new Date(String(raw.paidAt)).toISOString()
        : null,
      sepayTransactionId:
        raw.sepayTransactionId !== undefined && raw.sepayTransactionId !== null
          ? Number(raw.sepayTransactionId)
          : null,
      referenceCode: (raw.referenceCode as string) ?? null,
      confirmedBy,
      confirmedAt: raw.confirmedAt
        ? raw.confirmedAt instanceof Date
          ? raw.confirmedAt.toISOString()
          : new Date(String(raw.confirmedAt)).toISOString()
        : null,
      cancelledBy,
      cancelledAt: raw.cancelledAt
        ? raw.cancelledAt instanceof Date
          ? raw.cancelledAt.toISOString()
          : new Date(String(raw.cancelledAt)).toISOString()
        : null,
      cancellationReason: (raw.cancellationReason as string) ?? null,
      note: (raw.note as string) ?? null,
      customer,
      facility,
      createdAt:
        raw.createdAt instanceof Date
          ? raw.createdAt.toISOString()
          : new Date(String(raw.createdAt)).toISOString(),
      updatedAt:
        raw.updatedAt instanceof Date
          ? raw.updatedAt.toISOString()
          : new Date(String(raw.updatedAt)).toISOString(),
    };
  }

  private extractId(
    val: unknown,
    fallbackDoc?: unknown,
    fieldName?: string
  ): string {
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      if ('_id' in obj && obj._id) {
        return String(obj._id);
      }
      if ('id' in obj && obj.id) {
        return String(obj.id);
      }
    }
    if (val) {
      return String(val);
    }
    if (
      fallbackDoc &&
      typeof (fallbackDoc as { get?: (f: string) => unknown }).get ===
        'function' &&
      fieldName
    ) {
      const raw = (fallbackDoc as { get: (f: string) => unknown }).get(
        fieldName
      );
      if (raw) return String(raw);
    }
    return '';
  }

  // 1. Create or retrieve active payment request for reservation or contract
  @Transactional()
  async createPayment(
    customerId: string,
    callerRole: string,
    data: CreatePaymentRequest,
    session?: ClientSession
  ): Promise<PaymentResponse> {
    let targetFacilityId: Types.ObjectId;
    let targetCustomerId: Types.ObjectId;
    let amount: number;
    let expiresAt: Date | null;
    let reservationId: Types.ObjectId | null = null;
    let contractId: Types.ObjectId | null = null;

    if (data.purpose === PaymentPurposeEnum.RESERVATION_DEPOSIT) {
      if (!data.reservationId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
          'reservationId is required for RESERVATION_DEPOSIT',
        ]);
      }

      const reservation = await this.reservationRepository.findById(
        data.reservationId,
        session
      );
      if (!reservation) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
      }

      const isStaffOrAdmin = [
        RoleEnum.SYSTEM_ADMIN,
        RoleEnum.BUSINESS_OPS_MANAGER,
        RoleEnum.FACILITY_MANAGER,
        RoleEnum.FACILITY_STAFF,
      ].includes(callerRole as RoleEnum);

      const resCustomerStr = this.extractId(
        reservation.customerId,
        reservation,
        'customerId'
      );

      if (!isStaffOrAdmin && resCustomerStr !== customerId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }

      if (
        reservation.status !== ReservationStatusEnum.PENDING_PAYMENT &&
        reservation.status !== ReservationStatusEnum.PAYMENT_FAILED
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_505);
      }

      if (
        reservation.expiresAt &&
        new Date() > new Date(reservation.expiresAt)
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_304);
      }

      // Reuse existing pending payment if available
      const existingPayment =
        await this.paymentRepository.findActiveByReservation(
          data.reservationId,
          session
        );
      if (existingPayment) {
        const populated = await this.paymentRepository.findById(
          String(existingPayment._id),
          session
        );
        return validateResponse(
          paymentResponseSchema,
          this.formatPayment(populated || existingPayment)
        );
      }

      reservationId = new Types.ObjectId(data.reservationId);
      targetCustomerId = new Types.ObjectId(resCustomerStr);
      targetFacilityId = new Types.ObjectId(
        this.extractId(reservation.facilityId, reservation, 'facilityId')
      );
      amount = reservation.depositAmount;
      expiresAt = reservation.expiresAt
        ? new Date(reservation.expiresAt)
        : null;
    } else {
      // CONTRACT_DEPOSIT flow
      if (!data.contractId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
          'contractId is required for CONTRACT_DEPOSIT',
        ]);
      }

      const contract = await this.contractRepository.findById(
        data.contractId,
        session
      );
      if (!contract) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
      }

      const isStaffOrAdmin = [
        RoleEnum.SYSTEM_ADMIN,
        RoleEnum.BUSINESS_OPS_MANAGER,
        RoleEnum.FACILITY_MANAGER,
        RoleEnum.FACILITY_STAFF,
      ].includes(callerRole as RoleEnum);

      const contractCustomerStr = this.extractId(
        contract.customerId,
        contract,
        'customerId'
      );

      if (!isStaffOrAdmin && contractCustomerStr !== customerId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }

      if (contract.status !== ContractStatusEnum.DRAFT) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
      }

      if (contract.depositPaidAt) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_507);
      }

      const existingPayment = await this.paymentRepository.findActiveByContract(
        data.contractId,
        session
      );
      if (existingPayment) {
        const populated = await this.paymentRepository.findById(
          String(existingPayment._id),
          session
        );
        return validateResponse(
          paymentResponseSchema,
          this.formatPayment(populated || existingPayment)
        );
      }

      contractId = new Types.ObjectId(data.contractId);
      targetCustomerId = new Types.ObjectId(contractCustomerStr);
      targetFacilityId = new Types.ObjectId(
        this.extractId(contract.facilityId, contract, 'facilityId')
      );
      amount = contract.depositAmount;
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours holding
    }

    // Generate unique payment code
    let paymentCode = this.sepayService.generatePaymentCode();
    let collisionCheck = await this.paymentRepository.findByCode(
      paymentCode,
      session
    );
    while (collisionCheck) {
      paymentCode = this.sepayService.generatePaymentCode();
      collisionCheck = await this.paymentRepository.findByCode(
        paymentCode,
        session
      );
    }

    const created = await this.paymentRepository.create(
      {
        paymentCode,
        purpose: data.purpose,
        reservationId,
        contractId,
        customerId: targetCustomerId,
        facilityId: targetFacilityId,
        amount,
        paidAmount: 0,
        overpaidAmount: 0,
        method: PaymentMethodEnum.SEPAY_QR,
        status: PaymentStatusEnum.PENDING,
        expiresAt,
      },
      session
    );

    const populated = await this.paymentRepository.findById(
      String(created._id),
      session
    );
    const formatted = this.formatPayment(populated || created);

    this.auditLogService?.record({
      action: AuditActionEnum.CREATE,
      resourceType: AuditResourceEnum.PAYMENT,
      resourceId: String(created._id),
      after: formatted,
    });

    return validateResponse(paymentResponseSchema, formatted);
  }

  // 2. Get payment by ID
  async getPaymentById(
    id: string,
    callerId: string,
    callerRole: string
  ): Promise<PaymentResponse> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_500);
    }

    const isStaffOrAdmin = [
      RoleEnum.SYSTEM_ADMIN,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.FACILITY_STAFF,
    ].includes(callerRole as RoleEnum);

    const customerStr = String(
      payment.customerId && typeof payment.customerId === 'object'
        ? (payment.customerId as { _id: Types.ObjectId })._id
        : payment.customerId
    );

    if (!isStaffOrAdmin && customerStr !== callerId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    return validateResponse(paymentResponseSchema, this.formatPayment(payment));
  }

  // 3. Get paginated list of payments
  async getPayments(
    query: PaymentQuery,
    callerId: string,
    callerRole: string
  ): Promise<PaginatedData<PaymentResponse>> {
    const isStaffOrAdmin = [
      RoleEnum.SYSTEM_ADMIN,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.FACILITY_STAFF,
    ].includes(callerRole as RoleEnum);

    const filter = { ...query };
    if (!isStaffOrAdmin) {
      filter.customerId = callerId;
    }

    const result = await this.paymentRepository.findPaginated(filter);
    return {
      items: result.items.map((p) => this.formatPayment(p)),
      pagination: result.pagination,
    };
  }

  // 4. Cancel pending payment
  async cancelPayment(
    id: string,
    callerId: string,
    callerRole: string,
    data: CancelPaymentRequest
  ): Promise<PaymentResponse> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_500);
    }

    const isStaffOrAdmin = [
      RoleEnum.SYSTEM_ADMIN,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.FACILITY_STAFF,
    ].includes(callerRole as RoleEnum);

    const customerStr = String(
      payment.customerId && typeof payment.customerId === 'object'
        ? (payment.customerId as { _id: Types.ObjectId })._id
        : payment.customerId
    );

    if (!isStaffOrAdmin && customerStr !== callerId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (
      payment.status !== PaymentStatusEnum.PENDING &&
      payment.status !== PaymentStatusEnum.PARTIALLY_PAID
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_501);
    }

    const updated = await this.paymentRepository.update(id, {
      status: PaymentStatusEnum.CANCELLED,
      cancelledBy: new Types.ObjectId(callerId),
      cancelledAt: new Date(),
      cancellationReason: data.cancellationReason,
    });

    const populated = await this.paymentRepository.findById(id);
    const formatted = this.formatPayment(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL,
      resourceType: AuditResourceEnum.PAYMENT,
      resourceId: id,
      before: this.formatPayment(payment),
      after: formatted,
    });

    return validateResponse(paymentResponseSchema, formatted);
  }

  // 5. Staff manual confirmation (Cash / Counter transfer)
  @Transactional()
  async confirmManualPayment(
    id: string,
    staffId: string,
    data: ConfirmManualPaymentRequest,
    session?: ClientSession
  ): Promise<PaymentResponse> {
    const payment = await this.paymentRepository.findById(id, session);
    if (!payment) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_500);
    }

    if (
      payment.status !== PaymentStatusEnum.PENDING &&
      payment.status !== PaymentStatusEnum.PARTIALLY_PAID
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_501);
    }

    const now = new Date();
    const updated = await this.paymentRepository.update(
      id,
      {
        status: PaymentStatusEnum.PAID,
        paidAmount: payment.amount,
        paidAt: now,
        method: data.method,
        referenceCode: data.referenceCode || null,
        confirmedBy: new Types.ObjectId(staffId),
        confirmedAt: now,
        note: data.note,
      },
      session
    );

    // Notify connected domain
    if (
      payment.purpose === PaymentPurposeEnum.RESERVATION_DEPOSIT &&
      payment.reservationId
    ) {
      await this.reservationService.markDepositPaid(
        String(payment.reservationId),
        {
          paymentId: id,
          paidAmount: payment.amount,
          paidAt: now,
          referenceCode: data.referenceCode,
        },
        session
      );
    } else if (
      payment.purpose === PaymentPurposeEnum.CONTRACT_DEPOSIT &&
      payment.contractId
    ) {
      await this.contractService.markDepositPaid(
        String(payment.contractId),
        {
          paymentId: id,
          paidAmount: payment.amount,
          paidAt: now,
          referenceCode: data.referenceCode,
        },
        session
      );
    }

    const populated = await this.paymentRepository.findById(id, session);
    const formatted = this.formatPayment(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.CONFIRM_PAYMENT,
      resourceType: AuditResourceEnum.PAYMENT,
      resourceId: id,
      before: this.formatPayment(payment),
      after: formatted,
      metadata: {
        method: data.method,
        referenceCode: data.referenceCode || null,
        note: data.note,
      },
    });

    return validateResponse(paymentResponseSchema, formatted);
  }

  // 6. Process expired payments
  async processExpiredPayments(): Promise<{ processedCount: number }> {
    const expiredList = await this.paymentRepository.findExpired(new Date());
    let count = 0;

    for (const payment of expiredList) {
      await this.paymentRepository.update(String(payment._id), {
        status: PaymentStatusEnum.EXPIRED,
      });
      count++;
    }

    return { processedCount: count };
  }

  // 7. SePay Webhook Handler (Idempotent bank transfer processing)
  async handleSepayWebhook(
    payload: SepayWebhookPayload
  ): Promise<{ success: boolean; message?: string }> {
    // A. Deduplication check via sepayId
    const existingTx = await this.paymentRepository.findTransactionBySepayId(
      payload.id
    );

    if (
      existingTx &&
      [
        PaymentTransactionResultEnum.MATCHED,
        PaymentTransactionResultEnum.IGNORED,
        PaymentTransactionResultEnum.LATE,
      ].includes(existingTx.result)
    ) {
      return { success: true, message: 'Transaction already processed' };
    }

    // Record incoming transaction if not already persisted
    let txRecord = existingTx;
    if (!txRecord) {
      try {
        txRecord = await this.paymentRepository.createTransaction({
          sepayId: payload.id,
          gateway: payload.gateway,
          transactionDate: payload.transactionDate,
          accountNumber: payload.accountNumber,
          subAccount: payload.subAccount,
          code: payload.code,
          content: payload.content,
          transferType: payload.transferType,
          transferAmount: payload.transferAmount,
          accumulated: payload.accumulated,
          referenceCode: payload.referenceCode,
          description: payload.description,
          result: PaymentTransactionResultEnum.RECEIVED,
          rawPayload: payload as unknown as Record<string, unknown>,
        });
      } catch (err) {
        // If race condition hit unique index on sepayId, re-fetch
        const recheck = await this.paymentRepository.findTransactionBySepayId(
          payload.id
        );
        if (recheck) {
          txRecord = recheck;
        } else {
          throw err;
        }
      }
    }

    // B. Check transfer direction: only process incoming transfers
    if (payload.transferType && payload.transferType.toLowerCase() !== 'in') {
      await this.paymentRepository.updateTransactionResult(
        String(txRecord._id),
        PaymentTransactionResultEnum.IGNORED
      );
      return { success: true, message: 'Ignored non-incoming transfer' };
    }

    // C. Extract payment code
    let paymentCode: string | null = null;
    if (payload.code) {
      paymentCode = this.sepayService.extractPaymentCode(payload.code);
    }
    if (!paymentCode && payload.content) {
      paymentCode = this.sepayService.extractPaymentCode(payload.content);
    }

    if (!paymentCode) {
      await this.paymentRepository.updateTransactionResult(
        String(txRecord._id),
        PaymentTransactionResultEnum.UNMATCHED
      );
      return {
        success: true,
        message: 'No recognizable payment code in transaction',
      };
    }

    // D. Find matching payment
    const payment = await this.paymentRepository.findByCode(paymentCode);
    if (!payment) {
      await this.paymentRepository.updateTransactionResult(
        String(txRecord._id),
        PaymentTransactionResultEnum.UNMATCHED
      );
      return { success: true, message: 'Payment code did not match any order' };
    }

    // Verify account number if provided in payload
    const config = getSepayConfig();
    if (
      payload.accountNumber &&
      payload.accountNumber.trim() !== config.accountNumber
    ) {
      await this.paymentRepository.updateTransactionResult(
        String(txRecord._id),
        PaymentTransactionResultEnum.UNMATCHED,
        String(payment._id)
      );
      return { success: true, message: 'Account number mismatch' };
    }

    // If already fully paid
    if (payment.status === PaymentStatusEnum.PAID) {
      await this.paymentRepository.updateTransactionResult(
        String(txRecord._id),
        PaymentTransactionResultEnum.MATCHED,
        String(payment._id)
      );
      return { success: true, message: 'Payment was already fully settled' };
    }

    // If payment was cancelled or expired, record as LATE transfer
    if (
      payment.status === PaymentStatusEnum.CANCELLED ||
      payment.status === PaymentStatusEnum.EXPIRED
    ) {
      await this.paymentRepository.updateTransactionResult(
        String(txRecord._id),
        PaymentTransactionResultEnum.LATE,
        String(payment._id)
      );
      return {
        success: true,
        message: 'Payment was expired or cancelled (recorded as LATE)',
      };
    }

    // E. Settle payment inside transactional boundary
    await this.settlePaymentWithTransaction(
      payment,
      payload,
      String(txRecord._id)
    );

    return { success: true };
  }

  @Transactional()
  private async settlePaymentWithTransaction(
    payment: IPayment,
    payload: SepayWebhookPayload,
    transactionRecordId: string,
    session?: ClientSession
  ): Promise<void> {
    const paymentId = String(payment._id);
    const currentPaid = Number(payment.paidAmount || 0);
    const newPaidAmount = currentPaid + Number(payload.transferAmount);
    const isFullyPaid = newPaidAmount >= payment.amount;
    const overpaidAmount = isFullyPaid
      ? Math.max(0, newPaidAmount - payment.amount)
      : 0;
    const newStatus = isFullyPaid
      ? PaymentStatusEnum.PAID
      : PaymentStatusEnum.PARTIALLY_PAID;

    const now = new Date();
    const updatePayload: Partial<IPayment> = {
      paidAmount: newPaidAmount,
      overpaidAmount,
      status: newStatus,
      sepayTransactionId: payload.id,
      referenceCode: payload.referenceCode || payload.code || null,
    };

    if (isFullyPaid) {
      updatePayload.paidAt = now;
    }

    const updatedPayment = await this.paymentRepository.atomicUpdatePayment(
      paymentId,
      updatePayload,
      session
    );

    if (!updatedPayment) {
      return;
    }

    // If fully paid, notify target domain (Reservation or Contract)
    if (isFullyPaid) {
      if (
        payment.purpose === PaymentPurposeEnum.RESERVATION_DEPOSIT &&
        payment.reservationId
      ) {
        await this.reservationService.markDepositPaid(
          String(payment.reservationId),
          {
            paymentId,
            paidAmount: newPaidAmount,
            paidAt: now,
            referenceCode: payload.referenceCode || payload.code || null,
          },
          session
        );
      } else if (
        payment.purpose === PaymentPurposeEnum.CONTRACT_DEPOSIT &&
        payment.contractId
      ) {
        await this.contractService.markDepositPaid(
          String(payment.contractId),
          {
            paymentId,
            paidAmount: newPaidAmount,
            paidAt: now,
            referenceCode: payload.referenceCode || payload.code || null,
          },
          session
        );
      }
    }

    // Update transaction result
    await this.paymentRepository.updateTransactionResult(
      transactionRecordId,
      isFullyPaid
        ? PaymentTransactionResultEnum.MATCHED
        : PaymentTransactionResultEnum.PARTIALLY_MATCHED,
      paymentId,
      session
    );

    const populated = await this.paymentRepository.findById(paymentId, session);
    const formatted = this.formatPayment(populated || updatedPayment);

    this.auditLogService?.record({
      action: AuditActionEnum.RECEIVE_PAYMENT,
      resourceType: AuditResourceEnum.PAYMENT,
      resourceId: paymentId,
      before: this.formatPayment(payment),
      after: formatted,
      metadata: {
        sepayId: payload.id,
        transferAmount: payload.transferAmount,
        isFullyPaid,
      },
    });
  }
}
