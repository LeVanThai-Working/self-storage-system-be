import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { Invoice } from '../src/modules/invoice/invoice.model.ts';
import { InvoiceRepository } from '../src/modules/invoice/invoice.repository.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
} from '../src/common/enums/billing.enum.ts';
import { PaymentMethodEnum } from '../src/common/enums/payment.enum.ts';
import { User } from '../src/modules/user/user.model.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { Payment } from '../src/modules/payment/payment.model.ts';
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
import {
  PaymentPurposeEnum,
  PaymentStatusEnum,
} from '../src/common/enums/payment.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';

describe('billing/T0.3: Invoice Repository Implementation', () => {
  let repository: InvoiceRepository;

  beforeAll(async () => {
    await setupTestDB();
    repository = new InvoiceRepository(Invoice);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('1. create, findById & findByInvoiceCode', () => {
    it('should create an invoice and find by id and code', async () => {
      const contractId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const facilityId = new Types.ObjectId();

      const created = await repository.create({
        invoiceCode: 'INV-261031-1001',
        contractId,
        customerId,
        facilityId,
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
      });

      expect(created._id).toBeDefined();
      expect(created.invoiceCode).toBe('INV-261031-1001');

      const foundById = await repository.findById(created._id.toString());
      expect(foundById).not.toBeNull();
      expect(foundById?.invoiceCode).toBe('INV-261031-1001');

      const foundByCode = await repository.findByInvoiceCode('INV-261031-1001');
      expect(foundByCode).not.toBeNull();
      expect(foundByCode?._id.toString()).toBe(created._id.toString());
    });
  });

  describe('2. findByIdWithDetails', () => {
    it('should populate customer, facility, contract and payment details', async () => {
      const user = await User.create({
        name: 'Nguyễn Văn A',
        email: 'customer@example.com',
        password: 'HashedPassword123!',
        role: RoleEnum.CUSTOMER,
        status: UserStatusEnum.ACTIVE,
        authProvider: AuthProviderEnum.LOCAL,
        phoneNumber: '0901234567',
      });

      const facility = await Facility.create({
        name: 'Kho Hoàng Mai HN',
        code: 'HN01',
        city: 'Hà Nội',
        address: '123 Giải Phóng, Hà Nội',
        status: FacilityStatusEnum.ACTIVE,
        timezone: 'Asia/Ho_Chi_Minh',
      });

      const storageUnitId = new Types.ObjectId();
      const contract = await Contract.create({
        contractCode: 'HD-2026-0001',
        source: ContractSourceEnum.WALK_IN,
        customerId: user._id,
        facilityId: facility._id,
        storageUnitId,
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 2000000,
        depositAmount: 2000000,
        totalPeriodicPrice: 2000000,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-12-01'),
        status: ContractStatusEnum.ACTIVE,
        depositStatus: ContractDepositStatusEnum.HELD,
      });

      const payment = await Payment.create({
        paymentCode: 'PAY-INV-1001',
        purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
        customerId: user._id,
        facilityId: facility._id,
        amount: 2000000,
        method: PaymentMethodEnum.SEPAY_QR,
        status: PaymentStatusEnum.PAID,
        paidAt: new Date(),
      });

      const created = await repository.create({
        invoiceCode: 'INV-261031-1002',
        contractId: contract._id,
        customerId: user._id,
        facilityId: facility._id,
        paymentId: payment._id,
        paymentMethod: PaymentMethodEnum.SEPAY_QR,
        type: InvoiceTypeEnum.FIRST_PERIOD,
        status: InvoiceStatusEnum.PAID,
        billingPeriodIndex: 1,
        periodStartDate: new Date('2026-11-01T00:00:00.000Z'),
        periodEndDate: new Date('2026-11-30T23:59:59.999Z'),
        dueDate: new Date('2026-11-01T23:59:59.999Z'),
        items: [
          {
            name: 'Tiền thuê kỳ 1',
            quantity: 1,
            unitPrice: 2000000,
            amount: 2000000,
            itemType: InvoiceItemTypeEnum.RENT,
          },
        ],
        subtotal: 2000000,
        totalAmount: 2000000,
        paidAmount: 2000000,
        paidAt: new Date(),
      });

      const detailed = await repository.findByIdWithDetails(
        created._id.toString()
      );
      expect(detailed).not.toBeNull();

      const populatedFacility = detailed?.facilityId as unknown as {
        name: string;
        code: string;
      };
      const populatedCustomer = detailed?.customerId as unknown as {
        name: string;
        email: string;
      };
      const populatedContract = detailed?.contractId as unknown as {
        contractCode: string;
        status: string;
      };
      const populatedPayment = detailed?.paymentId as unknown as {
        paymentCode: string;
        amount: number;
      };

      expect(populatedFacility.name).toBe('Kho Hoàng Mai HN');
      expect(populatedFacility.code).toBe('HN01');
      expect(populatedCustomer.name).toBe('Nguyễn Văn A');
      expect(populatedContract.contractCode).toBe('HD-2026-0001');
      expect(populatedPayment.paymentCode).toBe('PAY-INV-1001');
    });
  });

  describe('3. findByContractId & findActiveByContractAndPeriod', () => {
    it('should find all invoices by contractId ordered by billingPeriodIndex', async () => {
      const contractId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const facilityId = new Types.ObjectId();

      await repository.create({
        invoiceCode: 'INV-261031-1003',
        contractId,
        customerId,
        facilityId,
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 2,
        periodStartDate: new Date('2026-12-01'),
        periodEndDate: new Date('2026-12-31'),
        dueDate: new Date('2026-12-01'),
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      await repository.create({
        invoiceCode: 'INV-261031-1004',
        contractId,
        customerId,
        facilityId,
        type: InvoiceTypeEnum.FIRST_PERIOD,
        billingPeriodIndex: 1,
        periodStartDate: new Date('2026-11-01'),
        periodEndDate: new Date('2026-11-30'),
        dueDate: new Date('2026-11-01'),
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      const list = await repository.findByContractId(contractId.toString());
      expect(list.length).toBe(2);
      expect(list[0].billingPeriodIndex).toBe(1);
      expect(list[1].billingPeriodIndex).toBe(2);
    });

    it('should find active invoice by period and exclude cancelled invoices', async () => {
      const contractId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const facilityId = new Types.ObjectId();

      // Cancelled invoice for period 1
      await repository.create({
        invoiceCode: 'INV-261031-1005',
        contractId,
        customerId,
        facilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.CANCELLED,
        billingPeriodIndex: 1,
        periodStartDate: new Date('2026-11-01'),
        periodEndDate: new Date('2026-11-30'),
        dueDate: new Date('2026-11-01'),
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      const notFoundCancelled = await repository.findActiveByContractAndPeriod(
        contractId.toString(),
        1,
        InvoiceTypeEnum.RECURRING
      );
      expect(notFoundCancelled).toBeNull();

      // Active issued invoice for period 2
      await repository.create({
        invoiceCode: 'INV-261031-1006',
        contractId,
        customerId,
        facilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 2,
        periodStartDate: new Date('2026-12-01'),
        periodEndDate: new Date('2026-12-31'),
        dueDate: new Date('2026-12-01'),
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      const foundActive = await repository.findActiveByContractAndPeriod(
        contractId.toString(),
        2,
        InvoiceTypeEnum.RECURRING
      );
      expect(foundActive).not.toBeNull();
      expect(foundActive?.invoiceCode).toBe('INV-261031-1006');
    });
  });

  describe('4. findPendingDueInvoices & findOverdueInvoices', () => {
    it('should filter pending due invoices up to a target date', async () => {
      const facilityA = new Types.ObjectId();
      const facilityB = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const contract1 = new Types.ObjectId();
      const contract2 = new Types.ObjectId();
      const contract3 = new Types.ObjectId();
      const contract4 = new Types.ObjectId();

      // Due Nov 1 (Past)
      await repository.create({
        invoiceCode: 'INV-261031-1007',
        contractId: contract1,
        customerId,
        facilityId: facilityA,
        status: InvoiceStatusEnum.ISSUED,
        dueDate: new Date('2026-11-01T23:59:59.999Z'),
        periodStartDate: new Date('2026-11-01'),
        periodEndDate: new Date('2026-11-30'),
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 1,
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      // Due Nov 5
      await repository.create({
        invoiceCode: 'INV-261031-1008',
        contractId: contract2,
        customerId,
        facilityId: facilityA,
        status: InvoiceStatusEnum.ISSUED,
        dueDate: new Date('2026-11-05T23:59:59.999Z'),
        periodStartDate: new Date('2026-11-05'),
        periodEndDate: new Date('2026-12-05'),
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 1,
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      // Due Nov 15 (Far future)
      await repository.create({
        invoiceCode: 'INV-261031-1009',
        contractId: contract3,
        customerId,
        facilityId: facilityA,
        status: InvoiceStatusEnum.ISSUED,
        dueDate: new Date('2026-11-15T23:59:59.999Z'),
        periodStartDate: new Date('2026-11-15'),
        periodEndDate: new Date('2026-12-15'),
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 1,
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      // Facility B Due Nov 1
      await repository.create({
        invoiceCode: 'INV-261031-1010',
        contractId: contract4,
        customerId,
        facilityId: facilityB,
        status: InvoiceStatusEnum.ISSUED,
        dueDate: new Date('2026-11-01T23:59:59.999Z'),
        periodStartDate: new Date('2026-11-01'),
        periodEndDate: new Date('2026-11-30'),
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 1,
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      const dueNov10All = await repository.findPendingDueInvoices(
        new Date('2026-11-10T00:00:00.000Z')
      );
      expect(dueNov10All.length).toBe(3);

      const dueNov10FacilityA = await repository.findPendingDueInvoices(
        new Date('2026-11-10T00:00:00.000Z'),
        facilityA.toString()
      );
      expect(dueNov10FacilityA.length).toBe(2);
    });

    it('should find overdue invoices past the grace period', async () => {
      const facilityId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const contract1 = new Types.ObjectId();
      const contract2 = new Types.ObjectId();

      // Due 5 days ago (Overdue past 3-day grace)
      await repository.create({
        invoiceCode: 'INV-261031-1011',
        contractId: contract1,
        customerId,
        facilityId,
        status: InvoiceStatusEnum.ISSUED,
        dueDate: new Date('2026-10-25T00:00:00.000Z'),
        periodStartDate: new Date('2026-10-25'),
        periodEndDate: new Date('2026-11-25'),
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 1,
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      // Due 1 day ago (Within 3-day grace period, not yet overdue)
      await repository.create({
        invoiceCode: 'INV-261031-1012',
        contractId: contract2,
        customerId,
        facilityId,
        status: InvoiceStatusEnum.ISSUED,
        dueDate: new Date('2026-10-30T00:00:00.000Z'),
        periodStartDate: new Date('2026-10-30'),
        periodEndDate: new Date('2026-11-30'),
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 1,
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      // Grace target: 3 days ago from Oct 31 = Oct 28
      const overdueList = await repository.findOverdueInvoices(
        new Date('2026-10-28T00:00:00.000Z')
      );

      expect(overdueList.length).toBe(1);
      expect(overdueList[0].invoiceCode).toBe('INV-261031-1011');
    });
  });

  describe('5. atomicUpdateStatus', () => {
    it('should atomically update status when expectedStatus matches', async () => {
      const invoice = await repository.create({
        invoiceCode: 'INV-261031-1013',
        contractId: new Types.ObjectId(),
        customerId: new Types.ObjectId(),
        facilityId: new Types.ObjectId(),
        status: InvoiceStatusEnum.ISSUED,
        type: InvoiceTypeEnum.RECURRING,
        dueDate: new Date('2026-11-01'),
        periodStartDate: new Date('2026-11-01'),
        periodEndDate: new Date('2026-11-30'),
        items: [],
        subtotal: 1500000,
        totalAmount: 1500000,
      });

      const updated = await repository.atomicUpdateStatus(
        invoice._id.toString(),
        InvoiceStatusEnum.ISSUED,
        {
          status: InvoiceStatusEnum.PAID,
          paidAmount: 1500000,
          paidAt: new Date(),
          paymentMethod: PaymentMethodEnum.SEPAY_QR,
        }
      );

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe(InvoiceStatusEnum.PAID);
      expect(updated?.paidAmount).toBe(1500000);
      expect(updated?.paymentMethod).toBe(PaymentMethodEnum.SEPAY_QR);
    });

    it('should return null when expectedStatus does not match', async () => {
      const invoice = await repository.create({
        invoiceCode: 'INV-261031-1014',
        contractId: new Types.ObjectId(),
        customerId: new Types.ObjectId(),
        facilityId: new Types.ObjectId(),
        status: InvoiceStatusEnum.PAID,
        type: InvoiceTypeEnum.RECURRING,
        dueDate: new Date('2026-11-01'),
        periodStartDate: new Date('2026-11-01'),
        periodEndDate: new Date('2026-11-30'),
        items: [],
        subtotal: 1500000,
        totalAmount: 1500000,
        paidAmount: 1500000,
      });

      // Try to mark as PAID again from ISSUED status
      const failedUpdate = await repository.atomicUpdateStatus(
        invoice._id.toString(),
        InvoiceStatusEnum.ISSUED,
        {
          status: InvoiceStatusEnum.PAID,
        }
      );

      expect(failedUpdate).toBeNull();
    });

    it('should support array of expectedStatuses', async () => {
      const invoice = await repository.create({
        invoiceCode: 'INV-261031-1015',
        contractId: new Types.ObjectId(),
        customerId: new Types.ObjectId(),
        facilityId: new Types.ObjectId(),
        status: InvoiceStatusEnum.OVERDUE,
        type: InvoiceTypeEnum.RECURRING,
        dueDate: new Date('2026-10-20'),
        periodStartDate: new Date('2026-10-20'),
        periodEndDate: new Date('2026-11-20'),
        items: [],
        subtotal: 1500000,
        totalAmount: 1500000,
      });

      const cancelled = await repository.atomicUpdateStatus(
        invoice._id.toString(),
        [InvoiceStatusEnum.ISSUED, InvoiceStatusEnum.OVERDUE],
        {
          status: InvoiceStatusEnum.CANCELLED,
          cancelReason: 'Khách hàng trả kho trước hạn',
          cancelledAt: new Date(),
        }
      );

      expect(cancelled).not.toBeNull();
      expect(cancelled?.status).toBe(InvoiceStatusEnum.CANCELLED);
      expect(cancelled?.cancelReason).toBe('Khách hàng trả kho trước hạn');
    });
  });

  describe('6. countUnpaidByContract', () => {
    it('should count only ISSUED and OVERDUE invoices for a contract', async () => {
      const contractId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const facilityId = new Types.ObjectId();

      // 1 ISSUED (kỳ 1)
      await repository.create({
        invoiceCode: 'INV-261031-1016',
        contractId,
        customerId,
        facilityId,
        status: InvoiceStatusEnum.ISSUED,
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 1,
        dueDate: new Date(),
        periodStartDate: new Date(),
        periodEndDate: new Date(),
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      // 1 OVERDUE (kỳ 2)
      await repository.create({
        invoiceCode: 'INV-261031-1017',
        contractId,
        customerId,
        facilityId,
        status: InvoiceStatusEnum.OVERDUE,
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 2,
        dueDate: new Date(),
        periodStartDate: new Date(),
        periodEndDate: new Date(),
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      // 1 PAID (kỳ 3)
      await repository.create({
        invoiceCode: 'INV-261031-1018',
        contractId,
        customerId,
        facilityId,
        status: InvoiceStatusEnum.PAID,
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 3,
        dueDate: new Date(),
        periodStartDate: new Date(),
        periodEndDate: new Date(),
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      // 1 CANCELLED (kỳ 4)
      await repository.create({
        invoiceCode: 'INV-261031-1019',
        contractId,
        customerId,
        facilityId,
        status: InvoiceStatusEnum.CANCELLED,
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 4,
        dueDate: new Date(),
        periodStartDate: new Date(),
        periodEndDate: new Date(),
        items: [],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      const unpaidCount = await repository.countUnpaidByContract(
        contractId.toString()
      );
      expect(unpaidCount).toBe(2);
    });
  });

  describe('7. findPaginated', () => {
    it('should paginate and filter invoices properly', async () => {
      const facilityA = new Types.ObjectId();
      const facilityB = new Types.ObjectId();
      const customerA = new Types.ObjectId();
      const contractId = new Types.ObjectId();

      for (let i = 1; i <= 5; i++) {
        await repository.create({
          invoiceCode: `INV-PAGINATE-${i}`,
          contractId,
          customerId: customerA,
          facilityId: i <= 3 ? facilityA : facilityB,
          status:
            i % 2 === 0 ? InvoiceStatusEnum.PAID : InvoiceStatusEnum.ISSUED,
          type: InvoiceTypeEnum.RECURRING,
          billingPeriodIndex: i,
          dueDate: new Date(`2026-11-0${i}`),
          periodStartDate: new Date('2026-11-01'),
          periodEndDate: new Date('2026-11-30'),
          items: [],
          subtotal: 1000000 * i,
          totalAmount: 1000000 * i,
        });
      }

      // Filter by facilityA
      const paginatedFacilityA = await repository.findPaginated({
        facilityId: facilityA.toString(),
        limit: 2,
        page: 1,
      });

      expect(paginatedFacilityA.items.length).toBe(2);
      expect(paginatedFacilityA.pagination.totalItems).toBe(3);
      expect(paginatedFacilityA.pagination.totalPages).toBe(2);

      // Filter by status PAID
      const paginatedPaid = await repository.findPaginated({
        status: InvoiceStatusEnum.PAID,
      });
      expect(paginatedPaid.pagination.totalItems).toBe(2);
    });
  });
});
