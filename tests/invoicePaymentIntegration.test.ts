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
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import {
  Payment,
  PaymentTransaction,
} from '../src/modules/payment/payment.model.ts';
import { PaymentRepository } from '../src/modules/payment/payment.repository.ts';
import { PaymentService } from '../src/modules/payment/payment.service.ts';
import { SepayService } from '../src/modules/payment/sepay.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import type { AuditLogService } from '../src/modules/auditLog/auditLog.service.ts';
import type { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
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
  PaymentTransactionResultEnum,
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
import { getSepayConfig } from '../src/config/sepay.config.ts';

describe('billing/T1.2: SePay VietQR Payment & Webhook Settlement for Invoices', () => {
  let invoiceRepo: InvoiceRepository;
  let contractRepo: ContractRepository;
  let userRepo: UserRepository;
  let paymentRepo: PaymentRepository;
  let invoiceService: InvoiceService;
  let paymentService: PaymentService;
  let sepayService: SepayService;
  let mockAuditLogService: { record: ReturnType<typeof vi.fn> };
  let mockRefundRequestService: {
    createRefundRequestInternal: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    await setupTestDB();
    expect(Payment).toBeDefined();
    expect(PaymentTransaction).toBeDefined();
    expect(Reservation).toBeDefined();
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
    mockRefundRequestService = { createRefundRequestInternal: vi.fn() };

    invoiceService = new InvoiceService(
      invoiceRepo,
      contractRepo,
      userRepo,
      mockAuditLogService as unknown as AuditLogService
    );

    sepayService = new SepayService(getSepayConfig());

    const dummyReservationRepo = new ReservationRepository(Reservation);
    const dummyReservationService = {} as unknown as ReservationService;
    const dummyContractService = {} as unknown as ContractService;

    paymentService = new PaymentService(
      paymentRepo,
      sepayService,
      dummyReservationRepo,
      contractRepo,
      dummyReservationService,
      dummyContractService,
      mockAuditLogService as unknown as AuditLogService,
      userRepo,
      mockRefundRequestService as unknown as RefundRequestService,
      invoiceRepo,
      invoiceService
    );
  });

  async function createFixtures() {
    const customer = await User.create({
      name: 'Khách hàng A',
      email: 'customer_a@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0901234567',
    });

    const otherCustomer = await User.create({
      name: 'Khách hàng B',
      email: 'customer_b@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0901234568',
    });

    const facility1 = await Facility.create({
      name: 'Cơ sở 1',
      code: 'CS01',
      city: 'TP. Hồ Chí Minh',
      address: '100 Nguyễn Huệ, Q1, TP.HCM',
      status: FacilityStatusEnum.ACTIVE,
      timezone: 'Asia/Ho_Chi_Minh',
    });

    const facility2 = await Facility.create({
      name: 'Cơ sở 2',
      code: 'CS02',
      city: 'TP. Hồ Chí Minh',
      address: '200 Điện Biên Phủ, Bình Thạnh, TP.HCM',
      status: FacilityStatusEnum.ACTIVE,
      timezone: 'Asia/Ho_Chi_Minh',
    });

    const staff1 = await User.create({
      name: 'Nhân viên Cơ sở 1',
      email: 'staff1@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0902234567',
      assignedFacilityId: facility1._id,
    });

    const staff2 = await User.create({
      name: 'Nhân viên Cơ sở 2',
      email: 'staff2@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0903234567',
      assignedFacilityId: facility2._id,
    });

    const admin = await User.create({
      name: 'Quản trị viên',
      email: 'admin@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.SYSTEM_ADMIN,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0904234567',
    });

    const contract = await Contract.create({
      contractCode: 'HD-2026-INV01',
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
      totalPeriodicPrice: 2150000,
      status: ContractStatusEnum.ACTIVE,
    });

    const invoice = await Invoice.create({
      invoiceCode: 'INV-261101-0001',
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
          name: 'Tiền thuê kho tháng 11',
          quantity: 1,
          unitPrice: 2150000,
          amount: 2150000,
          itemType: InvoiceItemTypeEnum.RENT,
        },
      ],
      subtotal: 2150000,
      totalAmount: 2150000,
      paidAmount: 0,
      issuedAt: new Date(),
    });

    return {
      customer,
      otherCustomer,
      facility1,
      facility2,
      staff1,
      staff2,
      admin,
      contract,
      invoice,
    };
  }

  describe('1. createPayment for INVOICE_PAYMENT', () => {
    it('should create payment for ISSUED invoice with correct amount and QR URL', async () => {
      const { customer, invoice, contract } = await createFixtures();

      const payment = await paymentService.createPayment(
        customer._id.toString(),
        RoleEnum.CUSTOMER,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: invoice._id.toString(),
        }
      );

      expect(payment).toBeDefined();
      expect(payment.id).toBeDefined();
      expect(payment.purpose).toBe(PaymentPurposeEnum.INVOICE_PAYMENT);
      expect(payment.invoiceId).toBe(invoice._id.toString());
      expect(payment.contractId).toBe(contract._id.toString());
      expect(payment.customerId).toBe(customer._id.toString());
      expect(payment.amount).toBe(2150000);
      expect(payment.status).toBe(PaymentStatusEnum.PENDING);
      expect(payment.method).toBe(PaymentMethodEnum.SEPAY_QR);
      expect(payment.qrUrl).toBeDefined();
      expect(payment.qrUrl).toContain('sepay');
    });

    it('should be idempotent: calling createPayment again returns existing pending payment', async () => {
      const { customer, invoice } = await createFixtures();

      const firstCall = await paymentService.createPayment(
        customer._id.toString(),
        RoleEnum.CUSTOMER,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: invoice._id.toString(),
        }
      );

      const secondCall = await paymentService.createPayment(
        customer._id.toString(),
        RoleEnum.CUSTOMER,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: invoice._id.toString(),
        }
      );

      expect(firstCall.id).toBe(secondCall.id);
      expect(firstCall.paymentCode).toBe(secondCall.paymentCode);

      const count = await Payment.countDocuments({
        invoiceId: invoice._id,
        status: PaymentStatusEnum.PENDING,
      });
      expect(count).toBe(1);
    });

    it('should throw 400 when invoice is already PAID', async () => {
      const { customer, invoice } = await createFixtures();

      await Invoice.findByIdAndUpdate(invoice._id, {
        status: InvoiceStatusEnum.PAID,
        paidAmount: invoice.totalAmount,
      });

      await expect(
        paymentService.createPayment(
          customer._id.toString(),
          RoleEnum.CUSTOMER,
          {
            purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
            invoiceId: invoice._id.toString(),
          }
        )
      ).rejects.toThrowError(AppError);
    });

    it('should throw 400 when invoice is CANCELLED', async () => {
      const { customer, invoice } = await createFixtures();

      await Invoice.findByIdAndUpdate(invoice._id, {
        status: InvoiceStatusEnum.CANCELLED,
        cancelReason: 'Hủy sai thông tin',
      });

      await expect(
        paymentService.createPayment(
          customer._id.toString(),
          RoleEnum.CUSTOMER,
          {
            purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
            invoiceId: invoice._id.toString(),
          }
        )
      ).rejects.toThrowError(AppError);
    });

    it('should throw 403 when customer tries to pay another customer invoice', async () => {
      const { otherCustomer, invoice } = await createFixtures();

      await expect(
        paymentService.createPayment(
          otherCustomer._id.toString(),
          RoleEnum.CUSTOMER,
          {
            purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
            invoiceId: invoice._id.toString(),
          }
        )
      ).rejects.toThrowError(AppError);
    });

    it('should throw 403 when staff from different facility tries to create payment', async () => {
      const { staff2, invoice } = await createFixtures();

      await expect(
        paymentService.createPayment(
          staff2._id.toString(),
          RoleEnum.FACILITY_STAFF,
          {
            purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
            invoiceId: invoice._id.toString(),
          }
        )
      ).rejects.toThrowError(AppError);
    });

    it('should allow staff from same facility or admin to create payment', async () => {
      const { staff1, admin, invoice } = await createFixtures();

      const resStaff = await paymentService.createPayment(
        staff1._id.toString(),
        RoleEnum.FACILITY_STAFF,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: invoice._id.toString(),
        }
      );
      expect(resStaff.id).toBeDefined();

      const resAdmin = await paymentService.createPayment(
        admin._id.toString(),
        RoleEnum.SYSTEM_ADMIN,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: invoice._id.toString(),
        }
      );
      expect(resAdmin.id).toBe(resStaff.id); // Reuses the active pending payment
    });
  });

  describe('2. SePay Webhook Settlement for INVOICE_PAYMENT', () => {
    it('should settle payment, mark invoice PAID, and sync firstPeriodPaidAt on contract', async () => {
      const { customer, invoice, contract } = await createFixtures();

      const payment = await paymentService.createPayment(
        customer._id.toString(),
        RoleEnum.CUSTOMER,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: invoice._id.toString(),
        }
      );

      const sepayConfig = getSepayConfig();
      const webhookPayload = {
        id: 98765432,
        gateway: 'Vietcombank',
        transactionDate: '2026-11-01 10:30:00',
        accountNumber: sepayConfig.accountNumber,
        code: payment.paymentCode,
        content: `Thanh toan hoa don ${payment.paymentCode}`,
        transferType: 'in',
        transferAmount: 2150000,
        accumulated: 2150000,
        referenceCode: 'VCB.98765432',
      };

      const result = await paymentService.handleSepayWebhook(webhookPayload);
      expect(result.success).toBe(true);

      // Verify Payment is PAID
      const settledPayment = await Payment.findById(payment.id);
      expect(settledPayment?.status).toBe(PaymentStatusEnum.PAID);
      expect(settledPayment?.paidAmount).toBe(2150000);
      expect(settledPayment?.sepayTransactionId).toBe(98765432);

      // Verify Invoice is PAID
      const settledInvoice = await Invoice.findById(invoice._id);
      expect(settledInvoice?.status).toBe(InvoiceStatusEnum.PAID);
      expect(settledInvoice?.paidAmount).toBe(2150000);
      expect(settledInvoice?.paymentId?.toString()).toBe(payment.id);
      expect(settledInvoice?.paymentMethod).toBe(PaymentMethodEnum.SEPAY_QR);
      expect(settledInvoice?.paidAt).toBeDefined();

      // Verify Contract firstPeriodPaidAt was synchronized
      const updatedContract = await Contract.findById(contract._id);
      expect(updatedContract?.firstPeriodPaidAt).toBeDefined();

      // Verify Transaction record MATCHED
      const tx = await PaymentTransaction.findOne({ sepayId: 98765432 });
      expect(tx?.result).toBe(PaymentTransactionResultEnum.MATCHED);
      expect(tx?.matchedPaymentId?.toString()).toBe(payment.id);
    });

    it('should restore OVERDUE contract to ACTIVE when last overdue invoice is settled', async () => {
      const { customer, contract, facility1 } = await createFixtures();

      // Mark contract as OVERDUE
      await Contract.findByIdAndUpdate(contract._id, {
        status: ContractStatusEnum.OVERDUE,
      });

      // Create an overdue recurring invoice
      const overdueInvoice = await Invoice.create({
        invoiceCode: 'INV-261201-0002',
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
            name: 'Tiền thuê kho tháng 12',
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

      // Pay the first period invoice first
      const firstInvoice = await Invoice.findOne({
        contractId: contract._id,
        billingPeriodIndex: 1,
      });
      await Invoice.findByIdAndUpdate(firstInvoice!._id, {
        status: InvoiceStatusEnum.PAID,
        paidAmount: firstInvoice!.totalAmount,
      });

      // Now create payment for the overdue invoice
      const payment = await paymentService.createPayment(
        customer._id.toString(),
        RoleEnum.CUSTOMER,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: overdueInvoice._id.toString(),
        }
      );

      const sepayConfig = getSepayConfig();
      const webhookPayload = {
        id: 98765433,
        gateway: 'Vietcombank',
        transactionDate: new Date().toISOString(),
        accountNumber: sepayConfig.accountNumber,
        code: payment.paymentCode,
        content: `Thanh toan tien no ${payment.paymentCode}`,
        transferType: 'in',
        transferAmount: 2000000,
        accumulated: 4150000,
        referenceCode: 'VCB.98765433',
      };

      const result = await paymentService.handleSepayWebhook(webhookPayload);
      expect(result.success).toBe(true);

      // Verify overdue invoice is now PAID
      const settledOverdue = await Invoice.findById(overdueInvoice._id);
      expect(settledOverdue?.status).toBe(InvoiceStatusEnum.PAID);

      // Verify contract status was restored from OVERDUE to ACTIVE!
      const restoredContract = await Contract.findById(contract._id);
      expect(restoredContract?.status).toBe(ContractStatusEnum.ACTIVE);
    });

    it('should create refund request and NOT mark invoice PAID if transfer amount mismatches', async () => {
      const { customer, invoice } = await createFixtures();

      const payment = await paymentService.createPayment(
        customer._id.toString(),
        RoleEnum.CUSTOMER,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: invoice._id.toString(),
        }
      );

      const sepayConfig = getSepayConfig();
      // Khách chuyển 2,000,000 thay vì 2,150,000
      const webhookPayload = {
        id: 98765434,
        gateway: 'Vietcombank',
        transactionDate: '2026-11-01 11:00:00',
        accountNumber: sepayConfig.accountNumber,
        code: payment.paymentCode,
        content: `Chuyen thieu tien ${payment.paymentCode}`,
        transferType: 'in',
        transferAmount: 2000000,
        accumulated: 2000000,
        referenceCode: 'VCB.98765434',
      };

      const result = await paymentService.handleSepayWebhook(webhookPayload);
      expect(result.success).toBe(true);

      // Payment remains PENDING
      const currentPayment = await Payment.findById(payment.id);
      expect(currentPayment?.status).toBe(PaymentStatusEnum.PENDING);

      // Invoice remains ISSUED
      const currentInvoice = await Invoice.findById(invoice._id);
      expect(currentInvoice?.status).toBe(InvoiceStatusEnum.ISSUED);

      // Refund request created automatically
      expect(
        mockRefundRequestService.createRefundRequestInternal
      ).toHaveBeenCalledWith(
        customer._id.toString(),
        expect.objectContaining({
          amount: 2000000,
          paymentId: payment.id,
        })
      );
    });

    it('should handle duplicate webhook gracefully (idempotency)', async () => {
      const { customer, invoice } = await createFixtures();

      const payment = await paymentService.createPayment(
        customer._id.toString(),
        RoleEnum.CUSTOMER,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: invoice._id.toString(),
        }
      );

      const sepayConfig = getSepayConfig();
      const webhookPayload = {
        id: 98765435,
        gateway: 'Vietcombank',
        transactionDate: '2026-11-01 10:30:00',
        accountNumber: sepayConfig.accountNumber,
        code: payment.paymentCode,
        content: `Thanh toan hoa don ${payment.paymentCode}`,
        transferType: 'in',
        transferAmount: 2150000,
        accumulated: 2150000,
        referenceCode: 'VCB.98765435',
      };

      const firstRes = await paymentService.handleSepayWebhook(webhookPayload);
      expect(firstRes.success).toBe(true);

      const secondRes = await paymentService.handleSepayWebhook(webhookPayload);
      expect(secondRes.success).toBe(true);
      expect(secondRes.message).toContain('already processed');

      const countTx = await PaymentTransaction.countDocuments({
        sepayId: 98765435,
      });
      expect(countTx).toBe(1);
    });
  });
});
