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
import { Payment } from '../src/modules/payment/payment.model.ts';
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

describe('billing/T1.1: Invoice Generation Service Implementation', () => {
  let invoiceRepo: InvoiceRepository;
  let contractRepo: ContractRepository;
  let userRepo: UserRepository;
  let service: InvoiceService;
  let mockAuditLogService: { record: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    await setupTestDB();
    // Ensure models are registered for populate
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
    mockAuditLogService = { record: vi.fn() };
    service = new InvoiceService(
      invoiceRepo,
      contractRepo,
      userRepo,
      mockAuditLogService as unknown as AuditLogService
    );
  });

  async function createTestFixtures() {
    const customer = await User.create({
      name: 'Nguyễn Văn Khách',
      email: 'customer@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0901234567',
    });

    const otherCustomer = await User.create({
      name: 'Lê Văn Khách Khác',
      email: 'other_customer@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0901234568',
    });

    const facility1 = await Facility.create({
      name: 'Cơ sở Quận 1',
      code: 'CS01',
      city: 'TP. Hồ Chí Minh',
      address: '100 Nguyễn Huệ, Q1, TP.HCM',
      status: FacilityStatusEnum.ACTIVE,
      timezone: 'Asia/Ho_Chi_Minh',
    });

    const facility2 = await Facility.create({
      name: 'Cơ sở Bình Thạnh',
      code: 'CS02',
      city: 'TP. Hồ Chí Minh',
      address: '200 Điện Biên Phủ, Bình Thạnh, TP.HCM',
      status: FacilityStatusEnum.ACTIVE,
      timezone: 'Asia/Ho_Chi_Minh',
    });

    const staffFacility1 = await User.create({
      name: 'Nhân viên Cơ sở 1',
      email: 'staff_cs01@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0902234567',
      assignedFacilityId: facility1._id,
    });

    const staffFacility2 = await User.create({
      name: 'Nhân viên Cơ sở 2',
      email: 'staff_cs02@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0903234567',
      assignedFacilityId: facility2._id,
    });

    const admin = await User.create({
      name: 'Quản trị hệ thống',
      email: 'admin@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.SYSTEM_ADMIN,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0904234567',
    });

    const monthlyContract = await Contract.create({
      contractCode: 'HD-2026-M01',
      source: ContractSourceEnum.WALK_IN,
      customerId: customer._id,
      facilityId: facility1._id,
      storageUnitId: new Types.ObjectId(),
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      rentalPrice: 2000000,
      depositAmount: 2000000,
      depositStatus: ContractDepositStatusEnum.HELD,
      billingUnit: BillingUnitEnum.MONTH,
      rentalDuration: 6,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2027-05-01T00:00:00.000Z'),
      totalPeriodicPrice: 2150000,
      amenities: [
        {
          facilityAmenityOfferingId: new Types.ObjectId(),
          amenityId: new Types.ObjectId(),
          name: 'Ổ cắm điện 220V',
          quantity: 1,
          pricePerUnit: 150000,
          billingUnit: BillingUnitEnum.MONTH,
          totalPrice: 150000,
        },
      ],
      status: ContractStatusEnum.ACTIVE,
    });

    return {
      customer,
      otherCustomer,
      facility1,
      facility2,
      staffFacility1,
      staffFacility2,
      admin,
      monthlyContract,
    };
  }

  describe('1. generateFirstPeriodInvoice', () => {
    it('should generate first period invoice for monthly contract with rent and amenities', async () => {
      const { monthlyContract, customer, facility1 } =
        await createTestFixtures();

      const invoice = await service.generateFirstPeriodInvoice(monthlyContract);

      expect(invoice).toBeDefined();
      expect(invoice.invoiceCode).toMatch(/^INV-\d{6}-[0-9A-F]{4}$/);
      expect(invoice.contractId.toString()).toBe(
        monthlyContract._id.toString()
      );
      expect(invoice.customerId.toString()).toBe(customer._id.toString());
      expect(invoice.facilityId.toString()).toBe(facility1._id.toString());
      expect(invoice.type).toBe(InvoiceTypeEnum.FIRST_PERIOD);
      expect(invoice.status).toBe(InvoiceStatusEnum.ISSUED);
      expect(invoice.billingPeriodIndex).toBe(1);
      expect(invoice.items.length).toBe(2);

      const rentItem = invoice.items.find(
        (i) => i.itemType === InvoiceItemTypeEnum.RENT
      );
      expect(rentItem).toBeDefined();
      expect(rentItem?.amount).toBe(2000000);

      const amenityItem = invoice.items.find(
        (i) => i.itemType === InvoiceItemTypeEnum.AMENITY
      );
      expect(amenityItem).toBeDefined();
      expect(amenityItem?.amount).toBe(150000);

      expect(invoice.subtotal).toBe(2150000);
      expect(invoice.totalAmount).toBe(2150000);
      expect(invoice.paidAmount).toBe(0);

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditActionEnum.GENERATE_INVOICE,
          resourceId: invoice._id.toString(),
        })
      );
    });

    it('should be idempotent: subsequent calls return the existing first period invoice without creating a new one', async () => {
      const { monthlyContract } = await createTestFixtures();

      const firstCall =
        await service.generateFirstPeriodInvoice(monthlyContract);
      const secondCall =
        await service.generateFirstPeriodInvoice(monthlyContract);

      expect(firstCall._id.toString()).toBe(secondCall._id.toString());
      expect(secondCall.invoiceCode).toBe(firstCall.invoiceCode);

      const count = await Invoice.countDocuments({
        contractId: monthlyContract._id,
        billingPeriodIndex: 1,
      });
      expect(count).toBe(1);
    });

    it('should calculate periodEndDate properly for short daily contract (<= 14 days)', async () => {
      const { customer, facility1 } = await createTestFixtures();

      const shortDailyContract = await Contract.create({
        contractCode: 'HD-2026-D01',
        source: ContractSourceEnum.RESERVATION,
        customerId: customer._id,
        facilityId: facility1._id,
        storageUnitId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        rentalPrice: 500000,
        depositAmount: 500000,
        depositStatus: ContractDepositStatusEnum.HELD,
        billingUnit: BillingUnitEnum.DAY,
        rentalDuration: 10,
        startDate: new Date('2026-11-01T00:00:00.000Z'),
        endDate: new Date('2026-11-11T00:00:00.000Z'),
        totalPeriodicPrice: 500000,
        status: ContractStatusEnum.ACTIVE,
      });

      const invoice =
        await service.generateFirstPeriodInvoice(shortDailyContract);

      expect(invoice.billingPeriodIndex).toBe(1);
      expect(invoice.type).toBe(InvoiceTypeEnum.FIRST_PERIOD);
      expect(new Date(invoice.periodEndDate).getTime()).toBeGreaterThanOrEqual(
        new Date('2026-11-11T00:00:00.000Z').getTime()
      );
    });

    it('should limit first cycle to 7 days for long daily contract (> 14 days)', async () => {
      const { customer, facility1 } = await createTestFixtures();

      const longDailyContract = await Contract.create({
        contractCode: 'HD-2026-D02',
        source: ContractSourceEnum.RESERVATION,
        customerId: customer._id,
        facilityId: facility1._id,
        storageUnitId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        rentalPrice: 1500000,
        depositAmount: 1500000,
        depositStatus: ContractDepositStatusEnum.HELD,
        billingUnit: BillingUnitEnum.DAY,
        rentalDuration: 30,
        startDate: new Date('2026-11-01T00:00:00.000Z'),
        endDate: new Date('2026-12-01T00:00:00.000Z'),
        totalPeriodicPrice: 1500000,
        status: ContractStatusEnum.ACTIVE,
      });

      const invoice =
        await service.generateFirstPeriodInvoice(longDailyContract);

      expect(invoice.billingPeriodIndex).toBe(1);
      // Period is 7 days from Nov 1st -> Nov 7th
      const startMs = new Date(invoice.periodStartDate).getTime();
      const endMs = new Date(invoice.periodEndDate).getTime();
      const diffDays = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(7);
    });
  });

  describe('2. generateRecurringInvoice', () => {
    it('should throw AppError 400 when cycleIndex < 2', async () => {
      const { monthlyContract } = await createTestFixtures();

      await expect(
        service.generateRecurringInvoice(monthlyContract, 1)
      ).rejects.toThrowError(AppError);
    });

    it('should generate cycle 2 invoice based on cycle 1 end date', async () => {
      const { monthlyContract } = await createTestFixtures();

      const period1 = await service.generateFirstPeriodInvoice(monthlyContract);

      const period2 = await service.generateRecurringInvoice(
        monthlyContract,
        2
      );

      expect(period2).not.toBeNull();
      expect(period2?.billingPeriodIndex).toBe(2);
      expect(period2?.type).toBe(InvoiceTypeEnum.RECURRING);
      expect(period2?.status).toBe(InvoiceStatusEnum.ISSUED);
      expect(period2?.items.length).toBe(2);

      // Period 2 start date should be day after Period 1 end date
      const p1End = new Date(period1.periodEndDate);
      const p2Start = new Date(period2!.periodStartDate);
      expect(p2Start.getTime()).toBeGreaterThan(p1End.getTime());

      expect(mockAuditLogService.record).toHaveBeenCalledTimes(2);
    });

    it('should return existing recurring invoice when called again for same cycle (idempotency)', async () => {
      const { monthlyContract } = await createTestFixtures();

      await service.generateFirstPeriodInvoice(monthlyContract);

      const firstCall = await service.generateRecurringInvoice(
        monthlyContract,
        2
      );
      const secondCall = await service.generateRecurringInvoice(
        monthlyContract,
        2
      );

      expect(firstCall?._id.toString()).toBe(secondCall?._id.toString());
      expect(secondCall?.invoiceCode).toBe(firstCall?.invoiceCode);

      const count = await Invoice.countDocuments({
        contractId: monthlyContract._id,
        billingPeriodIndex: 2,
      });
      expect(count).toBe(1);
    });

    it('should return null when cycle start date exceeds contract end date', async () => {
      const { customer, facility1 } = await createTestFixtures();

      const twoMonthsContract = await Contract.create({
        contractCode: 'HD-2026-M02',
        source: ContractSourceEnum.WALK_IN,
        customerId: customer._id,
        facilityId: facility1._id,
        storageUnitId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        rentalPrice: 2000000,
        depositAmount: 2000000,
        depositStatus: ContractDepositStatusEnum.HELD,
        billingUnit: BillingUnitEnum.MONTH,
        rentalDuration: 2,
        startDate: new Date('2026-11-01T00:00:00.000Z'),
        endDate: new Date('2026-12-15T00:00:00.000Z'),
        totalPeriodicPrice: 2000000,
        status: ContractStatusEnum.ACTIVE,
      });

      await service.generateFirstPeriodInvoice(twoMonthsContract);
      await service.generateRecurringInvoice(twoMonthsContract, 2);

      // Cycle 3 starts beyond 2026-12-31
      const cycle3 = await service.generateRecurringInvoice(
        twoMonthsContract,
        3
      );
      expect(cycle3).toBeNull();
    });
  });

  describe('3. createManualInvoice', () => {
    it('should reject CUSTOMER caller with AppError 403', async () => {
      const { customer, monthlyContract } = await createTestFixtures();

      await expect(
        service.createManualInvoice(
          {
            contractId: monthlyContract._id.toString(),
            periodStartDate: '2026-11-01T00:00:00.000Z',
            periodEndDate: '2026-11-30T23:59:59.999Z',
            dueDate: '2026-11-10T00:00:00.000Z',
            items: [
              {
                name: 'Phí vệ sinh kho',
                quantity: 1,
                unitPrice: 200000,
                amount: 200000,
                itemType: InvoiceItemTypeEnum.OTHER,
              },
            ],
          },
          customer._id.toString(),
          RoleEnum.CUSTOMER
        )
      ).rejects.toThrowError(AppError);
    });

    it('should reject when contract is not found', async () => {
      const { staffFacility1 } = await createTestFixtures();

      await expect(
        service.createManualInvoice(
          {
            contractId: new Types.ObjectId().toString(),
            periodStartDate: '2026-11-01T00:00:00.000Z',
            periodEndDate: '2026-11-30T23:59:59.999Z',
            dueDate: '2026-11-10T00:00:00.000Z',
            items: [
              {
                name: 'Phí đền bù hư hỏng',
                quantity: 1,
                unitPrice: 300000,
                amount: 300000,
                itemType: InvoiceItemTypeEnum.DAMAGE_FEE,
              },
            ],
          },
          staffFacility1._id.toString(),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrowError(AppError);
    });

    it('should reject staff assigned to a different facility with AppError 403', async () => {
      const { monthlyContract, staffFacility2 } = await createTestFixtures();

      await expect(
        service.createManualInvoice(
          {
            contractId: monthlyContract._id.toString(),
            periodStartDate: '2026-11-01T00:00:00.000Z',
            periodEndDate: '2026-11-30T23:59:59.999Z',
            dueDate: '2026-11-10T00:00:00.000Z',
            items: [
              {
                name: 'Phí vệ sinh kho',
                quantity: 1,
                unitPrice: 200000,
                amount: 200000,
                itemType: InvoiceItemTypeEnum.OTHER,
              },
            ],
          },
          staffFacility2._id.toString(),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrowError(AppError);
    });

    it('should reject invalid dates where periodStartDate > periodEndDate', async () => {
      const { monthlyContract, staffFacility1 } = await createTestFixtures();

      await expect(
        service.createManualInvoice(
          {
            contractId: monthlyContract._id.toString(),
            periodStartDate: '2026-12-01T00:00:00.000Z',
            periodEndDate: '2026-11-01T23:59:59.999Z',
            dueDate: '2026-11-10T00:00:00.000Z',
            items: [
              {
                name: 'Phí vệ sinh kho',
                quantity: 1,
                unitPrice: 200000,
                amount: 200000,
                itemType: InvoiceItemTypeEnum.OTHER,
              },
            ],
          },
          staffFacility1._id.toString(),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrowError(AppError);
    });

    it('should successfully create manual incidental invoice when authorized', async () => {
      const { monthlyContract, staffFacility1 } = await createTestFixtures();

      const result = await service.createManualInvoice(
        {
          contractId: monthlyContract._id.toString(),
          periodStartDate: '2026-11-01T00:00:00.000Z',
          periodEndDate: '2026-11-30T23:59:59.999Z',
          dueDate: '2026-11-10T00:00:00.000Z',
          items: [
            {
              name: 'Phí vệ sinh dọn dẹp',
              description: 'Dọn dẹp rác kho do khách trả muộn',
              quantity: 2,
              unitPrice: 150000,
              amount: 300000,
              itemType: InvoiceItemTypeEnum.OTHER,
            },
          ],
          discountAmount: 50000,
          taxAmount: 25000,
          notes: 'Đã giảm giá 50k cho khách thân thiết',
        },
        staffFacility1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.invoiceCode).toMatch(/^INV-\d{6}-[0-9A-F]{4}$/);
      expect(result.type).toBe(InvoiceTypeEnum.INCIDENTAL);
      expect(result.status).toBe(InvoiceStatusEnum.ISSUED);
      expect(result.subtotal).toBe(300000);
      expect(result.discountAmount).toBe(50000);
      expect(result.taxAmount).toBe(25000);
      expect(result.totalAmount).toBe(275000); // 300k - 50k + 25k
      expect(result.notes).toBe('Đã giảm giá 50k cho khách thân thiết');
    });

    it('should allow SYSTEM_ADMIN to create manual invoice across any facility', async () => {
      const { monthlyContract, admin } = await createTestFixtures();

      const result = await service.createManualInvoice(
        {
          contractId: monthlyContract._id.toString(),
          periodStartDate: '2026-11-01T00:00:00.000Z',
          periodEndDate: '2026-11-30T23:59:59.999Z',
          dueDate: '2026-11-10T00:00:00.000Z',
          items: [
            {
              name: 'Phí dịch vụ đặc biệt',
              quantity: 1,
              unitPrice: 100000,
              amount: 100000,
              itemType: InvoiceItemTypeEnum.OTHER,
            },
          ],
        },
        admin._id.toString(),
        RoleEnum.SYSTEM_ADMIN
      );

      expect(result.totalAmount).toBe(100000);
      expect(result.type).toBe(InvoiceTypeEnum.INCIDENTAL);
    });
  });

  describe('4. getInvoiceById', () => {
    it('should return 404 when invoice does not exist', async () => {
      const { admin } = await createTestFixtures();

      await expect(
        service.getInvoiceById(
          new Types.ObjectId().toString(),
          admin._id.toString(),
          RoleEnum.SYSTEM_ADMIN
        )
      ).rejects.toThrowError(AppError);
    });

    it('should allow customer to view their own invoice', async () => {
      const { customer, monthlyContract } = await createTestFixtures();

      const invoice = await service.generateFirstPeriodInvoice(monthlyContract);

      const found = await service.getInvoiceById(
        invoice._id.toString(),
        customer._id.toString(),
        RoleEnum.CUSTOMER
      );

      expect(found).toBeDefined();
      expect(found.id).toBe(invoice._id.toString());
      expect(found.contractId).toBe(monthlyContract._id.toString());
    });

    it('should reject customer trying to view another customer invoice with 403', async () => {
      const { otherCustomer, monthlyContract } = await createTestFixtures();

      const invoice = await service.generateFirstPeriodInvoice(monthlyContract);

      await expect(
        service.getInvoiceById(
          invoice._id.toString(),
          otherCustomer._id.toString(),
          RoleEnum.CUSTOMER
        )
      ).rejects.toThrowError(AppError);
    });

    it('should allow staff from same facility to view invoice', async () => {
      const { staffFacility1, monthlyContract } = await createTestFixtures();

      const invoice = await service.generateFirstPeriodInvoice(monthlyContract);

      const found = await service.getInvoiceById(
        invoice._id.toString(),
        staffFacility1._id.toString(),
        RoleEnum.FACILITY_STAFF
      );

      expect(found).toBeDefined();
      expect(found.id).toBe(invoice._id.toString());
    });

    it('should reject staff from different facility trying to view invoice with 403', async () => {
      const { staffFacility2, monthlyContract } = await createTestFixtures();

      const invoice = await service.generateFirstPeriodInvoice(monthlyContract);

      await expect(
        service.getInvoiceById(
          invoice._id.toString(),
          staffFacility2._id.toString(),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrowError(AppError);
    });

    it('should allow SYSTEM_ADMIN to view any invoice', async () => {
      const { admin, monthlyContract } = await createTestFixtures();

      const invoice = await service.generateFirstPeriodInvoice(monthlyContract);

      const found = await service.getInvoiceById(
        invoice._id.toString(),
        admin._id.toString(),
        RoleEnum.SYSTEM_ADMIN
      );

      expect(found).toBeDefined();
      expect(found.id).toBe(invoice._id.toString());
    });
  });
});
