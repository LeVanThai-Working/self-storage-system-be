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

describe('billing/T1.3: Manual Payment Confirmation (Maker-Checker)', () => {
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
      name: 'Khách hàng C',
      email: 'customer_c@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0901234567',
    });

    const facility1 = await Facility.create({
      name: 'Kho Tân Bình',
      code: 'TB01',
      city: 'TP. Hồ Chí Minh',
      address: '50 Cộng Hòa, Tân Bình, TP.HCM',
      status: FacilityStatusEnum.ACTIVE,
      timezone: 'Asia/Ho_Chi_Minh',
    });

    const facility2 = await Facility.create({
      name: 'Kho Phú Nhuận',
      code: 'PN01',
      city: 'TP. Hồ Chí Minh',
      address: '70 Phan Xích Long, Phú Nhuận, TP.HCM',
      status: FacilityStatusEnum.ACTIVE,
      timezone: 'Asia/Ho_Chi_Minh',
    });

    const staff1 = await User.create({
      name: 'Nhân viên A Tân Bình',
      email: 'staff_a_tb@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0902234567',
      assignedFacilityId: facility1._id,
    });

    const staff2 = await User.create({
      name: 'Nhân viên B Tân Bình',
      email: 'staff_b_tb@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0903234567',
      assignedFacilityId: facility1._id,
    });

    const staffOtherFacility = await User.create({
      name: 'Nhân viên Phú Nhuận',
      email: 'staff_pn@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0904234567',
      assignedFacilityId: facility2._id,
    });

    const admin = await User.create({
      name: 'Quản trị viên',
      email: 'admin_audit@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.SYSTEM_ADMIN,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0905234567',
    });

    const contract = await Contract.create({
      contractCode: 'HD-2026-MAN01',
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

    const firstPeriodInvoice = await Invoice.create({
      invoiceCode: 'INV-261101-MAN01',
      contractId: contract._id,
      customerId: customer._id,
      facilityId: facility1._id,
      type: InvoiceTypeEnum.FIRST_PERIOD,
      status: InvoiceStatusEnum.ISSUED,
      billingPeriodIndex: 1,
      periodStartDate: new Date('2026-11-01T00:00:00.000Z'),
      periodEndDate: new Date('2026-11-30T23:59:59.999Z'),
      dueDate: new Date('2026-11-01T23:59:59.999Z'),
      items: [
        {
          name: 'Tiền thuê kho tháng 11/2026',
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
      staff2,
      staffOtherFacility,
      admin,
      contract,
      firstPeriodInvoice,
    };
  }

  describe('1. Basic Manual Payment Confirmation', () => {
    it('should confirm CASH manual payment with valid proof image', async () => {
      const { staff1, firstPeriodInvoice, contract } = await createFixtures();

      const result = await service.confirmManualPayment(
        firstPeriodInvoice._id.toString(),
        {
          paymentMethod: PaymentMethodEnum.CASH,
          proofImageUrl: 'https://cdn.example.com/receipts/rec_001.jpg',
          note: 'Khách nộp tiền mặt tại quầy Tân Bình',
        },
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(InvoiceStatusEnum.PAID);
      expect(result.paidAmount).toBe(2000000);
      expect(result.paymentMethod).toBe(PaymentMethodEnum.CASH);
      expect(result.proofImageUrl).toBe(
        'https://cdn.example.com/receipts/rec_001.jpg'
      );
      expect(result.confirmedBy?.id).toBe(staff1._id.toString());
      expect(result.confirmedAt).toBeDefined();

      // Check Payment record in DB
      const payment = await Payment.findOne({
        invoiceId: firstPeriodInvoice._id,
      });
      expect(payment).toBeDefined();
      expect(payment?.status).toBe(PaymentStatusEnum.PAID);
      expect(payment?.method).toBe(PaymentMethodEnum.CASH);
      expect(payment?.amount).toBe(2000000);
      expect(payment?.proofImageUrl).toBe(
        'https://cdn.example.com/receipts/rec_001.jpg'
      );
      expect(payment?.confirmedBy?.toString()).toBe(staff1._id.toString());

      // Sync firstPeriodPaidAt on contract
      const updatedContract = await Contract.findById(contract._id);
      expect(updatedContract?.firstPeriodPaidAt).toBeDefined();
    });

    it('should confirm BANK_TRANSFER manual payment with referenceCode', async () => {
      const { staff1, firstPeriodInvoice } = await createFixtures();

      const result = await service.confirmManualPayment(
        firstPeriodInvoice._id.toString(),
        {
          paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
          proofImageUrl: 'https://cdn.example.com/receipts/bank_proof_002.png',
          referenceCode: 'FT2611019999',
          note: 'Chuyển khoản trực tiếp vào tài khoản cơ sở',
        },
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      expect(result.status).toBe(InvoiceStatusEnum.PAID);
      expect(result.paymentMethod).toBe(PaymentMethodEnum.BANK_TRANSFER);

      const payment = await Payment.findOne({
        invoiceId: firstPeriodInvoice._id,
      });
      expect(payment?.method).toBe(PaymentMethodEnum.BANK_TRANSFER);
      expect(payment?.referenceCode).toBe('FT2611019999');
    });

    it('should throw 400 when proofImageUrl is missing', async () => {
      const { staff1, firstPeriodInvoice } = await createFixtures();

      await expect(
        service.confirmManualPayment(
          firstPeriodInvoice._id.toString(),
          {
            paymentMethod: PaymentMethodEnum.CASH,
            proofImageUrl: '',
          },
          staff1._id.toString(),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrowError(AppError);
    });

    it('should throw 400 when invoice is already PAID (no double payment)', async () => {
      const { staff1, firstPeriodInvoice } = await createFixtures();

      await service.confirmManualPayment(
        firstPeriodInvoice._id.toString(),
        {
          paymentMethod: PaymentMethodEnum.CASH,
          proofImageUrl: 'https://cdn.example.com/receipts/rec_001.jpg',
        },
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      // Attempt second payment
      await expect(
        service.confirmManualPayment(
          firstPeriodInvoice._id.toString(),
          {
            paymentMethod: PaymentMethodEnum.CASH,
            proofImageUrl: 'https://cdn.example.com/receipts/rec_002.jpg',
          },
          staff1._id.toString(),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrowError(AppError);
    });
  });

  describe('2. Authorization & Scoping Rules', () => {
    it('should reject CUSTOMER caller with 403', async () => {
      const { customer, firstPeriodInvoice } = await createFixtures();

      await expect(
        service.confirmManualPayment(
          firstPeriodInvoice._id.toString(),
          {
            paymentMethod: PaymentMethodEnum.CASH,
            proofImageUrl: 'https://cdn.example.com/receipts/rec_001.jpg',
          },
          customer._id.toString(),
          RoleEnum.CUSTOMER
        )
      ).rejects.toThrowError(AppError);
    });

    it('should reject staff assigned to a different facility with 403', async () => {
      const { staffOtherFacility, firstPeriodInvoice } = await createFixtures();

      await expect(
        service.confirmManualPayment(
          firstPeriodInvoice._id.toString(),
          {
            paymentMethod: PaymentMethodEnum.CASH,
            proofImageUrl: 'https://cdn.example.com/receipts/rec_001.jpg',
          },
          staffOtherFacility._id.toString(),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrowError(AppError);
    });

    it('should allow SYSTEM_ADMIN to confirm manual payment across any facility', async () => {
      const { admin, firstPeriodInvoice } = await createFixtures();

      const result = await service.confirmManualPayment(
        firstPeriodInvoice._id.toString(),
        {
          paymentMethod: PaymentMethodEnum.CASH,
          proofImageUrl: 'https://cdn.example.com/receipts/admin_proof.jpg',
        },
        admin._id.toString(),
        RoleEnum.SYSTEM_ADMIN
      );

      expect(result.status).toBe(InvoiceStatusEnum.PAID);
      expect(result.confirmedBy?.id).toBe(admin._id.toString());
    });
  });

  describe('3. Maker-Checker Enforcement', () => {
    it('should reject when the creator of an INCIDENTAL invoice attempts to confirm their own invoice', async () => {
      const { staff1, contract } = await createFixtures();

      // Staff 1 creates an incidental manual invoice (Maker)
      const incidentalInvoice = await service.createManualInvoice(
        {
          contractId: contract._id.toString(),
          periodStartDate: '2026-11-01T00:00:00.000Z',
          periodEndDate: '2026-11-30T23:59:59.999Z',
          dueDate: '2026-11-10T00:00:00.000Z',
          items: [
            {
              name: 'Phí sửa ổ khóa kho',
              quantity: 1,
              unitPrice: 150000,
              amount: 150000,
              itemType: InvoiceItemTypeEnum.OTHER,
            },
          ],
        },
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      // Staff 1 attempts to confirm payment on their own created invoice -> REJECTED
      await expect(
        service.confirmManualPayment(
          incidentalInvoice.id,
          {
            paymentMethod: PaymentMethodEnum.CASH,
            proofImageUrl: 'https://cdn.example.com/receipts/lock_proof.jpg',
          },
          staff1._id.toString(),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrowError(AppError);
    });

    it('should allow a DIFFERENT staff member at the same facility to confirm the INCIDENTAL invoice (Checker)', async () => {
      const { staff1, staff2, contract } = await createFixtures();

      // Staff 1 creates incidental invoice (Maker)
      const incidentalInvoice = await service.createManualInvoice(
        {
          contractId: contract._id.toString(),
          periodStartDate: '2026-11-01T00:00:00.000Z',
          periodEndDate: '2026-11-30T23:59:59.999Z',
          dueDate: '2026-11-10T00:00:00.000Z',
          items: [
            {
              name: 'Phí sửa ổ khóa kho',
              quantity: 1,
              unitPrice: 150000,
              amount: 150000,
              itemType: InvoiceItemTypeEnum.OTHER,
            },
          ],
        },
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      // Staff 2 confirms payment (Checker) -> SUCCESS
      const confirmed = await service.confirmManualPayment(
        incidentalInvoice.id,
        {
          paymentMethod: PaymentMethodEnum.CASH,
          proofImageUrl: 'https://cdn.example.com/receipts/lock_proof.jpg',
        },
        staff2._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      expect(confirmed.status).toBe(InvoiceStatusEnum.PAID);
      expect(confirmed.createdBy?.id).toBe(staff1._id.toString());
      expect(confirmed.confirmedBy?.id).toBe(staff2._id.toString());
    });

    it('should allow any staff to confirm system-generated invoices (FIRST_PERIOD / RECURRING) without Maker-Checker block', async () => {
      const { staff1, firstPeriodInvoice } = await createFixtures();

      // First period invoice is system-generated (createdBy is null)
      const confirmed = await service.confirmManualPayment(
        firstPeriodInvoice._id.toString(),
        {
          paymentMethod: PaymentMethodEnum.CASH,
          proofImageUrl: 'https://cdn.example.com/receipts/system_rec.jpg',
        },
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      expect(confirmed.status).toBe(InvoiceStatusEnum.PAID);
      expect(confirmed.confirmedBy?.id).toBe(staff1._id.toString());
    });
  });

  describe('4. Side Effects: Pending Payment Invalidation & Overdue Debt Recovery', () => {
    it('should cancel existing PENDING payment when manual payment is confirmed', async () => {
      const { staff1, firstPeriodInvoice, customer, facility1, contract } =
        await createFixtures();

      // Simulate customer previously generated a SePay QR code (Payment PENDING)
      const pendingPayment = await Payment.create({
        paymentCode: 'PAY-261101-PEND',
        purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
        invoiceId: firstPeriodInvoice._id,
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

      // Customer walks into facility and pays cash
      await service.confirmManualPayment(
        firstPeriodInvoice._id.toString(),
        {
          paymentMethod: PaymentMethodEnum.CASH,
          proofImageUrl: 'https://cdn.example.com/receipts/cash_counter.jpg',
        },
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      // Verify the old pending payment is now CANCELLED
      const oldPayment = await Payment.findById(pendingPayment._id);
      expect(oldPayment?.status).toBe(PaymentStatusEnum.CANCELLED);
      expect(oldPayment?.cancellationReason).toContain(
        'manual payment confirmation'
      );
    });

    it('should restore contract OVERDUE -> ACTIVE when last overdue invoice is manually settled', async () => {
      const { staff1, contract, customer, facility1 } = await createFixtures();

      await Contract.findByIdAndUpdate(contract._id, {
        status: ContractStatusEnum.OVERDUE,
      });

      // Settle invoice 1
      const invoice1 = await Invoice.findOne({
        contractId: contract._id,
        billingPeriodIndex: 1,
      });
      await Invoice.findByIdAndUpdate(invoice1!._id, {
        status: InvoiceStatusEnum.PAID,
        paidAmount: invoice1!.totalAmount,
      });

      // Create invoice 2 as OVERDUE
      const overdueInvoice = await Invoice.create({
        invoiceCode: 'INV-261201-OVERDUE',
        contractId: contract._id,
        customerId: customer._id,
        facilityId: facility1._id,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.OVERDUE,
        billingPeriodIndex: 2,
        periodStartDate: new Date('2026-12-01T00:00:00.000Z'),
        periodEndDate: new Date('2026-12-31T23:59:59.999Z'),
        dueDate: new Date('2026-12-01T23:59:59.999Z'),
        items: [
          {
            name: 'Tiền thuê tháng 12/2026',
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

      // Staff manually confirms the overdue invoice at counter
      await service.confirmManualPayment(
        overdueInvoice._id.toString(),
        {
          paymentMethod: PaymentMethodEnum.CASH,
          proofImageUrl: 'https://cdn.example.com/receipts/debt_settlement.jpg',
        },
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      // Verify contract status was restored to ACTIVE
      const restoredContract = await Contract.findById(contract._id);
      expect(restoredContract?.status).toBe(ContractStatusEnum.ACTIVE);
    });
  });
});
