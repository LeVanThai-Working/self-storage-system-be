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
import { StorageUnitService } from '../src/modules/storageUnit/storageUnit.service.ts';
import { StorageUnitController } from '../src/modules/storageUnit/storageUnit.controller.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { UnitTypeRepository } from '../src/modules/unitType/unitType.repository.ts';
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
import type { AuditLogService } from '../src/modules/auditLog/auditLog.service.ts';
import '../src/modules/storageRack/storageRack.model.ts';
import '../src/modules/storageRack/rackTier.model.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import {
  ContractAddendumStatusEnum,
  ContractAddendumTypeEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { ReservationStatusEnum } from '../src/common/enums/reservation.enum.ts';
import { addDays } from '../src/utils/date.util.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import type { Request as ExpressRequest } from 'express';

const subDays = (d: Date, days: number) =>
  new Date(d.getTime() - days * 86400000);

describe('booking/T3.5 — Contract TTL & Storage Unit Reconciliation', () => {
  let contractService: ContractService;
  let storageUnitService: StorageUnitService;
  let storageUnitController: StorageUnitController;
  let contractRepo: ContractRepository;
  let storageUnitRepo: StorageUnitRepository;
  let reservationRepo: ReservationRepository;
  let mockAuditLogService: {
    record: ReturnType<typeof vi.fn>;
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
    const unitTypeRepo = new UnitTypeRepository(UnitType);
    const userRepo = new UserRepository(User);
    const refundRepo = new RefundRequestRepository(RefundRequest);
    const refundService = new RefundRequestService(refundRepo);
    const customerInventoryRepo = new CustomerInventoryRepository(
      CustomerInventory
    );
    const incidentRepo = new IncidentRepository(Incident);

    mockAuditLogService = {
      record: vi.fn(),
    };

    contractService = new ContractService(
      contractRepo,
      reservationRepo,
      storageUnitRepo,
      amenityOfferingRepo,
      futoRepo,
      facilityRepo,
      userRepo,
      mockAuditLogService as unknown as AuditLogService,
      refundService,
      customerInventoryRepo,
      incidentRepo
    );

    storageUnitService = new StorageUnitService(
      storageUnitRepo,
      facilityRepo,
      unitTypeRepo,
      futoRepo,
      customerInventoryRepo,
      mockAuditLogService as unknown as AuditLogService,
      reservationRepo,
      contractRepo
    );

    storageUnitController = new StorageUnitController(storageUnitService);

    // Setup Facility
    await Facility.create({
      _id: new Types.ObjectId(TEST_FACILITY_A_ID),
      name: 'Chi Nhanh Q1 HCM',
      code: 'FAC01',
      address: '123 Nguyen Hue',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
      managerId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
      operatingHours: { open: '08:00', close: '22:00' },
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

  it('automatically cancels expired Walk-in contract DRAFT and releases storage unit back to AVAILABLE', async () => {
    const unit = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-TTL-01',
      floor: 1,
      status: StorageUnitStatusEnum.RESERVED,
    });

    const now = new Date();
    const expiredAt = subDays(now, 1);

    const contract = await Contract.create({
      contractCode: 'CTR-TTL-EXPIRED-01',
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
      rentalPrice: 1200000,
      totalPeriodicPrice: 1200000,
      status: ContractStatusEnum.DRAFT,
      expiresAt: expiredAt,
      deleted: false,
    });

    const result = await contractService.processExpiredDrafts(now);
    expect(result.expiredContractsCount).toBe(1);

    // Verify contract is CANCELLED
    const updatedContract = await contractRepo.findById(
      contract._id.toString()
    );
    expect(updatedContract?.status).toBe(ContractStatusEnum.CANCELLED);
    expect(updatedContract?.cancellationReason).toBe('DRAFT_EXPIRED');

    // Verify storage unit is released to AVAILABLE
    const updatedUnit = await storageUnitRepo.findById(unit._id.toString());
    expect(updatedUnit?.status).toBe(StorageUnitStatusEnum.AVAILABLE);
  });

  it('automatically cancels expired Addendum and releases proposed storage unit', async () => {
    const unitOld = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-TTL-OLD',
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });

    const unitNew = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-TTL-NEW',
      floor: 1,
      status: StorageUnitStatusEnum.RESERVED,
    });

    const now = new Date();
    const expiredAt = subDays(now, 1);

    const contract = await Contract.create({
      contractCode: 'CTR-ADDENDUM-TTL-01',
      source: ContractSourceEnum.WALK_IN,
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      storageUnitId: unitOld._id,
      facilityUnitTypeOfferingId: facilityOfferingId,
      billingUnit: BillingUnitEnum.MONTH,
      rentalDuration: 1,
      startDate: subDays(now, 10),
      endDate: addDays(now, 20),
      depositAmount: 240000,
      rentalPrice: 1200000,
      totalPeriodicPrice: 1200000,
      status: ContractStatusEnum.ACTIVE,
      addendums: [
        {
          addendumCode: 'ADD-01',
          type: ContractAddendumTypeEnum.UNIT_CHANGE,
          previousStorageUnitId: unitOld._id,
          newStorageUnitId: unitNew._id,
          amenities: [],
          totalPeriodicPrice: 1200000,
          damageFee: 0,
          status: ContractAddendumStatusEnum.PENDING_APPROVAL,
          requestedBy: new Types.ObjectId(TEST_USERS.customer1.id),
          requestedAt: subDays(now, 3),
          expiresAt: expiredAt,
          customerSigned: false,
          staffSigned: false,
        },
      ],
      deleted: false,
    });

    const result = await contractService.processExpiredDrafts(now);
    expect(result.expiredAddendumsCount).toBe(1);

    // Verify addendum is CANCELLED
    const updatedContract = await contractRepo.findById(
      contract._id.toString()
    );
    expect(updatedContract?.addendums[0].status).toBe(
      ContractAddendumStatusEnum.CANCELLED
    );
    expect(updatedContract?.addendums[0].cancellationReason).toBe(
      'ADDENDUM_EXPIRED'
    );

    // Verify new unit is released to AVAILABLE
    const updatedUnit = await storageUnitRepo.findById(unitNew._id.toString());
    expect(updatedUnit?.status).toBe(StorageUnitStatusEnum.AVAILABLE);
  });

  it('guards toggleMaintenance and deleteStorageUnit when storage unit is held by active reservation or contract', async () => {
    const unit1 = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-GUARD-01',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });

    // Create active reservation referencing unit1
    await Reservation.create({
      reservationCode: 'RES-GUARD-01',
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityUnitTypeOfferingId: facilityOfferingId,
      storageUnitId: unit1._id,
      startDate: new Date(),
      checkInDate: new Date(),
      checkInTimeSlot: '09:00 - 11:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1200000,
      totalAmount: 1200000,
      depositAmount: 240000,
      status: ReservationStatusEnum.CONFIRMED,
      deleted: false,
    });

    // Attempt to put unit1 under maintenance -> Should throw 400 MESSAGE_CODE_629
    await expect(
      storageUnitService.toggleMaintenance(unit1._id.toString(), {
        isUnderMaintenance: true,
      })
    ).rejects.toThrow(
      expect.objectContaining({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_629,
      })
    );

    // Attempt to delete unit1 -> Should throw 400 MESSAGE_CODE_629
    await expect(
      storageUnitService.deleteStorageUnit(unit1._id.toString())
    ).rejects.toThrow(
      expect.objectContaining({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_629,
      })
    );
  });

  it('reconciles orphan RESERVED units and leaves legitimate reserved units untouched', async () => {
    // Unit A: Legitimate RESERVED (has confirmed reservation)
    const unitLegit = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-LEGIT-01',
      floor: 1,
      status: StorageUnitStatusEnum.RESERVED,
    });

    await Reservation.create({
      reservationCode: 'RES-LEGIT-01',
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityUnitTypeOfferingId: facilityOfferingId,
      storageUnitId: unitLegit._id,
      startDate: new Date(),
      checkInDate: new Date(),
      checkInTimeSlot: '09:00 - 11:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1200000,
      totalAmount: 1200000,
      depositAmount: 240000,
      status: ReservationStatusEnum.CONFIRMED,
      deleted: false,
    });

    // Unit B: Orphaned RESERVED (NO reservation, NO contract)
    const unitOrphan = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId,
      unitNumber: 'U-ORPHAN-01',
      floor: 1,
      status: StorageUnitStatusEnum.RESERVED,
    });

    // Call reconcile via controller
    const mockReq = {
      user: {
        _id: new Types.ObjectId(TEST_USERS.opsManager.id),
        role: RoleEnum.BUSINESS_OPS_MANAGER,
      },
      headers: {},
    } as unknown as ExpressRequest;

    const response = await storageUnitController.reconcile(mockReq);

    expect(response.success).toBe(true);
    expect(response.data.reconciledCount).toBe(1);
    expect(response.data.details[0].unitId).toBe(unitOrphan._id.toString());

    // Verify unitOrphan status restored to AVAILABLE
    const refreshedOrphan = await storageUnitRepo.findById(
      unitOrphan._id.toString()
    );
    expect(refreshedOrphan?.status).toBe(StorageUnitStatusEnum.AVAILABLE);

    // Verify unitLegit status remains RESERVED
    const refreshedLegit = await storageUnitRepo.findById(
      unitLegit._id.toString()
    );
    expect(refreshedLegit?.status).toBe(StorageUnitStatusEnum.RESERVED);
  });
});
