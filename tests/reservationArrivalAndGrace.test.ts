import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
  TEST_FACILITY_B_ID,
} from './helpers/auth.helper.ts';
import {
  Reservation,
  type IReservation,
} from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { Amenity } from '../src/modules/amenity/amenity.model.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import { Incident } from '../src/modules/incident/incident.model.ts';
import { IncidentRepository } from '../src/modules/incident/incident.repository.ts';
import '../src/modules/storageRack/storageRack.model.ts';
import '../src/modules/storageRack/rackTier.model.ts';
import {
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import {
  ReservationStatusEnum,
  RefundStatusEnum,
} from '../src/common/enums/reservation.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  AmenityTypeEnum,
  AmenityStatusEnum,
} from '../src/common/enums/amenity.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { AppError } from '../src/common/errors/appError.error.ts';
import { startOfDayVN } from '../src/utils/date.util.ts';

const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86400000);
const subDays = (d: Date, days: number) =>
  new Date(d.getTime() - days * 86400000);

describe('T2.5 — arrivedAt and Check-in Grace Period Verification', () => {
  let reservationService: ReservationService;
  let contractService: ContractService;
  let facilityUnitTypeOfferingId: Types.ObjectId;
  let storageUnitId: Types.ObjectId;
  let amenityOfferingId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    const facilityRepo = new FacilityRepository(Facility);
    const userRepo = new UserRepository(User);
    const suRepo = new StorageUnitRepository(StorageUnit);
    const fatoRepo = new FacilityAmenityOfferingRepository(
      FacilityAmenityOffering
    );
    const futoRepo = new FacilityUnitTypeOfferingRepository(
      FacilityUnitTypeOffering
    );
    const resRepo = new ReservationRepository(Reservation);
    const contractRepo = new ContractRepository(Contract);
    const refundRepo = new RefundRequestRepository(RefundRequest);
    const refundService = new RefundRequestService(refundRepo);
    const incidentRepo = new IncidentRepository(Incident);
    const inventoryRepo = new CustomerInventoryRepository(CustomerInventory);

    reservationService = new ReservationService(
      resRepo,
      facilityRepo,
      futoRepo,
      fatoRepo,
      suRepo,
      userRepo,
      undefined, // paymentRepo
      undefined, // facilityTimeSlotRepo
      undefined, // auditLogService
      undefined, // notificationService
      undefined, // reservationQueue
      contractRepo,
      refundService,
      incidentRepo
    );

    contractService = new ContractService(
      contractRepo,
      resRepo,
      suRepo,
      fatoRepo,
      futoRepo,
      facilityRepo,
      userRepo,
      undefined,
      refundService,
      inventoryRepo,
      incidentRepo
    );

    await Facility.create({
      _id: new Types.ObjectId(TEST_FACILITY_A_ID),
      name: 'Facility A Test',
      city: 'Hanoi',
      address: '123 Test St',
      status: 'active',
      operatingHours: { open: '08:00', close: '20:00' },
      managerId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
    });

    const unitType = await UnitType.create({
      name: 'Standard Unit',
      category: UnitTypeCategoryEnum.STORAGE,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { length: 2, width: 2, height: 2 },
      area: 4,
      volume: 8,
    });

    const futo = await FacilityUnitTypeOffering.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId: unitType._id,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 1000000,
      depositMultiplier: 1,
      minRentalDays: 30,
      status: 'active',
    });
    facilityUnitTypeOfferingId = futo._id;

    const su = await StorageUnit.create({
      unitNumber: 'U-801',
      floor: 1,
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId: unitType._id,
      status: StorageUnitStatusEnum.RESERVED,
    });
    storageUnitId = su._id;

    const amenity = await Amenity.create({
      name: 'Shelving Unit',
      type: AmenityTypeEnum.STORAGE_RACK,
      status: AmenityStatusEnum.ACTIVE,
    });

    const fato = await FacilityAmenityOffering.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      amenityId: amenity._id,
      pricePerUnit: 50000,
      billingUnit: BillingUnitEnum.MONTH,
      totalQuantity: 10,
      inUseQuantity: 1,
      status: 'active',
    });
    amenityOfferingId = fato._id;
  });

  async function createFixtureReservation(
    overrides: Partial<IReservation> = {}
  ) {
    const defaultCheckIn = addDays(startOfDayVN(), 1);
    const doc = await Reservation.create({
      reservationCode: `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      facilityUnitTypeOfferingId,
      storageUnitId,
      startDate: defaultCheckIn,
      checkInDate: defaultCheckIn,
      checkInTimeSlot: '14:00 - 16:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1000000,
      depositAmount: 1000000,
      totalAmount: 1050000,
      status: ReservationStatusEnum.CONFIRMED,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      policySnapshot: {
        freeCancelHours: 24,
        forfeitPercent: 100,
        noShowGraceHours: 24,
        cancellationMode: 'slot_start',
      },
      amenities: [
        {
          facilityAmenityOfferingId: amenityOfferingId,
          amenityId: new Types.ObjectId(),
          name: 'Shelving Unit',
          quantity: 1,
          pricePerUnit: 50000,
          billingUnit: BillingUnitEnum.MONTH,
          totalPrice: 50000,
        },
      ],
      ...overrides,
    });
    return doc;
  }

  // 1. Mark customer arrived successfully
  it('1. should allow staff of the same facility to mark customer arrival', async () => {
    const res = await createFixtureReservation();

    const caller = {
      userId: TEST_USERS.staffFacilityA.id,
      role: TEST_USERS.staffFacilityA.role,
      facilityId: TEST_FACILITY_A_ID,
    };

    const result = await reservationService.markCustomerArrived(
      res._id.toString(),
      caller
    );

    expect(result.arrivedAt).toBeTruthy();
    expect(result.arrivedBy).toBeDefined();

    const dbRes = await Reservation.findById(res._id);
    expect(dbRes?.arrivedAt).toBeInstanceOf(Date);
    expect(String(dbRes?.arrivedBy)).toBe(TEST_USERS.staffFacilityA.id);
  });

  // 2. Reject repeated arrival marking (idempotency / duplicate check)
  it('2. should reject marking arrival when customer has already been marked as arrived', async () => {
    const res = await createFixtureReservation({
      arrivedAt: new Date(),
      arrivedBy: new Types.ObjectId(TEST_USERS.staffFacilityA.id),
    });

    const caller = {
      userId: TEST_USERS.staffFacilityA.id,
      role: TEST_USERS.staffFacilityA.role,
      facilityId: TEST_FACILITY_A_ID,
    };

    await expect(
      reservationService.markCustomerArrived(res._id.toString(), caller)
    ).rejects.toThrow(new AppError(400, MESSAGE_CODE.MESSAGE_CODE_326));
  });

  // 3. Mark arrived RBAC: customer and different facility staff forbidden
  it('3. should enforce RBAC: customer and cross-facility staff cannot mark arrival', async () => {
    const res = await createFixtureReservation();

    // Customer
    await expect(
      reservationService.markCustomerArrived(res._id.toString(), {
        userId: TEST_USERS.customer1.id,
        role: TEST_USERS.customer1.role,
      })
    ).rejects.toThrow(new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103));

    // Staff from facility B
    await expect(
      reservationService.markCustomerArrived(res._id.toString(), {
        userId: TEST_USERS.staffFacilityB.id,
        role: TEST_USERS.staffFacilityB.role,
        facilityId: TEST_FACILITY_B_ID,
      })
    ).rejects.toThrow(
      new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility'])
    );
  });

  // 4. Extend grace period successfully by Manager
  it('4. should allow facility manager to extend grace period with reason', async () => {
    const res = await createFixtureReservation();

    const caller = {
      userId: TEST_USERS.managerFacilityA.id,
      role: TEST_USERS.managerFacilityA.role,
      facilityId: TEST_FACILITY_A_ID,
    };

    const result = await reservationService.extendGracePeriod(
      res._id.toString(),
      caller,
      {
        extensionHours: 24,
        reason: 'Khách hàng bị trễ chuyến bay do bão, xin gia hạn thêm 24 giờ',
      }
    );

    expect(result.graceExpiresAt).toBeTruthy();
    expect(result.graceExtendedAt).toBeTruthy();
    expect(result.graceExtensionReason).toBe(
      'Khách hàng bị trễ chuyến bay do bão, xin gia hạn thêm 24 giờ'
    );

    const dbRes = await Reservation.findById(res._id);
    expect(dbRes?.graceExpiresAt).toBeInstanceOf(Date);
    expect(String(dbRes?.graceExtendedBy)).toBe(TEST_USERS.managerFacilityA.id);
  });

  // 5. Extend grace period RBAC: staff cannot extend grace (manager+ only)
  it('5. should enforce RBAC: facility staff cannot extend grace period', async () => {
    const res = await createFixtureReservation();

    // Staff from facility A
    await expect(
      reservationService.extendGracePeriod(
        res._id.toString(),
        {
          userId: TEST_USERS.staffFacilityA.id,
          role: TEST_USERS.staffFacilityA.role,
          facilityId: TEST_FACILITY_A_ID,
        },
        { extensionHours: 12, reason: 'Staff trying to extend' }
      )
    ).rejects.toThrow(new AppError(403, MESSAGE_CODE.MESSAGE_CODE_120));

    // Manager from facility B
    await expect(
      reservationService.extendGracePeriod(
        res._id.toString(),
        {
          userId: TEST_USERS.managerFacilityB.id,
          role: TEST_USERS.managerFacilityB.role,
          facilityId: TEST_FACILITY_B_ID,
        },
        { extensionHours: 12, reason: 'Manager B trying to extend' }
      )
    ).rejects.toThrow(
      new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility'])
    );
  });

  // 6. Invalid status for mark-arrived
  it('6. should reject mark-arrived if reservation is not in CONFIRMED or OVERDUE status', async () => {
    const res = await createFixtureReservation({
      status: ReservationStatusEnum.PENDING_PAYMENT,
    });

    const caller = {
      userId: TEST_USERS.staffFacilityA.id,
      role: TEST_USERS.staffFacilityA.role,
      facilityId: TEST_FACILITY_A_ID,
    };

    await expect(
      reservationService.markCustomerArrived(res._id.toString(), caller)
    ).rejects.toThrow(new AppError(400, MESSAGE_CODE.MESSAGE_CODE_325));
  });

  // 7. Invalid status for extend-grace
  it('7. should reject extend-grace if reservation is CANCELLED or COMPLETED', async () => {
    const res = await createFixtureReservation({
      status: ReservationStatusEnum.CANCELLED,
    });

    const caller = {
      userId: TEST_USERS.managerFacilityA.id,
      role: TEST_USERS.managerFacilityA.role,
      facilityId: TEST_FACILITY_A_ID,
    };

    await expect(
      reservationService.extendGracePeriod(res._id.toString(), caller, {
        extensionHours: 10,
        reason: 'Attempting to extend cancelled reservation',
      })
    ).rejects.toThrow(new AppError(400, MESSAGE_CODE.MESSAGE_CODE_327));
  });

  // 8. No-show paused when customer has arrived
  it('8. should NOT cancel overdue reservation as no-show if customer has arrived (arrivedAt is set)', async () => {
    const pastCheckIn = subDays(startOfDayVN(), 3);
    const pastGrace = subDays(new Date(), 1);

    const res = await createFixtureReservation({
      checkInDate: pastCheckIn,
      status: ReservationStatusEnum.OVERDUE,
      graceExpiresAt: pastGrace,
      arrivedAt: new Date(), // Customer arrived!
      arrivedBy: new Types.ObjectId(TEST_USERS.staffFacilityA.id),
    });

    const result = await reservationService.processOverdueReservations();

    expect(result.noShowCount).toBe(0);

    const checkRes = await Reservation.findById(res._id);
    expect(checkRes?.status).toBe(ReservationStatusEnum.OVERDUE);

    const unit = await StorageUnit.findById(storageUnitId);
    expect(unit?.status).toBe(StorageUnitStatusEnum.RESERVED);
  });

  // 9. Preserve manager grace extension during step 1 of processOverdueReservations
  it('9. should preserve manager extended graceExpiresAt when transitioning CONFIRMED to OVERDUE', async () => {
    const yesterday = subDays(startOfDayVN(), 1);
    const extendedGrace = addDays(new Date(), 3);

    const res = await createFixtureReservation({
      checkInDate: yesterday,
      status: ReservationStatusEnum.CONFIRMED,
      graceExpiresAt: extendedGrace,
      graceExtendedAt: new Date(),
      graceExtendedBy: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
      graceExtensionReason: 'Khách báo đến muộn 3 ngày',
    });

    const result = await reservationService.processOverdueReservations();
    expect(result.overdueCount).toBe(1);

    const checkRes = await Reservation.findById(res._id);
    expect(checkRes?.status).toBe(ReservationStatusEnum.OVERDUE);
    expect(checkRes?.graceExpiresAt?.getTime()).toBe(extendedGrace.getTime());
  });

  // 10. Gate createContract: cannot create before check-in date when arrivedAt is null
  it('10. should reject contract creation before checkInDate if customer has NOT arrived', async () => {
    const futureDate = addDays(startOfDayVN(), 5);
    const res = await createFixtureReservation({
      checkInDate: futureDate,
      startDate: futureDate,
      status: ReservationStatusEnum.CONFIRMED,
      arrivedAt: null,
    });

    await expect(
      contractService.createContract(
        {
          reservationId: res._id.toString(),
          source: ContractSourceEnum.RESERVATION,
          rentalDuration: 1,
          billingUnit: BillingUnitEnum.MONTH,
        },
        TEST_USERS.staffFacilityA.id,
        TEST_USERS.staffFacilityA.role
      )
    ).rejects.toThrow(new AppError(400, MESSAGE_CODE.MESSAGE_CODE_423));
  });

  // 11. Gate createContract: allow early creation when customer HAS arrived
  it('11. should allow early contract creation before checkInDate if customer HAS arrived', async () => {
    const futureDate = addDays(startOfDayVN(), 5);
    const res = await createFixtureReservation({
      checkInDate: futureDate,
      startDate: futureDate,
      status: ReservationStatusEnum.CONFIRMED,
      arrivedAt: new Date(),
      arrivedBy: new Types.ObjectId(TEST_USERS.staffFacilityA.id),
    });

    const contract = await contractService.createContract(
      {
        reservationId: res._id.toString(),
        source: ContractSourceEnum.RESERVATION,
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
      },
      TEST_USERS.staffFacilityA.id,
      TEST_USERS.staffFacilityA.role
    );

    expect(contract).toBeDefined();
    expect(contract.status).toBe(ContractStatusEnum.DRAFT);
  });

  // 12. Gate createContract: reject when past check-in deadline + signing buffer if not arrived
  it('12. should reject contract creation when past check-in deadline and customer has NOT arrived', async () => {
    const pastDate = subDays(startOfDayVN(), 5);
    const pastGrace = subDays(new Date(), 4);

    const res = await createFixtureReservation({
      checkInDate: pastDate,
      startDate: pastDate,
      status: ReservationStatusEnum.OVERDUE,
      graceExpiresAt: pastGrace,
      arrivedAt: null,
    });

    await expect(
      contractService.createContract(
        {
          reservationId: res._id.toString(),
          source: ContractSourceEnum.RESERVATION,
          rentalDuration: 1,
          billingUnit: BillingUnitEnum.MONTH,
        },
        TEST_USERS.staffFacilityA.id,
        TEST_USERS.staffFacilityA.role
      )
    ).rejects.toThrow(new AppError(400, MESSAGE_CODE.MESSAGE_CODE_424));
  });
});
