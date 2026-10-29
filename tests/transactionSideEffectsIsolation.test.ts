import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { type ClientSession, Types } from 'mongoose';
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
  runAfterCommit,
  createTransactionScope,
  runInTransactionScope,
  flushAfterCommitHooks,
} from '../src/utils/transactionScope.util.ts';
import { Transactional } from '../src/common/decorators/transactional.decorator.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
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
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import {
  AuthProviderEnum,
  RoleEnum,
  UserStatusEnum,
} from '../src/common/enums/user.enum.ts';
import type { NotificationService } from '../src/modules/notification/notification.service.ts';
import type { ReservationQueue } from '../src/modules/reservation/reservation.queue.ts';

// Helper service with @Transactional() applied explicitly for vitest compatibility
class DummyTransactionalService {
  async successfulTx(sideEffectFn: () => void, session?: ClientSession) {
    // Perform a db write
    await User.create(
      [
        {
          name: 'TxUserSuccess',
          email: 'tx_success@test.com',
          role: RoleEnum.CUSTOMER,
          authProvider: AuthProviderEnum.GOOGLE,
          status: UserStatusEnum.ACTIVE,
          isEmailVerified: true,
        },
      ],
      { session }
    );
    runAfterCommit(sideEffectFn);
    return 'SUCCESS';
  }

  async failingTx(sideEffectFn: () => void, session?: ClientSession) {
    // Perform a db write then throw error to trigger rollback
    await User.create(
      [
        {
          name: 'TxUserFail',
          email: 'tx_fail@test.com',
          role: RoleEnum.CUSTOMER,
          authProvider: AuthProviderEnum.GOOGLE,
          status: UserStatusEnum.ACTIVE,
          isEmailVerified: true,
        },
      ],
      { session }
    );
    runAfterCommit(sideEffectFn);
    throw new Error('Simulated Transaction Failure');
  }

  async asyncHookTx(
    asyncSideEffectFn: () => Promise<void>,
    session?: ClientSession
  ) {
    await User.create(
      [
        {
          name: 'TxUserAsync',
          email: 'tx_async@test.com',
          role: RoleEnum.CUSTOMER,
          authProvider: AuthProviderEnum.GOOGLE,
          status: UserStatusEnum.ACTIVE,
          isEmailVerified: true,
        },
      ],
      { session }
    );
    runAfterCommit(asyncSideEffectFn);
    return 'ASYNC_SUCCESS';
  }
}

function applyTransactional(target: unknown, propertyKey: string) {
  const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey)!;
  Transactional()(target, propertyKey, descriptor);
  Object.defineProperty(target, propertyKey, descriptor);
}

applyTransactional(DummyTransactionalService.prototype, 'successfulTx');
applyTransactional(DummyTransactionalService.prototype, 'failingTx');
applyTransactional(DummyTransactionalService.prototype, 'asyncHookTx');

