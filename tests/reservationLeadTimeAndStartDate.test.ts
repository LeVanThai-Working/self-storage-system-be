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
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Amenity } from '../src/modules/amenity/amenity.model.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import { Incident } from '../src/modules/incident/incident.model.ts';
import { IncidentRepository } from '../src/modules/incident/incident.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import '../src/modules/storageRack/storageRack.model.ts';
import '../src/modules/storageRack/rackTier.model.ts';
import {
  ContractSourceEnum,
  ContractStatusEnum,
  ContractDepositStatusEnum,
} from '../src/common/enums/contract.enum.ts';
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

const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86400000);

describe('T2.6 & T2.7 — Same-day Lead Time, Forfeit Warning, startDate Limit, and Signature Re-signing', () => {
  let reservationService: ReservationService;
  let contractService: ContractService;
  let facilityUnitTypeOfferingId: Types.ObjectId;
  let storageUnitId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await teardownTestDB();
  });

  beforeEach(async () => {
    vi.useFakeTimers();
    // Fix current time to 10:00 AM VN time on 2026-11-01
    vi.setSystemTime(new Date('2026-11-01T10:00:00.000+07:00'));

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
      undefined, // auditLogService
      refundService,
      inventoryRepo,
      incidentRepo
    );

    await Facility.create({
      _id: new Types.ObjectId(TEST_FACILITY_A_ID),
      name: 'Facility A Test',
      city: 'Hanoi',
      address: '123 Facility A Road',
      status: 'active',
      operatingHours: { open: '08:00', close: '20:00' },
      location: { type: 'Point', coordinates: [105.85, 21.02] },
    });

    const unitType = await UnitType.create({
      name: 'Standard Unit Type',
      category: UnitTypeCategoryEnum.CLIMATE_CONTROLLED,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { length: 2, width: 2, height: 2.5 },
      area: 4,
      volume: 10,
    });

    const futo = await FacilityUnitTypeOffering.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId: unitType._id,
      name: 'Standard Unit Type',
      category: UnitTypeCategoryEnum.CLIMATE_CONTROLLED,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { length: 2, width: 2, height: 2.5 },
      area: 4,
      volume: 10,
      pricePerUnit: 1_000_000,
      billingUnit: BillingUnitEnum.MONTH,
      depositMultiplier: 1,
      minRentalDays: 30,
    });
    facilityUnitTypeOfferingId = futo._id;

    const su = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId: unitType._id,
      unitNumber: 'A-101',
      status: StorageUnitStatusEnum.AVAILABLE,
      floor: 1,
      zone: 'Zone A',
    });
    storageUnitId = su._id;

    const amenity = await Amenity.create({
      name: 'Pallet Jack',
      type: AmenityTypeEnum.EQUIPMENT,
      status: AmenityStatusEnum.ACTIVE,
    });

    await FacilityAmenityOffering.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      amenityId: amenity._id,
      pricePerUnit: 50_000,
      billingUnit: BillingUnitEnum.MONTH,
      totalQuantity: 5,
      inUseQuantity: 0,
      status: 'active',
    });
  });

  // ==========================================
  // T2.6: Same-day Lead Time & Forfeit Warning
  // ==========================================

  it('1. should reject same-day booking if check-in slot start is less than leadMinutes (120m) from now', async () => {
    // Current time is 10:00 AM VN. Slot 11:00 starts in 60 min (< 120 min lead time)
    const today = new Date('2026-11-01T10:00:00.000+07:00');

    try {
      await reservationService.createReservation(TEST_USERS.customer1.id, {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: String(storageUnitId),
        facilityUnitTypeOfferingId: String(facilityUnitTypeOfferingId),
        checkInDate: today.toISOString(),
        checkInTimeSlot: '11:00 - 13:00',
        rentalDuration: 30,
        termsAccepted: true,
      });
      expect.unreachable('Should have thrown AppError for lead time violation');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_328);
    }
  });

  it('2. should allow same-day booking if check-in slot starts >= leadMinutes (120m) from now', async () => {
    // Current time is 10:00 AM VN. Slot 13:00 starts in 180 min (>= 120 min lead time)
    const today = new Date('2026-11-01T10:00:00.000+07:00');

    const result = await reservationService.createReservation(
      TEST_USERS.customer1.id,
      {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: String(storageUnitId),
        facilityUnitTypeOfferingId: String(facilityUnitTypeOfferingId),
        checkInDate: today.toISOString(),
        checkInTimeSlot: '13:00 - 15:00',
        rentalDuration: 30,
        termsAccepted: true,
      }
    );

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.checkInTimeSlot).toBe('13:00 - 15:00');
  });

  it('3. should allow booking on future days without sameDayLeadMinutes restriction', async () => {
    const futureDate = new Date('2026-11-03T10:00:00.000+07:00');
    // Early morning slot on future date
    const slot = '08:00 - 10:00';

    const result = await reservationService.createReservation(
      TEST_USERS.customer1.id,
      {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: String(storageUnitId),
        facilityUnitTypeOfferingId: String(facilityUnitTypeOfferingId),
        checkInDate: futureDate.toISOString(),
        checkInTimeSlot: slot,
        rentalDuration: 30,
        termsAccepted: true,
      }
    );

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it('4. should flag immediateForfeitWarning = true when reservation is booked within 24h of check-in', async () => {
    // Today 14:00 (satisfies 120m lead time, but < 24h before check-in)
    const today = new Date('2026-11-01T10:00:00.000+07:00');

    const result = await reservationService.createReservation(
      TEST_USERS.customer1.id,
      {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: String(storageUnitId),
        facilityUnitTypeOfferingId: String(facilityUnitTypeOfferingId),
        checkInDate: today.toISOString(),
        checkInTimeSlot: '14:00 - 16:00',
        rentalDuration: 30,
        termsAccepted: true,
      }
    );

    expect(result.immediateForfeitWarning).toBe(true);

    // Verify stored in DB
    const resDoc = await Reservation.findById(result.id);
    expect(resDoc?.immediateForfeitWarning).toBe(true);
  });

  it('5. should flag immediateForfeitWarning = false when reservation is booked > 24h before check-in', async () => {
    const futureDate = new Date('2026-11-05T10:00:00.000+07:00');
    const slot = '10:00 - 12:00';

    const result = await reservationService.createReservation(
      TEST_USERS.customer1.id,
      {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: String(storageUnitId),
        facilityUnitTypeOfferingId: String(facilityUnitTypeOfferingId),
        checkInDate: futureDate.toISOString(),
        checkInTimeSlot: slot,
        rentalDuration: 30,
        termsAccepted: true,
      }
    );

    expect(result.immediateForfeitWarning).toBe(false);

    const resDoc = await Reservation.findById(result.id);
    expect(resDoc?.immediateForfeitWarning).toBe(false);
  });

  // ============================================================
  // T2.7: maxStartDateOffsetDays & Signature Re-signing on Check-In
  // ============================================================

  it('6. should reject booking if startDate exceeds checkInDate by more than maxStartDateOffsetDays (3 days)', async () => {
    const checkInDate = addDays(new Date(), 2);
    // 4 days after check-in date (exceeds default 3 days)
    const invalidStartDate = addDays(checkInDate, 4);

    try {
      await reservationService.createReservation(TEST_USERS.customer1.id, {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: String(storageUnitId),
        facilityUnitTypeOfferingId: String(facilityUnitTypeOfferingId),
        checkInDate: checkInDate.toISOString(),
        checkInTimeSlot: '09:00 - 11:00',
        startDate: invalidStartDate.toISOString(),
        rentalDuration: 30,
        termsAccepted: true,
      });
      expect.unreachable(
        'Should have thrown AppError for startDate exceeding max offset'
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_329);
    }
  });

  it('7. should accept booking if startDate is within maxStartDateOffsetDays (<= 3 days)', async () => {
    const checkInDate = addDays(new Date(), 2);
    // exactly 3 days after check-in date
    const validStartDate = addDays(checkInDate, 3);

    const result = await reservationService.createReservation(
      TEST_USERS.customer1.id,
      {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: String(storageUnitId),
        facilityUnitTypeOfferingId: String(facilityUnitTypeOfferingId),
        checkInDate: checkInDate.toISOString(),
        checkInTimeSlot: '09:00 - 11:00',
        startDate: validStartDate.toISOString(),
        rentalDuration: 30,
        termsAccepted: true,
      }
    );

    expect(result).toBeDefined();
    expect(new Date(result.startDate).getTime()).toBe(
      startOfDayVN(validStartDate).getTime()
    );
  });

  it('8. should activate contract directly when check-in is on time without date shift', async () => {
    const scheduledStartDate = startOfDayVN(new Date());
    const scheduledEndDate = addDays(scheduledStartDate, 30);

    const contract = await Contract.create({
      contractCode: `CTR-ONTIME-${Date.now()}`,
      source: ContractSourceEnum.WALK_IN,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId,
      facilityUnitTypeOfferingId,
      startDate: scheduledStartDate,
      endDate: scheduledEndDate,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1_000_000,
      depositAmount: 1_000_000,
      totalPeriodicPrice: 1_000_000,
      depositPaidAt: new Date(),
      depositStatus: ContractDepositStatusEnum.HELD,
      firstPeriodPaidAt: new Date(),
      status: ContractStatusEnum.DRAFT,
      customerSigned: true,
      customerSignedAt: new Date(),
      staffSigned: false,
      termsAccepted: true,
    });

    const checkedIn = await contractService.checkInContract(
      String(contract._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        termsAccepted: true,
        actualCheckInDate: scheduledStartDate,
      }
    );

    expect(checkedIn.status).toBe(ContractStatusEnum.ACTIVE);
    expect(checkedIn.customerSigned).toBe(true);
    expect(new Date(checkedIn.startDate).getTime()).toBe(
      scheduledStartDate.getTime()
    );
  });

  it('9. should reset customer signature, save signatureHistory, and throw MESSAGE_CODE_425 when late check-in shifts contract dates', async () => {
    const originalStartDate = startOfDayVN(
      new Date('2026-11-01T00:00:00.000Z')
    );
    const originalEndDate = addDays(originalStartDate, 30);
    const signedAt = new Date('2026-10-31T10:00:00.000Z');

    const contract = await Contract.create({
      contractCode: `CTR-LATE-${Date.now()}`,
      source: ContractSourceEnum.WALK_IN,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId,
      facilityUnitTypeOfferingId,
      startDate: originalStartDate,
      endDate: originalEndDate,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1_000_000,
      depositAmount: 1_000_000,
      totalPeriodicPrice: 1_000_000,
      depositPaidAt: new Date(),
      depositStatus: ContractDepositStatusEnum.HELD,
      firstPeriodPaidAt: new Date(),
      status: ContractStatusEnum.DRAFT,
      customerSigned: true,
      customerSignedAt: signedAt,
      staffSigned: false,
      termsAccepted: true,
    });

    // Customer checks in 4 days late: 2026-11-05
    const lateCheckIn = new Date('2026-11-05T10:00:00.000+07:00');

    try {
      await contractService.checkInContract(
        String(contract._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          termsAccepted: true,
          actualCheckInDate: lateCheckIn,
        }
      );
      expect.unreachable(
        'Should have thrown AppError for signature reset required'
      );
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_425);
    }

    // Verify contract document state in DB
    const updated = await Contract.findById(contract._id);
    expect(updated?.status).toBe(ContractStatusEnum.DRAFT);
    expect(updated?.customerSigned).toBe(false);
    expect(updated?.customerSignedAt).toBeNull();
    // Dates shifted
    expect(new Date(updated!.startDate).getTime()).toBe(
      startOfDayVN(lateCheckIn).getTime()
    );

    // Verify signature history
    expect(updated?.signatureHistory).toHaveLength(1);
    const hist = updated!.signatureHistory[0];
    expect(hist.party).toBe('customer');
    expect(new Date(hist.signedAt).getTime()).toBe(signedAt.getTime());
    expect(new Date(hist.previousStartDate).getTime()).toBe(
      originalStartDate.getTime()
    );
    expect(new Date(hist.previousEndDate).getTime()).toBe(
      originalEndDate.getTime()
    );
  });

  it('10. should allow Manager to complete check-in once customer re-signs the adjusted draft contract', async () => {
    const originalStartDate = startOfDayVN(
      new Date('2026-11-01T00:00:00.000Z')
    );
    const originalEndDate = addDays(originalStartDate, 30);
    const lateCheckIn = new Date('2026-11-05T10:00:00.000+07:00');

    const contract = await Contract.create({
      contractCode: `CTR-RESIGN-${Date.now()}`,
      source: ContractSourceEnum.WALK_IN,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId,
      facilityUnitTypeOfferingId,
      startDate: originalStartDate,
      endDate: originalEndDate,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1_000_000,
      depositAmount: 1_000_000,
      totalPeriodicPrice: 1_000_000,
      depositPaidAt: new Date(),
      depositStatus: ContractDepositStatusEnum.HELD,
      firstPeriodPaidAt: new Date(),
      status: ContractStatusEnum.DRAFT,
      customerSigned: true,
      customerSignedAt: new Date(),
      staffSigned: false,
      termsAccepted: true,
    });

    // Step 1: Initial check-in attempt detects late date, resets signature & throws 425
    await expect(
      contractService.checkInContract(
        String(contract._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          termsAccepted: true,
          actualCheckInDate: lateCheckIn,
        }
      )
    ).rejects.toThrow();

    // Step 2: Customer re-signs the newly adjusted DRAFT contract
    const reSigned = await contractService.customerSignContract(
      String(contract._id),
      TEST_USERS.customer1.id,
      RoleEnum.CUSTOMER,
      { termsAccepted: true }
    );
    expect(reSigned.customerSigned).toBe(true);

    // Step 3: Manager re-invokes check-in -> now succeeds and activates contract
    const activated = await contractService.checkInContract(
      String(contract._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        termsAccepted: true,
        actualCheckInDate: lateCheckIn,
      }
    );

    expect(activated.status).toBe(ContractStatusEnum.ACTIVE);
    expect(activated.customerSigned).toBe(true);
    expect(new Date(activated.startDate).getTime()).toBe(
      startOfDayVN(lateCheckIn).getTime()
    );
  });
});
