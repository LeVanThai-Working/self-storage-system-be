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
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { ContractController } from '../src/modules/contract/contract.controller.ts';
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
import {
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { addDays, startOfDayVN } from '../src/utils/date.util.ts';
import type { Request as ExpressRequest } from 'express';

const subDays = (d: Date, days: number) =>
  new Date(d.getTime() - days * 86400000);

describe('booking/T3.3 — Contract OVERDUE Job & Expiry Reminders', () => {
  let contractService: ContractService;
  let contractController: ContractController;
  let contractRepo: ContractRepository;
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
    const reservationRepo = new ReservationRepository(Reservation);
    const storageUnitRepo = new StorageUnitRepository(StorageUnit);
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
      incidentRepo
    );

    contractController = new ContractController(contractService);

    // Setup Facility
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

    // Setup UnitType
    const unitType = await UnitType.create({
      name: 'Standard Box T33',
      category: UnitTypeCategoryEnum.LOCKER,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { length: 1, width: 1, height: 1 },
      area: 1,
      volume: 1,
    });
    unitTypeId = unitType._id as Types.ObjectId;

    // Setup Facility Offering
    const futo = await FacilityUnitTypeOffering.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      pricePerUnit: 3000000,
      billingUnit: BillingUnitEnum.MONTH,
      status: 'active',
      pricingTiers: [
        { minDurationMonths: 1, maxDurationMonths: 12, discountPercentage: 0 },
      ],
      depositRule: { type: 'fixed', fixedAmount: 3000000 },
    });
    facilityOfferingId = futo._id as Types.ObjectId;
  });

  const createActiveContractFixture = async (
    code: string,
    endDate: Date,
    rentalPrice: number = 3000000
  ) => {
    const unit = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: `U-${code}`,
      status: StorageUnitStatusEnum.OCCUPIED,
    });

    return Contract.create({
      contractCode: code,
      source: ContractSourceEnum.WALK_IN,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId: unit._id,
      facilityUnitTypeOfferingId: facilityOfferingId,
      startDate: subDays(endDate, 30),
      endDate,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice,
      depositAmount: rentalPrice,
      totalPeriodicPrice: rentalPrice,
      damageFee: 0,
      overdueFee: 0,
      refundAmount: 0,
      additionalPaymentRequired: 0,
      status: ContractStatusEnum.ACTIVE,
      termsAccepted: true,
      customerSigned: true,
      staffSigned: true,
    });
  };

  it('1. should scan expired active contracts and transition them to OVERDUE with calculated fee', async () => {
    const now = new Date();
    // Ended 3 days ago
    const pastEndDate = subDays(now, 3);
    const c1 = await createActiveContractFixture(
      'CTR-T33-01',
      pastEndDate,
      3000000
    );

    const result = await contractService.processOverdueContracts({ limit: 10 });
    expect(result.overdueCount).toBe(1);
    expect(result.failedCount).toBe(0);

    const updated = await Contract.findById(c1._id);
    expect(updated?.status).toBe(ContractStatusEnum.OVERDUE);
    expect(updated?.overdueFee).toBeGreaterThan(0);
  });

  it('2. should isolate failures so an error in one contract does not abort processing of others', async () => {
    const now = new Date();
    const pastEndDate = subDays(now, 2);
    const c1 = await createActiveContractFixture('CTR-T33-OK1', pastEndDate);
    const c2 = await createActiveContractFixture('CTR-T33-FAIL', pastEndDate);
    const c3 = await createActiveContractFixture('CTR-T33-OK2', pastEndDate);

    // Spy on processSingleOverdueContract to simulate failure specifically on c2
    const originalProcessSingle =
      contractService.processSingleOverdueContract.bind(contractService);
    vi.spyOn(
      contractService,
      'processSingleOverdueContract'
    ).mockImplementation(async (id: string, n?: Date, s?: ClientSession) => {
      if (id === c2._id.toString()) {
        throw new Error('Transient DB simulation error on c2');
      }
      return originalProcessSingle(id, n, s);
    });

    const result = await contractService.processOverdueContracts({ limit: 10 });

    expect(result.overdueCount).toBe(2);
    expect(result.failedCount).toBe(1);

    const checkC1 = await Contract.findById(c1._id);
    const checkC2 = await Contract.findById(c2._id);
    const checkC3 = await Contract.findById(c3._id);

    expect(checkC1?.status).toBe(ContractStatusEnum.OVERDUE);
    expect(checkC2?.status).toBe(ContractStatusEnum.ACTIVE); // preserved
    expect(checkC3?.status).toBe(ContractStatusEnum.OVERDUE);
  });

  it('3. should be idempotent and not re-process contracts already transitioned to OVERDUE', async () => {
    const now = new Date();
    const pastEndDate = subDays(now, 2);
    await createActiveContractFixture('CTR-T33-IDEMP', pastEndDate);

    const firstRun = await contractService.processOverdueContracts({
      limit: 10,
    });
    expect(firstRun.overdueCount).toBe(1);

    const secondRun = await contractService.processOverdueContracts({
      limit: 10,
    });
    expect(secondRun.overdueCount).toBe(0);
  });

  it('4. should enforce RBAC on POST /contracts/process-overdue (OPS & ADMIN only)', async () => {
    const now = new Date();
    await createActiveContractFixture('CTR-T33-API', subDays(now, 2));

    const customerReq = {
      headers: {},
      user: {
        _id: TEST_USERS.customer1.id,
        role: RoleEnum.CUSTOMER,
      },
    } as unknown as ExpressRequest;

    await expect(
      contractController.processOverdue(customerReq, {})
    ).rejects.toThrow();

    const opsReq = {
      headers: {},
      user: {
        _id: TEST_USERS.opsManager.id,
        role: RoleEnum.BUSINESS_OPS_MANAGER,
      },
    } as unknown as ExpressRequest;

    const response = await contractController.processOverdue(opsReq, {});
    expect(response.success).toBe(true);
    expect(response.data.overdueCount).toBe(1);
  });

  it('5. should identify contracts approaching expiry in 30, 7, and 1 days for reminder notifications', async () => {
    const now = new Date();
    // Expiry in 30 days
    await createActiveContractFixture(
      'CTR-EXP-30',
      addDays(startOfDayVN(now), 30)
    );
    // Expiry in 7 days
    await createActiveContractFixture(
      'CTR-EXP-7',
      addDays(startOfDayVN(now), 7)
    );
    // Expiry in 1 day
    await createActiveContractFixture(
      'CTR-EXP-1',
      addDays(startOfDayVN(now), 1)
    );
    // Expiry in 15 days (should not trigger 30, 7, 1)
    await createActiveContractFixture(
      'CTR-EXP-15',
      addDays(startOfDayVN(now), 15)
    );

    const reminderResult = await contractService.processExpiryReminders(now);
    expect(reminderResult.remindedCount).toBe(3);
  });
});
