import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  computeCancellationOutcome,
  getCheckInTargetTimeVN,
  type CancellationOutcomeResult,
} from '../src/utils/reservationPolicy.util.ts';
import {
  RefundStatusEnum,
  ReservationStatusEnum,
} from '../src/common/enums/reservation.enum.ts';
import { addDays, startOfDayVN } from '../src/utils/date.util.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../src/common/enums/facilityUnitTypeOffering.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
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
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import {
  Payment,
  PaymentTransaction,
} from '../src/modules/payment/payment.model.ts';
import { PaymentRepository } from '../src/modules/payment/payment.repository.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
import { runReservationCheckInDateMigration } from '../scripts/migrate-reservation-checkin-date.ts';

describe('T2.1: Reservation Cancellation Deadline & Slot Reference Time (Unit Tests)', () => {
  describe('getCheckInTargetTimeVN', () => {
    it('should correctly parse slot start time in Vietnam Time (UTC+7) in slot_start mode', () => {
      const checkInDate = startOfDayVN('2026-10-30');
      const slotTimeStr = '09:00 - 11:00';

      const target = getCheckInTargetTimeVN(
        checkInDate,
        slotTimeStr,
        'slot_start'
      );

      // In VN (+07:00), 2026-10-30 09:00:00 is 2026-10-30T02:00:00.000Z in UTC
      expect(target.toISOString()).toBe('2026-10-30T02:00:00.000Z');
      expect(target.getTime()).toBe(
        new Date('2026-10-30T09:00:00.000+07:00').getTime()
      );
    });

    it('should correctly handle afternoon slot (e.g. 14:30 - 16:30)', () => {
      const checkInDate = startOfDayVN('2026-10-30');
      const slotTimeStr = '14:30 - 16:30';

      const target = getCheckInTargetTimeVN(
        checkInDate,
        slotTimeStr,
        'slot_start'
      );

      // 14:30 VN = 07:30 UTC
      expect(target.toISOString()).toBe('2026-10-30T07:30:00.000Z');
    });

    it('should fallback to startOfDayVN if slot is missing, empty, or malformed in slot_start mode', () => {
      const checkInDate = startOfDayVN('2026-10-30');

      const targetEmpty = getCheckInTargetTimeVN(checkInDate, '', 'slot_start');
      expect(targetEmpty.getTime()).toBe(checkInDate.getTime());

      const targetMalformed = getCheckInTargetTimeVN(
        checkInDate,
        'invalid-slot-format',
        'slot_start'
      );
      expect(targetMalformed.getTime()).toBe(checkInDate.getTime());
    });

    it('should always return startOfDayVN in calendar_day mode regardless of slot string', () => {
      const checkInDate = startOfDayVN('2026-10-30');
      const slotTimeStr = '15:00 - 17:00';

      const target = getCheckInTargetTimeVN(
        checkInDate,
        slotTimeStr,
        'calendar_day'
      );

      expect(target.getTime()).toBe(checkInDate.getTime());
      // 2026-10-30 00:00:00 +07:00 = 2026-10-29T17:00:00.000Z
      expect(target.toISOString()).toBe('2026-10-29T17:00:00.000Z');
    });
  });

  describe('computeCancellationOutcome — slot_start Mode (24h before slot start)', () => {
    const baseReservation = {
      depositAmount: 1_000_000,
      checkInDate: startOfDayVN('2026-10-30'),
      checkInTimeSlot: '09:00 - 11:00',
      status: ReservationStatusEnum.PAYMENT_SUCCESSFUL,
      policySnapshot: {
        freeCancelHours: 24,
        forfeitPercent: 100,
        noShowGraceHours: 24,
        cancellationMode: 'slot_start' as const,
      },
    };

    // Slot start: 2026-10-30 09:00:00 +07:00 (2026-10-30T02:00:00.000Z)
    // Deadline (24h before): 2026-10-29 09:00:00 +07:00 (2026-10-29T02:00:00.000Z)

    it('should grant 100% refund when customer cancels 1 second before deadline', () => {
      const now = new Date('2026-10-29T08:59:59.000+07:00'); // 01:59:59Z

      const result: CancellationOutcomeResult = computeCancellationOutcome(
        baseReservation,
        now
      );

      expect(result.isFreeCancellation).toBe(true);
      expect(result.refundAmount).toBe(1_000_000);
      expect(result.forfeitedAmount).toBe(0);
      expect(result.refundStatus).toBe(RefundStatusEnum.PENDING);
      expect(result.hoursRemaining).toBeGreaterThan(24);
      expect(result.freeCancelDeadline.toISOString()).toBe(
        '2026-10-29T02:00:00.000Z'
      );
    });

    it('should grant 100% refund when customer cancels exactly at deadline', () => {
      const now = new Date('2026-10-29T09:00:00.000+07:00'); // 02:00:00Z

      const result = computeCancellationOutcome(baseReservation, now);

      expect(result.isFreeCancellation).toBe(true);
      expect(result.refundAmount).toBe(1_000_000);
      expect(result.forfeitedAmount).toBe(0);
      expect(result.refundStatus).toBe(RefundStatusEnum.PENDING);
      expect(result.hoursRemaining).toBe(24);
    });

    it('should forfeit 100% deposit when customer cancels 1 second after deadline', () => {
      const now = new Date('2026-10-29T09:00:01.000+07:00'); // 02:00:01Z

      const result = computeCancellationOutcome(baseReservation, now);

      expect(result.isFreeCancellation).toBe(false);
      expect(result.refundAmount).toBe(0);
      expect(result.forfeitedAmount).toBe(1_000_000);
      expect(result.refundStatus).toBe(RefundStatusEnum.NONE);
      expect(result.hoursRemaining).toBeLessThan(24);
    });

    it('should support partial forfeiture (e.g. 50%) on late cancellation when configured', () => {
      const customPolicyReservation = {
        ...baseReservation,
        policySnapshot: {
          ...baseReservation.policySnapshot,
          forfeitPercent: 50,
        },
      };
      const now = new Date('2026-10-29T09:00:01.000+07:00');

      const result = computeCancellationOutcome(customPolicyReservation, now);

      expect(result.isFreeCancellation).toBe(false);
      expect(result.refundAmount).toBe(500_000);
      expect(result.forfeitedAmount).toBe(500_000);
      expect(result.refundStatus).toBe(RefundStatusEnum.PENDING);
    });
  });

  describe('computeCancellationOutcome — Midnight Crossing & Boundary Cases (23:59 vs 00:00)', () => {
    it('should accurately handle midnight slot (00:00 slot start)', () => {
      const midnightReservation = {
        depositAmount: 2_000_000,
        checkInDate: startOfDayVN('2026-10-30'),
        checkInTimeSlot: '00:00 - 02:00',
        status: ReservationStatusEnum.CONFIRMED,
        policySnapshot: {
          freeCancelHours: 24,
          forfeitPercent: 100,
          noShowGraceHours: 24,
          cancellationMode: 'slot_start' as const,
        },
      };
      // Slot: 2026-10-30 00:00:00 +07:00
      // Deadline (24h before): 2026-10-29 00:00:00 +07:00

      // 1 sec before deadline: 2026-10-28 23:59:59 +07:00
      const beforeMidnight = new Date('2026-10-28T23:59:59.000+07:00');
      const freeResult = computeCancellationOutcome(
        midnightReservation,
        beforeMidnight
      );
      expect(freeResult.isFreeCancellation).toBe(true);
      expect(freeResult.refundAmount).toBe(2_000_000);

      // Exactly at midnight deadline: 2026-10-29 00:00:00 +07:00
      const exactMidnight = new Date('2026-10-29T00:00:00.000+07:00');
      const exactResult = computeCancellationOutcome(
        midnightReservation,
        exactMidnight
      );
      expect(exactResult.isFreeCancellation).toBe(true);
      expect(exactResult.refundAmount).toBe(2_000_000);

      // 1 sec past midnight deadline: 2026-10-29 00:00:01 +07:00
      const pastMidnight = new Date('2026-10-29T00:00:01.000+07:00');
      const lateResult = computeCancellationOutcome(
        midnightReservation,
        pastMidnight
      );
      expect(lateResult.isFreeCancellation).toBe(false);
      expect(lateResult.refundAmount).toBe(0);
      expect(lateResult.forfeitedAmount).toBe(2_000_000);
    });
  });

  describe('computeCancellationOutcome — calendar_day Mode (24h before 00:00 VN of checkInDate)', () => {
    it('should compute deadline from start of day in calendar_day mode', () => {
      const calendarReservation = {
        depositAmount: 1_500_000,
        checkInDate: startOfDayVN('2026-10-30'),
        checkInTimeSlot: '16:00 - 18:00', // Slot is afternoon, but calendar_day uses 00:00:00 VN
        status: ReservationStatusEnum.PAYMENT_SUCCESSFUL,
        policySnapshot: {
          freeCancelHours: 24,
          forfeitPercent: 100,
          noShowGraceHours: 24,
          cancellationMode: 'calendar_day' as const,
        },
      };

      // Target: 2026-10-30 00:00:00 +07:00
      // Deadline (24h before): 2026-10-29 00:00:00 +07:00

      // Cancel at 2026-10-28 23:59:59 +07:00 -> Free
      const before = new Date('2026-10-28T23:59:59.000+07:00');
      const resBefore = computeCancellationOutcome(calendarReservation, before);
      expect(resBefore.isFreeCancellation).toBe(true);
      expect(resBefore.refundAmount).toBe(1_500_000);

      // Cancel at 2026-10-29 00:00:01 +07:00 -> Late (even though slot is afternoon)
      const after = new Date('2026-10-29T00:00:01.000+07:00');
      const resAfter = computeCancellationOutcome(calendarReservation, after);
      expect(resAfter.isFreeCancellation).toBe(false);
      expect(resAfter.refundAmount).toBe(0);
      expect(resAfter.forfeitedAmount).toBe(1_500_000);
    });
  });

  describe('computeCancellationOutcome — Statuses & Roles', () => {
    it('should return 0 refund and 0 forfeit for PENDING_PAYMENT status', () => {
      const pendingRes = {
        depositAmount: 1_000_000,
        checkInDate: startOfDayVN('2026-10-30'),
        checkInTimeSlot: '09:00 - 11:00',
        status: ReservationStatusEnum.PENDING_PAYMENT,
      };

      const result = computeCancellationOutcome(pendingRes, new Date());
      expect(result.isFreeCancellation).toBe(true);
      expect(result.refundAmount).toBe(0);
      expect(result.forfeitedAmount).toBe(0);
      expect(result.refundStatus).toBe(RefundStatusEnum.NONE);
    });

    it('should forfeit deposit when customer cancels an OVERDUE reservation', () => {
      const overdueRes = {
        depositAmount: 1_000_000,
        checkInDate: startOfDayVN('2026-10-25'),
        checkInTimeSlot: '09:00 - 11:00',
        status: ReservationStatusEnum.OVERDUE,
        policySnapshot: {
          freeCancelHours: 24,
          forfeitPercent: 100,
          noShowGraceHours: 24,
          cancellationMode: 'slot_start' as const,
        },
      };

      const result = computeCancellationOutcome(
        overdueRes,
        new Date('2026-10-26T10:00:00.000+07:00')
      );
      expect(result.isFreeCancellation).toBe(false);
      expect(result.refundAmount).toBe(0);
      expect(result.forfeitedAmount).toBe(1_000_000);
      expect(result.refundStatus).toBe(RefundStatusEnum.NONE);
    });

    it('should grant 100% refund when facility cancels a PAYMENT_SUCCESSFUL reservation', () => {
      const facilityCancelRes = {
        depositAmount: 800_000,
        checkInDate: startOfDayVN('2026-10-30'),
        checkInTimeSlot: '09:00 - 11:00',
        status: ReservationStatusEnum.PAYMENT_SUCCESSFUL,
      };

      // Even if cancelled 1 minute before slot, facility cancel gives 100% refund
      const now = new Date('2026-10-30T08:59:00.000+07:00');
      const result = computeCancellationOutcome(facilityCancelRes, now, {
        isCustomer: false,
      });

      expect(result.isFreeCancellation).toBe(true);
      expect(result.refundAmount).toBe(800_000);
      expect(result.forfeitedAmount).toBe(0);
      expect(result.refundStatus).toBe(RefundStatusEnum.PENDING);
    });

    it('should safely fallback to slot_start mode when legacy reservation has no cancellationMode in snapshot', () => {
      const legacyRes = {
        depositAmount: 1_000_000,
        checkInDate: startOfDayVN('2026-10-30'),
        checkInTimeSlot: '14:00 - 16:00',
        status: ReservationStatusEnum.CONFIRMED,
        policySnapshot: {
          freeCancelHours: 24,
          forfeitPercent: 100,
          noShowGraceHours: 24,
          // cancellationMode is undefined
        },
      };

      // In slot_start mode, deadline is 2026-10-29 14:00:00 VN
      // Cancel at 2026-10-29 13:00:00 VN -> Free!
      const now = new Date('2026-10-29T13:00:00.000+07:00');
      const result = computeCancellationOutcome(legacyRes, now);

      expect(result.isFreeCancellation).toBe(true);
      expect(result.refundAmount).toBe(1_000_000);
    });
  });

  describe('Integration: ReservationService & CheckInDate Normalization', () => {
    let reservationService: ReservationService;
    let reservationRepo: ReservationRepository;
    let refundRequestRepo: RefundRequestRepository;

    const unitTypeId = new Types.ObjectId();
    const offeringId = new Types.ObjectId();
    const unit1Id = new Types.ObjectId();
    const unit2Id = new Types.ObjectId();

    beforeAll(async () => {
      await setupTestDB();

      const userRepo = new UserRepository(User);
      const facilityRepo = new FacilityRepository(Facility);
      const offeringRepo = new FacilityUnitTypeOfferingRepository(
        FacilityUnitTypeOffering
      );
      const amenityOfferingRepo = new FacilityAmenityOfferingRepository(
        FacilityAmenityOffering
      );
      const storageUnitRepo = new StorageUnitRepository(StorageUnit);
      const paymentRepo = new PaymentRepository(
        Payment,
        PaymentTransaction,
        Reservation,
        Contract
      );
      const contractRepo = new ContractRepository(Contract);
      refundRequestRepo = new RefundRequestRepository(RefundRequest);
      const refundRequestService = new RefundRequestService(
        refundRequestRepo,
        paymentRepo,
        reservationRepo,
        contractRepo
      );
      reservationRepo = new ReservationRepository(Reservation);

      reservationService = new ReservationService(
        reservationRepo,
        facilityRepo,
        offeringRepo,
        amenityOfferingRepo,
        storageUnitRepo,
        userRepo,
        paymentRepo,
        undefined,
        undefined,
        undefined,
        undefined,
        contractRepo,
        refundRequestService
      );
    });

    afterAll(async () => {
      await teardownTestDB();
    });

    beforeEach(async () => {
      await clearTestDB();
      await seedTestUsers();

      await Facility.create({
        _id: new Types.ObjectId(TEST_FACILITY_A_ID),
        name: 'Facility Alpha',
        city: 'Ho Chi Minh',
        address: '123 Alpha St',
        status: FacilityStatusEnum.ACTIVE,
      });

      await UnitType.create({
        _id: unitTypeId,
        name: 'Standard Unit',
        category: UnitTypeCategoryEnum.CLIMATE_CONTROLLED,
        status: UnitTypeStatusEnum.ACTIVE,
        dimensions: { length: 2, width: 2, height: 2.5 },
        area: 4,
        volume: 10,
      });

      await FacilityUnitTypeOffering.create({
        _id: offeringId,
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        unitTypeId,
        billingUnit: BillingUnitEnum.MONTH,
        pricePerUnit: 1_000_000,
        depositMultiplier: 1,
        minRentalDays: 1,
        status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
      });

      await StorageUnit.create([
        {
          _id: unit1Id,
          facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
          unitTypeId,
          unitNumber: 'U-101',
          floor: 1,
          status: StorageUnitStatusEnum.AVAILABLE,
        },
        {
          _id: unit2Id,
          facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
          unitTypeId,
          unitNumber: 'U-102',
          floor: 1,
          status: StorageUnitStatusEnum.AVAILABLE,
        },
      ]);
    });

    it('should normalize checkInDate and startDate to startOfDayVN in createReservation', async () => {
      const customer = TEST_USERS.customer1;
      // Client sends date with non-midnight hours or local time
      const rawDateInput = '2026-11-15T15:45:30.000Z';

      const res = await reservationService.createReservation(customer.id, {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: unit1Id.toString(),
        facilityUnitTypeOfferingId: offeringId.toString(),
        checkInDate: rawDateInput,
        checkInTimeSlot: '10:00 - 12:00',
        rentalDuration: 1,
        termsAccepted: true,
      });

      const rawDoc = await Reservation.findById(res.id).lean();
      expect(rawDoc).toBeTruthy();

      const expectedStartOfDay = startOfDayVN('2026-11-15');
      expect(rawDoc?.checkInDate.getTime()).toBe(expectedStartOfDay.getTime());
      expect(rawDoc?.startDate.getTime()).toBe(expectedStartOfDay.getTime());
    });

    it('should integrate cancellation deadline in cancelReservation and create RefundRequest on free cancel', async () => {
      const customer = TEST_USERS.customer1;
      const futureCheckIn = addDays(startOfDayVN(), 5);

      const created = await reservationService.createReservation(customer.id, {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: unit1Id.toString(),
        facilityUnitTypeOfferingId: offeringId.toString(),
        checkInDate: futureCheckIn.toISOString(),
        checkInTimeSlot: '09:00 - 11:00',
        rentalDuration: 1,
        termsAccepted: true,
      });

      // Mark as PAYMENT_SUCCESSFUL
      await Reservation.updateOne(
        { _id: new Types.ObjectId(created.id) },
        {
          $set: {
            status: ReservationStatusEnum.PAYMENT_SUCCESSFUL,
            paidAmount: 1_000_000,
          },
        }
      );

      // Cancel now (5 days before checkInDate, well ahead of the 24h deadline)
      const cancelled = await reservationService.cancelReservation(
        created.id,
        customer.id,
        RoleEnum.CUSTOMER,
        {
          cancellationReason: 'Need to postpone trip',
          refundBankName: 'Vietcombank',
          refundAccountNumber: '1234567890',
          refundAccountHolder: 'NGUYEN VAN A',
        }
      );

      expect(cancelled.status).toBe(ReservationStatusEnum.CANCELLED);
      expect(cancelled.refundAmount).toBe(1_000_000);
      expect(cancelled.forfeitedAmount).toBe(0);
      expect(cancelled.refundStatus).toBe(RefundStatusEnum.PENDING);

      // Verify RefundRequest is automatically created
      const refundReq = await RefundRequest.findOne({
        reservationId: new Types.ObjectId(created.id),
      }).lean();
      expect(refundReq).toBeTruthy();
      expect(refundReq?.amount).toBe(1_000_000);
    });

    it('should forfeit deposit when customer cancels past the deadline in cancelReservation', async () => {
      const customer = TEST_USERS.customer1;
      // Date is tomorrow morning (less than 24h remaining, but slot not passed)
      const targetDate = addDays(startOfDayVN(), 1);

      const created = await reservationService.createReservation(customer.id, {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: unit2Id.toString(),
        facilityUnitTypeOfferingId: offeringId.toString(),
        checkInDate: targetDate.toISOString(),
        checkInTimeSlot: '09:00 - 11:00',
        rentalDuration: 1,
        termsAccepted: true,
      });

      await Reservation.updateOne(
        { _id: new Types.ObjectId(created.id) },
        {
          $set: {
            status: ReservationStatusEnum.CONFIRMED,
            paidAmount: 1_000_000,
            checkInDate: startOfDayVN(),
            checkInTimeSlot: '08:00 - 10:00',
          },
        }
      );

      // Cancel on the day of check-in (less than 24h remaining)
      const cancelled = await reservationService.cancelReservation(
        created.id,
        customer.id,
        RoleEnum.CUSTOMER,
        { cancellationReason: 'Change of mind last minute' }
      );

      expect(cancelled.status).toBe(ReservationStatusEnum.CANCELLED);
      expect(cancelled.refundAmount).toBe(0);
      expect(cancelled.forfeitedAmount).toBe(1_000_000);
      expect(cancelled.refundStatus).toBe(RefundStatusEnum.NONE);

      // No RefundRequest created for 0 refund
      const refundReq = await RefundRequest.findOne({
        reservationId: new Types.ObjectId(created.id),
      }).lean();
      expect(refundReq).toBeNull();
    });
  });

  describe('Migration Script: migrate-reservation-checkin-date.ts', () => {
    beforeAll(async () => {
      await setupTestDB();
    });

    afterAll(async () => {
      await teardownTestDB();
    });

    beforeEach(async () => {
      await clearTestDB();
    });

    it('should normalize legacy non-startOfDay checkInDate and startDate idempotently', async () => {
      // Seed legacy document with arbitrary UTC times (e.g. 07:15:00 UTC)
      const legacyId = new Types.ObjectId();
      const legacyCheckIn = new Date('2026-11-20T07:15:00.000Z');
      const legacyStart = new Date('2026-11-20T10:30:00.000Z');

      await Reservation.create({
        _id: legacyId,
        reservationCode: 'SSM-LEGACY-001',
        customerId: new Types.ObjectId(),
        facilityId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        storageUnitId: new Types.ObjectId(),
        checkInDate: legacyCheckIn,
        startDate: legacyStart,
        checkInTimeSlot: '09:00 - 11:00',
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
        basePrice: 1_000_000,
        depositAmount: 1_000_000,
        totalAmount: 1_000_000,
        status: ReservationStatusEnum.CONFIRMED,
        refundStatus: RefundStatusEnum.NONE,
        forfeitedAmount: 0,
        termsAccepted: true,
      });

      // Run dry-run
      const dryRunResult = await runReservationCheckInDateMigration(undefined, {
        isDryRun: true,
      });
      expect(dryRunResult.scanned).toBe(1);
      expect(dryRunResult.updated).toBe(1);

      // Document still has legacy date in dry-run
      const docAfterDryRun = await Reservation.findById(legacyId).lean();
      expect(docAfterDryRun?.checkInDate.getTime()).toBe(
        legacyCheckIn.getTime()
      );

      // Real migration run
      const realRunResult = await runReservationCheckInDateMigration(
        undefined,
        {
          isDryRun: false,
        }
      );
      expect(realRunResult.scanned).toBe(1);
      expect(realRunResult.updated).toBe(1);

      const normalizedDoc = await Reservation.findById(legacyId).lean();
      const expectedNormalized = startOfDayVN('2026-11-20');
      expect(normalizedDoc?.checkInDate.getTime()).toBe(
        expectedNormalized.getTime()
      );
      expect(normalizedDoc?.startDate.getTime()).toBe(
        expectedNormalized.getTime()
      );

      // Second run is idempotent (0 updated)
      const secondRun = await runReservationCheckInDateMigration(undefined, {
        isDryRun: false,
      });
      expect(secondRun.scanned).toBe(1);
      expect(secondRun.updated).toBe(0);
    });
  });
});
