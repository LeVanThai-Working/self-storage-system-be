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
import { AuditActionEnum } from '../src/common/enums/auditLog.enum.ts';
import { startOfDayVN, endOfDayVN, addDays } from '../src/utils/date.util.ts';
import { BILLING_JOB } from '../src/modules/billing/billing.queue.ts';
import { processBillingJob } from '../src/modules/billing/billing.worker.ts';
import type { Job } from 'bullmq';

describe('billing/T2.3: Overdue Invoices Scan & Contract Lock Automation (Grace Period)', () => {
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
      sendNotification: vi.fn().mockResolvedValue({ id: 'notif-urgent-123' }),
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
      facilityCode: 'FAC-OVD-01',
      name: 'Overdue Test Facility',
      address: '456 Overdue Boulevard',
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
        email: 'customer@overdue.test',
        password: 'hashedpassword',
        name: 'Overdue Customer',
        phoneNumber: '0909999991',
        role: RoleEnum.CUSTOMER,
        status: UserStatusEnum.ACTIVE,
        authProvider: AuthProviderEnum.LOCAL,
      },
      {
        _id: testAdminId,
        email: 'admin@overdue.test',
        password: 'hashedpassword',
        name: 'Overdue Admin',
        phoneNumber: '0909999992',
        role: RoleEnum.SYSTEM_ADMIN,
        status: UserStatusEnum.ACTIVE,
        authProvider: AuthProviderEnum.LOCAL,
      },
      {
        _id: testStaffId,
        email: 'staff@overdue.test',
        password: 'hashedpassword',
        name: 'Overdue Staff',
        phoneNumber: '0909999993',
        role: RoleEnum.FACILITY_STAFF,
        assignedFacilityId: testFacilityId,
        status: UserStatusEnum.ACTIVE,
        authProvider: AuthProviderEnum.LOCAL,
      },
    ]);
  });

  describe('1. Business Logic: processOverdueInvoicesScan', () => {
    it('should transition Invoice -> OVERDUE and Contract -> OVERDUE when past 3 days grace period', async () => {
      // Contract: 2026-11-01 -> 2027-02-01
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const contract = await Contract.create({
        contractCode: 'CTR-OVD-001',
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

      // Invoice dueDate is 2026-11-01
      const cycle1PeriodEnd = endOfDayVN(addDays(startDate, 29));
      const invoice = await Invoice.create({
        invoiceCode: 'INV-OVD-001',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.FIRST_PERIOD,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 1,
        periodStartDate: startDate,
        periodEndDate: cycle1PeriodEnd,
        dueDate: startDate, // 2026-11-01
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
        paidAmount: 0,
      });

      // Scan run on 2026-11-05 02:00:00 (past 3 days grace period: 2nd, 3rd, 4th)
      const scanDate = new Date('2026-11-05T02:00:00.000Z');

      const result = await service.processOverdueInvoicesScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(1);
      expect(result.markedOverdueCount).toBe(1);
      expect(result.contractsLockedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(result.failedCount).toBe(0);

      // Verify Invoice updated to OVERDUE
      const updatedInvoice = await invoiceRepo.findById(String(invoice._id));
      expect(updatedInvoice?.status).toBe(InvoiceStatusEnum.OVERDUE);

      // Verify Contract locked to OVERDUE
      const updatedContract = await contractRepo.findById(String(contract._id));
      expect(updatedContract?.status).toBe(ContractStatusEnum.OVERDUE);

      // Verify Audit logs recorded
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditActionEnum.MARK_OVERDUE,
          resourceId: String(invoice._id),
        })
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditActionEnum.MARK_OVERDUE,
          resourceId: String(contract._id),
        })
      );

      // Verify Urgent High-Priority Notification sent
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: String(testCustomerId),
          priority: NotificationPriorityEnum.HIGH,
          type: NotificationTypeEnum.INVOICE,
          title: expect.stringContaining('Cảnh báo nợ quá hạn'),
          content: expect.stringContaining('CTR-OVD-001'),
        })
      );
    });

    it('should NOT mark invoice as OVERDUE if still within 3-day grace period', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const contract = await Contract.create({
        contractCode: 'CTR-OVD-002',
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

      const cycle1PeriodEnd = endOfDayVN(addDays(startDate, 29));
      const invoice = await Invoice.create({
        invoiceCode: 'INV-OVD-002',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.FIRST_PERIOD,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 1,
        periodStartDate: startDate,
        periodEndDate: cycle1PeriodEnd,
        dueDate: startDate, // 2026-11-01
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
        paidAmount: 0,
      });

      // Today is 2026-11-03 (Only 2 days after dueDate, within 3 days grace period)
      const scanDate = new Date('2026-11-03T10:00:00.000Z');

      const result = await service.processOverdueInvoicesScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(0);
      expect(result.markedOverdueCount).toBe(0);
      expect(result.contractsLockedCount).toBe(0);

      // Verify Invoice remains ISSUED
      const checkInvoice = await invoiceRepo.findById(String(invoice._id));
      expect(checkInvoice?.status).toBe(InvoiceStatusEnum.ISSUED);

      // Verify Contract remains ACTIVE
      const checkContract = await contractRepo.findById(String(contract._id));
      expect(checkContract?.status).toBe(ContractStatusEnum.ACTIVE);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should be idempotent and not lock contract again if contract is already OVERDUE', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      // Contract is already OVERDUE (e.g. from a previous debt issue)
      const contract = await Contract.create({
        contractCode: 'CTR-OVD-ALREADY',
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
        status: ContractStatusEnum.OVERDUE,
        amenities: [],
        deleted: false,
      });

      const cycle1PeriodEnd = endOfDayVN(addDays(startDate, 29));
      const invoice = await Invoice.create({
        invoiceCode: 'INV-OVD-003',
        contractId: contract._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.FIRST_PERIOD,
        status: InvoiceStatusEnum.ISSUED,
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
        paidAmount: 0,
      });

      const scanDate = new Date('2026-11-06T02:00:00.000Z');

      const result = await service.processOverdueInvoicesScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(1);
      expect(result.markedOverdueCount).toBe(1);
      // Contract was already OVERDUE, so contractsLockedCount is 0
      expect(result.contractsLockedCount).toBe(0);

      const checkInvoice = await invoiceRepo.findById(String(invoice._id));
      expect(checkInvoice?.status).toBe(InvoiceStatusEnum.OVERDUE);
    });

    it('should provide fault isolation: error on 1 invoice does not prevent others from transitioning', async () => {
      const startDate = startOfDayVN(new Date('2026-11-01T00:00:00.000Z'));
      const endDate = startOfDayVN(new Date('2027-02-01T00:00:00.000Z'));

      const contract1 = await Contract.create({
        contractCode: 'CTR-FAULT-OVD-1',
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

      const contract2 = await Contract.create({
        contractCode: 'CTR-FAULT-OVD-2',
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
      const inv1 = await Invoice.create({
        invoiceCode: 'INV-FAULT-OVD-1',
        contractId: contract1._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.FIRST_PERIOD,
        status: InvoiceStatusEnum.ISSUED,
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
        paidAmount: 0,
      });

      const inv2 = await Invoice.create({
        invoiceCode: 'INV-FAULT-OVD-2',
        contractId: contract2._id,
        customerId: testCustomerId,
        facilityId: testFacilityId,
        type: InvoiceTypeEnum.FIRST_PERIOD,
        status: InvoiceStatusEnum.ISSUED,
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
        paidAmount: 0,
      });

      // Mock atomicUpdateStatus on Invoice to throw specifically for inv1
      const originalUpdate = invoiceRepo.atomicUpdateStatus.bind(invoiceRepo);
      vi.spyOn(invoiceRepo, 'atomicUpdateStatus').mockImplementation(
        async (id, expectedStatus, updateData, session) => {
          if (String(id) === String(inv1._id)) {
            throw new Error('Simulated atomic update failure for inv1');
          }
          return originalUpdate(id, expectedStatus, updateData, session);
        }
      );

      const scanDate = new Date('2026-11-06T02:00:00.000Z');
      const result = await service.processOverdueInvoicesScan({
        now: scanDate,
      });

      expect(result.scannedCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.markedOverdueCount).toBe(1);
      expect(result.contractsLockedCount).toBe(1);

      // Verify inv2 was successfully updated to OVERDUE despite inv1 failure
      const checkInv2 = await invoiceRepo.findById(String(inv2._id));
      expect(checkInv2?.status).toBe(InvoiceStatusEnum.OVERDUE);
    });
  });

  describe('2. Controller Endpoint: POST /invoices/process-overdue', () => {
    it('should reject unauthorized or lower roles with 403 Forbidden', async () => {
      // Customer caller
      const reqCustomer = {
        headers: {
          'x-user-id': String(testCustomerId),
          'x-user-role': RoleEnum.CUSTOMER,
        },
      } as unknown as ExpressRequest;

      await expect(
        controller.processOverdueInvoices(reqCustomer)
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
        controller.processOverdueInvoices(reqStaff)
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('should allow SYSTEM_ADMIN to trigger overdue scan', async () => {
      const reqAdmin = {
        headers: {
          'x-user-id': String(testAdminId),
          'x-user-role': RoleEnum.SYSTEM_ADMIN,
        },
      } as unknown as ExpressRequest;

      const res = await controller.processOverdueInvoices(reqAdmin);
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveProperty('scannedCount');
      expect(res.data).toHaveProperty('markedOverdueCount');
      expect(res.data).toHaveProperty('contractsLockedCount');
      expect(res.data).toHaveProperty('skippedCount');
      expect(res.data).toHaveProperty('failedCount');
    });
  });

  describe('3. Worker Integration: BILLING_JOB.SCAN_OVERDUE_INVOICES', () => {
    it('should execute processBillingJob for SCAN_OVERDUE_INVOICES without error', async () => {
      const mockJob = {
        id: 'bullmq-job-overdue-1',
        name: BILLING_JOB.SCAN_OVERDUE_INVOICES,
        data: {},
      } as Job;

      await expect(processBillingJob(mockJob)).resolves.toBeUndefined();
    });
  });
});
