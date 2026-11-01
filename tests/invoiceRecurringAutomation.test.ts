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
import type { Request as ExpressRequest } from 'express';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { Invoice } from '../src/modules/invoice/invoice.model.ts';
import { InvoiceRepository } from '../src/modules/invoice/invoice.repository.ts';
import { InvoiceService } from '../src/modules/invoice/invoice.service.ts';
import { InvoiceController } from '../src/modules/invoice/invoice.controller.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { Payment } from '../src/modules/payment/payment.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import type { AuditLogService } from '../src/modules/auditLog/auditLog.service.ts';
import type { NotificationService } from '../src/modules/notification/notification.service.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
  BillingUnitEnum,
} from '../src/common/enums/billing.enum.ts';
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
import { NotificationTypeEnum } from '../src/common/enums/notification.enum.ts';
import { startOfDayVN, endOfDayVN, addDays } from '../src/utils/date.util.ts';
import { BILLING_JOB } from '../src/modules/billing/billing.queue.ts';
import { processBillingJob } from '../src/modules/billing/billing.worker.ts';
import type { Job } from 'bullmq';

describe('billing/T2.2: Recurring Invoice Generation Automation (T-7)', () => {
  let invoiceRepo: InvoiceRepository;
  let contractRepo: ContractRepository;
  let userRepo: UserRepository;
  let service: InvoiceService;
  let controller: InvoiceController;

  let mockAuditLogService: { record: ReturnType<typeof vi.fn> };
  let mockNotificationService: { sendNotification: ReturnType<typeof vi.fn> };

  let testFacilityId: Types.ObjectId;
  let testCustomerId: Types.ObjectId;
  let testAdminId: Types.ObjectId;
  let testStaffId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    expect(Payment).toBeDefined();
    expect(FacilityUnitTypeOffering).toBeDefined();
    expect(StorageUnit).toBeDefined();

    invoiceRepo = new InvoiceRepository(Invoice);
    contractRepo = new ContractRepository(Contract);
    userRepo = new UserRepository(User);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();

    mockAuditLogService = { record: vi.fn() };
    mockNotificationService = {
      sendNotification: vi.fn().mockResolvedValue({ id: 'notif-123' }),
    };

    service = new InvoiceService(
      invoiceRepo,
      contractRepo,
      userRepo,
      mockAuditLogService as unknown as AuditLogService,
      undefined,
      mockNotificationService as unknown as NotificationService
    );

    controller = new InvoiceController(service);

    testFacilityId = new Types.ObjectId();
    testCustomerId = new Types.ObjectId();
    testAdminId = new Types.ObjectId();
    testStaffId = new Types.ObjectId();

    await Facility.create({
      _id: testFacilityId,
      facilityCode: 'FAC-REC-01',
      name: 'Recurring Test Facility',
      address: '123 Billing Road',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
      operatingHours: {
        open: '08:00',
        close: '20:00',
        timezone: 'Asia/Ho_Chi_Minh',
      },
      capacity: { totalUnits: 10, occupiedUnits: 0, availableUnits: 10 },
      isDeleted: false,
    });

    await User.create([
      {
        _id: testCustomerId,
        email: 'customer@recurring.test',
        password: 'hashedpassword',
        name: 'Recurring Customer',
        phoneNumber: '0901234567',
        role: RoleEnum.CUSTOMER,
        status: UserStatusEnum.ACTIVE,
        authProvider: AuthProviderEnum.LOCAL,
      },
      {
        _id: testAdminId,
        email: 'admin@recurring.test',
        password: 'hashedpassword',
        name: 'System Admin',
        phoneNumber: '0901234568',
        role: RoleEnum.SYSTEM_ADMIN,
        status: UserStatusEnum.ACTIVE,
        authProvider: AuthProviderEnum.LOCAL,
      },
      {
        _id: testStaffId,
        email: 'staff@recurring.test',
        password: 'hashedpassword',
        name: 'Facility Staff',
        phoneNumber: '0901234569',
        role: RoleEnum.FACILITY_STAFF,
        assignedFacilityId: testFacilityId,
        status: UserStatusEnum.ACTIVE,
        authProvider: AuthProviderEnum.LOCAL,
      },
    ]);
  });

  describe('1. Business Logic: processRecurringInvoicesScan (T-7)', () => {
    it('should generate cycle 2 invoice when today is at T-7 mark', async () => {
      // Contract 3 months: 2026-11-01 -> 2027-02-01
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const contract = await Contract.create({
        contractCode: 'CTR-REC-001',
        source: ContractSourceEnum.WALK_IN,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        storageUnitId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        startDate,
        endDate,
        billingUnit: BillingUnitEnum.MONTH,
        rentalDuration: 3,
        rentalPrice: 1500000,
        totalPeriodicPrice: 1500000,
        depositAmount: 1500000,
        depositStatus: ContractDepositStatusEnum.HELD,
        status: ContractStatusEnum.ACTIVE,
        amenities: [],
        deleted: false,
      });

      // Cycle 1 invoice already generated and paid (period: 2026-11-01 -> 2026-11-30)
      const cycle1PeriodEnd = endOfDayVN(addDays(startDate, 29));
      await Invoice.create({
        invoiceCode: 'INV-261101-C001',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.PAID,
        billingPeriodIndex: 1,
        periodStartDate: startDate,
        periodEndDate: cycle1PeriodEnd,
        dueDate: startDate,
        items: [
          {
            name: 'Tiền thuê kỳ 1',
            itemType: InvoiceItemTypeEnum.RENT,
            quantity: 1,
            unitPrice: 1500000,
            amount: 1500000,
          },
        ],
        subtotal: 1500000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 1500000,
        paidAmount: 1500000,
      });

      // Today is 2026-11-24 (Exactly 7 days before Cycle 2 starts on 2026-12-01)
      const scanDate = new Date('2026-11-24T01:00:00.000Z');

      const result = await service.processRecurringInvoicesScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(1);
      expect(result.generatedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(result.failedCount).toBe(0);

      // Verify created cycle 2 invoice
      const cycle2Invoice = await invoiceRepo.findActiveByContractAndPeriod(
        String(contract._id),
        2
      );
      expect(cycle2Invoice).not.toBeNull();
      expect(cycle2Invoice?.billingPeriodIndex).toBe(2);
      expect(cycle2Invoice?.status).toBe(InvoiceStatusEnum.ISSUED);
      expect(cycle2Invoice?.totalAmount).toBe(1500000);
      expect(cycle2Invoice?.type).toBe(InvoiceTypeEnum.RECURRING);

      // Verify notification sent
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: String(testCustomerId),
          facilityId: String(testFacilityId),
          type: NotificationTypeEnum.INVOICE,
          metadata: expect.objectContaining({
            invoiceCode: cycle2Invoice?.invoiceCode,
            contractCode: 'CTR-REC-001',
            amount: 1500000,
          }),
        })
      );
    });

    it('should skip contract if scan date is before T-7 (e.g. T-11)', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const contract = await Contract.create({
        contractCode: 'CTR-REC-002',
        source: ContractSourceEnum.WALK_IN,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        storageUnitId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        startDate,
        endDate,
        billingUnit: BillingUnitEnum.MONTH,
        rentalDuration: 3,
        rentalPrice: 2000000,
        totalPeriodicPrice: 2000000,
        depositAmount: 2000000,
        depositStatus: ContractDepositStatusEnum.HELD,
        status: ContractStatusEnum.ACTIVE,
        amenities: [],
        deleted: false,
      });

      const cycle1PeriodEnd = endOfDayVN(addDays(startDate, 29));
      await Invoice.create({
        invoiceCode: 'INV-261101-C002',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.PAID,
        billingPeriodIndex: 1,
        periodStartDate: startDate,
        periodEndDate: cycle1PeriodEnd,
        dueDate: startDate,
        items: [
          {
            name: 'Tiền thuê kỳ 1',
            itemType: InvoiceItemTypeEnum.RENT,
            quantity: 1,
            unitPrice: 2000000,
            amount: 2000000,
          },
        ],
        subtotal: 2000000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 2000000,
        paidAmount: 2000000,
      });

      // Today is 2026-11-20 (11 days before Cycle 2 starts on 2026-12-01)
      const scanDate = new Date('2026-11-20T01:00:00.000Z');

      const result = await service.processRecurringInvoicesScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(1);
      expect(result.generatedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // Verify no cycle 2 invoice created
      const cycle2Invoice = await invoiceRepo.findActiveByContractAndPeriod(
        String(contract._id),
        2
      );
      expect(cycle2Invoice).toBeNull();
      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should skip if next period starts on or after contract endDate (contract completed)', async () => {
      // 1-month contract: 2026-11-01 -> 2026-11-30
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = endOfDayVN(addDays(startDate, 29));

      const contract = await Contract.create({
        contractCode: 'CTR-REC-003',
        source: ContractSourceEnum.WALK_IN,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        storageUnitId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        startDate,
        endDate,
        billingUnit: BillingUnitEnum.MONTH,
        rentalDuration: 1,
        rentalPrice: 1200000,
        totalPeriodicPrice: 1200000,
        depositAmount: 1200000,
        depositStatus: ContractDepositStatusEnum.HELD,
        status: ContractStatusEnum.ACTIVE,
        amenities: [],
        deleted: false,
      });

      await Invoice.create({
        invoiceCode: 'INV-261101-C003',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.PAID,
        billingPeriodIndex: 1,
        periodStartDate: startDate,
        periodEndDate: endDate,
        dueDate: startDate,
        items: [
          {
            name: 'Tiền thuê kỳ 1',
            itemType: InvoiceItemTypeEnum.RENT,
            quantity: 1,
            unitPrice: 1200000,
            amount: 1200000,
          },
        ],
        subtotal: 1200000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 1200000,
        paidAmount: 1200000,
      });

      // Today is 2026-11-24
      const scanDate = new Date('2026-11-24T01:00:00.000Z');

      const result = await service.processRecurringInvoicesScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(1);
      expect(result.generatedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      const cycle2 = await invoiceRepo.findActiveByContractAndPeriod(
        String(contract._id),
        2
      );
      expect(cycle2).toBeNull();
    });

    it('should be idempotent and not create duplicate invoices when run twice', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const contract = await Contract.create({
        contractCode: 'CTR-REC-IDEMPOTENT',
        source: ContractSourceEnum.WALK_IN,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        storageUnitId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        startDate,
        endDate,
        billingUnit: BillingUnitEnum.MONTH,
        rentalDuration: 3,
        rentalPrice: 1800000,
        totalPeriodicPrice: 1800000,
        depositAmount: 1800000,
        depositStatus: ContractDepositStatusEnum.HELD,
        status: ContractStatusEnum.ACTIVE,
        amenities: [],
        deleted: false,
      });

      const cycle1PeriodEnd = endOfDayVN(addDays(startDate, 29));
      await Invoice.create({
        invoiceCode: 'INV-261101-C004',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.PAID,
        billingPeriodIndex: 1,
        periodStartDate: startDate,
        periodEndDate: cycle1PeriodEnd,
        dueDate: startDate,
        items: [
          {
            name: 'Tiền thuê kỳ 1',
            itemType: InvoiceItemTypeEnum.RENT,
            quantity: 1,
            unitPrice: 1800000,
            amount: 1800000,
          },
        ],
        subtotal: 1800000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 1800000,
        paidAmount: 1800000,
      });

      const scanDate = new Date('2026-11-24T01:00:00.000Z');

      // Run 1: Should generate
      const run1 = await service.processRecurringInvoicesScan({
        now: scanDate,
      });
      expect(run1.generatedCount).toBe(1);

      // Run 2: Same date -> Should skip
      const run2 = await service.processRecurringInvoicesScan({
        now: scanDate,
      });
      expect(run2.scannedCount).toBe(1);
      expect(run2.generatedCount).toBe(0);
      expect(run2.skippedCount).toBe(1);
      expect(run2.failedCount).toBe(0);

      // Verify exactly one cycle 2 invoice exists
      const invoices = await invoiceRepo.findByContractId(String(contract._id));
      const cycle2Invoices = invoices.filter(
        (inv) => inv.billingPeriodIndex === 2
      );
      expect(cycle2Invoices).toHaveLength(1);
    });

    it('should provide fault isolation: failure on 1 contract does not abort others', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-05-01T00:00:00.000Z'));

      // Contract 1: Valid
      const c1 = await Contract.create({
        contractCode: 'CTR-REC-FAULT-1',
        source: ContractSourceEnum.WALK_IN,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        storageUnitId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        startDate,
        endDate,
        billingUnit: BillingUnitEnum.MONTH,
        rentalDuration: 6,
        rentalPrice: 1000000,
        totalPeriodicPrice: 1000000,
        depositAmount: 1000000,
        depositStatus: ContractDepositStatusEnum.HELD,
        status: ContractStatusEnum.ACTIVE,
        amenities: [],
        deleted: false,
      });

      // Contract 2: Valid
      const c2 = await Contract.create({
        contractCode: 'CTR-REC-FAULT-2',
        source: ContractSourceEnum.WALK_IN,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        storageUnitId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        startDate,
        endDate,
        billingUnit: BillingUnitEnum.MONTH,
        rentalDuration: 6,
        rentalPrice: 2000000,
        totalPeriodicPrice: 2000000,
        depositAmount: 2000000,
        depositStatus: ContractDepositStatusEnum.HELD,
        status: ContractStatusEnum.ACTIVE,
        amenities: [],
        deleted: false,
      });

      const cycle1PeriodEnd = endOfDayVN(addDays(startDate, 29));
      await Invoice.create([
        {
          invoiceCode: 'INV-FAULT-001',
          contractId: c1._id,
          customerId: testCustomerId,
          facilityId: testFacilityId,
          type: InvoiceTypeEnum.RECURRING,
          status: InvoiceStatusEnum.PAID,
          billingPeriodIndex: 1,
          periodStartDate: startDate,
          periodEndDate: cycle1PeriodEnd,
          dueDate: startDate,
          items: [
            {
              name: 'Kỳ 1',
              itemType: InvoiceItemTypeEnum.RENT,
              quantity: 1,
              unitPrice: 1000000,
              amount: 1000000,
            },
          ],
          subtotal: 1000000,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 1000000,
          paidAmount: 1000000,
        },
        {
          invoiceCode: 'INV-FAULT-002',
          contractId: c2._id,
          customerId: testCustomerId,
          facilityId: testFacilityId,
          type: InvoiceTypeEnum.RECURRING,
          status: InvoiceStatusEnum.PAID,
          billingPeriodIndex: 1,
          periodStartDate: startDate,
          periodEndDate: cycle1PeriodEnd,
          dueDate: startDate,
          items: [
            {
              name: 'Kỳ 1',
              itemType: InvoiceItemTypeEnum.RENT,
              quantity: 1,
              unitPrice: 2000000,
              amount: 2000000,
            },
          ],
          subtotal: 2000000,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 2000000,
          paidAmount: 2000000,
        },
      ]);

      // Mock generateRecurringInvoice to fail specifically on c1, succeed on c2
      const originalGenerate = service.generateRecurringInvoice.bind(service);
      vi.spyOn(service, 'generateRecurringInvoice').mockImplementation(
        async (contract, cycleIndex, session) => {
          if (String(contract._id) === String(c1._id)) {
            throw new Error('Simulated DB failure for contract 1');
          }
          return originalGenerate(contract, cycleIndex, session);
        }
      );

      const scanDate = new Date('2026-11-24T01:00:00.000Z');
      const result = await service.processRecurringInvoicesScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.generatedCount).toBe(1);

      // Verify c2 invoice was created despite c1 error
      const c2Invoice = await invoiceRepo.findActiveByContractAndPeriod(
        String(c2._id),
        2
      );
      expect(c2Invoice).not.toBeNull();
      expect(c2Invoice?.totalAmount).toBe(2000000);
    });
  });

  describe('2. Controller Endpoint: POST /invoices/process-recurring', () => {
    it('should reject unauthorized or lower roles with 403 Forbidden', async () => {
      // Customer caller
      const reqCustomer = {
        headers: {
          'x-user-id': String(testCustomerId),
          'x-user-role': RoleEnum.CUSTOMER,
        },
      } as unknown as ExpressRequest;

      await expect(
        controller.processRecurringInvoices(reqCustomer)
      ).rejects.toMatchObject({
        statusCode: 403,
      });

      // Facility Staff caller
      const reqStaff = {
        headers: {
          'x-user-id': String(testStaffId),
          'x-user-role': RoleEnum.FACILITY_STAFF,
        },
      } as unknown as ExpressRequest;

      await expect(
        controller.processRecurringInvoices(reqStaff)
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('should allow SYSTEM_ADMIN to trigger recurring scan', async () => {
      const reqAdmin = {
        headers: {
          'x-user-id': String(testAdminId),
          'x-user-role': RoleEnum.SYSTEM_ADMIN,
        },
      } as unknown as ExpressRequest;

      const res = await controller.processRecurringInvoices(reqAdmin);
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveProperty('scannedCount');
      expect(res.data).toHaveProperty('generatedCount');
      expect(res.data).toHaveProperty('skippedCount');
      expect(res.data).toHaveProperty('failedCount');
    });
  });

  describe('3. Worker Integration: BILLING_JOB.GENERATE_RECURRING_INVOICES', () => {
    it('should execute processBillingJob for GENERATE_RECURRING_INVOICES without error', async () => {
      const mockJob = {
        id: 'bullmq-job-1',
        name: BILLING_JOB.GENERATE_RECURRING_INVOICES,
        data: {},
      } as Job;

      await expect(processBillingJob(mockJob)).resolves.toBeUndefined();
    });
  });
});
