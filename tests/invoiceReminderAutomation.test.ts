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
import {
  NotificationTypeEnum,
  NotificationPriorityEnum,
} from '../src/common/enums/notification.enum.ts';
import { startOfDayVN, endOfDayVN, addDays } from '../src/utils/date.util.ts';
import { BILLING_JOB } from '../src/modules/billing/billing.queue.ts';
import { processBillingJob } from '../src/modules/billing/billing.worker.ts';
import type { Job } from 'bullmq';

describe('billing/T2.4: Payment Reminders Automation (T-3, T-1, T-0)', () => {
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
      sendNotification: vi.fn().mockResolvedValue({ id: 'notif-remind-123' }),
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
      facilityCode: 'FAC-REM-01',
      name: 'Reminder Test Facility',
      address: '789 Notification Street',
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
        email: 'customer@remind.test',
        password: 'hashedpassword',
        name: 'Reminder Customer',
        phoneNumber: '0908888881',
        role: RoleEnum.CUSTOMER,
        status: UserStatusEnum.ACTIVE,
        authProvider: AuthProviderEnum.LOCAL,
      },
      {
        _id: testAdminId,
        email: 'admin@remind.test',
        password: 'hashedpassword',
        name: 'Reminder Admin',
        phoneNumber: '0908888882',
        role: RoleEnum.SYSTEM_ADMIN,
        status: UserStatusEnum.ACTIVE,
        authProvider: AuthProviderEnum.LOCAL,
      },
      {
        _id: testStaffId,
        email: 'staff@remind.test',
        password: 'hashedpassword',
        name: 'Reminder Staff',
        phoneNumber: '0908888883',
        role: RoleEnum.FACILITY_STAFF,
        assignedFacilityId: testFacilityId,
        status: UserStatusEnum.ACTIVE,
        authProvider: AuthProviderEnum.LOCAL,
      },
    ]);
  });

  describe('1. Business Logic: processPaymentRemindersScan', () => {
    it('should dispatch T-3 reminder with NORMAL priority when due in 3 days', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const contract = await Contract.create({
        contractCode: 'CTR-REM-T3',
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

      // Invoice dueDate is 2026-11-10
      const dueDate = startOfDayVN(new Date('2026-11-10T00:00:00.000Z'));
      const invoice = await Invoice.create({
        invoiceCode: 'INV-REM-T3',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 2,
        periodStartDate: dueDate,
        periodEndDate: endOfDayVN(addDays(dueDate, 29)),
        dueDate,
        items: [
          {
            name: 'Tiền thuê kỳ 2',
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
        paidAmount: 0,
      });

      // Today is 2026-11-07 08:00 (Exactly 3 days before dueDate 2026-11-10)
      const scanDate = new Date('2026-11-07T08:00:00.000Z');

      const result = await service.processPaymentRemindersScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(1);
      expect(result.remindedT3Count).toBe(1);
      expect(result.remindedT1Count).toBe(0);
      expect(result.remindedT0Count).toBe(0);
      expect(result.totalRemindedCount).toBe(1);
      expect(result.skippedCount).toBe(0);

      // Verify notification sent with NORMAL priority
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: String(testCustomerId),
          priority: NotificationPriorityEnum.NORMAL,
          type: NotificationTypeEnum.INVOICE,
          title: expect.stringContaining('Hạn còn 3 ngày'),
        })
      );

      // Verify milestone recorded on invoice
      const updatedInvoice = await invoiceRepo.findById(String(invoice._id));
      expect(updatedInvoice?.remindersSent).toHaveLength(1);
      expect(updatedInvoice?.remindersSent?.[0]?.milestone).toBe('T-3');
    });

    it('should dispatch T-1 reminder with HIGH priority when due tomorrow', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const contract = await Contract.create({
        contractCode: 'CTR-REM-T1',
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

      const dueDate = startOfDayVN(new Date('2026-11-10T00:00:00.000Z'));
      const invoice = await Invoice.create({
        invoiceCode: 'INV-REM-T1',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 2,
        periodStartDate: dueDate,
        periodEndDate: endOfDayVN(addDays(dueDate, 29)),
        dueDate,
        items: [
          {
            name: 'Tiền thuê kỳ 2',
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
        paidAmount: 0,
      });

      // Today is 2026-11-09 08:00 (1 day before dueDate 2026-11-10)
      const scanDate = new Date('2026-11-09T08:00:00.000Z');

      const result = await service.processPaymentRemindersScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(1);
      expect(result.remindedT1Count).toBe(1);
      expect(result.totalRemindedCount).toBe(1);

      // Verify notification sent with HIGH priority
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: String(testCustomerId),
          priority: NotificationPriorityEnum.HIGH,
          type: NotificationTypeEnum.INVOICE,
          title: expect.stringContaining('Hạn còn 1 ngày'),
        })
      );

      const updatedInvoice = await invoiceRepo.findById(String(invoice._id));
      expect(
        updatedInvoice?.remindersSent?.some((r) => r.milestone === 'T-1')
      ).toBe(true);
    });

    it('should dispatch T-0 reminder with URGENT priority on dueDate', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const contract = await Contract.create({
        contractCode: 'CTR-REM-T0',
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

      const dueDate = startOfDayVN(new Date('2026-11-10T00:00:00.000Z'));
      const invoice = await Invoice.create({
        invoiceCode: 'INV-REM-T0',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 2,
        periodStartDate: dueDate,
        periodEndDate: endOfDayVN(addDays(dueDate, 29)),
        dueDate,
        items: [
          {
            name: 'Tiền thuê kỳ 2',
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
        paidAmount: 0,
      });

      // Today is 2026-11-10 08:00 (Due Date)
      const scanDate = new Date('2026-11-10T08:00:00.000Z');

      const result = await service.processPaymentRemindersScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(1);
      expect(result.remindedT0Count).toBe(1);
      expect(result.totalRemindedCount).toBe(1);

      // Verify notification sent with URGENT priority
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: String(testCustomerId),
          priority: NotificationPriorityEnum.URGENT,
          type: NotificationTypeEnum.INVOICE,
          title: expect.stringContaining('Hạn chót thanh toán hôm nay'),
        })
      );

      const updatedInvoice = await invoiceRepo.findById(String(invoice._id));
      expect(
        updatedInvoice?.remindersSent?.some((r) => r.milestone === 'T-0')
      ).toBe(true);
    });

    it('should skip invoice if not falling in T-3, T-1, or T-0 milestones (e.g. T-2)', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const contract = await Contract.create({
        contractCode: 'CTR-REM-T2',
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

      // Due date is 2026-11-10
      const dueDate = startOfDayVN(new Date('2026-11-10T00:00:00.000Z'));
      await Invoice.create({
        invoiceCode: 'INV-REM-T2',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 2,
        periodStartDate: dueDate,
        periodEndDate: endOfDayVN(addDays(dueDate, 29)),
        dueDate,
        items: [
          {
            name: 'Tiền thuê kỳ 2',
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
        paidAmount: 0,
      });

      // Today is 2026-11-08 (2 days before dueDate -> not in T-3, T-1, T-0)
      const scanDate = new Date('2026-11-08T08:00:00.000Z');

      const result = await service.processPaymentRemindersScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(0);
      expect(result.totalRemindedCount).toBe(0);
      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should be idempotent and not send duplicate reminders for the same milestone', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const contract = await Contract.create({
        contractCode: 'CTR-REM-IDEMP',
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

      const dueDate = startOfDayVN(new Date('2026-11-10T00:00:00.000Z'));
      await Invoice.create({
        invoiceCode: 'INV-REM-IDEMP',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 2,
        periodStartDate: dueDate,
        periodEndDate: endOfDayVN(addDays(dueDate, 29)),
        dueDate,
        items: [
          {
            name: 'Tiền thuê kỳ 2',
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
        paidAmount: 0,
      });

      const scanDate = new Date('2026-11-07T08:00:00.000Z');

      // Run 1: Should send reminder
      const run1 = await service.processPaymentRemindersScan({ now: scanDate });
      expect(run1.remindedT3Count).toBe(1);

      // Run 2: Same date -> Should skip
      const run2 = await service.processPaymentRemindersScan({ now: scanDate });
      expect(run2.scannedCount).toBe(1);
      expect(run2.remindedT3Count).toBe(0);
      expect(run2.skippedCount).toBe(1);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(1);
    });

    it('should provide fault isolation: error on 1 invoice does not prevent reminding others', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const c1 = await Contract.create({
        contractCode: 'CTR-REM-FAULT-1',
        source: ContractSourceEnum.WALK_IN,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        storageUnitId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        startDate,
        endDate,
        billingUnit: BillingUnitEnum.MONTH,
        rentalDuration: 3,
        rentalPrice: 1000000,
        totalPeriodicPrice: 1000000,
        depositAmount: 1000000,
        depositStatus: ContractDepositStatusEnum.HELD,
        status: ContractStatusEnum.ACTIVE,
        amenities: [],
        deleted: false,
      });

      const c2 = await Contract.create({
        contractCode: 'CTR-REM-FAULT-2',
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

      const dueDate = startOfDayVN(new Date('2026-11-10T00:00:00.000Z'));

      const inv1 = await Invoice.create({
        invoiceCode: 'INV-REM-FAULT-1',
        contractId: c1._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 2,
        periodStartDate: dueDate,
        periodEndDate: endOfDayVN(addDays(dueDate, 29)),
        dueDate,
        items: [
          {
            name: 'Kỳ 2',
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
        paidAmount: 0,
      });

      const inv2 = await Invoice.create({
        invoiceCode: 'INV-REM-FAULT-2',
        contractId: c2._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 2,
        periodStartDate: dueDate,
        periodEndDate: endOfDayVN(addDays(dueDate, 29)),
        dueDate,
        items: [
          {
            name: 'Kỳ 2',
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
        paidAmount: 0,
      });

      // Mock recordReminderSent to fail specifically for inv1
      const originalRecord = invoiceRepo.recordReminderSent.bind(invoiceRepo);
      vi.spyOn(invoiceRepo, 'recordReminderSent').mockImplementation(
        async (id, milestone, session) => {
          if (String(id) === String(inv1._id)) {
            throw new Error('Simulated reminder record failure for inv1');
          }
          return originalRecord(id, milestone, session);
        }
      );

      const scanDate = new Date('2026-11-07T08:00:00.000Z');
      const result = await service.processPaymentRemindersScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.totalRemindedCount).toBe(1);

      // Verify inv2 had milestone recorded
      const checkInv2 = await invoiceRepo.findById(String(inv2._id));
      expect(checkInv2?.remindersSent?.some((r) => r.milestone === 'T-3')).toBe(
        true
      );
    });
  });

  describe('2. Controller Endpoint: POST /invoices/process-reminders', () => {
    it('should reject unauthorized or lower roles with 403 Forbidden', async () => {
      // Customer caller
      const reqCustomer = {
        headers: {
          'x-user-id': String(testCustomerId),
          'x-user-role': RoleEnum.CUSTOMER,
        },
      } as unknown as ExpressRequest;

      await expect(
        controller.processPaymentReminders(reqCustomer)
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
        controller.processPaymentReminders(reqStaff)
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('should allow SYSTEM_ADMIN to trigger reminders scan', async () => {
      const reqAdmin = {
        headers: {
          'x-user-id': String(testAdminId),
          'x-user-role': RoleEnum.SYSTEM_ADMIN,
        },
      } as unknown as ExpressRequest;

      const res = await controller.processPaymentReminders(reqAdmin);
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveProperty('scannedCount');
      expect(res.data).toHaveProperty('remindedT3Count');
      expect(res.data).toHaveProperty('remindedT1Count');
      expect(res.data).toHaveProperty('remindedT0Count');
      expect(res.data).toHaveProperty('totalRemindedCount');
      expect(res.data).toHaveProperty('skippedCount');
      expect(res.data).toHaveProperty('failedCount');
    });
  });

  describe('3. Worker Integration: BILLING_JOB.REMIND_INVOICE_PAYMENT', () => {
    it('should execute processBillingJob for REMIND_INVOICE_PAYMENT without error', async () => {
      const mockJob = {
        id: 'bullmq-job-remind-1',
        name: BILLING_JOB.REMIND_INVOICE_PAYMENT,
        data: {},
      } as Job;

      await expect(processBillingJob(mockJob)).resolves.toBeUndefined();
    });
  });
});
