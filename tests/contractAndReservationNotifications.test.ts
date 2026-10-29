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
import {
  seedTestUsers,
  TEST_USERS,
  TEST_FACILITY_A_ID,
} from './helpers/auth.helper.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import { Incident } from '../src/modules/incident/incident.model.ts';
import { IncidentRepository } from '../src/modules/incident/incident.repository.ts';
import type { NotificationService } from '../src/modules/notification/notification.service.ts';
import '../src/modules/storageRack/storageRack.model.ts';
import '../src/modules/storageRack/rackTier.model.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import {
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { ReservationStatusEnum } from '../src/common/enums/reservation.enum.ts';
import {
  NotificationPriorityEnum,
  NotificationTypeEnum,
} from '../src/common/enums/notification.enum.ts';
import { addDays } from '../src/utils/date.util.ts';

const subDays = (d: Date, days: number) =>
  new Date(d.getTime() - days * 86400000);

describe('booking/T3.4 — Contract & Reservation Lifecycle Notifications', () => {
  let contractService: ContractService;
  let reservationService: ReservationService;
  let contractRepo: ContractRepository;
  let reservationRepo: ReservationRepository;
  let storageUnitRepo: StorageUnitRepository;
  let mockNotificationService: {
    sendNotification: ReturnType<typeof vi.fn>;
  };
  let unitTypeId: Types.ObjectId;
  let facilityOfferingId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    contractRepo = new ContractRepository(Contract);
    reservationRepo = new ReservationRepository(Reservation);
    storageUnitRepo = new StorageUnitRepository(StorageUnit);
    const amenityOfferingRepo = new FacilityAmenityOfferingRepository(
      FacilityAmenityOffering
    );
    const futoRepo = new FacilityUnitTypeOfferingRepository(
      FacilityUnitTypeOffering
    );
    const facilityRepo = new FacilityRepository(Facility);
    const userRepo = new UserRepository(User);
    const refundRepo = new RefundRequestRepository(RefundRequest);
    const refundService = new RefundRequestService(refundRepo);
    const customerInventoryRepo = new CustomerInventoryRepository(
      CustomerInventory
    );
    const incidentRepo = new IncidentRepository(Incident);

    mockNotificationService = {
      sendNotification: vi
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    contractService = new ContractService(
      contractRepo,
      reservationRepo,
      storageUnitRepo,
      amenityOfferingRepo,
      futoRepo,
      facilityRepo,
      userRepo,
      undefined,
      refundService,
      customerInventoryRepo,
      incidentRepo,
      undefined,
      mockNotificationService as unknown as NotificationService
    );

    reservationService = new ReservationService(
      reservationRepo,
      facilityRepo,
      futoRepo,
      amenityOfferingRepo,
      storageUnitRepo,
      userRepo,
      undefined,
      undefined,
      undefined,
      mockNotificationService as unknown as NotificationService,
      undefined,
      contractRepo,
      refundService,
      incidentRepo
    );

    // Setup Facility
    await Facility.create({
      _id: new Types.ObjectId(TEST_FACILITY_A_ID),
      name: 'Chi Nhanh Q1 HCM',
      code: 'FAC01',
      address: '123 Nguyen Hue',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
      managerId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
      operatingHours: {
        open: '08:00',
        close: '22:00',
      },
      timezone: 'Asia/Ho_Chi_Minh',
    });

    // Setup UnitType
    const unitType = await UnitType.create({
      name: 'Standard Locker',
      category: UnitTypeCategoryEnum.LOCKER,
      dimensions: { length: 1, width: 1, height: 1, unit: 'm' },
      area: 1,
      volume: 1,
      status: UnitTypeStatusEnum.ACTIVE,
    });
    unitTypeId = unitType._id as Types.ObjectId;

    // Setup Offering
    const offering = await FacilityUnitTypeOffering.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      pricePerUnit: 1200000,
      billingUnit: BillingUnitEnum.MONTH,
      status: 'active',
      pricingTiers: [
        { minDurationMonths: 1, maxDurationMonths: 12, discountPercentage: 0 },
      ],
      depositRule: { type: 'fixed', fixedAmount: 240000 },
    });
    facilityOfferingId = offering._id as Types.ObjectId;
  });

  it('notifies customer when a walk-in contract draft is created', async () => {
    const unit = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-NOTIF-01',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });

    const now = new Date();
    const contract = await contractService.createContract(
      {
        source: ContractSourceEnum.WALK_IN,
        facilityId: TEST_FACILITY_A_ID,
        customerId: TEST_USERS.customer1.id,
        storageUnitId: unit._id.toString(),
        facilityUnitTypeOfferingId: facilityOfferingId.toString(),
        billingUnit: BillingUnitEnum.MONTH,
        startDate: now.toISOString(),
        endDate: addDays(now, 30).toISOString(),
        rentalPrice: 1200000,
        depositAmount: 240000,
      },
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER
    );

    expect(contract).toBeDefined();
    expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: TEST_USERS.customer1.id,
        facilityId: TEST_FACILITY_A_ID,
        type: NotificationTypeEnum.CONTRACT,
        title: expect.stringContaining(contract.contractCode),
      })
    );
  });

  it('notifies facility manager when customer signs contract', async () => {
    const unit = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-NOTIF-02',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });

    const now = new Date();
    const created = await Contract.create({
      contractCode: 'CTR-NOTIF-02',
      source: ContractSourceEnum.WALK_IN,
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      storageUnitId: unit._id,
      facilityUnitTypeOfferingId: facilityOfferingId,
      billingUnit: BillingUnitEnum.MONTH,
      rentalDuration: 1,
      startDate: now,
      endDate: addDays(now, 30),
      depositAmount: 240000,
      depositPaidAt: now,
      firstPeriodPaidAt: now,
      rentalPrice: 1200000,
      totalPeriodicPrice: 1200000,
      status: ContractStatusEnum.DRAFT,
      deleted: false,
    });

    mockNotificationService.sendNotification.mockClear();

    await contractService.customerSignContract(
      created._id.toString(),
      TEST_USERS.customer1.id,
      RoleEnum.CUSTOMER,
      { signatureUrl: 'https://cdn.example.com/sig.png' }
    );

    expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: TEST_USERS.managerFacilityA.id,
        facilityId: TEST_FACILITY_A_ID,
        type: NotificationTypeEnum.CONTRACT,
        title: expect.stringContaining('Khách hàng đã ký hợp đồng'),
      })
    );
  });

  it('notifies customer when facility manager checks in and activates contract', async () => {
    const unit = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-NOTIF-03',
      floor: 1,
      status: StorageUnitStatusEnum.RESERVED,
    });

    const now = new Date();
    const created = await Contract.create({
      contractCode: 'CTR-NOTIF-03',
      source: ContractSourceEnum.WALK_IN,
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      storageUnitId: unit._id,
      facilityUnitTypeOfferingId: facilityOfferingId,
      billingUnit: BillingUnitEnum.MONTH,
      rentalDuration: 1,
      startDate: now,
      endDate: addDays(now, 30),
      depositAmount: 240000,
      depositPaidAt: now,
      firstPeriodPaidAt: now,
      rentalPrice: 1200000,
      totalPeriodicPrice: 1200000,
      status: ContractStatusEnum.DRAFT,
      customerSigned: true,
      customerSignedAt: now,
      deleted: false,
    });

    mockNotificationService.sendNotification.mockClear();

    await contractService.checkInContract(
      created._id.toString(),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        staffSignatureUrl: 'https://cdn.example.com/staff-sig.png',
        actualCheckInDate: now.toISOString(),
        signedContractFileUrls: ['https://cdn.example.com/signed-contract.pdf'],
      }
    );

    expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: TEST_USERS.customer1.id,
        facilityId: TEST_FACILITY_A_ID,
        type: NotificationTypeEnum.CONTRACT,
        title: expect.stringContaining('Nhận kho thành công'),
        priority: NotificationPriorityEnum.HIGH,
      })
    );
  });

  it('notifies customer and facility manager when contract becomes OVERDUE', async () => {
    const unit = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-NOTIF-04',
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });

    const expiredDate = subDays(new Date(), 2);
    const contract = await Contract.create({
      contractCode: 'CTR-NOTIF-04',
      source: ContractSourceEnum.WALK_IN,
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      storageUnitId: unit._id,
      facilityUnitTypeOfferingId: facilityOfferingId,
      billingUnit: BillingUnitEnum.MONTH,
      rentalDuration: 1,
      startDate: subDays(expiredDate, 30),
      endDate: expiredDate,
      depositAmount: 240000,
      rentalPrice: 1200000,
      totalPeriodicPrice: 1200000,
      status: ContractStatusEnum.ACTIVE,
      deleted: false,
    });

    mockNotificationService.sendNotification.mockClear();

    const ok = await contractService.processSingleOverdueContract(
      contract._id.toString(),
      new Date()
    );

    expect(ok).toBe(true);
    // Should notify both customer and facility manager
    expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: TEST_USERS.customer1.id,
        type: NotificationTypeEnum.CONTRACT,
        title: expect.stringContaining('đã quá hạn'),
      })
    );
    expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: TEST_USERS.managerFacilityA.id,
        type: NotificationTypeEnum.CONTRACT,
        title: expect.stringContaining('quá hạn'),
      })
    );
  });

  it('ReservationService processScheduleReminders sends T-1, unconfirmed alerts, and grace expiry warnings', async () => {
    const now = new Date();
    const tomorrow = addDays(now, 1);

    const unit1 = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-RES-NOTIF-01',
      floor: 1,
      status: StorageUnitStatusEnum.RESERVED,
    });
    const unit2 = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-RES-NOTIF-02',
      floor: 1,
      status: StorageUnitStatusEnum.RESERVED,
    });
    const unit3 = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-RES-NOTIF-03',
      floor: 1,
      status: StorageUnitStatusEnum.RESERVED,
    });

    // 1. Confirmed reservation for tomorrow (T-1)
    await Reservation.create({
      reservationCode: 'RES-T1-01',
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityUnitTypeOfferingId: facilityOfferingId,
      storageUnitId: unit1._id,
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1200000,
      totalAmount: 1200000,
      depositAmount: 240000,
      startDate: tomorrow,
      checkInDate: tomorrow,
      checkInTimeSlot: '09:00 - 11:00',
      status: ReservationStatusEnum.CONFIRMED,
      deleted: false,
    });

    // 2. Unconfirmed paid reservation for tomorrow
    await Reservation.create({
      reservationCode: 'RES-UNCONF-01',
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityUnitTypeOfferingId: facilityOfferingId,
      storageUnitId: unit2._id,
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1200000,
      totalAmount: 1200000,
      depositAmount: 240000,
      startDate: tomorrow,
      checkInDate: tomorrow,
      checkInTimeSlot: '14:00 - 16:00',
      status: ReservationStatusEnum.PAYMENT_SUCCESSFUL,
      deleted: false,
    });

    // 3. Grace expiring soon (within 1 hour)
    await Reservation.create({
      reservationCode: 'RES-GRACE-01',
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityUnitTypeOfferingId: facilityOfferingId,
      storageUnitId: unit3._id,
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1200000,
      totalAmount: 1200000,
      depositAmount: 240000,
      startDate: subDays(now, 1),
      checkInDate: subDays(now, 1),
      checkInTimeSlot: '09:00 - 11:00',
      status: ReservationStatusEnum.OVERDUE,
      graceExpiresAt: new Date(now.getTime() + 45 * 60 * 1000), // 45 mins from now
      arrivedAt: null,
      deleted: false,
    });

    mockNotificationService.sendNotification.mockClear();

    const summary = await reservationService.processScheduleReminders(now);
    await new Promise((r) => setTimeout(r, 100));

    expect(summary.remindedCheckInCount).toBe(1);
    expect(summary.remindedUnconfirmedCount).toBe(1);
    expect(summary.remindedGraceExpiringCount).toBe(1);

    expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: TEST_USERS.customer1.id,
        type: NotificationTypeEnum.RESERVATION,
        title: expect.stringContaining('Nhắc lịch nhận kho ngày mai (T-1)'),
      })
    );
    expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: TEST_USERS.managerFacilityA.id,
        type: NotificationTypeEnum.RESERVATION,
        title: expect.stringContaining('Cảnh báo đơn đặt chỗ chưa xác nhận'),
      })
    );
    expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: TEST_USERS.customer1.id,
        type: NotificationTypeEnum.RESERVATION,
        title: expect.stringContaining('Cảnh báo sắp hết thời gian ân hạn'),
      })
    );
  });
});
