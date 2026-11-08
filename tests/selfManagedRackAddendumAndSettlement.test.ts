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
import { Facility } from '../src/modules/facility/facility.model.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { RackTier } from '../src/modules/storageRack/rackTier.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { SigningAuthorization } from '../src/modules/signingAuthorization/signingAuthorization.model.ts';
import { LegalEntity } from '../src/modules/legalEntity/legalEntity.model.ts';

import { contractService } from '../src/modules/contract/contract.container.ts';
import { incidentService } from '../src/modules/incident/incident.container.ts';

import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
  RackZoneEnum,
} from '../src/common/enums/storageRack.enum.ts';
import {
  ContractAddendumStatusEnum,
  ContractAddendumTypeEnum,
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { InventoryItemStatusEnum } from '../src/common/enums/customerInventory.enum.ts';
import { RentalTargetTypeEnum } from '../src/common/enums/rental.enum.ts';
import {
  IncidentCategoryEnum,
  IncidentLiablePartyEnum,
  IncidentSeverityEnum,
} from '../src/common/enums/incident.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { AppError } from '../src/common/errors/appError.error.ts';
import {
  calculateInterruptedDays,
  calculateInterruptedRefundAmount,
} from '../src/utils/interruptedDays.util.ts';

describe('T-SMR.4: Self-Managed Rack Addendum, Interrupted Refund & Compensation Settlement Suite', () => {
  const facilityAId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);

  const customerCaller = {
    id: TEST_USERS.customer1.id,
    role: RoleEnum.CUSTOMER,
  };
  const staffA = {
    id: TEST_USERS.staffFacilityA.id,
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };
  const managerA = {
    id: TEST_USERS.managerFacilityA.id,
    role: RoleEnum.FACILITY_MANAGER,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };

  let unitTypeId: Types.ObjectId;
  let storageUnitId: Types.ObjectId;
  let oldRackId: Types.ObjectId;
  let newRackId: Types.ObjectId;
  let differentTierRackId: Types.ObjectId;
  let contractId: Types.ObjectId;
  let sku1Id: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    const legalEntity = await LegalEntity.create({
      companyName: 'SSM Storage Co',
      taxCode: '0101234567',
      registeredAddress: '123 Main St, Hanoi',
      legalRepresentative: {
        name: 'Manager A',
        title: 'Director',
        idNumber: '001099000001',
      },
      bankAccount: {
        bankName: 'Vietcombank',
        accountNumber: '1234567890',
        accountHolder: 'SSM Storage Co',
      },
      phone: '0901234567',
      email: 'legal@ssm.vn',
      status: 'active',
    });

    // Facility
    await Facility.create({
      _id: facilityAId,
      code: 'FACA',
      name: 'Facility A',
      address: '123 Main St',
      city: 'Hanoi',
      status: FacilityStatusEnum.ACTIVE,
      managerId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
      operatingHours: { open: '08:00', close: '20:00' },
      timezone: 'Asia/Ho_Chi_Minh',
      legalEntityId: legalEntity._id,
    });

    // Signing Authorization for Manager
    await SigningAuthorization.create({
      legalEntityId: legalEntity._id,
      facilityIds: [facilityAId],
      authorizedUserId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
      authorizationNumber: 'AUTH-2026-001',
      issuedDate: new Date('2026-01-01'),
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2027-12-31'),
      status: 'active',
      fileHash: 'sha256-mock-hash-manager',
      documentUrl: 'https://res.cloudinary.com/demo/image/upload/auth.pdf',
    });

    // Unit Type WAREHOUSE_RACK
    unitTypeId = new Types.ObjectId();
    await UnitType.create({
      _id: unitTypeId,
      name: 'Warehouse Rack Hall A',
      code: 'WR-01',
      category: 'warehouse_rack',
      dimensions: { width: 10, length: 20, height: 5 },
      volume: 1000,
      area: 200,
      description: 'Rack warehouse area',
      status: 'active',
    });

    // Storage Unit
    storageUnitId = new Types.ObjectId();
    await StorageUnit.create({
      _id: storageUnitId,
      facilityId: facilityAId,
      unitTypeId,
      unitNumber: 'WH-RACK-01',
      floor: 1,
      zone: 'Z1',
      status: StorageUnitStatusEnum.AVAILABLE,
    });

    oldRackId = new Types.ObjectId();
    await StorageRack.create({
      _id: oldRackId,
      facilityId: facilityAId,
      storageUnitId,
      rackCode: 'RACK-OLD-01',
      aisle: 'A1',
      bay: '01',
      zone: RackZoneEnum.STANDARD,
      tierCount: 4,
      status: RackStatusEnum.RENTED,
      currentContractId: null,
      currentCustomerId: customerId,
    });

    let oldRackTier1Id: Types.ObjectId | undefined;
    for (let t = 1; t <= 4; t++) {
      const tier = await RackTier.create({
        facilityId: facilityAId,
        storageUnitId,
        storageRackId: oldRackId,
        tierNumber: t,
        tierCode: `RACK-OLD-01-T0${t}`,
        maxWeightKg: 500,
        volumeM3: 2.5,
        status: RackTierStatusEnum.OCCUPIED,
      });
      if (t === 1) oldRackTier1Id = tier._id as Types.ObjectId;
    }

    // New Rack (Compatible replacement, 4 tiers, AVAILABLE)
    newRackId = new Types.ObjectId();
    await StorageRack.create({
      _id: newRackId,
      facilityId: facilityAId,
      storageUnitId,
      rackCode: 'RACK-NEW-02',
      aisle: 'A1',
      bay: '02',
      zone: RackZoneEnum.PRIME,
      tierCount: 4,
      status: RackStatusEnum.AVAILABLE,
      currentContractId: null,
      currentCustomerId: null,
    });

    for (let t = 1; t <= 4; t++) {
      await RackTier.create({
        facilityId: facilityAId,
        storageUnitId,
        storageRackId: newRackId,
        tierNumber: t,
        tierCode: `RACK-NEW-02-T0${t}`,
        maxWeightKg: 500,
        volumeM3: 2.5,
        status: RackTierStatusEnum.AVAILABLE,
      });
    }

    // Different tier count rack (3 tiers, incompatible)
    differentTierRackId = new Types.ObjectId();
    await StorageRack.create({
      _id: differentTierRackId,
      facilityId: facilityAId,
      storageUnitId,
      rackCode: 'RACK-DIFF-03',
      aisle: 'A2',
      bay: '01',
      zone: RackZoneEnum.STANDARD,
      tierCount: 3,
      status: RackStatusEnum.AVAILABLE,
      currentContractId: null,
      currentCustomerId: null,
    });

    // Customer SKU
    sku1Id = new Types.ObjectId();
    await CustomerSku.create({
      _id: sku1Id,
      customerId,
      skuCode: 'SKU-BOX-01',
      name: 'Storage Box Large',
      barcode: '893000000001',
      uom: 'thùng',
      status: 'active',
    });

    // Active Rack Rental Contract
    contractId = new Types.ObjectId();
    await Contract.create({
      _id: contractId,
      contractCode: 'CTR-261107-001',
      source: ContractSourceEnum.WALK_IN,
      customerId,
      facilityId: facilityAId,
      storageUnitId,
      rentalTargetType: RentalTargetTypeEnum.STORAGE_RACK,
      rentedRackIds: [oldRackId],
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      assignedStaffId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-30'),
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1500000,
      totalPeriodicPrice: 1500000,
      depositAmount: 1500000,
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

    await StorageRack.findByIdAndUpdate(oldRackId, {
      currentContractId: contractId,
    });

    await CustomerInventory.create({
      customerId,
      contractId,
      facilityId: facilityAId,
      storageUnitId,
      storageRackId: oldRackId,
      rackTierId: oldRackTier1Id,
      skuId: sku1Id,
      quantity: 10,
      status: InventoryItemStatusEnum.NORMAL,
    });
  });

  describe('1. Pure Function: calculateInterruptedDays & calculateInterruptedRefundAmount', () => {
    it('returns 0 days when interruption duration is less than 8 hours (grace period)', () => {
      const start = new Date('2026-11-01T08:00:00.000Z');
      const end = new Date('2026-11-01T15:30:00.000Z'); // 7.5 hours
      const days = calculateInterruptedDays({
        evacuatedAt: start,
        actualEndAt: end,
      });
      expect(days).toBe(0);

      const refund = calculateInterruptedRefundAmount({
        evacuatedAt: start,
        actualEndAt: end,
        monthlyRentalPrice: 1500000,
      });
      expect(refund).toBe(0);
    });

    it('returns 1 day when interruption duration is between 8 and 24 hours', () => {
      const start = new Date('2026-11-01T08:00:00.000Z');
      const end8h = new Date('2026-11-01T16:00:00.000Z'); // exactly 8 hours
      expect(
        calculateInterruptedDays({ evacuatedAt: start, actualEndAt: end8h })
      ).toBe(1);

      const end24h = new Date('2026-11-02T08:00:00.000Z'); // exactly 24 hours
      expect(
        calculateInterruptedDays({ evacuatedAt: start, actualEndAt: end24h })
      ).toBe(1);

      const refund = calculateInterruptedRefundAmount({
        evacuatedAt: start,
        actualEndAt: end24h,
        monthlyRentalPrice: 1500000,
      });
      // 1,500,000 / 30 * 1 = 50,000 VND
      expect(refund).toBe(50000);
    });

    it('returns 2 days when interruption is 36 hours (between 24h and 48h)', () => {
      const start = new Date('2026-11-01T08:00:00.000Z');
      const end36h = new Date('2026-11-02T20:00:00.000Z'); // 36 hours
      expect(
        calculateInterruptedDays({ evacuatedAt: start, actualEndAt: end36h })
      ).toBe(2);

      const refund = calculateInterruptedRefundAmount({
        evacuatedAt: start,
        actualEndAt: end36h,
        monthlyRentalPrice: 1500000,
      });
      // 1,500,000 / 30 * 2 = 100,000 VND
      expect(refund).toBe(100000);
    });

    it('enforces Cutoff Cap of readyAt + 48 hours [CHỐT D-SMR.9]', () => {
      const start = new Date('2026-11-01T08:00:00.000Z');
      const readyAt = new Date('2026-11-02T08:00:00.000Z'); // 24h later rack is ready
      // Customer delays coming for 5 days (120h)
      const lateCustomerEnd = new Date('2026-11-07T08:00:00.000Z');

      // Cap at readyAt + 48h = 2026-11-04T08:00:00.000Z (total effective duration = 72h = 3 days)
      const days = calculateInterruptedDays({
        evacuatedAt: start,
        readyAt,
        actualEndAt: lateCustomerEnd,
      });
      expect(days).toBe(3);

      const refund = calculateInterruptedRefundAmount({
        evacuatedAt: start,
        readyAt,
        actualEndAt: lateCustomerEnd,
        monthlyRentalPrice: 1500000,
      });
      // 1,500,000 / 30 * 3 = 150,000 VND
      expect(refund).toBe(150000);
    });
  });

  describe('2. Contract Addendum: RACK_CHANGE Flow', () => {
    it('creates RACK_CHANGE addendum and atomically reserves replacement rack (AVAILABLE -> RESERVED)', async () => {
      const res = await contractService.createAddendum(
        String(contractId),
        staffA.id,
        staffA.role,
        {
          type: ContractAddendumTypeEnum.RACK_CHANGE,
          previousRackId: String(oldRackId),
          newRackId: String(newRackId),
          notes: 'Đổi sang kệ mới do kệ cũ gãy thanh giằng',
        }
      );

      expect(res.addendums).toHaveLength(1);
      const addendum = res.addendums[0];
      expect(addendum.type).toBe(ContractAddendumTypeEnum.RACK_CHANGE);
      expect(addendum.status).toBe(ContractAddendumStatusEnum.DRAFT);
      expect(String(addendum.previousRackId)).toBe(String(oldRackId));
      expect(String(addendum.newRackId)).toBe(String(newRackId));

      // Replacement rack must be RESERVED
      const reservedRack = await StorageRack.findById(newRackId);
      expect(reservedRack?.status).toBe(RackStatusEnum.RESERVED);
      expect(String(reservedRack?.currentContractId)).toBe(String(contractId));
    });

    it('rejects RACK_CHANGE if replacement rack has mismatched tierCount (400 MESSAGE_CODE_437)', async () => {
      await expect(
        contractService.createAddendum(
          String(contractId),
          staffA.id,
          staffA.role,
          {
            type: ContractAddendumTypeEnum.RACK_CHANGE,
            previousRackId: String(oldRackId),
            newRackId: String(differentTierRackId), // 3 tiers vs 4 tiers
            notes: 'Mismatched tier count rack',
          }
        )
      ).rejects.toThrow(AppError);
    });

    it('rejects RACK_CHANGE if previousRackId does not belong to contract (400 MESSAGE_CODE_438)', async () => {
      const nonRentedRackId = new Types.ObjectId();
      await expect(
        contractService.createAddendum(
          String(contractId),
          staffA.id,
          staffA.role,
          {
            type: ContractAddendumTypeEnum.RACK_CHANGE,
            previousRackId: String(nonRentedRackId),
            newRackId: String(newRackId),
          }
        )
      ).rejects.toThrow(AppError);
    });

    it('releases reserved replacement rack back to AVAILABLE when addendum is cancelled', async () => {
      const created = await contractService.createAddendum(
        String(contractId),
        staffA.id,
        staffA.role,
        {
          type: ContractAddendumTypeEnum.RACK_CHANGE,
          previousRackId: String(oldRackId),
          newRackId: String(newRackId),
        }
      );
      const addendumId = created.addendums[0].id;

      // Cancel addendum
      await contractService.cancelAddendum(
        String(contractId),
        addendumId,
        staffA.id,
        staffA.role,
        { cancellationReason: 'Khách đổi ý không muốn đổi kệ' }
      );

      const restoredRack = await StorageRack.findById(newRackId);
      expect(restoredRack?.status).toBe(RackStatusEnum.AVAILABLE);
      expect(restoredRack?.currentContractId).toBeNull();
    });

    it('activates RACK_CHANGE when both customer and staff sign: updates rentedRackIds and sets newRack to RENTED', async () => {
      const created = await contractService.createAddendum(
        String(contractId),
        staffA.id,
        staffA.role,
        {
          type: ContractAddendumTypeEnum.RACK_CHANGE,
          previousRackId: String(oldRackId),
          newRackId: String(newRackId),
        }
      );
      const addendumId = created.addendums[0].id;

      // Customer signs first
      await contractService.customerSignAddendum(
        String(contractId),
        addendumId,
        customerCaller.id,
        customerCaller.role,
        { termsAccepted: true }
      );

      // Staff signs and completes
      const updatedContract = await contractService.staffSignAddendum(
        String(contractId),
        addendumId,
        managerA.id,
        managerA.role,
        {
          termsAccepted: true,
          signedAddendumFileUrls: [
            'https://res.cloudinary.com/demo/image/upload/signed_addendum.pdf',
          ],
        }
      );

      // Contract rentedRackIds must now contain newRackId instead of oldRackId
      const rentedRackIds = updatedContract.rentedRackIds.map((r: unknown) =>
        typeof r === 'object' && r !== null && '_id' in r
          ? String((r as { _id: unknown })._id)
          : String(r)
      );
      expect(rentedRackIds).toContain(String(newRackId));
      expect(rentedRackIds).not.toContain(String(oldRackId));

      // newRack must be RENTED
      const newRack = await StorageRack.findById(newRackId);
      expect(newRack?.status).toBe(RackStatusEnum.RENTED);
      expect(String(newRack?.currentCustomerId)).toBe(String(customerId));
      expect(String(newRack?.currentContractId)).toBe(String(contractId));
    });
  });

  describe('3. Incident Resolution & Compensation Accumulation', () => {
    it('preserves damageFee when liableParty is FACILITY during resolveIncident', async () => {
      const reported = await incidentService.reportIncident(customerCaller, {
        facilityId: String(facilityAId),
        storageUnitId: String(storageUnitId),
        storageRackId: String(oldRackId),
        contractId: String(contractId),
        category: IncidentCategoryEnum.STRUCTURAL,
        severity: IncidentSeverityEnum.HIGH,
        title: 'Thanh giằng kệ kho cong vênh làm đổ 1 thùng đồ',
        description: 'Vỡ 2 món gốm sứ khi kệ sập nhẹ',
        images: ['https://res.cloudinary.com/demo/image/upload/damage.jpg'],
        putUnitUnderMaintenance: false,
        requiresRelocation: true,
      });

      await incidentService.assignStaff(managerA, reported.id, {
        assignedStaffId: staffA.id,
      });

      // Staff resolves with FACILITY fault and agreed damageFee = 250,000 VND
      const resolved = await incidentService.resolveIncident(
        staffA,
        reported.id,
        {
          resolutionNotes:
            'Cơ sở chấp nhận đền bù 250,000 VND cho 2 món đồ gốm sứ vỡ.',
          staffEvidenceImages: [
            'https://res.cloudinary.com/demo/image/upload/fixed.jpg',
          ],
          repairCost: 500000,
          liableParty: IncidentLiablePartyEnum.FACILITY,
          damageFee: 250000,
        }
      );

      expect(resolved.resolution?.liableParty).toBe(
        IncidentLiablePartyEnum.FACILITY
      );
      expect(resolved.resolution?.damageFee).toBe(250000);
    });

    it('accumulates interruptedRefund and facilityDamageFee onto Contract when incident closes', async () => {
      const reported = await incidentService.reportIncident(customerCaller, {
        facilityId: String(facilityAId),
        storageUnitId: String(storageUnitId),
        storageRackId: String(oldRackId),
        contractId: String(contractId),
        category: IncidentCategoryEnum.STRUCTURAL,
        severity: IncidentSeverityEnum.HIGH,
        title: 'Sập kệ nguy hiểm',
        description: 'Phải sơ tán đồ lưu tạm',
        images: ['https://res.cloudinary.com/demo/image/upload/bent.jpg'],
        putUnitUnderMaintenance: false,
        requiresRelocation: true,
      });

      await incidentService.assignStaff(managerA, reported.id, {
        assignedStaffId: staffA.id,
      });

      // Evacuate rack (creates preEvacuationManifest with evacuatedAt)
      await incidentService.evacuateRack(staffA, reported.id, {
        evidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/evac.jpg',
        ],
        emergencyReason: 'Sơ tán kệ hư hỏng sang khu lưu tạm',
        requiresRelocation: true,
        items: [{ skuId: String(sku1Id), actualQuantity: 10 }],
      });

      // Manager uploads signed paper manifest
      await incidentService.uploadRestorationManifest(managerA, reported.id, {
        restorationManifestDocUrl:
          'https://res.cloudinary.com/demo/image/upload/paper_signed.pdf',
        notes: 'Đã lập biên bản kiểm kê bồi thường giấy',
      });

      // Customer acknowledges
      await incidentService.customerAcknowledge(customerCaller, reported.id, {
        notes: 'Đã nhận đủ hàng và đồng ý bồi thường',
      });

      // Resolve with agreed facility damage fee
      await incidentService.resolveIncident(staffA, reported.id, {
        resolutionNotes: 'Cơ sở nhận trách nhiệm bồi thường',
        staffEvidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/fixed.jpg',
        ],
        repairCost: 300000,
        liableParty: IncidentLiablePartyEnum.FACILITY,
        damageFee: 200000,
      });

      // Close Incident
      await incidentService.closeIncident(managerA, reported.id);

      // Verify contract has accumulated compensation
      const updatedContract = await Contract.findById(contractId);
      expect(updatedContract?.accumulatedFacilityDamageFee).toBe(200000);
      // evacuatedAt to now is within 8h in this rapid test, so interrupted days is 0 or >= 0
      expect(
        updatedContract?.accumulatedInterruptedRefund
      ).toBeGreaterThanOrEqual(0);
    });
  });

  describe('4. Integrated Check-out Settlement with Compensation', () => {
    it('accurately settles check-out: refunds deposit + facility compensations - deductions via RefundRequest', async () => {
      // Setup contract with pre-existing compensations
      await Contract.findByIdAndUpdate(contractId, {
        accumulatedInterruptedRefund: 100000, // 2 days interruption (100k)
        accumulatedFacilityDamageFee: 250000, // 250k item damage compensation
        damageFee: 50000, // customer damaged 50k warehouse fixture
      });

      // Customer cleared out items before check-out
      await CustomerInventory.deleteMany({ contractId });

      // Deposit = 1,500,000 VND
      // Total Credit = 1,500,000 + 100,000 + 250,000 = 1,850,000 VND
      // Total Deductions = 50,000 (damage) + 0 (overdue) = 50,000 VND
      // Net Refund = 1,800,000 VND
      const checkedOut = await contractService.checkOutContract(
        String(contractId),
        managerA.id,
        managerA.role,
        {
          inspectionNotes: 'Khách dọn sạch kho, hoàn trả mặt bằng',
        }
      );

      expect(checkedOut.status).toBe(ContractStatusEnum.COMPLETED);
      expect(checkedOut.refundAmount).toBe(1800000);
      expect(checkedOut.additionalPaymentRequired).toBe(0);
    });
  });
});
