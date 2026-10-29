import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
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
  getAuthHeaders,
} from './helpers/auth.helper.ts';
import { RegisterRoutes } from '../src/routes/routes.ts';
import { errorMiddleware } from '../src/middlewares/error.middleware.ts';
import { requestContextMiddleware } from '../src/middlewares/requestContext.middleware.ts';
import { runWithRequestContext } from '../src/utils/requestContext.util.ts';
import { sanitizeAuditMetadata } from '../src/utils/auditDiff.util.ts';
import { endOfDayVN, addDays, startOfDayVN } from '../src/utils/date.util.ts';
import {
  computeForfeiture,
  resolveReservationPolicy,
} from '../src/utils/reservationPolicy.util.ts';
import {
  getReservationConfig,
  buildReservationPolicySnapshot,
} from '../src/config/reservation.config.ts';
import { runReservationPolicySnapshotMigration } from '../scripts/migrate-reservation-policy-snapshot.ts';
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
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../src/common/enums/facilityUnitTypeOffering.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import {
  RefundStatusEnum,
  ReservationStatusEnum,
} from '../src/common/enums/reservation.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';

describe('T2.2: Reservation Policy Snapshot & Terms Acceptance Suite', () => {
  let app: Express;
  let reservationService: ReservationService;
  let reservationRepo: ReservationRepository;
  let refundRequestRepo: RefundRequestRepository;

  const unitTypeId = new Types.ObjectId();
  const offeringId = new Types.ObjectId();
  const unit1Id = new Types.ObjectId();
  const unit2Id = new Types.ObjectId();

  const savedEnv: Record<string, string | undefined> = {};
  const envKeys = [
    'RESERVATION_FREE_CANCEL_HOURS',
    'RESERVATION_OVERDUE_GRACE_HOURS',
    'RESERVATION_FORFEIT_PERCENT',
    'RESERVATION_POLICY_VERSION',
  ];

  beforeAll(async () => {
    for (const k of envKeys) {
      savedEnv[k] = process.env[k];
    }
    await setupTestDB();

    reservationRepo = new ReservationRepository(Reservation);
    const facilityRepo = new FacilityRepository(Facility);
    const offeringRepo = new FacilityUnitTypeOfferingRepository(
      FacilityUnitTypeOffering
    );
    const amenityOfferingRepo = new FacilityAmenityOfferingRepository(
      FacilityAmenityOffering
    );
    const storageUnitRepo = new StorageUnitRepository(StorageUnit);
    const userRepo = new UserRepository(User);
    const paymentRepo = new PaymentRepository(Payment, PaymentTransaction);
    const contractRepo = new ContractRepository(Contract);
    refundRequestRepo = new RefundRequestRepository(RefundRequest);
    const refundRequestService = new RefundRequestService(
      refundRequestRepo,
      userRepo,
      reservationRepo
    );

    // Explicitly pass undefined for facilityTimeSlotRepository, auditLogService, notificationService, reservationQueue
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

    app = express();
    app.set('trust proxy', 1);
    app.use(express.json());
    app.use(requestContextMiddleware);
    RegisterRoutes(app);
    app.use(errorMiddleware);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    for (const k of envKeys) {
      delete process.env[k];
    }
    await clearTestDB();
    await seedTestUsers();

    await Facility.create({
      _id: new Types.ObjectId(TEST_FACILITY_A_ID),
      name: 'Facility A - District 1',
      code: 'SGN01',
      address: '123 Nguyen Hue',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
      managerId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
    });

    await UnitType.create({
      _id: unitTypeId,
      name: 'Standard Small Box',
      category: UnitTypeCategoryEnum.SELF_STORAGE_BOX,
      dimensions: {
        length: 2,
        width: 2,
        height: 2.5,
      },
      area: 4,
      volume: 10,
      status: UnitTypeStatusEnum.ACTIVE,
    });

    await FacilityUnitTypeOffering.create({
      _id: offeringId,
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 1000000,
      depositMultiplier: 1,
      minRentalDays: 1,
      status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
    });

    await StorageUnit.create([
      {
        _id: unit1Id,
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        unitTypeId,
        unitNumber: 'A-101',
        floor: 1,
        status: StorageUnitStatusEnum.AVAILABLE,
      },
      {
        _id: unit2Id,
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        unitTypeId,
        unitNumber: 'A-102',
        floor: 1,
        status: StorageUnitStatusEnum.AVAILABLE,
      },
    ]);
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (savedEnv[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = savedEnv[k];
      }
    }
  });

  describe('1. Pure Functions: computeForfeiture, resolveReservationPolicy & Config', () => {
    it('should compute forfeiture and refund accurately with integer VND rounding', () => {
      expect(computeForfeiture(1000000, 0)).toEqual({
        forfeitedAmount: 0,
        refundAmount: 1000000,
      });

      expect(computeForfeiture(1000000, 100)).toEqual({
        forfeitedAmount: 1000000,
        refundAmount: 0,
      });

      const oddSplit = computeForfeiture(500001, 50);
      expect(oddSplit.forfeitedAmount).toBe(250001);
      expect(oddSplit.refundAmount).toBe(250000);
      expect(oddSplit.forfeitedAmount + oddSplit.refundAmount).toBe(500001);

      expect(computeForfeiture(0, 100)).toEqual({
        forfeitedAmount: 0,
        refundAmount: 0,
      });
    });

    it('should allow RESERVATION_FORFEIT_PERCENT=0 without falling back to 100', () => {
      process.env.RESERVATION_FORFEIT_PERCENT = '0';
      const config = getReservationConfig();
      expect(config.forfeitPercent).toBe(0);

      const snap = buildReservationPolicySnapshot(config);
      expect(snap.forfeitPercent).toBe(0);
    });

    it('should resolve policy from snapshot when present, and fallback to config for legacy records', () => {
      process.env.RESERVATION_FREE_CANCEL_HOURS = '24';
      process.env.RESERVATION_FORFEIT_PERCENT = '100';
      process.env.RESERVATION_OVERDUE_GRACE_HOURS = '24';

      const withSnapshot = resolveReservationPolicy({
        policySnapshot: {
          freeCancelHours: 48,
          forfeitPercent: 50,
          noShowGraceHours: 36,
        },
      });
      expect(withSnapshot).toEqual({
        freeCancelHours: 48,
        forfeitPercent: 50,
        noShowGraceHours: 36,
        cancellationMode: 'slot_start',
      });

      const legacyWithoutSnapshot = resolveReservationPolicy({});
      expect(legacyWithoutSnapshot).toEqual({
        freeCancelHours: 24,
        forfeitPercent: 100,
        noShowGraceHours: 24,
        cancellationMode: 'slot_start',
      });
    });
  });

  describe('2. Create Reservation: Terms Acceptance & Policy Snapshot', () => {
    it('should persist termsAccepted, policyVersion, acceptedAt, acceptedIp, and policySnapshot on creation', async () => {
      process.env.RESERVATION_FREE_CANCEL_HOURS = '36';
      process.env.RESERVATION_FORFEIT_PERCENT = '80';
      process.env.RESERVATION_OVERDUE_GRACE_HOURS = '12';
      process.env.RESERVATION_POLICY_VERSION = '2026-10-v2';

      const checkInDate = addDays(startOfDayVN(), 5).toISOString();

      const res = await runWithRequestContext(
        {
          requestId: 'req-test-1',
          ip: '203.0.113.45',
          userAgent: 'Vitest/1.0',
          method: 'POST',
          path: '/reservations',
          actor: null,
        },
        () =>
          reservationService.createReservation(TEST_USERS.customer1.id, {
            facilityId: TEST_FACILITY_A_ID,
            storageUnitId: unit1Id.toString(),
            facilityUnitTypeOfferingId: offeringId.toString(),
            checkInDate,
            checkInTimeSlot: '09:00 - 11:00',
            rentalDuration: 1,
            amenities: [],
            termsAccepted: true,
          })
      );

      expect(res.termsAccepted).toBe(true);
      expect(res.policyVersion).toBe('2026-10-v2');
      expect(res.acceptedAt).toBeTruthy();
      expect(res.policySnapshot).toEqual({
        freeCancelHours: 36,
        forfeitPercent: 80,
        noShowGraceHours: 12,
        cancellationMode: 'slot_start',
      });
      // acceptedIp must NOT be exposed in API response
      expect((res as Record<string, unknown>).acceptedIp).toBeUndefined();

      // Verify raw DB document stores acceptedIp
      const rawDoc = await Reservation.findById(res.id).lean();
      expect(rawDoc?.acceptedIp).toBe('203.0.113.45');
      expect(rawDoc?.termsAccepted).toBe(true);
      expect(rawDoc?.policyVersion).toBe('2026-10-v2');
      expect(rawDoc?.acceptedAt).toBeInstanceOf(Date);
      expect(rawDoc?.policySnapshot).toEqual({
        freeCancelHours: 36,
        forfeitPercent: 80,
        noShowGraceHours: 12,
        cancellationMode: 'slot_start',
      });

      // Verify audit masking masks acceptedIp
      const masked = sanitizeAuditMetadata({
        acceptedIp: '203.0.113.45',
        policyVersion: '2026-10-v2',
      }) as Record<string, unknown>;
      expect(masked.acceptedIp).toBe('***');
      expect(masked.policyVersion).toBe('2026-10-v2');
    });

    it('should reject createReservation with 400 MESSAGE_CODE_322 when termsAccepted is false', async () => {
      const checkInDate = addDays(startOfDayVN(), 5).toISOString();

      await expect(
        reservationService.createReservation(TEST_USERS.customer1.id, {
          facilityId: TEST_FACILITY_A_ID,
          storageUnitId: unit1Id.toString(),
          facilityUnitTypeOfferingId: offeringId.toString(),
          checkInDate,
          checkInTimeSlot: '09:00 - 11:00',
          rentalDuration: 1,
          amenities: [],
          termsAccepted: false,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_322,
      });
    });

    it('should reject POST /reservations via HTTP with 400 when termsAccepted is missing or false', async () => {
      const checkInDate = addDays(startOfDayVN(), 5).toISOString();
      const authHeaders = getAuthHeaders(TEST_USERS.customer1);

      // Missing termsAccepted -> Zod validation 400
      const missingRes = await request(app)
        .post('/reservations')
        .set(authHeaders)
        .send({
          facilityId: TEST_FACILITY_A_ID,
          storageUnitId: unit1Id.toString(),
          facilityUnitTypeOfferingId: offeringId.toString(),
          checkInDate,
          checkInTimeSlot: '09:00 - 11:00',
          rentalDuration: 1,
        });
      expect(missingRes.status).toBe(400);

      // termsAccepted: false -> Service 400 MESSAGE_CODE_322
      const falseRes = await request(app)
        .post('/reservations')
        .set(authHeaders)
        .send({
          facilityId: TEST_FACILITY_A_ID,
          storageUnitId: unit1Id.toString(),
          facilityUnitTypeOfferingId: offeringId.toString(),
          checkInDate,
          checkInTimeSlot: '09:00 - 11:00',
          rentalDuration: 1,
          termsAccepted: false,
        });
      expect(falseRes.status).toBe(400);
      expect(falseRes.body.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_322);
    });
  });

  describe('3. Snapshot Immutability in Cancel & Overdue Flows', () => {
    it('should evaluate free-cancel window using reservation policySnapshot even after env config changes', async () => {
      // Snapshot at creation: freeCancelHours = 12
      // Target check-in is ~35h away (>= 12h snapshot, < 72h current env)
      const checkInDate = new Date(Date.now() + 48 * 3600 * 1000);
      const reservation = await Reservation.create({
        reservationCode: 'RES-SNAP-IMMUTABLE',
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        facilityUnitTypeOfferingId: offeringId,
        storageUnitId: unit1Id,
        startDate: checkInDate,
        checkInDate,
        checkInTimeSlot: '09:00 - 11:00',
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
        basePrice: 1000000,
        depositAmount: 1000000,
        amenities: [],
        totalAmount: 1000000,
        status: ReservationStatusEnum.CONFIRMED,
        paidAt: new Date(),
        paidAmount: 1000000,
        termsAccepted: true,
        policyVersion: '2026-10-v1',
        acceptedAt: new Date(),
        policySnapshot: {
          freeCancelHours: 12,
          forfeitPercent: 100,
          noShowGraceHours: 24,
        },
      });
      await StorageUnit.findByIdAndUpdate(unit1Id, {
        status: StorageUnitStatusEnum.RESERVED,
      });

      // Later, facility changes env config to 72 hours!
      process.env.RESERVATION_FREE_CANCEL_HOURS = '72';

      // Customer cancels with 24h remaining (>= 12h snapshot, < 72h current env)
      const cancelled = await reservationService.cancelReservation(
        reservation._id.toString(),
        TEST_USERS.customer1.id,
        RoleEnum.CUSTOMER,
        { cancellationReason: 'Changed travel plan' }
      );

      // Must honor snapshot (12h) -> 100% refund!
      expect(cancelled.refundAmount).toBe(1000000);
      expect(cancelled.forfeitedAmount).toBe(0);
      expect(cancelled.refundStatus).toBe(RefundStatusEnum.PENDING);
    });

    it('should apply snapshot forfeitPercent on late cancel, create RefundRequest for remainder, and block cross-customer cancel', async () => {
      // Snapshot: freeCancelHours = 48, forfeitPercent = 60%
      const checkInDate = new Date(Date.now() + 12 * 3600 * 1000); // 12h from now (< 48h)
      const reservation = await Reservation.create({
        reservationCode: 'RES-SNAP-PARTIAL-FORFEIT',
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        facilityUnitTypeOfferingId: offeringId,
        storageUnitId: unit1Id,
        startDate: checkInDate,
        checkInDate,
        checkInTimeSlot: '09:00 - 11:00',
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
        basePrice: 1000000,
        depositAmount: 1000000,
        amenities: [],
        totalAmount: 1000000,
        status: ReservationStatusEnum.CONFIRMED,
        paidAt: new Date(),
        paidAmount: 1000000,
        termsAccepted: true,
        policyVersion: '2026-10-v1',
        acceptedAt: new Date(),
        policySnapshot: {
          freeCancelHours: 48,
          forfeitPercent: 60,
          noShowGraceHours: 24,
        },
      });
      await StorageUnit.findByIdAndUpdate(unit1Id, {
        status: StorageUnitStatusEnum.RESERVED,
      });

      // Cross-customer (customer2) must be rejected with 403
      await expect(
        reservationService.cancelReservation(
          reservation._id.toString(),
          TEST_USERS.customer2.id,
          RoleEnum.CUSTOMER,
          { cancellationReason: 'Malicious cancel attempt' }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });

      // Owner cancels late -> 60% forfeited (600,000), 40% refunded (400,000)
      const cancelled = await reservationService.cancelReservation(
        reservation._id.toString(),
        TEST_USERS.customer1.id,
        RoleEnum.CUSTOMER,
        { cancellationReason: 'Late cancellation by owner' }
      );

      expect(cancelled.forfeitedAmount).toBe(600000);
      expect(cancelled.refundAmount).toBe(400000);
      expect(cancelled.refundStatus).toBe(RefundStatusEnum.PENDING);

      // Verify RefundRequest created for the 400,000 remainder
      const refunds = await RefundRequest.find({
        reservationId: reservation._id,
      }).lean();
      expect(refunds).toHaveLength(1);
      expect(refunds[0].amount).toBe(400000);
    });

    it('should use snapshot noShowGraceHours and forfeitPercent in processOverdueReservations and support legacy records', async () => {
      const yesterday = addDays(startOfDayVN(), -1);

      // Reservation 1: CONFIRMED past checkInDate, snapshot noShowGraceHours = 48 (env = 24)
      const resOverdueCandidate = await Reservation.create({
        reservationCode: 'RES-OVERDUE-SNAP',
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        facilityUnitTypeOfferingId: offeringId,
        storageUnitId: unit1Id,
        startDate: yesterday,
        checkInDate: yesterday,
        checkInTimeSlot: '09:00 - 11:00',
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
        basePrice: 1000000,
        depositAmount: 1000000,
        amenities: [],
        totalAmount: 1000000,
        status: ReservationStatusEnum.CONFIRMED,
        termsAccepted: true,
        policyVersion: '2026-10-v1',
        policySnapshot: {
          freeCancelHours: 24,
          forfeitPercent: 100,
          noShowGraceHours: 48,
        },
      });
      await StorageUnit.findByIdAndUpdate(unit1Id, {
        status: StorageUnitStatusEnum.RESERVED,
      });

      // Reservation 2: Legacy OVERDUE past graceExpiresAt without policySnapshot
      const pastGrace = new Date(Date.now() - 3600 * 1000);
      const resLegacyNoShow = await Reservation.create({
        reservationCode: 'RES-LEGACY-NOSHOW',
        customerId: new Types.ObjectId(TEST_USERS.customer2.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        facilityUnitTypeOfferingId: offeringId,
        storageUnitId: unit2Id,
        startDate: yesterday,
        checkInDate: yesterday,
        checkInTimeSlot: '09:00 - 11:00',
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
        basePrice: 1000000,
        depositAmount: 1000000,
        amenities: [],
        totalAmount: 1000000,
        status: ReservationStatusEnum.OVERDUE,
        graceExpiresAt: pastGrace,
      });
      await StorageUnit.findByIdAndUpdate(unit2Id, {
        status: StorageUnitStatusEnum.RESERVED,
      });

      process.env.RESERVATION_OVERDUE_GRACE_HOURS = '24';

      const summary = await reservationService.processOverdueReservations();
      expect(summary.overdueCount).toBe(1);
      expect(summary.noShowCount).toBe(1);

      const updatedOverdue = await Reservation.findById(
        resOverdueCandidate._id
      ).lean();
      expect(updatedOverdue?.status).toBe(ReservationStatusEnum.OVERDUE);
      const expectedGrace = new Date(
        endOfDayVN(yesterday).getTime() + 48 * 3600 * 1000
      );
      expect(updatedOverdue?.graceExpiresAt?.toISOString()).toBe(
        expectedGrace.toISOString()
      );

      const updatedLegacyNoShow = await Reservation.findById(
        resLegacyNoShow._id
      ).lean();
      expect(updatedLegacyNoShow?.status).toBe(ReservationStatusEnum.CANCELLED);
      expect(updatedLegacyNoShow?.forfeitedAmount).toBe(1000000);
      expect(updatedLegacyNoShow?.refundAmount).toBe(0);
    });

    it('should backfill legacy reservations idempotently without overwriting existing snapshots', async () => {
      const checkInDate = addDays(startOfDayVN(), 3);

      // Legacy reservation without policySnapshot
      const legacyDoc = await Reservation.create({
        reservationCode: 'RES-MIG-LEGACY',
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        facilityUnitTypeOfferingId: offeringId,
        storageUnitId: unit1Id,
        startDate: checkInDate,
        checkInDate,
        checkInTimeSlot: '09:00 - 11:00',
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
        basePrice: 1000000,
        depositAmount: 1000000,
        amenities: [],
        totalAmount: 1000000,
        status: ReservationStatusEnum.CONFIRMED,
      });

      // Modern reservation with custom snapshot
      const modernDoc = await Reservation.create({
        reservationCode: 'RES-MIG-MODERN',
        customerId: new Types.ObjectId(TEST_USERS.customer2.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        facilityUnitTypeOfferingId: offeringId,
        storageUnitId: unit2Id,
        startDate: checkInDate,
        checkInDate,
        checkInTimeSlot: '09:00 - 11:00',
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
        basePrice: 1000000,
        depositAmount: 1000000,
        amenities: [],
        totalAmount: 1000000,
        status: ReservationStatusEnum.CONFIRMED,
        termsAccepted: true,
        policyVersion: '2026-10-custom',
        policySnapshot: {
          freeCancelHours: 72,
          forfeitPercent: 50,
          noShowGraceHours: 36,
        },
      });

      const firstRun = await runReservationPolicySnapshotMigration();
      expect(firstRun.scanned).toBe(1);
      expect(firstRun.migrated).toBe(1);

      const backfilled = await Reservation.findById(legacyDoc._id).lean();
      expect(backfilled?.policyVersion).toBe('legacy');
      expect(backfilled?.termsAccepted).toBe(false);
      expect(backfilled?.policySnapshot).toEqual({
        freeCancelHours: 24,
        forfeitPercent: 100,
        noShowGraceHours: 24,
        cancellationMode: 'slot_start',
      });

      // Second run must be idempotent (0 scanned, 0 migrated) and leave modernDoc untouched
      const secondRun = await runReservationPolicySnapshotMigration();
      expect(secondRun.scanned).toBe(0);
      expect(secondRun.migrated).toBe(0);

      const untouchedModern = await Reservation.findById(modernDoc._id).lean();
      expect(untouchedModern?.policyVersion).toBe('2026-10-custom');
      expect(untouchedModern?.policySnapshot?.freeCancelHours).toBe(72);
    });
  });
});
