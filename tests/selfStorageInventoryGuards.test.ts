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
import { Contract } from '../src/modules/contract/contract.model.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import { storageRackService } from '../src/modules/storageRack/storageRack.container.ts';
import {
  customerInventoryService,
  inventoryRequestService,
} from '../src/modules/customerInventory/customerInventory.container.ts';
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
import { RackZoneEnum } from '../src/common/enums/storageRack.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';

describe('Feature Gating: Self-Storage Units Guard (No Racks & No WMS/SKU)', () => {
  const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);
  const staffCaller = {
    id: TEST_USERS.staffFacilityA.id,
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };
  const adminCaller = {
    id: TEST_USERS.systemAdmin.id,
    role: RoleEnum.SYSTEM_ADMIN,
  };
  const customerCaller = {
    id: TEST_USERS.customer1.id,
    role: RoleEnum.CUSTOMER,
  };

  let smallUnitTypeId: Types.ObjectId;
  let warehouseUnitTypeId: Types.ObjectId;
  let selfStorageUnitId: Types.ObjectId;
  let warehouseUnitId: Types.ObjectId;
  let selfStorageContractId: Types.ObjectId;
  let warehouseContractId: Types.ObjectId;
  let skuId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    // 1. Facility
    await Facility.create({
      _id: facilityId,
      name: 'Facility Alpha',
      code: 'FA-01',
      address: '123 Test Street',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
    });

    // 2. Unit Types: SMALL (self-storage) and WAREHOUSE_RACK
    const smallUnitType = await UnitType.create({
      name: 'Small Self-Storage Box',
      dimensions: { length: 2, width: 2, height: 2 },
      area: 4,
      volume: 8,
      category: UnitTypeCategoryEnum.SMALL,
      status: UnitTypeStatusEnum.ACTIVE,
    });
    smallUnitTypeId = smallUnitType._id as Types.ObjectId;

    const warehouseUnitType = await UnitType.create({
      name: 'Industrial Warehouse Rack Area',
      dimensions: { length: 10, width: 10, height: 5 },
      area: 100,
      volume: 500,
      category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
      status: UnitTypeStatusEnum.ACTIVE,
      defaultRackConfig: {
        rackCount: 2,
        tiersPerRack: 3,
        tierDimensions: { length: 2, width: 1, height: 1 },
        tierMaxWeightKg: 500,
      },
    });
    warehouseUnitTypeId = warehouseUnitType._id as Types.ObjectId;

    // 3. Storage Units
    const smallUnit = await StorageUnit.create({
      facilityId,
      unitTypeId: smallUnitTypeId,
      unitNumber: 'SMALL-101',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    selfStorageUnitId = smallUnit._id as Types.ObjectId;

    const warehouseUnit = await StorageUnit.create({
      facilityId,
      unitTypeId: warehouseUnitTypeId,
      unitNumber: 'WH-101',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    warehouseUnitId = warehouseUnit._id as Types.ObjectId;

    // 4. Contracts (ACTIVE)
    const selfContract = await Contract.create({
      contractCode: 'CTR-SELF-001',
      customerId,
      facilityId,
      storageUnitId: selfStorageUnitId,
      status: ContractStatusEnum.ACTIVE,
      source: ContractSourceEnum.RESERVATION,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalPeriodicPrice: 500000,
      depositAmount: 500000,
      rentalPrice: 500000,
      billingUnit: 'month',
      facilityUnitTypeOfferingId: new Types.ObjectId(),
    });
    selfStorageContractId = selfContract._id as Types.ObjectId;

    const whContract = await Contract.create({
      contractCode: 'CTR-WH-001',
      customerId,
      facilityId,
      storageUnitId: warehouseUnitId,
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
    warehouseContractId = whContract._id as Types.ObjectId;

    // 5. Customer SKU
    const sku = await CustomerSku.create({
      customerId,
      skuCode: 'SKU-TEST-001',
      name: 'Test Product Carton',
      uom: 'box',
      status: CustomerSkuStatusEnum.ACTIVE,
    });
    skuId = sku._id as Types.ObjectId;
  });

  describe('Storage Rack Service Guards', () => {
    it('blocks createStorageRack with 400 MESSAGE_CODE_604 when unit is not WAREHOUSE_RACK', async () => {
      await expect(
        storageRackService.createStorageRack({
          storageUnitId: String(selfStorageUnitId),
          rackCode: 'R01',
          aisle: 'A',
          bay: 1,
          zone: RackZoneEnum.STANDARD,
          tierCount: 3,
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_604,
        })
      );
    });

    it('blocks provisionRacksForUnitEndpoint with 400 MESSAGE_CODE_604 when unit is not WAREHOUSE_RACK', async () => {
      await expect(
        storageRackService.provisionRacksForUnitEndpoint(
          String(selfStorageUnitId)
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_604,
        })
      );
    });

    it('gracefully returns an empty array when getRacksByStorageUnit is called for self-storage unit', async () => {
      const result = await storageRackService.getRacksByStorageUnit(
        String(selfStorageUnitId),
        customerCaller
      );
      expect(result).toEqual([]);
    });

    it('gracefully returns empty paginated items when getStorageRacks filters by self-storage unit ID', async () => {
      const result = await storageRackService.getStorageRacks(
        { storageUnitId: String(selfStorageUnitId) },
        staffCaller
      );
      expect(result.items).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
    });

    it('allows createStorageRack and getRacksByStorageUnit when unit is WAREHOUSE_RACK', async () => {
      const created = await storageRackService.createStorageRack({
        storageUnitId: String(warehouseUnitId),
        rackCode: 'R01',
        aisle: 'A',
        bay: 1,
        zone: RackZoneEnum.STANDARD,
        tierCount: 2,
      });

      expect(created.rackCode).toBe('R01');
      expect(created.tierCount).toBe(2);

      const racks = await storageRackService.getRacksByStorageUnit(
        String(warehouseUnitId),
        customerCaller
      );
      expect(racks.length).toBe(1);
      expect(racks[0].rackCode).toBe('R01');
    });
  });

  describe('Customer Inventory Service Guards', () => {
    it('gracefully returns 200 with empty racks and zero summary for self-storage unit tree', async () => {
      const tree = await customerInventoryService.getStorageUnitTree(
        String(selfStorageUnitId),
        customerCaller
      );

      expect(tree.storageUnit.id).toBe(String(selfStorageUnitId));
      expect(tree.racks).toEqual([]);
      expect(tree.unrackedItems).toEqual([]);
      expect(tree.summary.totalRacks).toBe(0);
      expect(tree.summary.totalTiers).toBe(0);
      expect(tree.summary.totalSkus).toBe(0);
      expect(tree.summary.totalQuantity).toBe(0);
    });

    it('blocks stockIn with 400 MESSAGE_CODE_650 on a self-storage contract', async () => {
      await expect(
        customerInventoryService.stockIn(
          {
            contractId: String(selfStorageContractId),
            skuId: String(skuId),
            quantity: 10,
          },
          adminCaller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_650,
        })
      );
    });

    it('gracefully returns empty list when findAllInventories queries by self-storage storageUnitId', async () => {
      const res = await customerInventoryService.findAllInventories(
        { storageUnitId: String(selfStorageUnitId) },
        staffCaller
      );
      expect(res.items).toEqual([]);
      expect(res.pagination.totalItems).toBe(0);
    });

    it('allows stockIn and returns populated tree on WAREHOUSE_RACK contract', async () => {
      // 1. Create rack in warehouse
      const rack = await storageRackService.createStorageRack({
        storageUnitId: String(warehouseUnitId),
        rackCode: 'WH-R01',
        aisle: 'A',
        bay: 1,
        zone: RackZoneEnum.STANDARD,
        tierCount: 2,
      });

      const tierId = rack.tiers?.[0]?.id;
      expect(tierId).toBeDefined();

      // 2. Perform Stock In on WAREHOUSE_RACK
      const inv = await customerInventoryService.stockIn(
        {
          contractId: String(warehouseContractId),
          skuId: String(skuId),
          rackTierId: tierId,
          quantity: 25,
        },
        adminCaller
      );

      expect(inv.quantity).toBe(25);

      // 3. Tree returns rack and tiered item
      const tree = await customerInventoryService.getStorageUnitTree(
        String(warehouseUnitId),
        customerCaller
      );
      expect(tree.racks.length).toBe(1);
      expect(tree.summary.totalQuantity).toBe(25);
    });
  });

  describe('Inventory Request Service Guards', () => {
    it('blocks createOutboundRequest with 400 MESSAGE_CODE_650 on a self-storage contract', async () => {
      await expect(
        inventoryRequestService.createOutboundRequest(
          {
            contractId: String(selfStorageContractId),
            items: [
              {
                skuId: String(skuId),
                quantity: 5,
                storageRackId: new Types.ObjectId().toString(),
                rackTierId: new Types.ObjectId().toString(),
              },
            ],
          },
          customerCaller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_650,
        })
      );
    });

    it('blocks createPreAdvisedInboundRequest with 400 MESSAGE_CODE_650 on a self-storage contract', async () => {
      await expect(
        inventoryRequestService.createPreAdvisedInboundRequest(
          {
            contractId: String(selfStorageContractId),
            items: [
              {
                skuId: String(skuId),
                quantity: 20,
              },
            ],
          },
          customerCaller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_650,
        })
      );
    });
  });
});
