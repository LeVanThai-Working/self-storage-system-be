import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { Invoice } from '../src/modules/invoice/invoice.model.ts';
import { InvoiceRepository } from '../src/modules/invoice/invoice.repository.ts';
import { InvoiceService } from '../src/modules/invoice/invoice.service.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import {
  Payment,
  PaymentTransaction,
} from '../src/modules/payment/payment.model.ts';
import { PaymentRepository } from '../src/modules/payment/payment.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import type { AuditLogService } from '../src/modules/auditLog/auditLog.service.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
  BillingUnitEnum,
} from '../src/common/enums/billing.enum.ts';
import {
  PaymentPurposeEnum,
  PaymentStatusEnum,
  PaymentMethodEnum,
} from '../src/common/enums/payment.enum.ts';
import {
  RoleEnum,
  UserStatusEnum,
  AuthProviderEnum,
} from '../src/common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import {
  ContractStatusEnum,
  ContractSourceEnum,
  ContractDepositStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { AppError } from '../src/common/errors/appError.error.ts';
import { AuditActionEnum } from '../src/common/enums/auditLog.enum.ts';

describe('billing/T1.4: Invoice Cancellation & Voiding Lifecycle', () => {
  let invoiceRepo: InvoiceRepository;
  let contractRepo: ContractRepository;
  let userRepo: UserRepository;
  let paymentRepo: PaymentRepository;
  let service: InvoiceService;
  let mockAuditLogService: { record: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    await setupTestDB();
    expect(Payment).toBeDefined();
    expect(PaymentTransaction).toBeDefined();
    expect(FacilityUnitTypeOffering).toBeDefined();
    expect(StorageUnit).toBeDefined();

    invoiceRepo = new InvoiceRepository(Invoice);
    contractRepo = new ContractRepository(Contract);
    userRepo = new UserRepository(User);
    paymentRepo = new PaymentRepository(Payment, PaymentTransaction);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    mockAuditLogService = { record: vi.fn() };
    service = new InvoiceService(
      invoiceRepo,
      contractRepo,
      userRepo,
      mockAuditLogService as unknown as AuditLogService,
      paymentRepo
    );
  });

  async function createFixtures() {
    const customer = await User.create({
      name: 'Khách hàng Hủy',
      email: 'customer_cancel@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0901234567',
    });

    const facility1 = await Facility.create({
      name: 'Cơ sở Quận 3',
      code: 'Q301',
      city: 'TP. Hồ Chí Minh',
      address: '15 Võ Văn Tần, Q3, TP.HCM',
      status: FacilityStatusEnum.ACTIVE,
      timezone: 'Asia/Ho_Chi_Minh',
    });

    const facility2 = await Facility.create({
      name: 'Cơ sở Quận 7',
      code: 'Q701',
      city: 'TP. Hồ Chí Minh',
      address: '25 Nguyễn Lương Bằng, Q7, TP.HCM',
      status: FacilityStatusEnum.ACTIVE,
      timezone: 'Asia/Ho_Chi_Minh',
    });

    const staff1 = await User.create({
      name: 'Nhân viên Cơ sở Q3',
      email: 'staff_q3@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0902234567',
      assignedFacilityId: facility1._id,
    });

    const staffOtherFacility = await User.create({
      name: 'Nhân viên Cơ sở Q7',
      email: 'staff_q7@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0903234567',
      assignedFacilityId: facility2._id,
    });

    const admin = await User.create({
      name: 'Quản trị viên Hệ thống',
      email: 'admin_cancel@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.SYSTEM_ADMIN,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0904234567',
    });

    const contract = await Contract.create({
      contractCode: 'HD-2026-CAN01',
      source: ContractSourceEnum.WALK_IN,
      customerId: customer._id,
      facilityId: facility1._id,
      storageUnitId: new Types.ObjectId(),
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      rentalPrice: 2000000,
      depositAmount: 2000000,
      depositStatus: ContractDepositStatusEnum.HELD,
      depositPaidAt: new Date(),
      billingUnit: BillingUnitEnum.MONTH,
      rentalDuration: 6,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2027-05-01T00:00:00.000Z'),
      totalPeriodicPrice: 2000000,
      status: ContractStatusEnum.ACTIVE,
    });

    const issuedInvoice = await Invoice.create({
      invoiceCode: 'INV-261101-CAN01',
      contractId: contract._id,
      customerId: customer._id,
      facilityId: facility1._id,
      type: InvoiceTypeEnum.RECURRING,
      status: InvoiceStatusEnum.ISSUED,
      billingPeriodIndex: 2,
      periodStartDate: new Date('2026-12-01T00:00:00.000Z'),
      periodEndDate: new Date('2026-12-31T23:59:59.999Z'),
      dueDate: new Date('2026-12-01T23:59:59.999Z'),
      items: [
        {
          name: 'Tiền thuê kho tháng 12/2026',
          quantity: 1,
          unitPrice: 2000000,
          amount: 2000000,
          itemType: InvoiceItemTypeEnum.RENT,
        },
      ],
      subtotal: 2000000,
      totalAmount: 2000000,
      paidAmount: 0,
      issuedAt: new Date(),
    });

    return {
      customer,
      facility1,
      facility2,
      staff1,
      staffOtherFacility,
      admin,
      contract,
      issuedInvoice,
    };
  }

  describe('1. Individual Invoice Cancellation (cancelInvoice)', () => {
    it('should cancel an ISSUED invoice with valid reason and record audit log', async () => {
      const { staff1, issuedInvoice } = await createFixtures();

      const result = await service.cancelInvoice(
        issuedInvoice._id.toString(),
        'Khách đổi lịch nhận kho sang tháng sau',
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(InvoiceStatusEnum.CANCELLED);
      expect(result.cancelReason).toBe(
        'Khách đổi lịch nhận kho sang tháng sau'
      );
      expect(result.cancelledBy?.id).toBe(staff1._id.toString());
      expect(result.cancelledAt).toBeDefined();

      const inDb = await Invoice.findById(issuedInvoice._id);
      expect(inDb?.status).toBe(InvoiceStatusEnum.CANCELLED);
      expect(inDb?.cancelReason).toBe('Khách đổi lịch nhận kho sang tháng sau');
      expect(inDb?.cancelledBy?.toString()).toBe(staff1._id.toString());

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditActionEnum.CANCEL_INVOICE,
          resourceId: issuedInvoice._id.toString(),
        })
      );
    });

    it('should cancel attached PENDING payment when invoice is cancelled', async () => {
      const { staff1, issuedInvoice, customer, facility1, contract } =
        await createFixtures();

      const pendingPayment = await Payment.create({
        paymentCode: 'PAY-261101-PEND-CAN',
        purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
        invoiceId: issuedInvoice._id,
        contractId: contract._id,
        customerId: customer._id,
        facilityId: facility1._id,
        amount: 2000000,
        paidAmount: 0,
        overpaidAmount: 0,
        method: PaymentMethodEnum.SEPAY_QR,
        status: PaymentStatusEnum.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await service.cancelInvoice(
        issuedInvoice._id.toString(),
        'Hủy hóa đơn do sai thông tin tiện ích',
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      const updatedPayment = await Payment.findById(pendingPayment._id);
      expect(updatedPayment?.status).toBe(PaymentStatusEnum.CANCELLED);
      expect(updatedPayment?.cancellationReason).toContain('Hóa đơn bị hủy');
    });

    it('should restore contract OVERDUE -> ACTIVE when last overdue invoice is cancelled', async () => {
      const { staff1, contract, customer, facility1, issuedInvoice } =
        await createFixtures();

      await Contract.findByIdAndUpdate(contract._id, {
        status: ContractStatusEnum.OVERDUE,
      });

      // Mark the fixture invoice as PAID so only overdueInvoice is unpaid
      await Invoice.findByIdAndUpdate(issuedInvoice._id, {
        status: InvoiceStatusEnum.PAID,
        paidAmount: issuedInvoice.totalAmount,
      });

      const overdueInvoice = await Invoice.create({
        invoiceCode: 'INV-261201-OVERDUE-CAN',
        contractId: contract._id,
        customerId: customer._id,
        facilityId: facility1._id,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.OVERDUE,
        billingPeriodIndex: 3,
        periodStartDate: new Date('2027-01-01T00:00:00.000Z'),
        periodEndDate: new Date('2027-01-31T23:59:59.999Z'),
        dueDate: new Date('2027-01-01T23:59:59.999Z'),
        items: [
          {
            name: 'Tiền thuê kho tháng 12/2026',
            quantity: 1,
            unitPrice: 2000000,
            amount: 2000000,
            itemType: InvoiceItemTypeEnum.RENT,
          },
        ],
        subtotal: 2000000,
        totalAmount: 2000000,
        paidAmount: 0,
        issuedAt: new Date(),
      });

      // Cancel the erroneous overdue invoice
      await service.cancelInvoice(
        overdueInvoice._id.toString(),
        'Hủy hóa đơn phạt nhầm cho khách hàng thân thiết',
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      const restoredContract = await Contract.findById(contract._id);
      expect(restoredContract?.status).toBe(ContractStatusEnum.ACTIVE);
    });

    it('should strictly reject cancelling a PAID invoice with 400', async () => {
      const { staff1, issuedInvoice } = await createFixtures();

      await Invoice.findByIdAndUpdate(issuedInvoice._id, {
        status: InvoiceStatusEnum.PAID,
        paidAmount: issuedInvoice.totalAmount,
      });

      await expect(
        service.cancelInvoice(
          issuedInvoice._id.toString(),
          'Cố tình hủy hóa đơn đã thanh toán',
          staff1._id.toString(),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrowError(AppError);
    });

    it('should reject cancelling an already CANCELLED invoice with 400', async () => {
      const { staff1, issuedInvoice } = await createFixtures();

      await service.cancelInvoice(
        issuedInvoice._id.toString(),
        'Hủy lần đầu',
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      await expect(
        service.cancelInvoice(
          issuedInvoice._id.toString(),
          'Hủy lần hai',
          staff1._id.toString(),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrowError(AppError);
    });

    it('should reject CUSTOMER caller with 403', async () => {
      const { customer, issuedInvoice } = await createFixtures();

      await expect(
        service.cancelInvoice(
          issuedInvoice._id.toString(),
          'Khách hàng tự hủy hóa đơn',
          customer._id.toString(),
          RoleEnum.CUSTOMER
        )
      ).rejects.toThrowError(AppError);
    });

    it('should reject staff assigned to different facility with 403', async () => {
      const { staffOtherFacility, issuedInvoice } = await createFixtures();

      await expect(
        service.cancelInvoice(
          issuedInvoice._id.toString(),
          'Nhân viên Q7 hủy hóa đơn cơ sở Q3',
          staffOtherFacility._id.toString(),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrowError(AppError);
    });

    it('should allow SYSTEM_ADMIN to cancel invoice across any facility', async () => {
      const { admin, issuedInvoice } = await createFixtures();

      const result = await service.cancelInvoice(
        issuedInvoice._id.toString(),
        'Quản trị viên hủy đơn theo chỉ đạo của BGĐ',
        admin._id.toString(),
        RoleEnum.SYSTEM_ADMIN
      );

      expect(result.status).toBe(InvoiceStatusEnum.CANCELLED);
      expect(result.cancelledBy?.id).toBe(admin._id.toString());
    });
  });

  describe('2. Batch Contract Voiding (voidInvoicesByContract)', () => {
    it('should void all unpaid (ISSUED & OVERDUE) invoices while preserving PAID invoices', async () => {
      const { contract, customer, facility1 } = await createFixtures();

      // Invoice 1: PAID
      const paidInvoice = await Invoice.create({
        invoiceCode: 'INV-261101-PAID',
        contractId: contract._id,
        customerId: customer._id,
        facilityId: facility1._id,
        type: InvoiceTypeEnum.FIRST_PERIOD,
        status: InvoiceStatusEnum.PAID,
        billingPeriodIndex: 1,
        periodStartDate: new Date('2026-11-01T00:00:00.000Z'),
        periodEndDate: new Date('2026-11-30T23:59:59.999Z'),
        dueDate: new Date('2026-11-01T23:59:59.999Z'),
        items: [
          {
            name: 'Tiền thuê tháng 11',
            quantity: 1,
            unitPrice: 2000000,
            amount: 2000000,
            itemType: InvoiceItemTypeEnum.RENT,
          },
        ],
        subtotal: 2000000,
        totalAmount: 2000000,
        paidAmount: 2000000,
        issuedAt: new Date(),
      });

      // Invoice 2: ISSUED
      const issuedInv = await Invoice.create({
        invoiceCode: 'INV-261201-ISSUED',
        contractId: contract._id,
        customerId: customer._id,
        facilityId: facility1._id,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 3,
        periodStartDate: new Date('2026-12-01T00:00:00.000Z'),
        periodEndDate: new Date('2026-12-31T23:59:59.999Z'),
        dueDate: new Date('2026-12-01T23:59:59.999Z'),
        items: [
          {
            name: 'Tiền thuê tháng 12',
            quantity: 1,
            unitPrice: 2000000,
            amount: 2000000,
            itemType: InvoiceItemTypeEnum.RENT,
          },
        ],
        subtotal: 2000000,
        totalAmount: 2000000,
        paidAmount: 0,
        issuedAt: new Date(),
      });

      // Invoice 3: OVERDUE
      const overdueInv = await Invoice.create({
        invoiceCode: 'INV-270101-OVERDUE',
        contractId: contract._id,
        customerId: customer._id,
        facilityId: facility1._id,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.OVERDUE,
        billingPeriodIndex: 4,
        periodStartDate: new Date('2027-01-01T00:00:00.000Z'),
        periodEndDate: new Date('2027-01-31T23:59:59.999Z'),
        dueDate: new Date('2027-01-01T23:59:59.999Z'),
        items: [
          {
            name: 'Tiền thuê tháng 1/2027',
            quantity: 1,
            unitPrice: 2000000,
            amount: 2000000,
            itemType: InvoiceItemTypeEnum.RENT,
          },
        ],
        subtotal: 2000000,
        totalAmount: 2000000,
        paidAmount: 0,
        issuedAt: new Date(),
      });

      // Pending payment on the issued invoice
      const pendingPayment = await Payment.create({
        paymentCode: 'PAY-VOID-CHECK',
        purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
        invoiceId: issuedInv._id,
        contractId: contract._id,
        customerId: customer._id,
        facilityId: facility1._id,
        amount: 2000000,
        paidAmount: 0,
        overpaidAmount: 0,
        method: PaymentMethodEnum.SEPAY_QR,
        status: PaymentStatusEnum.PENDING,
      });

      // Void all unpaid invoices for this contract (e.g. contract terminated early)
      const voided = await service.voidInvoicesByContract(
        contract._id.toString(),
        'Chấm dứt hợp đồng sớm theo yêu cầu của khách hàng'
      );

      expect(voided.length).toBe(3); // issuedInvoice from fixture + issuedInv + overdueInv

      // Paid invoice remains PAID!
      const checkPaid = await Invoice.findById(paidInvoice._id);
      expect(checkPaid?.status).toBe(InvoiceStatusEnum.PAID);

      // Issued & Overdue are CANCELLED
      const checkIssued = await Invoice.findById(issuedInv._id);
      expect(checkIssued?.status).toBe(InvoiceStatusEnum.CANCELLED);
      expect(checkIssued?.cancelReason).toBe(
        'Chấm dứt hợp đồng sớm theo yêu cầu của khách hàng'
      );

      const checkOverdue = await Invoice.findById(overdueInv._id);
      expect(checkOverdue?.status).toBe(InvoiceStatusEnum.CANCELLED);

      // Pending payment cancelled
      const checkPayment = await Payment.findById(pendingPayment._id);
      expect(checkPayment?.status).toBe(PaymentStatusEnum.CANCELLED);

      // Audit logs recorded
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditActionEnum.VOID_INVOICE,
        })
      );
    });
  });
});
