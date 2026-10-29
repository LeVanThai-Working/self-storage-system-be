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
import { Incident } from '../src/modules/incident/incident.model.ts';
import { IncidentRepository } from '../src/modules/incident/incident.repository.ts';
import '../src/modules/storageRack/storageRack.model.ts';
import '../src/modules/storageRack/rackTier.model.ts';
import {
  ReservationStatusEnum,
  RefundStatusEnum,
  ReservationCancelSourceEnum,
} from '../src/common/enums/reservation.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../src/common/enums/facilityUnitTypeOffering.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { RefundReasonEnum } from '../src/common/enums/refundRequest.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { AppError } from '../src/common/errors/appError.error.ts';

describe('T2.9: Mở rộng reassign-unit (Propose & Confirm Workflow) [CHỐT D4]', () => {
  let reservationRepo: ReservationRepository;
  let reservationService: ReservationService;
  let contractRepo: ContractRepository;
  let storageUnitRepo: StorageUnitRepository;
  let amenityOfferingRepo: FacilityAmenityOfferingRepository;
  let unitTypeOfferingRepo: FacilityUnitTypeOfferingRepository;
  let facilityRepo: FacilityRepository;
  let userRepo: UserRepository;
  let refundRequestRepo: RefundRequestRepository;
  let refundRequestService: RefundRequestService;
  let incidentRepo: IncidentRepository;

  const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const otherFacilityId = new Types.ObjectId(TEST_FACILITY_B_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);

  const unitType1Id = new Types.ObjectId('65b000000000000000000001');
  const unitType2Id = new Types.ObjectId('65b000000000000000000002');
  const unitType3Id = new Types.ObjectId('65b000000000000000000003');

  const offering1Id = new Types.ObjectId('65d000000000000000000001'); // 1,000,000
  const offering2Id = new Types.ObjectId('65d000000000000000000002'); // 1,500,000 (upgrade)
  const offering3Id = new Types.ObjectId('65d000000000000000000003'); // 500,000 (downgrade)

  const unit1Id = new Types.ObjectId('65c000000000000000000001'); // UnitType1
  const unit2Id = new Types.ObjectId('65c000000000000000000002'); // UnitType2
  const unit3Id = new Types.ObjectId('65c000000000000000000003'); // UnitType3

  beforeAll(async () => {
    await setupTestDB();

    reservationRepo = new ReservationRepository(Reservation);
    contractRepo = new ContractRepository(Contract);
    storageUnitRepo = new StorageUnitRepository(StorageUnit);
    amenityOfferingRepo = new FacilityAmenityOfferingRepository(
      FacilityAmenityOffering
    );
    unitTypeOfferingRepo = new FacilityUnitTypeOfferingRepository(
      FacilityUnitTypeOffering
    );
    facilityRepo = new FacilityRepository(Facility);
    userRepo = new UserRepository(User);
    refundRequestRepo = new RefundRequestRepository(RefundRequest);
    refundRequestService = new RefundRequestService(
      refundRequestRepo,
      userRepo,
      reservationRepo,
      contractRepo
    );
    incidentRepo = new IncidentRepository(Incident);

    reservationService = new ReservationService(
      reservationRepo,
      facilityRepo,
      unitTypeOfferingRepo,
      amenityOfferingRepo,
      storageUnitRepo,
      userRepo,
      undefined, // paymentRepo
      undefined, // facilityTimeSlotRepo
      undefined, // auditLogService
      undefined, // notificationService
      undefined, // reservationQueue
      contractRepo,
      refundRequestService,
      incidentRepo
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    // Create Facility A & B
    await Facility.create({
      _id: facilityId,
      name: 'Storage Hub District 1',
      city: 'Ho Chi Minh',
      address: '123 Nguyen Hue',
      operatingHours: { open: '08:00', close: '20:00' },
      status: 'active',
    });

    await Facility.create({
      _id: otherFacilityId,
      name: 'Storage Hub District 7',
      city: 'Ho Chi Minh',
      address: '456 Nguyen Van Linh',
      operatingHours: { open: '08:00', close: '20:00' },
      status: 'active',
    });

    // Create Unit Types
    await UnitType.create([
      {
        _id: unitType1Id,
        name: 'Small Storage Unit',
        category: UnitTypeCategoryEnum.LOCKER,
        dimensions: { length: 1, width: 1, height: 1 },
        area: 1,
        volume: 1,
        status: UnitTypeStatusEnum.ACTIVE,
      },
      {
        _id: unitType2Id,
        name: 'Medium Storage Unit (Upgraded)',
        category: UnitTypeCategoryEnum.ROOM,
        dimensions: { length: 2, width: 2, height: 2 },
        area: 4,
        volume: 8,
        status: UnitTypeStatusEnum.ACTIVE,
      },
      {
        _id: unitType3Id,
        name: 'Mini Storage Unit (Cheaper)',
        category: UnitTypeCategoryEnum.LOCKER,
        dimensions: { length: 0.5, width: 0.5, height: 0.5 },
        area: 0.25,
        volume: 0.125,
        status: UnitTypeStatusEnum.ACTIVE,
      },
    ]);

    // Create Offerings
    await FacilityUnitTypeOffering.create([
      {
        _id: offering1Id,
        facilityId,
        unitTypeId: unitType1Id,
        billingUnit: BillingUnitEnum.MONTH,
        pricePerUnit: 1000000,
        status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
      },
      {
        _id: offering2Id,
        facilityId,
        unitTypeId: unitType2Id,
        billingUnit: BillingUnitEnum.MONTH,
        pricePerUnit: 1500000,
        status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
      },
      {
        _id: offering3Id,
        facilityId,
        unitTypeId: unitType3Id,
        billingUnit: BillingUnitEnum.MONTH,
        pricePerUnit: 500000,
        status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
      },
    ]);

    // Create Storage Units
    await StorageUnit.create([
      {
        _id: unit1Id,
        facilityId,
        unitTypeId: unitType1Id,
        unitNumber: 'U-101',
        floor: 1,
        zone: 'A',
        status: StorageUnitStatusEnum.RESERVED,
      },
      {
        _id: unit2Id,
        facilityId,
        unitTypeId: unitType2Id,
        unitNumber: 'U-201',
        floor: 2,
        zone: 'B',
        status: StorageUnitStatusEnum.AVAILABLE,
      },
      {
        _id: unit3Id,
        facilityId,
        unitTypeId: unitType3Id,
        unitNumber: 'U-001',
        floor: 1,
        zone: 'C',
        status: StorageUnitStatusEnum.AVAILABLE,
      },
    ]);
  });

  async function createConfirmedReservation(
    custom?: Partial<IReservation>
  ): Promise<IReservation> {
    const res = await Reservation.create({
      reservationCode: `RES-T29-${Date.now()}`,
      customerId,
      facilityId,
      facilityUnitTypeOfferingId: offering1Id,
      storageUnitId: unit1Id,
      startDate: new Date('2026-11-01'),
      checkInDate: new Date('2026-11-01'),
      checkInTimeSlot: '09:00 - 11:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1000000,
      depositAmount: 500000,
      amenities: [],
      totalAmount: 1500000,
      status: ReservationStatusEnum.CONFIRMED,
      termsAccepted: true,
      ...custom,
    });
    return res;
  }

  it('1. Propose Flow: Manager proposes upgrade; locks new unit as RESERVED, keeps old unit, saves pendingUnitChange', async () => {
    const res = await createConfirmedReservation();

    const response = await reservationService.reassignStorageUnit(
      String(res._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        newStorageUnitId: String(unit2Id),
        reason: 'Upgrading due to AC repair in zone A',
        oldUnitStatus: 'under_maintenance',
        customerAgreed: false,
      }
    );

    expect(response.pendingUnitChange).not.toBeNull();
    expect(response.pendingUnitChange?.newStorageUnitId).toBe(String(unit2Id));
    expect(response.pendingUnitChange?.newFacilityUnitTypeOfferingId).toBe(
      String(offering2Id)
    );
    expect(response.pendingUnitChange?.newPricePerUnit).toBe(1500000);
    expect(response.pendingUnitChange?.reason).toBe(
      'Upgrading due to AC repair in zone A'
    );
    expect(response.basePrice).toBe(1000000); // basePrice remains unchanged during proposal stage
    expect(response.storageUnitId).toBe(String(unit1Id)); // old unit still assigned

    // Check DB state of storage units
    const oldUnit = await StorageUnit.findById(unit1Id);
    const newUnit = await StorageUnit.findById(unit2Id);
    expect(oldUnit?.status).toBe(StorageUnitStatusEnum.RESERVED);
    expect(newUnit?.status).toBe(StorageUnitStatusEnum.RESERVED);

    // Check unit change history
    expect(response.unitChangeHistory).toHaveLength(1);
    expect(response.unitChangeHistory[0]?.status).toBe('pending');
    expect(response.unitChangeHistory[0]?.fromPrice).toBe(1000000);
    expect(response.unitChangeHistory[0]?.toPrice).toBe(1500000);
  });

  it('2. Accept Flow: Customer accepts proposal -> Swaps unit, updates basePrice to upgraded price [CHỐT D4], frees old unit', async () => {
    const res = await createConfirmedReservation();

    // Step 1: Manager proposes
    await reservationService.reassignStorageUnit(
      String(res._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        newStorageUnitId: String(unit2Id),
        reason: 'Water maintenance in old unit',
        oldUnitStatus: 'under_maintenance',
      }
    );

    // Step 2: Customer accepts
    const response = await reservationService.respondUnitReassign(
      String(res._id),
      {
        userId: TEST_USERS.customer1.id,
        role: RoleEnum.CUSTOMER,
      },
      {
        action: 'accept',
      }
    );

    expect(response.pendingUnitChange).toBeNull();
    expect(response.storageUnitId).toBe(String(unit2Id));
    expect(response.facilityUnitTypeOfferingId).toBe(String(offering2Id));
    expect(response.basePrice).toBe(1500000); // Customer pays actual new unit price [CHỐT D4]

    // Verify units in DB
    const oldUnit = await StorageUnit.findById(unit1Id);
    const newUnit = await StorageUnit.findById(unit2Id);
    expect(oldUnit?.status).toBe(StorageUnitStatusEnum.UNDER_MAINTENANCE);
    expect(newUnit?.status).toBe(StorageUnitStatusEnum.RESERVED);

    // Verify history
    expect(response.unitChangeHistory).toHaveLength(1);
    expect(response.unitChangeHistory[0]?.status).toBe('accepted');
    expect(response.unitChangeHistory[0]?.decisionBy?.id).toBe(
      TEST_USERS.customer1.id
    );
  });

  it('3. Immediate Mode: Manager passes customerAgreed: true -> executes propose and accept atomically in one step', async () => {
    const res = await createConfirmedReservation();

    const response = await reservationService.reassignStorageUnit(
      String(res._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        newStorageUnitId: String(unit2Id),
        reason: 'Customer requested upgrade directly at counter',
        oldUnitStatus: 'available',
        customerAgreed: true,
      }
    );

    expect(response.pendingUnitChange).toBeNull();
    expect(response.storageUnitId).toBe(String(unit2Id));
    expect(response.facilityUnitTypeOfferingId).toBe(String(offering2Id));
    expect(response.basePrice).toBe(1500000); // Updated to new price [CHỐT D4]

    // Verify units in DB
    const oldUnit = await StorageUnit.findById(unit1Id);
    const newUnit = await StorageUnit.findById(unit2Id);
    expect(oldUnit?.status).toBe(StorageUnitStatusEnum.AVAILABLE);
    expect(newUnit?.status).toBe(StorageUnitStatusEnum.RESERVED);

    // Verify history
    expect(response.unitChangeHistory).toHaveLength(1);
    expect(response.unitChangeHistory[0]?.status).toBe('accepted');
  });

  it('4. Reject Flow: Customer rejects proposal -> frees new unit to AVAILABLE, cancels reservation as FACILITY_FAULT, 100% refund [CHỐT D4]', async () => {
    const res = await createConfirmedReservation();

    // Manager proposes
    await reservationService.reassignStorageUnit(
      String(res._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        newStorageUnitId: String(unit2Id),
        reason: 'Original unit unavailable due to facility defect',
        oldUnitStatus: 'under_maintenance',
      }
    );

    // Customer rejects
    const response = await reservationService.respondUnitReassign(
      String(res._id),
      {
        userId: TEST_USERS.customer1.id,
        role: RoleEnum.CUSTOMER,
      },
      {
        action: 'reject',
        rejectReason: 'Upgraded price is beyond my budget',
      }
    );

    expect(response.status).toBe(ReservationStatusEnum.CANCELLED);
    expect(response.cancellationSource).toBe(
      ReservationCancelSourceEnum.FACILITY_FAULT
    );
    expect(response.refundAmount).toBe(500000); // 100% deposit refunded
    expect(response.forfeitedAmount).toBe(0);
    expect(response.refundStatus).toBe(RefundStatusEnum.PENDING);
    expect(response.pendingUnitChange).toBeNull();

    // Verify units in DB
    const oldUnit = await StorageUnit.findById(unit1Id);
    const newUnit = await StorageUnit.findById(unit2Id);
    expect(newUnit?.status).toBe(StorageUnitStatusEnum.AVAILABLE); // New unit freed back to AVAILABLE
    expect(oldUnit?.status).toBe(StorageUnitStatusEnum.UNDER_MAINTENANCE); // Old unit released to UNDER_MAINTENANCE

    // Verify RefundRequest created in DB
    const refundRequests = await RefundRequest.find({
      reservationId: res._id,
    });
    expect(refundRequests).toHaveLength(1);
    expect(refundRequests[0]?.amount).toBe(500000);
    expect(refundRequests[0]?.reason).toBe(RefundReasonEnum.FACILITY_FAULT);

    // Verify history entry
    expect(response.unitChangeHistory).toHaveLength(1);
    expect(response.unitChangeHistory[0]?.status).toBe('rejected');
    expect(response.unitChangeHistory[0]?.rejectReason).toBe(
      'Upgraded price is beyond my budget'
    );
  });

  it('5. Orphaned lock release: Cancelling reservation with pending proposal releases the proposed unit back to AVAILABLE', async () => {
    const res = await createConfirmedReservation();

    // Manager proposes
    await reservationService.reassignStorageUnit(
      String(res._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        newStorageUnitId: String(unit2Id),
        reason: 'Maintenance proposal',
      }
    );

    // New unit is currently locked as RESERVED
    let unit2Doc = await StorageUnit.findById(unit2Id);
    expect(unit2Doc?.status).toBe(StorageUnitStatusEnum.RESERVED);

    // Customer cancels the reservation before responding
    await reservationService.cancelReservation(
      String(res._id),
      TEST_USERS.customer1.id,
      RoleEnum.CUSTOMER,
      {
        cancellationReason: 'I want to cancel the booking entirely',
      }
    );

    // Verify both units are freed (no orphaned lock on unit 2!)
    unit2Doc = await StorageUnit.findById(unit2Id);
    const unit1Doc = await StorageUnit.findById(unit1Id);
    expect(unit2Doc?.status).toBe(StorageUnitStatusEnum.AVAILABLE);
    expect(unit1Doc?.status).toBe(StorageUnitStatusEnum.AVAILABLE);
  });

  it('6. Error guards & validation checks', async () => {
    const res = await createConfirmedReservation();

    // Guard 1: Respond when no pending change -> throws 400 MESSAGE_CODE_330
    await expect(
      reservationService.respondUnitReassign(
        String(res._id),
        { userId: TEST_USERS.customer1.id, role: RoleEnum.CUSTOMER },
        { action: 'accept' }
      )
    ).rejects.toThrow(AppError);

    // Guard 2: Downgrade price not allowed -> throws 400 MESSAGE_CODE_316
    await expect(
      reservationService.reassignStorageUnit(
        String(res._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          newStorageUnitId: String(unit3Id), // unit3 has offering3 price 500k < 1m
          reason: 'Attempt downgrade',
        }
      )
    ).rejects.toThrow(AppError);
    // Unit 3 remains AVAILABLE
    const unit3Doc = await StorageUnit.findById(unit3Id);
    expect(unit3Doc?.status).toBe(StorageUnitStatusEnum.AVAILABLE);

    // Manager proposes unit 2 successfully
    await reservationService.reassignStorageUnit(
      String(res._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        newStorageUnitId: String(unit2Id),
        reason: 'Proposal 1',
      }
    );

    // Guard 3: Attempt second proposal while one is pending -> throws 400 MESSAGE_CODE_331
    await expect(
      reservationService.reassignStorageUnit(
        String(res._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          newStorageUnitId: String(unit2Id),
          reason: 'Proposal 2 while pending',
        }
      )
    ).rejects.toThrow(AppError);

    // Guard 4: Cross-customer access -> Customer 2 trying to respond to Customer 1's proposal -> throws 403 MESSAGE_CODE_103
    await expect(
      reservationService.respondUnitReassign(
        String(res._id),
        { userId: TEST_USERS.customer2.id, role: RoleEnum.CUSTOMER },
        { action: 'accept' }
      )
    ).rejects.toThrow(AppError);

    // Guard 5: Cross-facility manager proposing reassign -> throws 403 MESSAGE_CODE_122
    await expect(
      reservationService.reassignStorageUnit(
        String(res._id),
        TEST_USERS.managerFacilityB.id,
        RoleEnum.FACILITY_MANAGER,
        {
          newStorageUnitId: String(unit2Id),
          reason: 'Manager B proposing for Facility A',
        }
      )
    ).rejects.toThrow(AppError);
  });
});
