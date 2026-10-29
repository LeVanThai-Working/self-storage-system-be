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
} from './helpers/auth.helper.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { StorageRackRepository } from '../src/modules/storageRack/storageRack.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { Profile } from '../src/modules/profile/profile.model.ts';
import { ProfileRepository } from '../src/modules/profile/profile.repository.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import { FacilityTimeSlot } from '../src/modules/facilityTimeSlot/facilityTimeSlot.model.ts';
import { FacilityTimeSlotRepository } from '../src/modules/facilityTimeSlot/facilityTimeSlot.repository.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  RackStatusEnum,
  RackZoneEnum,
} from '../src/common/enums/storageRack.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../src/common/enums/facilityUnitTypeOffering.enum.ts';
import { ReservationStatusEnum } from '../src/common/enums/reservation.enum.ts';
import { ContractSourceEnum } from '../src/common/enums/contract.enum.ts';
import { RentalTargetTypeEnum } from '../src/common/enums/rental.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import type { AuditLogService } from '../src/modules/auditLog/auditLog.service.ts';

describe('Storage Rack Rental Integration Flow', () => {
  let reservationService: ReservationService;
  let contractService: ContractService;
  let storageRackRepository: StorageRackRepository;

  let warehouseUnitTypeId: Types.ObjectId;
  let warehouseOfferingId: Types.ObjectId;
  let warehouseStorageUnitId: Types.ObjectId;
  let rackA1Id: Types.ObjectId;
  let rackA2Id: Types.ObjectId;
  let rackA3Id: Types.ObjectId;

  const mockAuditLogService = {
    record: () => {},
  } as unknown as AuditLogService;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    // 1. Seed Facility
    await Facility.create({
      _id: new Types.ObjectId(TEST_FACILITY_A_ID),
      name: 'Chi Nhánh Kho Tổng Tân Bình',
      code: 'TB01',
      city: 'Hồ Chí Minh',
      address: '123 Cộng Hòa, Phường 13, Quận Tân Bình, TP.HCM',
      status: FacilityStatusEnum.ACTIVE,
      operatingHours: { open: '08:00', close: '20:00' },
    });

    // 2. Seed Facility Time Slot
    await FacilityTimeSlot.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      slotName: '09:00 - 10:00',
      startTime: '09:00',
      endTime: '10:00',
      maxCapacity: 10,
      isActive: true,
    });

    // 3. Seed UnitType (Warehouse Rack category)
    const unitTypeDoc = await UnitType.create({
      name: 'Kho Kệ Chia Sẻ (Shared Warehouse)',
      code: 'WH-RACK-01',
      category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
      area: 50,
      volume: 200,
      dimensions: { length: 10, width: 5, height: 4 },
      status: UnitTypeStatusEnum.ACTIVE,
    });
    warehouseUnitTypeId = unitTypeDoc._id;

    // 4. Seed Offering with rackZonePricing
    const offeringDoc = await FacilityUnitTypeOffering.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId: warehouseUnitTypeId,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 1200000,
      rackZonePricing: {
        PRIME: 1500000,
        STANDARD: 1200000,
        ECONOMY: 1000000,
      },
      depositMultiplier: 1,
      minRentalDays: 30,
      status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
    });
    warehouseOfferingId = offeringDoc._id;

    // 5. Seed StorageUnit (Large warehouse room holding multiple racks)
    const storageUnitDoc = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId: warehouseUnitTypeId,
      unitNumber: 'WH-HALL-101',
      floor: 1,
      zone: 'Khu A',
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    warehouseStorageUnitId = storageUnitDoc._id;

    // 6. Seed Racks inside the warehouse room
    const rack1 = await StorageRack.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId: warehouseStorageUnitId,
      rackCode: 'A-01',
      aisle: 'A',
      bay: 1,
      zone: RackZoneEnum.PRIME,
      tierCount: 4,
      status: RackStatusEnum.AVAILABLE,
    });
    rackA1Id = rack1._id;

    const rack2 = await StorageRack.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId: warehouseStorageUnitId,
      rackCode: 'A-02',
      aisle: 'A',
      bay: 2,
      zone: RackZoneEnum.PRIME,
      tierCount: 4,
      status: RackStatusEnum.AVAILABLE,
    });
    rackA2Id = rack2._id;

    const rack3 = await StorageRack.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId: warehouseStorageUnitId,
      rackCode: 'A-03',
      aisle: 'A',
      bay: 3,
      zone: RackZoneEnum.STANDARD,
      tierCount: 4,
      customPrice: 1100000, // Custom override price
      status: RackStatusEnum.AVAILABLE,
    });
    rackA3Id = rack3._id;

    // 7. Initialize Repositories and Services
    const resRepo = new ReservationRepository(Reservation);
    const contractRepo = new ContractRepository(Contract);
    const suRepo = new StorageUnitRepository(StorageUnit);
    storageRackRepository = new StorageRackRepository(StorageRack);
    const futoRepo = new FacilityUnitTypeOfferingRepository(
      FacilityUnitTypeOffering
    );
    const fatoRepo = new FacilityAmenityOfferingRepository(
      FacilityAmenityOffering
    );
    const facilityRepo = new FacilityRepository(Facility);
    const userRepo = new UserRepository(User);
    const profileRepo = new ProfileRepository(Profile);
    const inventoryRepo = new CustomerInventoryRepository(CustomerInventory);
    const refundRepo = new RefundRequestRepository(RefundRequest);
    const refundService = new RefundRequestService(refundRepo);
    const timeSlotRepo = new FacilityTimeSlotRepository(FacilityTimeSlot);

    reservationService = new ReservationService(
      resRepo,
      facilityRepo,
      futoRepo,
      fatoRepo,
      suRepo,
      userRepo,
      undefined,
      timeSlotRepo,
      mockAuditLogService,
      undefined,
      undefined,
      contractRepo,
      refundService,
      undefined,
      storageRackRepository
    );

    contractService = new ContractService(
      contractRepo,
      resRepo,
      suRepo,
      fatoRepo,
      futoRepo,
      facilityRepo,
      userRepo,
      mockAuditLogService,
      refundService,
      inventoryRepo,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      profileRepo,
      undefined,
      storageRackRepository
    );
  });

  it('TC-RACK-01: Customer reserves 2 racks -> calculates price by zone & locks racks without locking the warehouse unit', async () => {
    const customerId = TEST_USERS.customer1.id;
    const checkInDate = new Date(
      Date.now() + 2 * 24 * 3600 * 1000
    ).toISOString();

    const result = await reservationService.createReservation(customerId, {
      facilityId: TEST_FACILITY_A_ID,
      storageUnitId: warehouseStorageUnitId.toString(),
      facilityUnitTypeOfferingId: warehouseOfferingId.toString(),
      rentedRackIds: [rackA1Id.toString(), rackA2Id.toString()],
      checkInDate,
      checkInTimeSlot: '09:00 - 10:00',
      rentalDuration: 30,
      termsAccepted: true,
    });

    expect(result).toBeDefined();
    expect(result.rentalTargetType).toBe(RentalTargetTypeEnum.STORAGE_RACK);
    expect(result.rentedRackIds).toHaveLength(2);

    // PRIME zone price is 1,500,000/rack -> 2 racks = 3,000,000 VND
    expect(result.basePrice).toBe(3000000);
    expect(result.depositAmount).toBe(3000000);

    // Verify storage racks status changed to RESERVED
    const rack1 = await StorageRack.findById(rackA1Id);
    const rack2 = await StorageRack.findById(rackA2Id);
    expect(rack1?.status).toBe(RackStatusEnum.RESERVED);
    expect(rack2?.status).toBe(RackStatusEnum.RESERVED);

    // Verify the large warehouse unit itself remains AVAILABLE for other racks
    const unit = await StorageUnit.findById(warehouseStorageUnitId);
    expect(unit?.status).toBe(StorageUnitStatusEnum.AVAILABLE);
  });

  it('TC-RACK-02: Concurrency & Partial Unique Index: Another customer can book other racks in the same warehouse without index collision', async () => {
    const customerAId = TEST_USERS.customer1.id;
    const customerBId = TEST_USERS.customer2.id;
    const checkInDate = new Date(
      Date.now() + 2 * 24 * 3600 * 1000
    ).toISOString();

    // Customer A books Rack A1 and A2
    await reservationService.createReservation(customerAId, {
      facilityId: TEST_FACILITY_A_ID,
      storageUnitId: warehouseStorageUnitId.toString(),
      facilityUnitTypeOfferingId: warehouseOfferingId.toString(),
      rentedRackIds: [rackA1Id.toString(), rackA2Id.toString()],
      checkInDate,
      checkInTimeSlot: '09:00 - 10:00',
      rentalDuration: 30,
      termsAccepted: true,
    });

    // Customer B attempts to book Rack A1 (already reserved) -> Must be rejected with 400
    await expect(
      reservationService.createReservation(customerBId, {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: warehouseStorageUnitId.toString(),
        facilityUnitTypeOfferingId: warehouseOfferingId.toString(),
        rentedRackIds: [rackA1Id.toString()],
        checkInDate,
        checkInTimeSlot: '09:00 - 10:00',
        rentalDuration: 30,
        termsAccepted: true,
      })
    ).rejects.toThrow();

    // Customer B books Rack A3 (available, customPrice = 1,100,000) -> Must succeed concurrently!
    const resB = await reservationService.createReservation(customerBId, {
      facilityId: TEST_FACILITY_A_ID,
      storageUnitId: warehouseStorageUnitId.toString(),
      facilityUnitTypeOfferingId: warehouseOfferingId.toString(),
      rentedRackIds: [rackA3Id.toString()],
      checkInDate,
      checkInTimeSlot: '09:00 - 10:00',
      rentalDuration: 30,
      termsAccepted: true,
    });

    expect(resB).toBeDefined();
    expect(resB.basePrice).toBe(1100000); // Custom override price respected
    const rack3 = await StorageRack.findById(rackA3Id);
    expect(rack3?.status).toBe(RackStatusEnum.RESERVED);
  });

  it('TC-RACK-03: Cancelling reservation releases racks back to AVAILABLE', async () => {
    const customerId = TEST_USERS.customer1.id;
    const checkInDate = new Date(
      Date.now() + 2 * 24 * 3600 * 1000
    ).toISOString();

    const reservation = await reservationService.createReservation(customerId, {
      facilityId: TEST_FACILITY_A_ID,
      storageUnitId: warehouseStorageUnitId.toString(),
      facilityUnitTypeOfferingId: warehouseOfferingId.toString(),
      rentedRackIds: [rackA1Id.toString()],
      checkInDate,
      checkInTimeSlot: '09:00 - 10:00',
      rentalDuration: 30,
      termsAccepted: true,
    });

    // Rack is RESERVED
    let rack = await StorageRack.findById(rackA1Id);
    expect(rack?.status).toBe(RackStatusEnum.RESERVED);

    // Cancel reservation
    await reservationService.cancelReservation(
      reservation.id,
      customerId,
      RoleEnum.CUSTOMER,
      { cancellationReason: 'Không còn nhu cầu' }
    );

    // Rack is released back to AVAILABLE
    rack = await StorageRack.findById(rackA1Id);
    expect(rack?.status).toBe(RackStatusEnum.AVAILABLE);
  });

  it('TC-RACK-04: Full lifecycle: Reservation -> Contract Check-in (RENTED) -> Check-out (AVAILABLE)', async () => {
    const customerId = TEST_USERS.customer1.id;
    const staffId = TEST_USERS.staffFacilityA.id;
    const checkInDate = new Date(
      Date.now() + 2 * 24 * 3600 * 1000
    ).toISOString();

    // 1. Create reservation
    const resDoc = await reservationService.createReservation(customerId, {
      facilityId: TEST_FACILITY_A_ID,
      storageUnitId: warehouseStorageUnitId.toString(),
      facilityUnitTypeOfferingId: warehouseOfferingId.toString(),
      rentedRackIds: [rackA1Id.toString(), rackA2Id.toString()],
      checkInDate,
      checkInTimeSlot: '09:00 - 10:00',
      rentalDuration: 30,
      termsAccepted: true,
    });

    // 2. Transition reservation to CONFIRMED (simulating payment and arrival)
    await Reservation.findByIdAndUpdate(resDoc.id, {
      status: ReservationStatusEnum.CONFIRMED,
      paidAmount: resDoc.depositAmount,
      paidAt: new Date(),
      arrivedAt: new Date(),
    });

    // 3. Create Contract from Reservation
    const contract = await contractService.createContract(
      {
        source: ContractSourceEnum.RESERVATION,
        reservationId: resDoc.id,
      },
      staffId,
      RoleEnum.FACILITY_STAFF
    );

    expect(contract.rentalTargetType).toBe(RentalTargetTypeEnum.STORAGE_RACK);
    expect(contract.rentedRackIds).toHaveLength(2);

    // Verify Draft PDF Preview mentions the rack system
    const draftPdf = await contractService.getContractDraftPdf(
      contract.id,
      customerId,
      RoleEnum.CUSTOMER
    );
    expect(draftPdf.html).toContain('Hệ thống Kệ kho (2 kệ)');
    expect(draftPdf.html).toContain('WH-HALL-101');

    // 4. Customer signs on app & first period rent is settled
    await contractService.customerSignContract(
      contract.id,
      customerId,
      RoleEnum.CUSTOMER,
      { termsAccepted: true }
    );
    await Contract.findByIdAndUpdate(contract.id, {
      firstPeriodPaidAt: new Date(),
    });
    const managerId = TEST_USERS.managerFacilityA.id;
    await contractService.checkInContract(
      contract.id,
      managerId,
      RoleEnum.FACILITY_MANAGER,
      { actualCheckInDate: new Date().toISOString() }
    );

    // 5. Verify racks are now RENTED and bound to contract & customer
    const rentedRack1 = await StorageRack.findById(rackA1Id);
    const rentedRack2 = await StorageRack.findById(rackA2Id);
    expect(rentedRack1?.status).toBe(RackStatusEnum.RENTED);
    expect(rentedRack1?.currentContractId?.toString()).toBe(contract.id);
    expect(rentedRack1?.currentCustomerId?.toString()).toBe(customerId);
    expect(rentedRack2?.status).toBe(RackStatusEnum.RENTED);

    // 6. Check-out contract -> Racks vacated back to AVAILABLE
    await contractService.checkOutContract(
      contract.id,
      staffId,
      RoleEnum.FACILITY_STAFF,
      { damageFee: 0 }
    );

    const vacatedRack1 = await StorageRack.findById(rackA1Id);
    const vacatedRack2 = await StorageRack.findById(rackA2Id);
    expect(vacatedRack1?.status).toBe(RackStatusEnum.AVAILABLE);
    expect(vacatedRack1?.currentContractId).toBeNull();
    expect(vacatedRack1?.currentCustomerId).toBeNull();
    expect(vacatedRack2?.status).toBe(RackStatusEnum.AVAILABLE);
  });

  it('TC-RACK-05: Walk-in contract creation directly rents racks and sets pricing', async () => {
    const staffId = TEST_USERS.staffFacilityA.id;
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    const walkIn = await contractService.createWalkInContract(
      {
        facilityId: TEST_FACILITY_A_ID,
        storageUnitId: warehouseStorageUnitId.toString(),
        facilityUnitTypeOfferingId: warehouseOfferingId.toString(),
        rentedRackIds: [rackA1Id.toString(), rackA3Id.toString()],
        startDate,
        endDate,
        billingUnit: BillingUnitEnum.MONTH,
        customerName: 'Nguyễn Văn Walk-in',
        customerEmail: 'walkin.rack@example.com',
        customerPhone: '0988776655',
        dateOfBirth: '1995-05-15',
        idCardNumber: '079095001234',
      },
      staffId,
      RoleEnum.FACILITY_STAFF
    );

    expect(walkIn).toBeDefined();
    expect(walkIn.rentalTargetType).toBe(RentalTargetTypeEnum.STORAGE_RACK);
    expect(walkIn.rentedRackIds).toHaveLength(2);
    // rackA1 is PRIME (1,500,000) + rackA3 is customPrice (1,100,000) = 2,600,000 VND
    expect(walkIn.rentalPrice).toBe(2600000);

    const rack1 = await StorageRack.findById(rackA1Id);
    const rack3 = await StorageRack.findById(rackA3Id);
    expect(rack1?.status).toBe(RackStatusEnum.RESERVED);
    expect(rack3?.status).toBe(RackStatusEnum.RESERVED);
  });
});
