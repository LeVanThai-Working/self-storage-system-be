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
import { Facility } from '../src/modules/facility/facility.model.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { RackTier } from '../src/modules/storageRack/rackTier.model.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { InventoryMovement } from '../src/modules/customerInventory/inventoryMovement.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';

import { incidentService } from '../src/modules/incident/incident.container.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
  RackZoneEnum,
} from '../src/common/enums/storageRack.enum.ts';
import {
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import {
  IncidentCategoryEnum,
  IncidentLiablePartyEnum,
  IncidentSeverityEnum,
  IncidentStatusEnum,
} from '../src/common/enums/incident.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { InventoryItemStatusEnum } from '../src/common/enums/customerInventory.enum.ts';

import { AppError } from '../src/common/errors/appError.error.ts';

describe('T-SMR.3: Self-Managed Warehouse Rack Incident Handling & 2-Layer Acknowledgment', () => {
  const facilityAId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const facilityBId = new Types.ObjectId(TEST_FACILITY_B_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);

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
  const staffB = {
    id: TEST_USERS.staffFacilityB.id,
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: TEST_FACILITY_B_ID,
  };
  const customerCaller = {
    id: TEST_USERS.customer1.id,
    role: RoleEnum.CUSTOMER,
  };
  const otherCustomerCaller = {
    id: TEST_USERS.customer2.id,
    role: RoleEnum.CUSTOMER,
  };

  let storageUnitId: Types.ObjectId;
  let storageRackId: Types.ObjectId;
  let rackTier1Id: Types.ObjectId;
  let rackTier2Id: Types.ObjectId;
  let contractId: Types.ObjectId;
  let sku1Id: Types.ObjectId;
  let sku2Id: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    // 1. Facilities
    await Facility.create([
      {
        _id: facilityAId,
        name: 'Facility A - Warehouse',
        code: 'HN01',
        address: '123 Warehouse Ave',
        city: 'Ha Noi',
        status: FacilityStatusEnum.ACTIVE,
      },
      {
        _id: facilityBId,
        name: 'Facility B - Warehouse',
        code: 'SGN01',
        address: '456 Storage St',
        city: 'Ho Chi Minh',
        status: FacilityStatusEnum.ACTIVE,
      },
    ]);

    // 2. Storage Unit & Unit Type
    const unitType = await UnitType.create({
      name: `Standard Warehouse Rack Unit ${Date.now()}`,
      category: 'warehouse_rack',
      dimensions: { length: 10, width: 5, height: 4 },
      area: 50,
      volume: 200,
    });

    const unit = await StorageUnit.create({
      unitNumber: 'WH-ROOM-101',
      facilityId: facilityAId,
      unitTypeId: unitType._id,
      floor: 1,
      zone: 'A',
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    storageUnitId = unit._id as Types.ObjectId;

    // 3. Storage Rack
    const rack = await StorageRack.create({
      facilityId: facilityAId,
      storageUnitId,
      rackCode: 'RACK-A01',
      aisle: 'A',
      bay: 1,
      tierCount: 2,
      zone: RackZoneEnum.STANDARD,
      status: RackStatusEnum.RENTED,
      currentCustomerId: customerId,
    });
    storageRackId = rack._id as Types.ObjectId;

    // 4. Rack Tiers
    const tier1 = await RackTier.create({
      facilityId: facilityAId,
      storageUnitId,
      storageRackId,
      tierNumber: 1,
      tierCode: 'T1',
      maxWeightKg: 500,
      status: RackTierStatusEnum.OCCUPIED,
    });
    rackTier1Id = tier1._id as Types.ObjectId;

    const tier2 = await RackTier.create({
      facilityId: facilityAId,
      storageUnitId,
      storageRackId,
      tierNumber: 2,
      tierCode: 'T2',
      maxWeightKg: 500,
      status: RackTierStatusEnum.OCCUPIED,
    });
    rackTier2Id = tier2._id as Types.ObjectId;

    // 5. Contract
    const startDate = new Date(Date.now() - 5 * 86400000);
    const endDate = new Date(Date.now() + 25 * 86400000);
    const contract = await Contract.create({
      contractCode: 'CTR-SMR-301',
      source: ContractSourceEnum.WALK_IN,
      customerId,
      facilityId: facilityAId,
      storageUnitId,
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      rentedRackIds: [storageRackId],
      startDate,
      endDate,
      actualCheckInDate: startDate,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1500000,
      totalPeriodicPrice: 1500000,
      depositAmount: 1500000,
      depositPaidAt: startDate,
      firstPeriodPaidAt: startDate,
      depositStatus: ContractDepositStatusEnum.HELD,
      customerSigned: true,
      customerSignedAt: startDate,
      staffSigned: true,
      staffSignedAt: startDate,
      termsAccepted: true,
      status: ContractStatusEnum.ACTIVE,
    });
    contractId = contract._id as Types.ObjectId;

    // Update rack with contractId
    await StorageRack.findByIdAndUpdate(storageRackId, {
      currentContractId: contractId,
    });

    // 6. Customer SKUs
    const sku1 = await CustomerSku.create({
      customerId,
      skuCode: 'SKU-BOX-01',
      name: 'Electronic Boxes Component',
      uom: 'thùng',
      lengthCm: 30,
      widthCm: 20,
      heightCm: 15,
      weightKg: 5,
    });
    sku1Id = sku1._id as Types.ObjectId;

    const sku2 = await CustomerSku.create({
      customerId,
      skuCode: 'SKU-BOX-02',
      name: 'Plastic Tool Cases',
      uom: 'hộp',
      lengthCm: 40,
      widthCm: 30,
      heightCm: 25,
      weightKg: 8,
    });
    sku2Id = sku2._id as Types.ObjectId;

    // 7. Active Inventory Items on Rack Tiers
    await CustomerInventory.create([
      {
        customerId,
        contractId,
        facilityId: facilityAId,
        storageUnitId,
        storageRackId,
        rackTierId: rackTier1Id,
        skuId: sku1Id,
        quantity: 20,
        status: InventoryItemStatusEnum.NORMAL,
      },
      {
        customerId,
        contractId,
        facilityId: facilityAId,
        storageUnitId,
        storageRackId,
        rackTierId: rackTier2Id,
        skuId: sku2Id,
        quantity: 15,
        status: InventoryItemStatusEnum.NORMAL,
      },
    ]);
  });

  async function createIncident(requiresRelocation: boolean = false) {
    const reported = await incidentService.reportIncident(customerCaller, {
      facilityId: String(facilityAId),
      storageUnitId: String(storageUnitId),
      storageRackId: String(storageRackId),
      contractId: String(contractId),
      category: IncidentCategoryEnum.STRUCTURAL,
      severity: IncidentSeverityEnum.HIGH,
      title: 'Bent support crossbar on Rack A01',
      description:
        'Support crossbar bent, risk of tier collapse under vibration.',
      images: ['https://res.cloudinary.com/demo/image/upload/bent_rack.jpg'],
      putUnitUnderMaintenance: false,
      requiresRelocation,
    });

    await incidentService.assignStaff(managerA, reported.id, {
      assignedStaffId: staffA.id,
    });

    return reported.id;
  }

  describe('1. Emergency Rack Evacuation (POST /incidents/:id/evacuate-rack)', () => {
    it('should successfully evacuate rack items to TEMPORARY_HOLDING and generate preEvacuationManifest', async () => {
      const incidentId = await createIncident(false);

      const evacuateRes = await incidentService.evacuateRack(
        staffA,
        incidentId,
        {
          evidenceImages: [
            'https://res.cloudinary.com/demo/image/upload/evac_scene_1.jpg',
          ],
          emergencyReason:
            'Kệ A01 bị cong dầm ngang, sơ tán khẩn cấp xuống sàn lưu tạm bảo vệ hàng',
          items: [
            {
              skuId: String(sku1Id),
              actualQuantity: 20,
              condition: 'Nguyên vẹn',
              notes: 'Đúng 20 thùng',
            },
            {
              skuId: String(sku2Id),
              actualQuantity: 14, // 1 missing or discrepancy detected
              condition: '14 hộp nguyên vẹn, thiếu 1 so với DB',
              notes: 'Thực tế 14',
            },
          ],
        }
      );

      expect(evacuateRes).toBeDefined();
      expect(evacuateRes.status).toBe(IncidentStatusEnum.IN_PROGRESS);
      expect(evacuateRes.preEvacuationManifest).toBeDefined();
      expect(evacuateRes.preEvacuationManifest?.evidenceImages).toContain(
        'https://res.cloudinary.com/demo/image/upload/evac_scene_1.jpg'
      );
      expect(evacuateRes.preEvacuationManifest?.totalSystemQuantity).toBe(35); // 20 + 15
      expect(evacuateRes.preEvacuationManifest?.totalActualQuantity).toBe(34); // 20 + 14
      expect(evacuateRes.preEvacuationManifest?.totalDiscrepancy).toBe(-1); // 34 - 35
      expect(evacuateRes.preEvacuationManifest?.items).toHaveLength(2);

      // Verify DB storageRack is in MAINTENANCE
      const updatedRack = await StorageRack.findById(storageRackId);
      expect(updatedRack?.status).toBe(RackStatusEnum.MAINTENANCE);

      // Verify DB rackTiers are reset to AVAILABLE
      const tier1 = await RackTier.findById(rackTier1Id);
      const tier2 = await RackTier.findById(rackTier2Id);
      expect(tier1?.status).toBe(RackTierStatusEnum.AVAILABLE);
      expect(tier2?.status).toBe(RackTierStatusEnum.AVAILABLE);

      // Verify CustomerInventory items are in TEMPORARY_HOLDING with rackTierId: null
      const holdingItems = await CustomerInventory.find({
        contractId,
        status: InventoryItemStatusEnum.TEMPORARY_HOLDING,
      });
      expect(holdingItems).toHaveLength(2);
      expect(holdingItems[0].storageRackId).toBeNull();
      expect(holdingItems[0].rackTierId).toBeNull();

      // Verify InventoryMovements were recorded
      const movements = await InventoryMovement.find({ contractId });
      expect(movements.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject evacuation if customer tries to call evacuate-rack (403 Zero-Touch)', async () => {
      const incidentId = await createIncident(false);

      await expect(
        incidentService.evacuateRack(customerCaller, incidentId, {
          evidenceImages: [
            'https://res.cloudinary.com/demo/image/upload/evac_scene_1.jpg',
          ],
          emergencyReason: 'Khách hàng cố tình tự bấm sơ tán',
          items: [{ skuId: String(sku1Id), actualQuantity: 20 }],
        })
      ).rejects.toThrow(AppError);
    });

    it('should reject evacuation if staff belongs to another facility (403)', async () => {
      const incidentId = await createIncident(false);

      await expect(
        incidentService.evacuateRack(staffB, incidentId, {
          evidenceImages: [
            'https://res.cloudinary.com/demo/image/upload/evac_scene_1.jpg',
          ],
          emergencyReason: 'Nhân viên cơ sở B can thiệp cơ sở A',
          items: [{ skuId: String(sku1Id), actualQuantity: 20 }],
        })
      ).rejects.toThrow(AppError);
    });

    it('should reject second evacuation on the same incident (MESSAGE_CODE_710)', async () => {
      const incidentId = await createIncident(false);

      await incidentService.evacuateRack(staffA, incidentId, {
        evidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/evac_scene_1.jpg',
        ],
        emergencyReason: 'Sơ tán lần 1 hợp lệ',
        items: [{ skuId: String(sku1Id), actualQuantity: 20 }],
      });

      await expect(
        incidentService.evacuateRack(staffA, incidentId, {
          evidenceImages: [
            'https://res.cloudinary.com/demo/image/upload/evac_scene_2.jpg',
          ],
          emergencyReason: 'Sơ tán lần 2 trùng lặp',
          items: [{ skuId: String(sku1Id), actualQuantity: 20 }],
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('2. Two-Layer Acknowledgment & Restoration Manifest Flow', () => {
    it('should allow FM to upload signed restoration paper manifest and customer to acknowledge on App', async () => {
      const incidentId = await createIncident(false);

      await incidentService.evacuateRack(staffA, incidentId, {
        evidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/evac_scene_1.jpg',
        ],
        emergencyReason: 'Sơ tán khẩn cấp xuống sàn lưu tạm',
        items: [{ skuId: String(sku1Id), actualQuantity: 20 }],
      });

      // Staff finishes repairing old rack -> calls resolveIncident
      await incidentService.resolveIncident(staffA, incidentId, {
        resolutionNotes:
          'Đã hàn gia cố bu-lông và thanh giằng hoàn tất an toàn.',
        staffEvidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/repair_done.jpg',
        ],
        repairCost: 300000,
        liableParty: IncidentLiablePartyEnum.FACILITY,
        damageFee: 0,
      });

      // FM uploads scanned paper manifest with customer ink signature
      const docRes = await incidentService.uploadRestorationManifest(
        managerA,
        incidentId,
        {
          restorationManifestDocUrl:
            'https://res.cloudinary.com/demo/image/upload/signed_manifest_paper.pdf',
          notes: 'Biên bản bàn giao kiểm đếm hàng đã có chữ ký tươi của khách.',
        }
      );
      expect(docRes.restorationManifestDocUrl).toBe(
        'https://res.cloudinary.com/demo/image/upload/signed_manifest_paper.pdf'
      );
      expect(docRes.restorationUploadedAt).toBeDefined();

      // Customer acknowledges on App
      const ackRes = await incidentService.customerAcknowledge(
        customerCaller,
        incidentId,
        {
          notes: 'Đã nhận lại đủ 20 thùng hàng, kệ hàn chắc chắn.',
        }
      );
      expect(ackRes.customerAcknowledgedAt).toBeDefined();

      // Manager can now successfully close the incident
      const closedRes = await incidentService.closeIncident(
        managerA,
        incidentId
      );
      expect(closedRes.status).toBe(IncidentStatusEnum.CLOSED);
      expect(closedRes.closedAt).toBeDefined();
    });

    it('should block closing incident when paper manifest has not been uploaded (MESSAGE_CODE_712)', async () => {
      const incidentId = await createIncident(false);

      await incidentService.evacuateRack(staffA, incidentId, {
        evidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/evac_scene_1.jpg',
        ],
        emergencyReason: 'Sơ tán khẩn cấp xuống sàn lưu tạm',
        items: [{ skuId: String(sku1Id), actualQuantity: 20 }],
      });

      await incidentService.resolveIncident(staffA, incidentId, {
        resolutionNotes: 'Kệ cũ đã sửa xong.',
        staffEvidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/repair_done.jpg',
        ],
        repairCost: 200000,
        liableParty: IncidentLiablePartyEnum.FACILITY,
        damageFee: 0,
      });

      // Try closing without uploading signed paper manifest
      await expect(
        incidentService.closeIncident(managerA, incidentId)
      ).rejects.toThrow(AppError);
    });

    it('should block closing incident when customer has not acknowledged on App (MESSAGE_CODE_713)', async () => {
      const incidentId = await createIncident(false);

      await incidentService.evacuateRack(staffA, incidentId, {
        evidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/evac_scene_1.jpg',
        ],
        emergencyReason: 'Sơ tán khẩn cấp xuống sàn lưu tạm',
        items: [{ skuId: String(sku1Id), actualQuantity: 20 }],
      });

      await incidentService.resolveIncident(staffA, incidentId, {
        resolutionNotes: 'Kệ cũ đã sửa xong.',
        staffEvidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/repair_done.jpg',
        ],
        repairCost: 200000,
        liableParty: IncidentLiablePartyEnum.FACILITY,
        damageFee: 0,
      });

      // FM uploads document, but customer hasn't tapped acknowledge on App yet
      await incidentService.uploadRestorationManifest(managerA, incidentId, {
        restorationManifestDocUrl:
          'https://res.cloudinary.com/demo/image/upload/signed_manifest.pdf',
      });

      await expect(
        incidentService.closeIncident(managerA, incidentId)
      ).rejects.toThrow(AppError);
    });

    it('should prevent staff from uploading restoration manifest (Maker-Checker, FM/Ops/Admin only)', async () => {
      const incidentId = await createIncident(false);

      await expect(
        incidentService.uploadRestorationManifest(staffA, incidentId, {
          restorationManifestDocUrl:
            'https://res.cloudinary.com/demo/image/upload/signed_manifest.pdf',
        })
      ).rejects.toThrow(AppError);
    });

    it('should prevent another customer from acknowledging on behalf of contract owner', async () => {
      const incidentId = await createIncident(false);

      await incidentService.evacuateRack(staffA, incidentId, {
        evidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/evac_scene_1.jpg',
        ],
        emergencyReason: 'Sơ tán khẩn cấp',
        items: [{ skuId: String(sku1Id), actualQuantity: 20 }],
      });

      await incidentService.uploadRestorationManifest(managerA, incidentId, {
        restorationManifestDocUrl:
          'https://res.cloudinary.com/demo/image/upload/signed_manifest.pdf',
      });

      await expect(
        incidentService.customerAcknowledge(otherCustomerCaller, incidentId, {
          notes: 'Khách hàng lạ xác nhận',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('3. Unrepairable Rack Flow (requiresRelocation: true -> Skip RESOLVED -> Direct to CLOSED)', () => {
    it('should allow directly closing from IN_PROGRESS when requiresRelocation is true after manifest & customer acknowledge', async () => {
      // Incident flagged as requiresRelocation = true
      const incidentId = await createIncident(true);

      // Staff evacuates rack with requiresRelocation: true
      const evacRes = await incidentService.evacuateRack(staffA, incidentId, {
        evidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/bent_beyond_repair.jpg',
        ],
        emergencyReason:
          'Kệ A01 bị gãy dầm chịu lực không thể sửa chữa. Mời khách lên quầy giải quyết đổi kệ/hủy',
        requiresRelocation: true,
        items: [
          { skuId: String(sku1Id), actualQuantity: 20 },
          { skuId: String(sku2Id), actualQuantity: 15 },
        ],
      });
      expect(evacRes.status).toBe(IncidentStatusEnum.IN_PROGRESS);
      expect(evacRes.requiresRelocation).toBe(true);

      // Customer comes to warehouse, negotiates rack change / cancellation at counter with Manager.
      // Manager uploads signed paper manifest.
      await incidentService.uploadRestorationManifest(managerA, incidentId, {
        restorationManifestDocUrl:
          'https://res.cloudinary.com/demo/image/upload/paper_negotiation_signed.pdf',
        notes: 'Đã hoàn tất thương lượng tại quầy và bàn giao hàng.',
      });

      // Customer acknowledges on App
      await incidentService.customerAcknowledge(customerCaller, incidentId, {
        notes: 'Đã kiểm kê và dời đồ xong xuôi.',
      });

      // Manager directly calls closeIncident from IN_PROGRESS (bypassing RESOLVED to avoid duplicate notification)
      const closed = await incidentService.closeIncident(managerA, incidentId, {
        notes: 'Đóng hồ sơ sự cố sau khi khách đã lên làm việc tại quầy.',
      });

      expect(closed.status).toBe(IncidentStatusEnum.CLOSED);
      expect(closed.closedAt).toBeDefined();
    });
  });

  describe('4. Standard Incidents (Non-rack / No evacuation)', () => {
    it('should allow normal incidents without evacuation to close normally without requiring restoration manifest', async () => {
      // Normal incident (broken light switch)
      const reported = await incidentService.reportIncident(customerCaller, {
        facilityId: String(facilityAId),
        storageUnitId: String(storageUnitId),
        contractId: String(contractId),
        category: IncidentCategoryEnum.ELECTRICAL,
        severity: IncidentSeverityEnum.LOW,
        title: 'Broken light bulb in aisle',
        description: 'Light bulb flickering.',
        images: ['https://res.cloudinary.com/demo/image/upload/bulb.jpg'],
        putUnitUnderMaintenance: false,
        requiresRelocation: false,
      });

      await incidentService.assignStaff(managerA, reported.id, {
        assignedStaffId: staffA.id,
      });

      await incidentService.resolveIncident(staffA, reported.id, {
        resolutionNotes: 'Đã thay bóng đèn LED mới.',
        staffEvidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/bulb_fixed.jpg',
        ],
        repairCost: 50000,
        liableParty: IncidentLiablePartyEnum.FACILITY,
        damageFee: 0,
      });

      // Can close directly without preEvacuationManifest or restorationManifestDocUrl
      const closed = await incidentService.closeIncident(managerA, reported.id);
      expect(closed.status).toBe(IncidentStatusEnum.CLOSED);
    });
  });
});