describe('booking/T3.2 — Side effects only run after commit', () => {
  let reservationService: ReservationService;
  let storageUnitRepo: StorageUnitRepository;
  let facilityUnitTypeOfferingId: Types.ObjectId;
  let unitTypeId: Types.ObjectId;
  let storageUnitId: Types.ObjectId;

  const mockSendNotification = vi
    .fn()
    .mockResolvedValue({ id: 'mock-notif-id' });
  const mockAddExpireReservationJob = vi.fn().mockResolvedValue(undefined);
  const mockRemoveExpireReservationJob = vi.fn().mockResolvedValue(undefined);

  const mockNotificationService = {
    sendNotification: mockSendNotification,
  } as unknown as NotificationService;

  const mockReservationQueue = {
    addExpireReservationJob: mockAddExpireReservationJob,
    removeExpireReservationJob: mockRemoveExpireReservationJob,
  } as unknown as ReservationQueue;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();
    vi.clearAllMocks();

    const facilityRepo = new FacilityRepository(Facility);
    const userRepo = new UserRepository(User);
    storageUnitRepo = new StorageUnitRepository(StorageUnit);
    const amenityOfferingRepo = new FacilityAmenityOfferingRepository(
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
      mockNotificationService,
      mockReservationQueue,
      contractRepo,
      refundService,
      incidentRepo,
      undefined,
      inventoryRepo
    );

    // Setup facility
    await Facility.create({
      _id: new Types.ObjectId(TEST_FACILITY_A_ID),
      name: 'Facility A - District 1',
      address: '123 Nguyen Hue',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
      managerId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
      operatingHours: { open: '08:00', close: '20:00' },
      timezone: 'Asia/Ho_Chi_Minh',
    });

    // Setup base unit type and storage unit
    const unitType = await UnitType.create({
      name: 'Standard Box',
      category: UnitTypeCategoryEnum.LOCKER,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { length: 1, width: 1, height: 1 },
      area: 1,
      volume: 1,
    });
    unitTypeId = unitType._id as Types.ObjectId;

    const futo = await FacilityUnitTypeOffering.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      pricePerUnit: 500000,
      billingUnit: BillingUnitEnum.MONTH,
      status: 'active',
      pricingTiers: [
        { minDurationMonths: 1, maxDurationMonths: 12, discountPercentage: 0 },
      ],
      depositRule: { type: 'fixed', fixedAmount: 500000 },
    });
    facilityUnitTypeOfferingId = futo._id as Types.ObjectId;

    const storageUnit = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'UNIT-TX-01',
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    storageUnitId = storageUnit._id as Types.ObjectId;
  });

  describe('1. TransactionScope & runAfterCommit Unit Behavior', () => {
    it('should execute hook immediately when called outside of a transaction scope', () => {
      const effect = vi.fn();
      runAfterCommit(effect);
      expect(effect).toHaveBeenCalledTimes(1);
    });

    it('should defer hook execution until flushAfterCommitHooks is called inside transaction scope', async () => {
      const scope = createTransactionScope();
      const effect = vi.fn();

      await runInTransactionScope(scope, async () => {
        runAfterCommit(effect);
        expect(effect).not.toHaveBeenCalled();
      });

      expect(effect).not.toHaveBeenCalled();
      await flushAfterCommitHooks(scope);
      expect(effect).toHaveBeenCalledTimes(1);
    });

    it('should discard registered hooks when scope is cleared on rollback', async () => {
      const dummyService = new DummyTransactionalService();
      const effect = vi.fn();

      await expect(dummyService.failingTx(effect)).rejects.toThrow(
        'Simulated Transaction Failure'
      );

      // The hook must NEVER be called because the transaction failed and rolled back
      expect(effect).not.toHaveBeenCalled();

      // Check DB: TxUserFail was rolled back
      const createdUser = await User.findOne({ email: 'tx_fail@test.com' });
      expect(createdUser).toBeNull();
    });

    it('should execute registered hooks exactly once when @Transactional commits', async () => {
      const dummyService = new DummyTransactionalService();
      const effect = vi.fn();

      const result = await dummyService.successfulTx(effect);
      expect(result).toBe('SUCCESS');
      expect(effect).toHaveBeenCalledTimes(1);

      // Check DB: TxUserSuccess was committed
      const createdUser = await User.findOne({ email: 'tx_success@test.com' });
      expect(createdUser).not.toBeNull();
    });

    it('should safely handle async hooks and promise rejections without crashing', async () => {
      const dummyService = new DummyTransactionalService();
      const asyncEffect = vi
        .fn()
        .mockRejectedValue(new Error('Async side effect network error'));

      const result = await dummyService.asyncHookTx(asyncEffect);
      expect(result).toBe('ASYNC_SUCCESS');
      expect(asyncEffect).toHaveBeenCalledTimes(1);

      // Even if async hook rejected, the transaction remains committed
      const createdUser = await User.findOne({ email: 'tx_async@test.com' });
      expect(createdUser).not.toBeNull();
    });

    it('should safely handle async hook error outside of a transaction scope', async () => {
      const asyncErrorHook = vi
        .fn()
        .mockRejectedValue(new Error('Sync/Async outside tx error'));
      expect(() => runAfterCommit(asyncErrorHook)).not.toThrow();
      expect(asyncErrorHook).toHaveBeenCalledTimes(1);
    });

    it('should discard hooks from failed retry attempts and only fire once after successful commit', async () => {
      const scope = createTransactionScope();
      const effectAttempt1 = vi.fn();
      const effectAttempt2 = vi.fn();

      await runInTransactionScope(scope, async () => {
        // Attempt 1: registers hook, then fails
        scope.afterCommitHooks = [];
        runAfterCommit(effectAttempt1);
        // Simulate retry: reset afterCommitHooks
        scope.afterCommitHooks = [];

        // Attempt 2: registers hook, succeeds
        runAfterCommit(effectAttempt2);
      });

      await flushAfterCommitHooks(scope);

      expect(effectAttempt1).not.toHaveBeenCalled();
      expect(effectAttempt2).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. ReservationService Transaction Side Effect Isolation', () => {
    it('should NOT send notifications or add BullMQ jobs if createReservation rolls back', async () => {
      // Intentionally simulate an error at the end of createReservation
      // (after notifyCustomer and scheduleExpirationJob have been called inside the method body)
      vi.spyOn(
        reservationService as unknown as { formatReservation: () => unknown },
        'formatReservation'
      ).mockImplementationOnce(() => {
        throw new Error('Simulated Error After Side Effect Registration');
      });

      const createInput = {
        facilityId: TEST_FACILITY_A_ID,
        facilityOfferingId: facilityUnitTypeOfferingId.toString(),
        storageUnitId: storageUnitId.toString(),
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
        checkInTimeSlot: '09:00 - 11:00',
        checkInDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        termsAccepted: true,
      };

      await expect(
        reservationService.createReservation(
          TEST_USERS.customer1.id,
          createInput
        )
      ).rejects.toThrow('Simulated Error After Side Effect Registration');

      // Assert side effects: 0 notifications, 0 BullMQ jobs
      expect(mockSendNotification).not.toHaveBeenCalled();
      expect(mockAddExpireReservationJob).not.toHaveBeenCalled();

      // Verify no reservation created in DB
      const resCount = await Reservation.countDocuments();
      expect(resCount).toBe(0);
    });

    it('should send notification and add BullMQ job exactly once after createReservation commits', async () => {
      const createInput = {
        facilityId: TEST_FACILITY_A_ID,
        facilityOfferingId: facilityUnitTypeOfferingId.toString(),
        storageUnitId: storageUnitId.toString(),
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
        checkInTimeSlot: '09:00 - 11:00',
        checkInDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        termsAccepted: true,
      };

      const result = await reservationService.createReservation(
        TEST_USERS.customer1.id,
        createInput
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      // Side effects should have run after commit
      expect(mockAddExpireReservationJob).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalled();
    });

    it('should remove BullMQ job and send notifications after markDepositPaid commits', async () => {
      const createInput = {
        facilityId: TEST_FACILITY_A_ID,
        facilityOfferingId: facilityUnitTypeOfferingId.toString(),
        storageUnitId: storageUnitId.toString(),
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
        checkInTimeSlot: '09:00 - 11:00',
        checkInDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        termsAccepted: true,
      };

      const created = await reservationService.createReservation(
        TEST_USERS.customer1.id,
        createInput
      );

      vi.clearAllMocks();

      const paymentInfo = {
        paymentId: new Types.ObjectId().toString(),
        paidAmount: 500000,
        paidAt: new Date(),
        referenceCode: 'REF-TX-01',
      };

      await reservationService.markDepositPaid(created.id, paymentInfo);

      // BullMQ expire job removed and confirmation notification sent
      expect(mockRemoveExpireReservationJob).toHaveBeenCalledWith(created.id);
      expect(mockSendNotification).toHaveBeenCalled();
    });

    it('should NOT remove BullMQ job or send notifications if markDepositPaid rolls back', async () => {
      const createInput = {
        facilityId: TEST_FACILITY_A_ID,
        facilityOfferingId: facilityUnitTypeOfferingId.toString(),
        storageUnitId: storageUnitId.toString(),
        rentalDuration: 1,
        billingUnit: BillingUnitEnum.MONTH,
        checkInTimeSlot: '09:00 - 11:00',
        checkInDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        termsAccepted: true,
      };

      const created = await reservationService.createReservation(
        TEST_USERS.customer1.id,
        createInput
      );

      vi.clearAllMocks();

      // Intentionally simulate an error at the end of markDepositPaid
      vi.spyOn(
        reservationService as unknown as { formatReservation: () => unknown },
        'formatReservation'
      ).mockImplementationOnce(() => {
        throw new Error('Simulated Error In markDepositPaid');
      });

      const paymentInfo = {
        paymentId: new Types.ObjectId().toString(),
        paidAmount: 500000,
        paidAt: new Date(),
        referenceCode: 'REF-TX-02',
      };

      await expect(
        reservationService.markDepositPaid(created.id, paymentInfo)
      ).rejects.toThrow('Simulated Error In markDepositPaid');

      // Side effects must NOT run because transaction rolled back
      expect(mockRemoveExpireReservationJob).not.toHaveBeenCalled();
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });
});
