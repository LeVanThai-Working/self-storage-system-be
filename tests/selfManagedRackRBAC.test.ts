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
import { Contract } from '../src/modules/contract/contract.model.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { RackTier } from '../src/modules/storageRack/rackTier.model.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { customerInventoryService } from '../src/modules/customerInventory/customerInventory.container.ts';
import { customerSkuService } from '../src/modules/customerSku/customerSku.container.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { CustomerSkuStatusEnum } from '../src/common/enums/customerSku.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
  RackZoneEnum,
} from '../src/common/enums/storageRack.enum.ts';
import { InventoryItemStatusEnum } from '../src/common/enums/customerInventory.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';

describe('T-SMR.1: Self-Managed Warehouse Rack RBAC & Zero-Touch Policy', () => {
  const facilityAId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const facilityBId = new Types.ObjectId(TEST_FACILITY_B_ID);

  const customer1Caller = {
    id: TEST_USERS.customer1.id,
    role: RoleEnum.CUSTOMER,
  };
  const customer2Caller = {
    id: TEST_USERS.customer2.id,
    role: RoleEnum.CUSTOMER,
  };
  const staffACaller = {
    id: TEST_USERS.staffFacilityA.id,
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };
  const managerACaller = {
    id: TEST_USERS.managerFacilityA.id,
    role: RoleEnum.FACILITY_MANAGER,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };
  const adminCaller = {
    id: TEST_USERS.systemAdmin.id,
    role: RoleEnum.SYSTEM_ADMIN,
  };

  let warehouseUnitTypeId: Types.ObjectId;
  let unitAId: Types.ObjectId;
  let unitBId: Types.ObjectId;

  let rack1Id: Types.ObjectId;
  let tier1AId: Types.ObjectId;

  let rack2Id: Types.ObjectId;
  let tier2AId: Types.ObjectId;

  let rack3Id: Types.ObjectId;
  let tier3AId: Types.ObjectId;

  let contract1Id: Types.ObjectId;
  let contract2Id: Types.ObjectId;

  let sku1Id: Types.ObjectId;
  let sku2Id: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    // 1. Facilities
    await Facility.create([
      {
        _id: facilityAId,
        name: 'Facility Alpha',
        code: 'FA-01',
        address: '123 Street A',
        city: 'Ho Chi Minh',
        status: FacilityStatusEnum.ACTIVE,
      },
      {
        _id: facilityBId,
        name: 'Facility Beta',
        code: 'FB-02',
        address: '456 Street B',
        city: 'Hanoi',
        status: FacilityStatusEnum.ACTIVE,
      },
    ]);

    // 2. UnitType
    const unitType = await UnitType.create({
      name: 'Warehouse Rack Unit Type',
      dimensions: { length: 10, width: 10, height: 5 },
      area: 100,
      volume: 500,
      category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
      status: UnitTypeStatusEnum.ACTIVE,
    });
    warehouseUnitTypeId = unitType._id as Types.ObjectId;

    // 3. Storage Units
    const unitA = await StorageUnit.create({
      facilityId: facilityAId,
      unitTypeId: warehouseUnitTypeId,
      unitNumber: 'WH-A-101',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    unitAId = unitA._id as Types.ObjectId;

    const unitB = await StorageUnit.create({
      facilityId: facilityBId,
      unitTypeId: warehouseUnitTypeId,
      unitNumber: 'WH-B-201',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    unitBId = unitB._id as Types.ObjectId;

    // 4. Storage Racks & Tiers in Unit A
    const rack1 = await StorageRack.create({
      facilityId: facilityAId,
      storageUnitId: unitAId,
      rackCode: 'RACK-01',
      aisle: 'A',
      bay: 1,
      zone: RackZoneEnum.STANDARD,
      tierCount: 2,
      status: RackStatusEnum.RENTED,
    });
    rack1Id = rack1._id as Types.ObjectId;

    const tier1A = await RackTier.create({
      facilityId: facilityAId,
      storageRackId: rack1Id,
      storageUnitId: unitAId,
      tierNumber: 1,
      tierCode: 'RACK-01-T1',
      dimensions: { length: 2, width: 1, height: 1 },
      maxWeightKg: 500,
      status: RackTierStatusEnum.AVAILABLE,
    });
    tier1AId = tier1A._id as Types.ObjectId;

    await RackTier.create({
      facilityId: facilityAId,
      storageRackId: rack1Id,
      storageUnitId: unitAId,
      tierNumber: 2,
      tierCode: 'RACK-01-T2',
      dimensions: { length: 2, width: 1, height: 1 },
      maxWeightKg: 500,
      status: RackTierStatusEnum.AVAILABLE,
    });

    const rack2 = await StorageRack.create({
      facilityId: facilityAId,
      storageUnitId: unitAId,
      rackCode: 'RACK-02',
      aisle: 'A',
      bay: 2,
      zone: RackZoneEnum.STANDARD,
      tierCount: 2,
      status: RackStatusEnum.RENTED,
    });
    rack2Id = rack2._id as Types.ObjectId;

    const tier2A = await RackTier.create({
      facilityId: facilityAId,
      storageRackId: rack2Id,
      storageUnitId: unitAId,
      tierNumber: 1,
      tierCode: 'RACK-02-T1',
      dimensions: { length: 2, width: 1, height: 1 },
      maxWeightKg: 500,
      status: RackTierStatusEnum.AVAILABLE,
    });
    tier2AId = tier2A._id as Types.ObjectId;

    await RackTier.create({
      facilityId: facilityAId,
      storageRackId: rack2Id,
      storageUnitId: unitAId,
      tierNumber: 2,
      tierCode: 'RACK-02-T2',
      dimensions: { length: 2, width: 1, height: 1 },
      maxWeightKg: 500,
      status: RackTierStatusEnum.AVAILABLE,
    });

    // Rack 3 for Customer 2
    const rack3 = await StorageRack.create({
      facilityId: facilityAId,
      storageUnitId: unitAId,
      rackCode: 'RACK-03',
      aisle: 'B',
      bay: 1,
      zone: RackZoneEnum.STANDARD,
      tierCount: 1,
      status: RackStatusEnum.RENTED,
    });
    rack3Id = rack3._id as Types.ObjectId;

    const tier3A = await RackTier.create({
      facilityId: facilityAId,
      storageRackId: rack3Id,
      storageUnitId: unitAId,
      tierNumber: 1,
      tierCode: 'RACK-03-T1',
      dimensions: { length: 2, width: 1, height: 1 },
      maxWeightKg: 500,
      status: RackTierStatusEnum.AVAILABLE,
    });
    tier3AId = tier3A._id as Types.ObjectId;

    // 5. Contracts
    // Contract 1: customer 1 rents Rack 1 and Rack 2
    const contract1 = await Contract.create({
      contractCode: 'CTR-CUST1-001',
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: facilityAId,
      storageUnitId: unitAId,
      rentedRackIds: [rack1Id, rack2Id],
      status: ContractStatusEnum.ACTIVE,
      source: ContractSourceEnum.RESERVATION,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalPeriodicPrice: 2000000,
      depositAmount: 2000000,
      rentalPrice: 2000000,
      billingUnit: 'month',
      facilityUnitTypeOfferingId: new Types.ObjectId(),
    });
    contract1Id = contract1._id as Types.ObjectId;

    // Contract 2: customer 2 rents Rack 3
    const contract2 = await Contract.create({
      contractCode: 'CTR-CUST2-001',
      customerId: new Types.ObjectId(TEST_USERS.customer2.id),
      facilityId: facilityAId,
      storageUnitId: unitAId,
      rentedRackIds: [rack3Id],
      status: ContractStatusEnum.ACTIVE,
      source: ContractSourceEnum.RESERVATION,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalPeriodicPrice: 1000000,
      depositAmount: 1000000,
      rentalPrice: 1000000,
      billingUnit: 'month',
      facilityUnitTypeOfferingId: new Types.ObjectId(),
    });
    contract2Id = contract2._id as Types.ObjectId;

    // Assign currentContractId to racks
    await StorageRack.findByIdAndUpdate(rack1Id, {
      currentContractId: contract1Id,
      currentCustomerId: new Types.ObjectId(TEST_USERS.customer1.id),
    });
    await StorageRack.findByIdAndUpdate(rack2Id, {
      currentContractId: contract1Id,
      currentCustomerId: new Types.ObjectId(TEST_USERS.customer1.id),
    });
    await StorageRack.findByIdAndUpdate(rack3Id, {
      currentContractId: contract2Id,
      currentCustomerId: new Types.ObjectId(TEST_USERS.customer2.id),
    });

    // 6. SKUs
    const sku1 = await CustomerSku.create({
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      skuCode: 'SKU-CUST1-01',
      name: 'Cust1 Electronics Box',
      uom: 'box',
      status: CustomerSkuStatusEnum.ACTIVE,
    });
    sku1Id = sku1._id as Types.ObjectId;

    const sku2 = await CustomerSku.create({
      customerId: new Types.ObjectId(TEST_USERS.customer2.id),
      skuCode: 'SKU-CUST2-01',
      name: 'Cust2 Textile Bundle',
      uom: 'bundle',
      status: CustomerSkuStatusEnum.ACTIVE,
    });
    sku2Id = sku2._id as Types.ObjectId;
  });

  describe('Part 1: Customer Self-Mutation & Zero-Touch Staff Policy', () => {
    it('allows CUSTOMER to stockIn directly into rented rack tier', async () => {
      const res = await customerInventoryService.stockIn(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1AId),
          quantity: 10,
        },
        customer1Caller
      );
      expect(res.quantity).toBe(10);
      expect(res.status).toBe(InventoryItemStatusEnum.NORMAL);

      // Verify Tier state machine moved to OCCUPIED
      const updatedTier = await RackTier.findById(tier1AId);
      expect(updatedTier?.status).toBe(RackTierStatusEnum.OCCUPIED);
    });

    it('allows CUSTOMER to stockMove items between tiers across their rented racks', async () => {
      // Stock in first
      await customerInventoryService.stockIn(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1AId),
          quantity: 10,
        },
        customer1Caller
      );

      // Customer moves 4 items from Tier 1A (Rack 1) to Tier 2A (Rack 2)
      const resMove = await customerInventoryService.stockMove(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          fromRackTierId: String(tier1AId),
          toRackTierId: String(tier2AId),
          quantity: 4,
          reason: 'Customer rearranging goods',
        },
        customer1Caller
      );

      expect(resMove.quantity).toBe(4);

      // Verify source inventory has 6 items left
      const sourceInv = await CustomerInventory.findOne({
        contractId: contract1Id,
        rackTierId: tier1AId,
      });
      expect(sourceInv?.quantity).toBe(6);
    });

    it('allows CUSTOMER to stockAdjust on their rented rack tier', async () => {
      // Stock in first
      await customerInventoryService.stockIn(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1AId),
          quantity: 10,
        },
        customer1Caller
      );

      const resAdjust = await customerInventoryService.stockAdjust(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1AId),
          newQuantity: 12,
          reason: 'Customer physical cycle count',
        },
        customer1Caller
      );

      expect(resAdjust.quantity).toBe(12);
    });

    it('allows CUSTOMER to stockOut from their rented rack tier', async () => {
      // Stock in first
      await customerInventoryService.stockIn(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1AId),
          quantity: 10,
        },
        customer1Caller
      );

      const resOut = await customerInventoryService.stockOut(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1AId),
          quantity: 3,
        },
        customer1Caller
      );

      expect(resOut.quantity).toBe(7);
    });

    it('BLOCKS FACILITY_STAFF and FACILITY_MANAGER from mutating daily inventory (403 Zero-Touch)', async () => {
      // Staff calling stockIn
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

      // Manager calling stockMove
      await expect(
        customerInventoryService.stockMove(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            fromRackTierId: String(tier1AId),
            toRackTierId: String(tier2AId),
            quantity: 2,
          },
          managerACaller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );

      // Staff calling stockAdjust
      await expect(
        customerInventoryService.stockAdjust(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            rackTierId: String(tier1AId),
            newQuantity: 8,
            reason: 'Staff unauthorized adjust',
          },
          staffACaller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );

      // Staff calling stockOut
      await expect(
        customerInventoryService.stockOut(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            rackTierId: String(tier1AId),
            quantity: 2,
          },
          staffACaller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );
    });

    it('blocks CUSTOMER from mutating inventory under another customer contract (403/404)', async () => {
      await expect(
        customerInventoryService.stockIn(
          {
            contractId: String(contract1Id),
            skuId: String(sku2Id),
            rackTierId: String(tier1AId),
            quantity: 5,
          },
          customer2Caller
        )
      ).rejects.toThrow();
    });
  });

  describe('Part 2: Zero-Touch SKU Management', () => {
    it('allows CUSTOMER to create, update, and delete their own SKU', async () => {
      const created = await customerSkuService.createSku(
        {
          skuCode: 'SKU-NEW-01',
          name: 'New Customer SKU',
          uom: 'box',
        },
        customer1Caller
      );
      expect(created.skuCode).toBe('SKU-NEW-01');

      const updated = await customerSkuService.updateSku(
        created.id,
        { name: 'Updated SKU Name' },
        customer1Caller
      );
      expect(updated.name).toBe('Updated SKU Name');

      await customerSkuService.deleteSku(created.id, customer1Caller);
      const checkDeleted = await CustomerSku.findById(created.id);
      // Soft-deleted check: either null or deleted === true
      expect(
        !checkDeleted ||
          (checkDeleted as unknown as { deleted?: boolean })?.deleted
      ).toBe(true);
    });

    it('BLOCKS FACILITY_STAFF and FACILITY_MANAGER from mutating SKU catalog (403 Zero-Touch)', async () => {
      // Staff cannot create SKU
      await expect(
        customerSkuService.createSku(
          {
            skuCode: 'SKU-STAFF-01',
            name: 'Staff Created SKU',
            uom: 'box',
            customerId: TEST_USERS.customer1.id,
          },
          staffACaller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );

      // Manager cannot update SKU
      await expect(
        customerSkuService.updateSku(
          String(sku1Id),
          { name: 'Manager Renamed SKU' },
          managerACaller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );

      // Staff cannot delete SKU
      await expect(
        customerSkuService.deleteSku(String(sku1Id), staffACaller)
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );
    });
  });

  describe('Part 3: Multi-Rack Isolation & Maintenance Guard', () => {
    it('blocks stockIn on a rack under MAINTENANCE (625), but permits stockIn on other ACTIVE racks in the same contract', async () => {
      // Put Rack 1 into MAINTENANCE
      await StorageRack.findByIdAndUpdate(rack1Id, {
        status: RackStatusEnum.MAINTENANCE,
      });

      // 1. Trying to stockIn to Tier 1A (on Rack 1) must be rejected with 400 MESSAGE_CODE_625
      await expect(
        customerInventoryService.stockIn(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            rackTierId: String(tier1AId),
            quantity: 5,
          },
          customer1Caller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_625,
        })
      );

      // 2. StockIn to Tier 2A (on Rack 2 which is still ACTIVE) MUST SUCCEED
      const res = await customerInventoryService.stockIn(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier2AId),
          quantity: 8,
        },
        customer1Caller
      );
      expect(res.quantity).toBe(8);
    });

    it('blocks stockMove to or from a rack tier under MAINTENANCE', async () => {
      // Seed goods on Tier 2A
      await customerInventoryService.stockIn(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier2AId),
          quantity: 10,
        },
        customer1Caller
      );

      // Put Rack 1 into MAINTENANCE
      await StorageRack.findByIdAndUpdate(rack1Id, {
        status: RackStatusEnum.MAINTENANCE,
      });

      // Moving to Tier 1A (on damaged rack) must be blocked
      await expect(
        customerInventoryService.stockMove(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            fromRackTierId: String(tier2AId),
            toRackTierId: String(tier1AId),
            quantity: 2,
          },
          customer1Caller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_625,
        })
      );
    });
  });

  describe('Part 4: Ownership & Cross-Customer Guards', () => {
    it('blocks customer from stockIn or stockMove to a rack owned by another customer (Rule 637)', async () => {
      // Customer 1 tries to stockIn on Tier 3A (rented by Customer 2)
      await expect(
        customerInventoryService.stockIn(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            rackTierId: String(tier3AId),
            quantity: 5,
          },
          customer1Caller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_637,
        })
      );
    });

    it('blocks customer from calling stockIn with rackTierId: null (trying to self-put into holding)', async () => {
      await expect(
        customerInventoryService.stockIn(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            rackTierId: null as unknown as string,
            quantity: 5,
          },
          customer1Caller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
        })
      );
    });
  });

  describe('Part 5: Full Freeze Policy on TEMPORARY_HOLDING', () => {
    beforeEach(async () => {
      // Seed a record in TEMPORARY_HOLDING (e.g. from an incident evacuation)
      await CustomerInventory.create({
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        contractId: contract1Id,
        facilityId: facilityAId,
        storageUnitId: unitAId,
        storageRackId: null,
        rackTierId: null,
        skuId: sku1Id,
        quantity: 20,
        pendingOutboundQuantity: 0,
        status: InventoryItemStatusEnum.TEMPORARY_HOLDING,
        holdingReason: 'Evacuated due to rack incident #123',
        lastMovementAt: new Date(),
      });
    });

    it('blocks stockOut on goods in TEMPORARY_HOLDING (Full Freeze: 400 MESSAGE_CODE_645)', async () => {
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
    });

    it('blocks stockMove from or to TEMPORARY_HOLDING (Full Freeze: 400 MESSAGE_CODE_645)', async () => {
      await expect(
        customerInventoryService.stockMove(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            fromRackTierId: null,
            toRackTierId: String(tier2AId),
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
    });

    it('blocks stockAdjust on goods in TEMPORARY_HOLDING (Full Freeze: 400 MESSAGE_CODE_645)', async () => {
      await expect(
        customerInventoryService.stockAdjust(
          {
            contractId: String(contract1Id),
            skuId: String(sku1Id),
            rackTierId: null,
            newQuantity: 15,
            reason: 'Attempting to adjust holding stock',
          },
          customer1Caller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_645,
        })
      );
    });
  });

  describe('Part 6: Scoped READ for Staff (PCCC) & FM Summary', () => {
    it('allows FACILITY_STAFF to view unit tree in their assigned facility, but blocks across facilities', async () => {
      // 1. Same facility: FA-01
      const treeA = await customerInventoryService.getStorageUnitTree(
        String(unitAId),
        staffACaller
      );
      expect(treeA.storageUnit.unitNumber).toBe('WH-A-101');

      // 2. Other facility: FB-02
      await expect(
        customerInventoryService.getStorageUnitTree(
          String(unitBId),
          staffACaller
        )
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );
    });

    it('allows FACILITY_STAFF to view sku locations filtered to their assigned facility', async () => {
      // Seed stock for SKU 1 in Unit A
      await customerInventoryService.stockIn(
        {
          contractId: String(contract1Id),
          skuId: String(sku1Id),
          rackTierId: String(tier1AId),
          quantity: 10,
        },
        adminCaller
      );

      const locationsRes = await customerInventoryService.getSkuLocations(
        String(sku1Id),
        staffACaller
      );
      expect(locationsRes.sku.id).toBe(String(sku1Id));
      expect(locationsRes.locations.length).toBeGreaterThanOrEqual(1);
      expect(locationsRes.locations[0].facility?.id).toBe(String(facilityAId));
    });

    it('BLOCKS FACILITY_STAFF from viewing summary (403), but ALLOWS FACILITY_MANAGER for customers with contracts at their facility', async () => {
      // Staff is blocked
      await expect(
        customerInventoryService.getCustomerSummary(staffACaller, {
          customerId: TEST_USERS.customer1.id,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );

      // FM is allowed for customer1 who has active contract at Facility A
      const summary = await customerInventoryService.getCustomerSummary(
        managerACaller,
        {
          customerId: TEST_USERS.customer1.id,
        }
      );
      expect(summary.totalActiveContracts).toBeGreaterThanOrEqual(1);
    });
  });
});
