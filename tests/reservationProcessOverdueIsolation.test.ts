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
import {
  Reservation,
  type IReservation,
} from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
import { ReservationController } from '../src/modules/reservation/reservation.controller.ts';
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
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { AppError } from '../src/common/errors/appError.error.ts';
import { startOfDayVN } from '../src/utils/date.util.ts';
import type { Request as ExpressRequest } from 'express';

const subDays = (d: Date, days: number) =>
  new Date(d.getTime() - days * 86400000);

describe('booking/T3.1 — process-overdue Per-record Isolation and Batching', () => {
  let reservationService: ReservationService;
  let reservationController: ReservationController;
  let storageUnitRepo: StorageUnitRepository;
  let amenityOfferingRepo: FacilityAmenityOfferingRepository;
  let facilityUnitTypeOfferingId: Types.ObjectId;
  let unitTypeId: Types.ObjectId;
  let storageUnitId: Types.ObjectId;
  let amenityOfferingId: Types.ObjectId;
  let amenityId: Types.ObjectId;

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
    storageUnitRepo = new StorageUnitRepository(StorageUnit);
    amenityOfferingRepo = new FacilityAmenityOfferingRepository(
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
      amenityOfferingRepo,
      storageUnitRepo,
      userRepo,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      contractRepo,
      refundService,
      incidentRepo,
      undefined,
      inventoryRepo
    );

    reservationController = new ReservationController(reservationService);

    // Setup base unit type and storage unit
    const unitType = await UnitType.create({
      name: 'Small Storage Box',
      category: UnitTypeCategoryEnum.LOCKER,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { length: 1, width: 1, height: 1 },
      area: 1,
      volume: 1,
    });
    unitTypeId = unitType._id as Types.ObjectId;

    const futo = await FacilityUnitTypeOffering.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId: unitType._id,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 500000,
      depositMultiplier: 1,
      minRentalDays: 30,
      status: 'active',
    });
    facilityUnitTypeOfferingId = futo._id as Types.ObjectId;

    const unit = await StorageUnit.create({
      unitNumber: 'T31-BOX-01',
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId: unitType._id,
      status: StorageUnitStatusEnum.RESERVED,
    });
    storageUnitId = unit._id as Types.ObjectId;

    const amenity = await Amenity.create({
      name: 'Pallet Jack T31',
      type: AmenityTypeEnum.EQUIPMENT,
      status: AmenityStatusEnum.ACTIVE,
    });
    amenityId = amenity._id as Types.ObjectId;

    const fato = await FacilityAmenityOffering.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      amenityId: amenity._id,
      pricePerUnit: 20000,
      pricingType: 'per_rental',
      totalQuantity: 10,
      inUseQuantity: 1,
      status: 'active',
    });
    amenityOfferingId = fato._id as Types.ObjectId;
  });

  const createFixtureReservation = async (
    overrides: Partial<IReservation> = {}
  ) => {
    let assignedUnitId = overrides.storageUnitId;
    if (!assignedUnitId) {
      const u = await StorageUnit.create({
        unitNumber: `T31-BOX-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        unitTypeId,
        status: StorageUnitStatusEnum.RESERVED,
      });
      assignedUnitId = u._id as Types.ObjectId;
    }

    return Reservation.create({
      reservationCode: `RES-T31-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      facilityUnitTypeOfferingId,
      storageUnitId: assignedUnitId,
      status: ReservationStatusEnum.CONFIRMED,
      basePrice: 500000,
      totalAmount: 520000,
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      checkInTimeSlot: '14:00 - 16:00',
      depositAmount: 500000,
      refundAmount: 0,
      forfeitedAmount: 0,
      refundStatus: RefundStatusEnum.NONE,
      checkInDate: subDays(startOfDayVN(), 2),
      startDate: subDays(startOfDayVN(), 2),
      durationDays: 30,
      rentalPrice: 500000,
      termsAccepted: true,
      policySnapshot: {
        freeCancelHours: 24,
        forfeitPercent: 100,
        noShowGraceHours: 24,
        cancellationMode: 'slot_start',
      },
      amenities: [
        {
          amenityId,
          name: 'Pallet Jack T31',
          facilityAmenityOfferingId: amenityOfferingId,
          quantity: 1,
          pricePerUnit: 20000,
          totalPrice: 20000,
          billingUnit: BillingUnitEnum.MONTH,
        },
      ],
      ...overrides,
    });
  };

  // 1. Fault Isolation: One failing reservation does not block or rollback others
  it('1. should continue processing remaining overdue reservations when one reservation fails (Fault Isolation)', async () => {
    const res1 = await createFixtureReservation({
      reservationCode: 'RES-T31-OK-1',
      checkInDate: subDays(startOfDayVN(), 1),
    });
    const res2 = await createFixtureReservation({
      reservationCode: 'RES-T31-FAIL-2',
      checkInDate: subDays(startOfDayVN(), 1),
    });
    const res3 = await createFixtureReservation({
      reservationCode: 'RES-T31-OK-3',
      checkInDate: subDays(startOfDayVN(), 1),
    });

    // Mock an error specifically when processing res2 in processSingleOverdueCheckIn
    const originalMethod = (
      reservationService as unknown as {
        processSingleOverdueCheckIn: (
          id: string,
          now: Date,
          config: unknown
        ) => Promise<boolean>;
      }
    ).processSingleOverdueCheckIn;

    vi.spyOn(
      reservationService as unknown as {
        processSingleOverdueCheckIn: (
          id: string,
          now: Date,
          config: unknown
        ) => Promise<boolean>;
      },
      'processSingleOverdueCheckIn'
    ).mockImplementation(async (id: string, now: Date, config: unknown) => {
      if (id === res2._id.toString()) {
        throw new Error('Simulated DB transient failure for res2');
      }
      return originalMethod.call(reservationService, id, now, config);
    });

    const result = await reservationService.processOverdueReservations();

    // res1 and res3 must succeed!
    expect(result.overdueCount).toBe(2);

    const check1 = await Reservation.findById(res1._id);
    const check2 = await Reservation.findById(res2._id);
    const check3 = await Reservation.findById(res3._id);

    expect(check1?.status).toBe(ReservationStatusEnum.OVERDUE);
    expect(check3?.status).toBe(ReservationStatusEnum.OVERDUE);
    // res2 rolled back and remained CONFIRMED
    expect(check2?.status).toBe(ReservationStatusEnum.CONFIRMED);
  });

  // 2. Concurrency: Two workers processing the same no-show reservation must not double-release hold
  it('2. should prevent race condition and double-release when two processes process no-show concurrently', async () => {
    const noShowRes = await createFixtureReservation({
      reservationCode: 'RES-T31-NOSHOW',
      storageUnitId,
      status: ReservationStatusEnum.OVERDUE,
      graceExpiresAt: subDays(new Date(), 1), // Grace expired yesterday
      arrivedAt: null,
    });

    // Both processes run processOverdueReservations at the same time
    const [resultA, resultB] = await Promise.all([
      reservationService.processOverdueReservations(),
      reservationService.processOverdueReservations(),
    ]);

    // Combined noShowCount must be exactly 1
    const totalNoShow = resultA.noShowCount + resultB.noShowCount;
    expect(totalNoShow).toBe(1);

    // Reservation should be CANCELLED
    const updatedRes = await Reservation.findById(noShowRes._id);
    expect(updatedRes?.status).toBe(ReservationStatusEnum.CANCELLED);

    // Storage unit must be AVAILABLE
    const unit = await StorageUnit.findById(storageUnitId);
    expect(unit?.status).toBe(StorageUnitStatusEnum.AVAILABLE);

    // Amenity inUseQuantity must be 0 (decremented exactly once from 1 to 0, not negative!)
    const fato = await FacilityAmenityOffering.findById(amenityOfferingId);
    expect(fato?.inUseQuantity).toBe(0);
  });

  // 3. Concurrency on Holding Expiration: expireSingleReservation must not double-release
  it('3. should prevent double-release when two processes call expireSingleReservation concurrently', async () => {
    const pendingRes = await createFixtureReservation({
      reservationCode: 'RES-T31-PENDING-EXP',
      storageUnitId,
      status: ReservationStatusEnum.PENDING_PAYMENT,
      expiresAt: subDays(new Date(), 1),
    });

    const [expA, expB] = await Promise.all([
      reservationService.expireSingleReservation(pendingRes._id.toString()),
      reservationService.expireSingleReservation(pendingRes._id.toString()),
    ]);

    // Exactly one must return true and the other false
    const successCount = (expA ? 1 : 0) + (expB ? 1 : 0);
    expect(successCount).toBe(1);

    const updatedRes = await Reservation.findById(pendingRes._id);
    expect(updatedRes?.status).toBe(ReservationStatusEnum.EXPIRED);

    // Amenity inUseQuantity must be 0
    const fato = await FacilityAmenityOffering.findById(amenityOfferingId);
    expect(fato?.inUseQuantity).toBe(0);
  });

  // 4. Batch Query Limit: Respects batchSize option
  it('4. should respect batchSize/limit when scanning overdue check-ins', async () => {
    // Create 4 overdue confirmed reservations
    await createFixtureReservation({ reservationCode: 'RES-T31-B-1' });
    await createFixtureReservation({ reservationCode: 'RES-T31-B-2' });
    await createFixtureReservation({ reservationCode: 'RES-T31-B-3' });
    await createFixtureReservation({ reservationCode: 'RES-T31-B-4' });

    // Process with batchSize = 2
    const firstBatch = await reservationService.processOverdueReservations({
      batchSize: 2,
    });
    expect(firstBatch.overdueCount).toBe(2);

    // Next batch processes the remaining 2
    const secondBatch = await reservationService.processOverdueReservations({
      batchSize: 2,
    });
    expect(secondBatch.overdueCount).toBe(2);

    // Third batch finds 0
    const thirdBatch = await reservationService.processOverdueReservations({
      batchSize: 2,
    });
    expect(thirdBatch.overdueCount).toBe(0);
  });

  // 5. Role Authorization on POST /reservations/process-overdue
  it('5. should enforce role authorization on POST /reservations/process-overdue (only OPS/ADMIN allowed)', async () => {
    const makeReq = (user: { _id: string; role: string }) =>
      ({
        user,
        headers: {},
      }) as unknown as ExpressRequest;

    // Customer -> 403
    await expect(
      reservationController.processOverdueReservations(
        makeReq({ _id: TEST_USERS.customer1.id, role: RoleEnum.CUSTOMER })
      )
    ).rejects.toThrow(new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103));

    // Facility Staff -> 403
    await expect(
      reservationController.processOverdueReservations(
        makeReq({
          _id: TEST_USERS.staffFacilityA.id,
          role: RoleEnum.FACILITY_STAFF,
        })
      )
    ).rejects.toThrow(new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103));

    // Facility Manager -> 403 (since process-overdue scans entire system)
    await expect(
      reservationController.processOverdueReservations(
        makeReq({
          _id: TEST_USERS.managerFacilityA.id,
          role: RoleEnum.FACILITY_MANAGER,
        })
      )
    ).rejects.toThrow(new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103));

    // Business Ops Manager -> 200
    const opsResult = await reservationController.processOverdueReservations(
      makeReq({
        _id: TEST_USERS.opsManager.id,
        role: RoleEnum.BUSINESS_OPS_MANAGER,
      })
    );
    expect(opsResult.success).toBe(true);
    expect(opsResult.statusCode).toBe(200);

    // System Admin -> 200
    const adminResult = await reservationController.processOverdueReservations(
      makeReq({ _id: TEST_USERS.systemAdmin.id, role: RoleEnum.SYSTEM_ADMIN })
    );
    expect(adminResult.success).toBe(true);
    expect(adminResult.statusCode).toBe(200);
  });
});
