import crypto from 'node:crypto';
import { Types, type ClientSession } from 'mongoose';
import { RefundRequestRepository } from './refundRequest.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { ReservationRepository } from '../reservation/reservation.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { IRefundRequest } from './refundRequest.model.ts';
import {
  RefundReasonEnum,
  RefundRequestStatusEnum,
} from '../../common/enums/refundRequest.enum.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { RefundStatusEnum } from '../../common/enums/reservation.enum.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import { encryptText, maskAccountNumber } from '../../utils/encryption.util.ts';
import { getRefundConfig } from '../../config/refund.config.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  refundRequestResponseSchema,
  type RefundRequestResponse,
} from './schemas/refundRequest.response.schema.ts';
import type {
  ApproveRefundRequest,
  CancelRefundRequest,
  ConfirmPaidRefund,
  CreateRefundRequest,
  RefundRequestQuery,
  RejectRefundRequest,
} from './schemas/refundRequest.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';

export class RefundRequestService {
  constructor(
    private readonly refundRequestRepository: RefundRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly reservationRepository?: ReservationRepository,
    private readonly contractRepository?: ContractRepository,
    private readonly auditLogService?: AuditLogService
  ) {}

  private generateRefundCode(): string {
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `REF-${Date.now()}-${randomSuffix}`;
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
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121);
    }

    const user = await this.userRepository.findById(callerId);
    if (!user || !user.assignedFacilityId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122);
    }

    const assignedId = String(
      (user.assignedFacilityId as { _id?: unknown })._id ||
        user.assignedFacilityId
    );

    if (assignedId !== String(targetFacilityId)) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122);
    }
  }

  private extractId(val: unknown): string {
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      if ('_id' in obj && obj._id) return String(obj._id);
      if ('id' in obj && obj.id) return String(obj.id);
    }
    return val ? String(val) : '';
  }

  public formatRefundRequest(doc: IRefundRequest): RefundRequestResponse {
    const raw = doc.toObject ? doc.toObject() : doc;

    const facility =
      raw.facilityId && typeof raw.facilityId === 'object'
        ? {
            id: this.extractId(raw.facilityId),
            name: (raw.facilityId as { name?: string }).name || 'Facility',
          }
        : { id: this.extractId(raw.facilityId) };

    const customer =
      raw.customerId && typeof raw.customerId === 'object'
        ? {
            id: this.extractId(raw.customerId),
            name: (raw.customerId as { name?: string }).name || 'Customer',
            email: (raw.customerId as { email?: string }).email,
          }
        : { id: this.extractId(raw.customerId) };

    const requestedBy =
      raw.requestedBy && typeof raw.requestedBy === 'object'
        ? {
            id: this.extractId(raw.requestedBy),
            name: (raw.requestedBy as { name?: string }).name || 'Requester',
          }
        : { id: this.extractId(raw.requestedBy) };

    const formatActor = (actor: unknown) => {
      if (!actor) return null;
      if (typeof actor === 'object') {
        return {
          id: this.extractId(actor),
          name: (actor as { name?: string }).name || 'Staff',
        };
      }
      return { id: String(actor) };
    };

    return validateResponse(refundRequestResponseSchema, {
      id: String(raw._id),
      refundCode: raw.refundCode,
      reservationId: raw.reservationId ? String(raw.reservationId) : null,
      contractId: raw.contractId ? String(raw.contractId) : null,
      paymentId: raw.paymentId ? String(raw.paymentId) : null,
      facility,
      customer,
      amount: Number(raw.amount),
      reason: raw.reason,
      status: raw.status,
      refundBankName: raw.refundBankName || null,
      refundAccountNumberMasked: raw.refundAccountNumberMasked || null,
      refundAccountHolder: raw.refundAccountHolder || null,
      referenceCode: raw.referenceCode || null,
      proofImageUrl: raw.proofImageUrl || null,
      rejectionReason: raw.rejectionReason || null,
      cancellationReason: raw.cancellationReason || null,
      note: raw.note || null,
      requestedBy,
      requestedAt:
        raw.requestedAt instanceof Date
          ? raw.requestedAt.toISOString()
          : new Date(String(raw.requestedAt)).toISOString(),
      approvedBy: formatActor(raw.approvedBy),
      approvedAt: raw.approvedAt
        ? new Date(String(raw.approvedAt)).toISOString()
        : null,
      rejectedBy: formatActor(raw.rejectedBy),
      rejectedAt: raw.rejectedAt
        ? new Date(String(raw.rejectedAt)).toISOString()
        : null,
      paidBy: formatActor(raw.paidBy),
      paidAt: raw.paidAt ? new Date(String(raw.paidAt)).toISOString() : null,
      cancelledBy: formatActor(raw.cancelledBy),
      cancelledAt: raw.cancelledAt
        ? new Date(String(raw.cancelledAt)).toISOString()
        : null,
      createdAt:
        raw.createdAt instanceof Date
          ? raw.createdAt.toISOString()
          : new Date(String(raw.createdAt)).toISOString(),
      updatedAt:
        raw.updatedAt instanceof Date
          ? raw.updatedAt.toISOString()
          : new Date(String(raw.updatedAt)).toISOString(),
    });
  }

  @Transactional()
  async createRefundRequest(
    callerId: string,
    callerRole: string,
    data: CreateRefundRequest,
    session?: ClientSession
  ): Promise<RefundRequestResponse> {
    // 1. Phân quyền: CUSTOMER và STAFF không được tạo thủ công qua API trực tiếp này
    if (
      callerRole === RoleEnum.CUSTOMER ||
      callerRole === RoleEnum.FACILITY_STAFF
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121);
    }

    await this.assertFacilityAccess(callerId, callerRole, data.facilityId);

    return this.createRefundRequestInternal(callerId, data, session);
  }

  /**
   * Tạo yêu cầu hoàn tiền nội bộ (hỗ trợ các luồng domain tự động như Huỷ đơn, Quá hạn, Webhook Mismatch).
   */
  @Transactional()
  async createRefundRequestInternal(
    requestedById: string,
    data: CreateRefundRequest,
    session?: ClientSession
  ): Promise<RefundRequestResponse> {
    // 1. Kiểm tra bất biến tổng tiền (Invariant check)
    // Bất biến tổng cọc chỉ áp dụng cho hoàn tiền từ cọc đã settle.
    // Với AMOUNT_MISMATCH (chuyển sai số tiền) hoặc LATE_PAYMENT (chuyển muộn),
    // nguồn tiền hoàn là giao dịch chuyển khoản bên ngoài chưa được nhận cọc, nên hoàn toàn bộ số tiền đã chuyển.
    const isExternalTransferRefund =
      data.reason === RefundReasonEnum.AMOUNT_MISMATCH ||
      data.reason === RefundReasonEnum.LATE_PAYMENT;

    if (!isExternalTransferRefund) {
      if (data.reservationId && this.reservationRepository) {
        const reservation = await this.reservationRepository.findById(
          data.reservationId,
          session
        );
        if (reservation) {
          const existingValidRefunds =
            await this.refundRequestRepository.sumValidRefundsByReservationId(
              data.reservationId,
              session
            );

          const totalPaid = Number(reservation.depositAmount || 0);
          const forfeited = Number(reservation.forfeitedAmount || 0);
          const netSettled = Math.max(0, totalPaid - forfeited);

          if (existingValidRefunds + data.amount > netSettled) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_513);
          }
        }
      }

      if (data.contractId && this.contractRepository) {
        const contract = await this.contractRepository.findById(
          data.contractId,
          session
        );
        if (contract) {
          const existingValidRefunds =
            await this.refundRequestRepository.sumValidRefundsByContractId(
              data.contractId,
              session
            );

          const totalDeposit = Number(contract.depositAmount || 0);
          if (existingValidRefunds + data.amount > totalDeposit) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_513);
          }
        }
      }
    }

    // 2. Mã hóa số tài khoản ngân hàng nhạy cảm
    let encryptedAcc: string | undefined;
    let maskedAcc: string | undefined;
    if (data.refundAccountNumber) {
      encryptedAcc = encryptText(data.refundAccountNumber);
      maskedAcc = maskAccountNumber(data.refundAccountNumber);
    }

    const refundCode = this.generateRefundCode();
    const createdDoc = await this.refundRequestRepository.create(
      {
        refundCode,
        reservationId: data.reservationId
          ? new Types.ObjectId(data.reservationId)
          : null,
        contractId: data.contractId
          ? new Types.ObjectId(data.contractId)
          : null,
        paymentId: data.paymentId ? new Types.ObjectId(data.paymentId) : null,
        facilityId: new Types.ObjectId(data.facilityId),
        customerId: new Types.ObjectId(data.customerId),
        amount: data.amount,
        reason: data.reason,
        status: RefundRequestStatusEnum.PENDING_APPROVAL,
        refundBankName: data.refundBankName || null,
        refundAccountNumberEncrypted: encryptedAcc || null,
        refundAccountNumberMasked: maskedAcc || null,
        refundAccountHolder: data.refundAccountHolder || null,
        note: data.note || null,
        requestedBy: new Types.ObjectId(requestedById),
        requestedAt: new Date(),
      },
      session
    );

    // Ghi audit log
    this.auditLogService?.record({
      action: AuditActionEnum.CREATE,
      resourceType: AuditResourceEnum.REFUND_REQUEST,
      resourceId: String(createdDoc._id),
      after: createdDoc,
    });

    const populated = await this.refundRequestRepository.findById(
      String(createdDoc._id),
      session
    );
    return this.formatRefundRequest(populated || createdDoc);
  }

  @Transactional()
  async approveRefundRequest(
    id: string,
    callerId: string,
    callerRole: string,
    data: ApproveRefundRequest,
    session?: ClientSession
  ): Promise<RefundRequestResponse> {
    const existing = await this.refundRequestRepository.findById(id, session);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_511);
    }

    if (existing.status === RefundRequestStatusEnum.PAID) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_516);
    }

    if (existing.status !== RefundRequestStatusEnum.PENDING_APPROVAL) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_512);
    }

    // 1. Maker-Checker: Người tạo không được tự duyệt
    const requesterId = this.extractId(existing.requestedBy);
    if (requesterId === callerId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_514);
    }

    // 2. Phân quyền & Ngưỡng duyệt OPS
    const facilityId = this.extractId(existing.facilityId);
    await this.assertFacilityAccess(callerId, callerRole, facilityId);

    const { opsApprovalThreshold } = getRefundConfig();
    if (
      callerRole === RoleEnum.FACILITY_MANAGER &&
      existing.amount > opsApprovalThreshold
    ) {
      // Vượt ngưỡng 10tr: chỉ OPS hoặc ADMIN được duyệt
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121);
    }

    const now = new Date();
    const updated = await this.refundRequestRepository.atomicUpdateStatus(
      id,
      RefundRequestStatusEnum.PENDING_APPROVAL,
      {
        status: RefundRequestStatusEnum.APPROVED,
        approvedBy: callerId as unknown as IRefundRequest['approvedBy'],
        approvedAt: now,
        note: data.note || existing.note,
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_512);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.APPROVE_REFUND,
      resourceType: AuditResourceEnum.REFUND_REQUEST,
      resourceId: id,
      before: existing,
      after: updated,
    });

    const populated = await this.refundRequestRepository.findById(id, session);
    return this.formatRefundRequest(populated || updated);
  }

  @Transactional()
  async rejectRefundRequest(
    id: string,
    callerId: string,
    callerRole: string,
    data: RejectRefundRequest,
    session?: ClientSession
  ): Promise<RefundRequestResponse> {
    const existing = await this.refundRequestRepository.findById(id, session);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_511);
    }

    if (existing.status === RefundRequestStatusEnum.PAID) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_516);
    }

    if (existing.status !== RefundRequestStatusEnum.PENDING_APPROVAL) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_512);
    }

    const facilityId = this.extractId(existing.facilityId);
    await this.assertFacilityAccess(callerId, callerRole, facilityId);

    const now = new Date();
    const updated = await this.refundRequestRepository.atomicUpdateStatus(
      id,
      RefundRequestStatusEnum.PENDING_APPROVAL,
      {
        status: RefundRequestStatusEnum.REJECTED,
        rejectedBy: callerId as unknown as IRefundRequest['rejectedBy'],
        rejectedAt: now,
        rejectionReason: data.rejectionReason,
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_512);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.REJECT_REFUND,
      resourceType: AuditResourceEnum.REFUND_REQUEST,
      resourceId: id,
      before: existing,
      after: updated,
    });

    const populated = await this.refundRequestRepository.findById(id, session);
    return this.formatRefundRequest(populated || updated);
  }

  @Transactional()
  async confirmPaidRefundRequest(
    id: string,
    callerId: string,
    callerRole: string,
    data: ConfirmPaidRefund,
    session?: ClientSession
  ): Promise<RefundRequestResponse> {
    const existing = await this.refundRequestRepository.findById(id, session);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_511);
    }

    if (existing.status === RefundRequestStatusEnum.PAID) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_516);
    }

    if (
      existing.status !== RefundRequestStatusEnum.APPROVED &&
      existing.status !== RefundRequestStatusEnum.PENDING_APPROVAL
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_512);
    }

    const facilityId = this.extractId(existing.facilityId);
    await this.assertFacilityAccess(callerId, callerRole, facilityId);

    if (!data.referenceCode || data.referenceCode.trim() === '') {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_515);
    }

    const now = new Date();
    const updated = await this.refundRequestRepository.atomicUpdateStatus(
      id,
      [
        RefundRequestStatusEnum.APPROVED,
        RefundRequestStatusEnum.PENDING_APPROVAL,
      ],
      {
        status: RefundRequestStatusEnum.PAID,
        paidBy: callerId as unknown as IRefundRequest['paidBy'],
        paidAt: now,
        referenceCode: data.referenceCode.trim(),
        proofImageUrl: data.proofImageUrl || existing.proofImageUrl,
        note: data.note || existing.note,
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_512);
    }

    // Đồng bộ sang Reservation nếu liên kết
    if (existing.reservationId && this.reservationRepository) {
      await this.reservationRepository.update(
        String(existing.reservationId),
        {
          refundStatus: RefundStatusEnum.REFUNDED,
          refundedBy: new Types.ObjectId(callerId),
          refundedAt: now,
          refundReference: data.referenceCode.trim(),
        },
        session
      );
    }

    this.auditLogService?.record({
      action: AuditActionEnum.PAY_REFUND,
      resourceType: AuditResourceEnum.REFUND_REQUEST,
      resourceId: id,
      before: existing,
      after: updated,
    });

    const populated = await this.refundRequestRepository.findById(id, session);
    return this.formatRefundRequest(populated || updated);
  }

  @Transactional()
  async cancelRefundRequest(
    id: string,
    callerId: string,
    callerRole: string,
    data: CancelRefundRequest,
    session?: ClientSession
  ): Promise<RefundRequestResponse> {
    const existing = await this.refundRequestRepository.findById(id, session);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_511);
    }

    if (existing.status === RefundRequestStatusEnum.PAID) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_516);
    }

    if (callerRole === RoleEnum.CUSTOMER) {
      const customerId = this.extractId(existing.customerId);
      if (customerId !== callerId) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_511);
      }
      if (existing.status !== RefundRequestStatusEnum.PENDING_APPROVAL) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_512);
      }
    } else {
      const facilityId = this.extractId(existing.facilityId);
      await this.assertFacilityAccess(callerId, callerRole, facilityId);
    }

    const now = new Date();
    const updated = await this.refundRequestRepository.atomicUpdateStatus(
      id,
      [
        RefundRequestStatusEnum.PENDING_APPROVAL,
        RefundRequestStatusEnum.APPROVED,
      ],
      {
        status: RefundRequestStatusEnum.CANCELLED,
        cancelledBy: callerId as unknown as IRefundRequest['cancelledBy'],
        cancelledAt: now,
        cancellationReason: data.cancellationReason,
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_512);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL,
      resourceType: AuditResourceEnum.REFUND_REQUEST,
      resourceId: id,
      before: existing,
      after: updated,
    });

    const populated = await this.refundRequestRepository.findById(id, session);
    return this.formatRefundRequest(populated || updated);
  }

  async getRefundRequests(
    callerId: string,
    callerRole: string,
    query: RefundRequestQuery
  ): Promise<PaginatedData<RefundRequestResponse>> {
    const scopedQuery = { ...query };

    if (callerRole === RoleEnum.CUSTOMER) {
      scopedQuery.customerId = callerId;
    } else if (
      callerRole === RoleEnum.FACILITY_STAFF ||
      callerRole === RoleEnum.FACILITY_MANAGER
    ) {
      const user = await this.userRepository.findById(callerId);
      if (!user || !user.assignedFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122);
      }
      scopedQuery.facilityId = String(
        (user.assignedFacilityId as { _id?: unknown })._id ||
          user.assignedFacilityId
      );
    }

    const paginated = await this.refundRequestRepository.paginate(scopedQuery);

    return {
      ...paginated,
      items: paginated.items.map((doc) => this.formatRefundRequest(doc)),
    };
  }

  async getRefundRequestById(
    id: string,
    callerId: string,
    callerRole: string
  ): Promise<RefundRequestResponse> {
    const existing = await this.refundRequestRepository.findById(id);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_511);
    }

    if (callerRole === RoleEnum.CUSTOMER) {
      const customerId = this.extractId(existing.customerId);
      if (customerId !== callerId) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_511);
      }
    } else if (
      callerRole === RoleEnum.FACILITY_STAFF ||
      callerRole === RoleEnum.FACILITY_MANAGER
    ) {
      const facilityId = this.extractId(existing.facilityId);
      await this.assertFacilityAccess(callerId, callerRole, facilityId);
    }

    return this.formatRefundRequest(existing);
  }
}
