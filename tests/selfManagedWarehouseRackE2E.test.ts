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
  TEST_FACILITY_B_ID,
} from './helpers/auth.helper.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { RackTier } from '../src/modules/storageRack/rackTier.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { InventoryMovement } from '../src/modules/customerInventory/inventoryMovement.model.ts';
import { Incident } from '../src/modules/incident/incident.model.ts';
import { FacilityTimeSlot } from '../src/modules/facilityTimeSlot/facilityTimeSlot.model.ts';
import { SigningAuthorization } from '../src/modules/signingAuthorization/signingAuthorization.model.ts';
import { LegalEntity } from '../src/modules/legalEntity/legalEntity.model.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';

import { contractService } from '../src/modules/contract/contract.container.ts';
import { incidentService } from '../src/modules/incident/incident.container.ts';
import {
  customerInventoryService,
  accessScheduleService,
} from '../src/modules/customerInventory/customerInventory.container.ts';
import { customerSkuService } from '../src/modules/customerSku/customerSku.container.ts';

import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
  RackZoneEnum,
} from '../src/common/enums/storageRack.enum.ts';
import {
  ContractAddendumTypeEnum,
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import {
  AccessScheduleStatusEnum,
  InventoryItemStatusEnum,
  MovementTypeEnum,
} from '../src/common/enums/customerInventory.enum.ts';
import { RentalTargetTypeEnum } from '../src/common/enums/rental.enum.ts';
import {
  IncidentCategoryEnum,
  IncidentLiablePartyEnum,
  IncidentSeverityEnum,
  IncidentStatusEnum,
} from '../src/common/enums/incident.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { getVNDateString, addDays } from '../src/utils/date.util.ts';

describe('T-SMR.5: Self-Managed Warehouse Rack End-to-End (E2E) Integration Suite', () => {
  const facilityAId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const facilityBId = new Types.ObjectId(TEST_FACILITY_B_ID);

  const customer1Caller = {
    id: TEST_USERS.customer1.id,
    userId: TEST_USERS.customer1.id,
    role: RoleEnum.CUSTOMER,
  };
  const customer2Caller = {
    id: TEST_USERS.customer2.id,
    userId: TEST_USERS.customer2.id,
    role: RoleEnum.CUSTOMER,
  };
  const staffACaller = {
    id: TEST_USERS.staffFacilityA.id,
    userId: TEST_USERS.staffFacilityA.id,
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };
  const staffBCaller = {
    id: TEST_USERS.staffFacilityB.id,
    userId: TEST_USERS.staffFacilityB.id,
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: TEST_FACILITY_B_ID,
  };
  const managerACaller = {
    id: TEST_USERS.managerFacilityA.id,
    userId: TEST_USERS.managerFacilityA.id,
    role: RoleEnum.FACILITY_MANAGER,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };

  let unitTypeId: Types.ObjectId;
  let storageUnitId: Types.ObjectId;
  let rack1Id: Types.ObjectId;
  let rack2Id: Types.ObjectId;
  let rack3Id: Types.ObjectId;
  let tier1AId: Types.ObjectId;
  let tier1BId: Types.ObjectId;
  let tier2AId: Types.ObjectId;
  let tier3AId: Types.ObjectId;
  let contract1Id: Types.ObjectId;
  let sku1Id: Types.ObjectId;
  let timeSlotId: Types.ObjectId;

  async function createTestIncident(options: {
    storageRackId: Types.ObjectId;
    title: string;
    description?: string;
    severity?: IncidentSeverityEnum;
    requiresRelocation?: boolean;
    damageFee?: number;
    liableParty?: IncidentLiablePartyEnum;
  }) {
    const reported = await incidentService.reportIncident(customer1Caller, {
      facilityId: String(facilityAId),
      storageUnitId: String(storageUnitId),
      storageRackId: String(options.storageRackId),
      contractId: String(contract1Id),
      category: IncidentCategoryEnum.STRUCTURAL,
      severity: options.severity || IncidentSeverityEnum.HIGH,
      title: options.title,
      description: options.description || 'Thanh giằng bị biến dạng cơ học',
      images: [
        'https://res.cloudinary.com/demo/image/upload/incident_rack.jpg',
      ],
      putUnitUnderMaintenance: false,
      requiresRelocation: options.requiresRelocation ?? false,
    });

    await incidentService.assignStaff(managerACaller, reported.id, {
      assignedStaffId: TEST_USERS.staffFacilityA.id,
    });

    if (options.damageFee !== undefined || options.liableParty !== undefined) {
      await Incident.findByIdAndUpdate(reported.id, {
        ...(options.damageFee !== undefined
          ? { damageFee: options.damageFee }
          : {}),
        ...(options.liableParty !== undefined
          ? { liableParty: options.liableParty }
          : {}),
      });
    }

    return reported.id;
  }

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    // 1. Legal Entity
    const legalEntity = await LegalEntity.create({
      companyName: 'SSM Warehouse Corporation',
      taxCode: '0109998888',
      registeredAddress: '100 Industrial Zone, Hanoi',
      legalRepresentative: {
        name: 'Manager A',
        title: 'Facility Director',
        idNumber: '001099000001',
      },
      bankAccount: {
        bankName: 'Vietcombank',
        accountNumber: '999888777666',
        accountHolder: 'SSM Warehouse Corp',
      },
      phone: '0909999888',
      email: 'corp@ssm.vn',
      status: 'active',
    });

    // 2. Facilities A and B
    await Facility.create({
      _id: facilityAId,
      code: 'FACA',
      name: 'SSM Mega Warehouse A',
      address: '100 Industrial Zone, Hanoi',
      city: 'Hanoi',
      status: FacilityStatusEnum.ACTIVE,
      managerId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
      operatingHours: { open: '08:00', close: '20:00' },
      timezone: 'Asia/Ho_Chi_Minh',
      legalEntityId: legalEntity._id,
    });

    await Facility.create({
      _id: facilityBId,
      code: 'FACB',
      name: 'SSM Mega Warehouse B',
      address: '200 Industrial Zone, Bac Ninh',
      city: 'Bac Ninh',
      status: FacilityStatusEnum.ACTIVE,
      managerId: new Types.ObjectId(TEST_USERS.managerFacilityB.id),
      operatingHours: { open: '08:00', close: '20:00' },
      timezone: 'Asia/Ho_Chi_Minh',
      legalEntityId: legalEntity._id,
    });

    // 3. Signing Authorization for Manager A
    await SigningAuthorization.create({
      legalEntityId: legalEntity._id,
      facilityIds: [facilityAId],
      authorizedUserId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
      authorizationNumber: 'AUTH-2026-FACA',
      issuedDate: new Date('2026-01-01'),
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2027-12-31'),
      status: 'active',
      fileHash: 'sha256-mock-auth-hash',
      documentUrl: 'https://res.cloudinary.com/demo/image/upload/auth.pdf',
    });

    // 4. TimeSlot for Facility A (08:00 - 10:00)
    const timeSlot = await FacilityTimeSlot.create({
      facilityId: facilityAId,
      slotName: 'Morning Shift 1',
      startTime: '08:00',
      endTime: '10:00',
      maxCapacity: 5,
      isActive: true,
    });
    timeSlotId = timeSlot._id as Types.ObjectId;

    // 5. UnitType (WAREHOUSE_RACK)
    unitTypeId = new Types.ObjectId();
    await UnitType.create({
      _id: unitTypeId,
      name: 'Warehouse Rack Hall A',
      code: 'WR-HA',
      category: 'warehouse_rack',
      dimensions: { width: 20, length: 50, height: 6 },
      volume: 6000,
      area: 1000,
      description: 'Industrial Hall with heavy duty rack rows',
      status: 'active',
    });

    // 6. StorageUnit
    storageUnitId = new Types.ObjectId();
    await StorageUnit.create({
      _id: storageUnitId,
      facilityId: facilityAId,
      unitTypeId,
      unitNumber: 'HALL-A-01',
      floor: 1,
      zone: 'Zone Alpha',
      status: StorageUnitStatusEnum.AVAILABLE,
    });

    // 7. Storage Racks (Rack 1 & Rack 2 rented by Customer 1, Rack 3 available replacement)
    rack1Id = new Types.ObjectId();
    await StorageRack.create({
      _id: rack1Id,
      facilityId: facilityAId,
      storageUnitId,
      rackCode: 'RACK-A1-01',
      aisle: 'A1',
      bay: '01',
      zone: RackZoneEnum.STANDARD,
      tierCount: 3,
      status: RackStatusEnum.RENTED,
      currentContractId: null,
      currentCustomerId: new Types.ObjectId(TEST_USERS.customer1.id),
    });

    tier1AId = new Types.ObjectId();
    await RackTier.create({
      _id: tier1AId,
      facilityId: facilityAId,
      storageUnitId,
      storageRackId: rack1Id,
      tierNumber: 1,
      tierCode: 'RACK-A1-01-T01',
      maxWeightKg: 800,
      volumeM3: 3.5,
      status: RackTierStatusEnum.AVAILABLE,
    });

    tier1BId = new Types.ObjectId();
    await RackTier.create({
      _id: tier1BId,
      facilityId: facilityAId,
      storageUnitId,
      storageRackId: rack1Id,
      tierNumber: 2,
      tierCode: 'RACK-A1-01-T02',
      maxWeightKg: 800,
      volumeM3: 3.5,
      status: RackTierStatusEnum.AVAILABLE,
    });

    await RackTier.create({
      facilityId: facilityAId,
      storageUnitId,
      storageRackId: rack1Id,
      tierNumber: 3,
      tierCode: 'RACK-A1-01-T03',
      maxWeightKg: 800,
      volumeM3: 3.5,
      status: RackTierStatusEnum.AVAILABLE,
    });

    // Rack 2 (also rented by Customer 1)
    rack2Id = new Types.ObjectId();
    await StorageRack.create({
      _id: rack2Id,
      facilityId: facilityAId,
      storageUnitId,
      rackCode: 'RACK-A1-02',
      aisle: 'A1',
      bay: '02',
      zone: RackZoneEnum.STANDARD,
      tierCount: 3,
      status: RackStatusEnum.RENTED,
      currentContractId: null,
      currentCustomerId: new Types.ObjectId(TEST_USERS.customer1.id),
    });

    tier2AId = new Types.ObjectId();
    await RackTier.create({
      _id: tier2AId,
      facilityId: facilityAId,
      storageUnitId,
      storageRackId: rack2Id,
      tierNumber: 1,
      tierCode: 'RACK-A1-02-T01',
      maxWeightKg: 800,
      volumeM3: 3.5,
      status: RackTierStatusEnum.AVAILABLE,
    });

    // Rack 3 (Vacant, ready for replacement addendum)
    rack3Id = new Types.ObjectId();
    await StorageRack.create({
      _id: rack3Id,
      facilityId: facilityAId,
      storageUnitId,
      rackCode: 'RACK-A1-03',
      aisle: 'A1',
      bay: '03',
      zone: RackZoneEnum.STANDARD,
      tierCount: 3,
      status: RackStatusEnum.AVAILABLE,
      currentContractId: null,
      currentCustomerId: null,
    });

    tier3AId = new Types.ObjectId();
    await RackTier.create({
      _id: tier3AId,
      facilityId: facilityAId,
      storageUnitId,
      storageRackId: rack3Id,
      tierNumber: 1,
      tierCode: 'RACK-A1-03-T01',
      maxWeightKg: 800,
      volumeM3: 3.5,
      status: RackTierStatusEnum.AVAILABLE,
    });
    for (let t = 2; t <= 3; t++) {
      await RackTier.create({
        facilityId: facilityAId,
        storageUnitId,
        storageRackId: rack3Id,
        tierNumber: t,
        tierCode: `RACK-A1-03-T0${t}`,
        maxWeightKg: 800,
        volumeM3: 3.5,
        status: RackTierStatusEnum.AVAILABLE,
      });
    }

    // 8. Customer SKU
    sku1Id = new Types.ObjectId();
    await CustomerSku.create({
      _id: sku1Id,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      skuCode: 'SKU-E2E-BOX',
      name: 'Industrial Carton Box',
      barcode: '893999000111',
      uom: 'box',
      status: 'active',
    });

    // 9. Active Rack Rental Contract (Customer 1 rents Rack 1 & Rack 2)
    contract1Id = new Types.ObjectId();
    await Contract.create({
      _id: contract1Id,
      contractCode: 'CTR-E2E-001',
      source: ContractSourceEnum.WALK_IN,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: facilityAId,
      storageUnitId,
      rentalTargetType: RentalTargetTypeEnum.STORAGE_RACK,
      rentedRackIds: [rack1Id, rack2Id],
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      assignedStaffId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-30'),
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 3000000,
      totalPeriodicPrice: 3000000,
      depositAmount: 3000000,
      depositPaidAt: new Date('2026-11-01'),
      firstPeriodPaidAt: new Date('2026-11-01'),
      depositStatus: ContractDepositStatusEnum.HELD,
      customerSigned: true,
      customerSignedAt: new Date('2026-11-01'),
      staffSigned: true,
      staffSignedAt: new Date('2026-11-01'),
      termsAccepted: true,
      status: ContractStatusEnum.ACTIVE,
      damageFee: 0,
      accumulatedInterruptedRefund: 0,
      accumulatedFacilityDamageFee: 0,
    });

    await StorageRack.findByIdAndUpdate(rack1Id, {
      currentContractId: contract1Id,
    });
    await StorageRack.findByIdAndUpdate(rack2Id, {
      currentContractId: contract1Id,
    });
  });

  // =========================================================================
  // JOURNEY 1: DAY-TO-DAY SELF-MANAGED OPERATIONS
  // =========================================================================
  describe('Journey 1: Day-to-Day Operations (AccessSchedule & Self-Managed Stock Mutations)', () => {
    it('executes full daily flow: book schedule -> gate check-in -> self-managed mutations -> gate check-out', async () => {
      const tomorrow = addDays(new Date(), 1);
      const scheduledDate = getVNDateString(tomorrow);

      // 1. Customer registers AccessSchedule
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(contract1Id),
          timeSlotId: String(timeSlotId),
          scheduledDate,
          numberOfPeople: 3,
          vehicleType: 'Xe tải 1.5 tấn',
          vehiclePlate: '29C-998.88',
          purpose: 'Bốc dỡ hàng mới nhập cảng về kho',
        },
        customer1Caller
      );

      expect(schedule.status).toBe(AccessScheduleStatusEnum.PENDING);
      expect(schedule.numberOfPeople).toBe(3);
      expect(schedule.qrPayload).toBeTruthy();
      expect(schedule.rawOtpCode).toHaveLength(6);

      // 2. Gate Check-in by Facility Staff (within allowed time window)
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${scheduledDate}T08:10:00.000+07:00`));

      const checkInResult = await accessScheduleService.checkIn(
        { code: schedule.qrPayload! },
        staffACaller
      );

      expect(checkInResult.schedule.status).toBe(
        AccessScheduleStatusEnum.CHECKED_IN
      );
      expect(checkInResult.schedule.checkedInAt).toBeTruthy();
      expect(checkInResult.rentedRacks).toHaveLength(2);
      expect(checkInResult.rentedRacks[0].rackCode).toBe('RACK-A1-01');
      expect(checkInResult.rentedRacks[0].aisle).toBe('A1');

      // 3. Customer Self-Management: stockIn 20 units to Tier 1A
      const stockInRes = await customerInventoryService.stockIn(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1AId),
          quantity: 20,
        },
        customer1Caller
      );
      expect(stockInRes.quantity).toBe(20);

      // Verify Tier 1A state machine transitioned to OCCUPIED
      const updatedTier1A = await RackTier.findById(tier1AId);
      expect(updatedTier1A?.status).toBe(RackTierStatusEnum.OCCUPIED);

      // 4. Customer Self-Management: stockMove 5 units from Tier 1A to Tier 1B
      const stockMoveRes = await customerInventoryService.stockMove(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          fromRackTierId: String(tier1AId),
          toRackTierId: String(tier1BId),
          quantity: 5,
        },
        customer1Caller
      );
      expect(stockMoveRes.quantity).toBe(5);

      const sourceInv = await CustomerInventory.findOne({
        contractId: contract1Id,
        rackTierId: tier1AId,
      });
      expect(sourceInv?.quantity).toBe(15);

      // Verify Tier 1B now also OCCUPIED
      const updatedTier1B = await RackTier.findById(tier1BId);
      expect(updatedTier1B?.status).toBe(RackTierStatusEnum.OCCUPIED);

      // 5. Customer Self-Management: stockAdjust on Tier 1A (+3 found during count)
      const stockAdjustRes = await customerInventoryService.stockAdjust(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1AId),
          newQuantity: 18,
          reason: 'Kiểm kê thực tế dư 3 thùng nguyên vẹn',
        },
        customer1Caller
      );
      expect(stockAdjustRes.quantity).toBe(18);

      // 6. Customer Self-Management: stockOut 5 units from Tier 1B
      const stockOutRes = await customerInventoryService.stockOut(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1BId),
          quantity: 5,
        },
        customer1Caller
      );
      expect(stockOutRes.quantity).toBe(0);

      // Tier 1B should automatically return to AVAILABLE because quantity = 0
      const tier1BAfterOut = await RackTier.findById(tier1BId);
      expect(tier1BAfterOut?.status).toBe(RackTierStatusEnum.AVAILABLE);

      // 7. Gate Check-out by Facility Staff
      const checkOutRes = await accessScheduleService.checkOut(
        schedule.id,
        {
          securityCheckPassed: true,
          notes: 'Khách rời kho an toàn, xe không có dấu hiệu va quẹt',
        },
        staffACaller
      );
      expect(checkOutRes.status).toBe(AccessScheduleStatusEnum.COMPLETED);
      expect(checkOutRes.checkedOutAt).toBeTruthy();

      vi.useRealTimers();

      // 8. Verify ledger movements
      const movements = await InventoryMovement.find({
        contractId: contract1Id,
      }).sort({ createdAt: 1 });
      expect(movements.length).toBeGreaterThanOrEqual(4);
      const types = movements.map((m) => m.type);
      expect(types).toContain(MovementTypeEnum.IN);
      expect(types).toContain(MovementTypeEnum.MOVE);
      expect(types).toContain(MovementTypeEnum.ADJUST);
      expect(types).toContain(MovementTypeEnum.OUT);
    });
  });

  // =========================================================================
  // JOURNEY 2: INCIDENT EVACUATION, FULL FREEZE & 2-LAYER ACKNOWLEDGMENT
  // =========================================================================
  describe('Journey 2: Incident Evacuation, Multi-Rack Isolation & 2-Layer Acknowledgment', () => {
    it('evacuates rack, freezes holding, allows other active racks, and enforces 2-layer acknowledgment before close', async () => {
      // Seed initial goods on Rack 1 (Tier 1A) and Rack 2 (Tier 2A)
      await customerInventoryService.stockIn(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1AId),
          quantity: 30,
        },
        customer1Caller
      );
      await customerInventoryService.stockIn(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier2AId),
          quantity: 15,
        },
        customer1Caller
      );

      // 1. Staff reports Incident on Rack 1 (severe deformation)
      const incidentId = await createTestIncident({
        storageRackId: rack1Id,
        title: 'Thanh giằng Kệ 1 bị cong vênh nghiêm trọng',
        description: 'Phát hiện dầm ngang tầng 1 bị nứt mối hàn',
        severity: IncidentSeverityEnum.HIGH,
        requiresRelocation: false,
      });

      // 2. Staff executes emergency evacuation to holding
      const evacRes = await incidentService.evacuateRack(
        staffACaller,
        incidentId,
        {
          evidenceImages: [
            'https://res.cloudinary.com/demo/image/upload/evac_scene_1.jpg',
          ],
          emergencyReason:
            'Sơ tán khẩn cấp hàng hóa do nứt dầm kệ kho, tránh nguy cơ sập đổ',
          items: [
            {
              skuId: String(sku1Id),
              actualQuantity: 30,
              condition: 'Nguyên vẹn',
              notes: '30 thùng nguyên',
            },
          ],
        }
      );

      expect(evacRes.preEvacuationManifest).toBeDefined();
      expect(evacRes.preEvacuationManifest?.items?.[0]?.actualQuantity).toBe(
        30
      );

      // Verify Rack 1 is now MAINTENANCE and its tiers are AVAILABLE
      const rack1 = await StorageRack.findById(rack1Id);
      expect(rack1?.status).toBe(RackStatusEnum.MAINTENANCE);
      const tier1A = await RackTier.findById(tier1AId);
      expect(tier1A?.status).toBe(RackTierStatusEnum.AVAILABLE);

      // Verify goods on Rack 1 are in TEMPORARY_HOLDING
      const holdingInv = await CustomerInventory.findOne({
        contractId: contract1Id,
        status: InventoryItemStatusEnum.TEMPORARY_HOLDING,
      });
      expect(holdingInv).toBeTruthy();
      expect(holdingInv?.quantity).toBe(30);
      expect(holdingInv?.rackTierId).toBeNull();

      // 3. FULL FREEZE: Customer CANNOT mutate items in TEMPORARY_HOLDING
      await expect(
        customerInventoryService.stockOut(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            rackTierId: null,
            quantity: 5,
          },
          customer1Caller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_645,
        })
      );

      // 4. MULTI-RACK ISOLATION: Customer CAN STILL operate on Rack 2 (Tier 2A) normally
      const rack2MutateRes = await customerInventoryService.stockOut(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier2AId),
          quantity: 5,
        },
        customer1Caller
      );
      expect(rack2MutateRes.quantity).toBe(10); // 15 - 5 = 10

      // 5. Facility completes repair: FM resolves incident
      await incidentService.resolveIncident(managerACaller, incidentId, {
        resolutionNotes:
          'Đã hàn gia cố và thay mới thanh giằng tầng 1 hoàn tất kiểm định an toàn',
        liableParty: IncidentLiablePartyEnum.FACILITY,
        damageFee: 0,
      });

      // Verify incident is RESOLVED and readyAt timestamp is set
      const resolvedIncident = await Incident.findById(incidentId);
      expect(resolvedIncident?.status).toBe(IncidentStatusEnum.RESOLVED);
      expect(resolvedIncident?.readyAt).toBeTruthy();

      // 6. TWO-LAYER ACKNOWLEDGMENT GUARD
      // Closing without physical paper manifest must fail
      await expect(
        incidentService.closeIncident(managerACaller, incidentId)
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_712,
        })
      );

      // Layer 1: Manager uploads scanned paper manifest with live signatures
      await incidentService.uploadRestorationManifest(
        managerACaller,
        incidentId,
        {
          restorationManifestDocUrl:
            'https://res.cloudinary.com/demo/image/upload/bb-nghiem-thu-signed.jpg',
        }
      );

      // Closing without customer app acknowledgment must fail
      await expect(
        incidentService.closeIncident(managerACaller, incidentId)
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_713,
        })
      );

      // Layer 2: Customer confirms restoration in-app
      await incidentService.customerAcknowledge(customer1Caller, incidentId);

      // Now closing must succeed
      const closedIncident = await incidentService.closeIncident(
        managerACaller,
        incidentId
      );
      expect(closedIncident.status).toBe(IncidentStatusEnum.CLOSED);
    });
  });

  // =========================================================================
  // JOURNEY 3: IRREPARABLE INCIDENT, RACK CHANGE & SETTLEMENT
  // =========================================================================
  describe('Journey 3: Irreparable Incident, Rack Change Addendum & Checkout Settlement', () => {
    it('migrates to new rack via RACK_CHANGE addendum, settles compensation exceeding deposit at checkout', async () => {
      // 1. Initial state: Customer 1 rents Rack 1, puts 10 boxes on it
      await customerInventoryService.stockIn(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1AId),
          quantity: 10,
        },
        customer1Caller
      );

      // 2. Severe collapse incident on Rack 1 (cannot be repaired in-place -> requiresRelocation = true)
      const incidentId = await createTestIncident({
        storageRackId: rack1Id,
        title: 'Sập đổ kết cấu Kệ A1-01',
        description: 'Kệ bị va quẹt biến dạng hoàn toàn không thể phục hồi',
        severity: IncidentSeverityEnum.CRITICAL,
        requiresRelocation: true, // Triggers direct IN_PROGRESS -> CLOSED and RACK_CHANGE flow
        damageFee: 500000, // Facility agrees to compensate 500,000 VND for damaged goods
        liableParty: IncidentLiablePartyEnum.FACILITY,
      });

      // Evacuate goods to holding
      await incidentService.evacuateRack(staffACaller, incidentId, {
        evidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/collapse_1.jpg',
        ],
        emergencyReason:
          'Sơ tán khẩn cấp toàn bộ hàng hóa do sập đổ kết cấu kệ kho',
        requiresRelocation: true,
        items: [
          {
            skuId: String(sku1Id),
            actualQuantity: 10,
            condition: 'Bị rơi đổ cần kiểm tra',
          },
        ],
      });

      // 3. Negotiate replacement: Create ContractAddendum RACK_CHANGE (Rack 1 -> Rack 3)
      const contractWithAddendum = await contractService.createAddendum(
        String(contract1Id),
        managerACaller.id,
        managerACaller.role,
        {
          type: ContractAddendumTypeEnum.RACK_CHANGE,
          previousRackId: String(rack1Id),
          newRackId: String(rack3Id),
          notes: 'Đổi sang Kệ A1-03 do Kệ A1-01 gặp sự cố nghiêm trọng',
        }
      );

      const addendum =
        contractWithAddendum.addendums[
          contractWithAddendum.addendums.length - 1
        ];
      expect(addendum.type).toBe(ContractAddendumTypeEnum.RACK_CHANGE);
      expect(String(addendum.previousRackId)).toBe(String(rack1Id));
      expect(String(addendum.newRackId)).toBe(String(rack3Id));

      // Rack 3 must be atomically reserved
      const rack3Reserved = await StorageRack.findById(rack3Id);
      expect(rack3Reserved?.status).toBe(RackStatusEnum.RESERVED);

      // 4. Signing Addendum: Customer signs then Staff signs
      await contractService.customerSignAddendum(
        String(contract1Id),
        addendum.id,
        customer1Caller.id,
        customer1Caller.role,
        { termsAccepted: true }
      );

      await contractService.staffSignAddendum(
        String(contract1Id),
        addendum.id,
        managerACaller.id,
        managerACaller.role,
        {
          termsAccepted: true,
          signedAddendumFileUrls: [
            'https://res.cloudinary.com/demo/image/upload/addendum-signed.pdf',
          ],
        }
      );

      // Verify Rack 3 is now RENTED, and Contract.rentedRackIds has Rack 3 instead of Rack 1
      const rack3Rented = await StorageRack.findById(rack3Id);
      expect(rack3Rented?.status).toBe(RackStatusEnum.RENTED);

      const contractAfterAddendum = await Contract.findById(contract1Id);
      const rentedIds = (contractAfterAddendum?.rentedRackIds || []).map((id) =>
        String(id)
      );
      expect(rentedIds).toContain(String(rack3Id));
      expect(rentedIds).not.toContain(String(rack1Id));

      // 5. Customer acknowledges and Facility closes Incident (direct IN_PROGRESS -> CLOSED)
      await incidentService.uploadRestorationManifest(
        managerACaller,
        incidentId,
        {
          restorationManifestDocUrl:
            'https://res.cloudinary.com/demo/image/upload/bien-ban-doi-ke.jpg',
        }
      );
      await incidentService.customerAcknowledge(customer1Caller, incidentId);

      // Set readyAt 3 days in the past and resolution with liableParty FACILITY to test interruption & compensation
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      await Incident.findByIdAndUpdate(incidentId, {
        readyAt: threeDaysAgo,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        resolution: {
          resolvedAt: threeDaysAgo,
          resolvedBy: new Types.ObjectId(managerACaller.id),
          resolutionNotes:
            'Đã hoàn tất thương lượng tại quầy đổi sang Kệ A1-03',
          liableParty: IncidentLiablePartyEnum.FACILITY,
          damageFee: 500000,
        },
      });

      const closedIncident = await incidentService.closeIncident(
        managerACaller,
        incidentId
      );
      expect(closedIncident.status).toBe(IncidentStatusEnum.CLOSED);

      // Check Contract accumulated interrupted refund and facility damage fee
      const contractAccumulated = await Contract.findById(contract1Id);
      expect(
        contractAccumulated?.accumulatedFacilityDamageFee
      ).toBeGreaterThanOrEqual(500000);
      expect(
        contractAccumulated?.accumulatedInterruptedRefund
      ).toBeGreaterThanOrEqual(0);

      // 6. Contract Checkout & Final Settlement
      // Empty remaining items first to satisfy check-out guard
      await CustomerInventory.deleteMany({ contractId: contract1Id });

      const checkOutRes = await contractService.checkOutContract(
        String(contract1Id),
        managerACaller.id,
        managerACaller.role,
        {
          inspectionNotes:
            'Thanh lý hợp đồng kho kệ tự quản, quyết toán cọc và bồi hoàn sự cố',
        }
      );

      expect(checkOutRes.status).toBe(ContractStatusEnum.COMPLETED);
      expect(checkOutRes.depositStatus).toBe(
        ContractDepositStatusEnum.REFUNDED
      );
      expect(checkOutRes.refundAmount).toBeGreaterThan(3000000);

      // Verify RefundRequest created with amount exceeding deposit due to facility damage fee
      const refund = await RefundRequest.findOne({ contractId: contract1Id });
      expect(refund).toBeTruthy();
      expect(refund?.amount).toBeGreaterThan(3000000); // 3M deposit + compensation > 3M
    });
  });

  // =========================================================================
  // JOURNEY 4: RBAC & PRIVACY MATRIX (ZERO-TOUCH & SCOPED AUDIT)
  // =========================================================================
  describe('Journey 4: Zero-Touch Staff Policy & Scoped Safety Oversight (RBAC Matrix)', () => {
    it('enforces Zero-Touch policy for Staff/FM and ensures scoped safety read permissions', async () => {
      // 1. Staff and FM CANNOT mutate customer inventory (Zero-Touch Policy - 403)
      await expect(
        customerInventoryService.stockIn(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            rackTierId: String(tier1AId),
            quantity: 5,
          },
          staffACaller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );

      await expect(
        customerInventoryService.stockIn(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            rackTierId: String(tier1AId),
            quantity: 5,
          },
          managerACaller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );

      // 2. Staff and FM CANNOT mutate customer SKU catalog (403)
      await expect(
        customerSkuService.createSku(
          {
            skuCode: 'SKU-ILLEGAL',
            name: 'Staff Created SKU',
            uom: 'box',
          },
          staffACaller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );

      // 3. Customer 2 CANNOT access or mutate Customer 1's rack (Rule 637)
      await expect(
        customerInventoryService.stockIn(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            rackTierId: String(tier1AId),
            quantity: 5,
          },
          customer2Caller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );

      // 4. Staff at Facility A CAN READ storage unit inventory tree (Safety Oversight / PCCC)
      const treeA = await customerInventoryService.getStorageUnitTree(
        String(storageUnitId),
        staffACaller
      );
      expect(treeA.storageUnit.unitNumber).toBe('HALL-A-01');
      expect(treeA.racks.length).toBeGreaterThanOrEqual(1);

      // 5. Staff at Facility B CANNOT READ storage unit tree at Facility A (Scoped Isolation - 403)
      await expect(
        customerInventoryService.getStorageUnitTree(
          String(storageUnitId),
          staffBCaller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );
    });
  });
});
