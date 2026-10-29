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
import '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { StorageRackRepository } from '../src/modules/storageRack/storageRack.repository.ts';
import { RackTier } from '../src/modules/storageRack/rackTier.model.ts';
import { RackTierRepository } from '../src/modules/storageRack/rackTier.repository.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import { CustomerSkuRepository } from '../src/modules/customerSku/customerSku.repository.ts';
import { CustomerSkuService } from '../src/modules/customerSku/customerSku.service.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import { InventoryMovement } from '../src/modules/customerInventory/inventoryMovement.model.ts';
import { InventoryMovementRepository } from '../src/modules/customerInventory/inventoryMovement.repository.ts';
import {
  CustomerInventoryService,
  type CallerContext,
} from '../src/modules/customerInventory/customerInventory.service.ts';
import { StorageRackService } from '../src/modules/storageRack/storageRack.service.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import {
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
  RackZoneEnum,
} from '../src/common/enums/storageRack.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import { CustomerSkuStatusEnum } from '../src/common/enums/customerSku.enum.ts';
import { InventoryItemStatusEnum } from '../src/common/enums/customerInventory.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { CloudinaryFolderEnum } from '../src/common/enums/upload.enum.ts';
import { SupportTicketCategoryEnum } from '../src/common/enums/supportTicket.enum.ts';

describe('Pha 1: FE Feedback Tests (G1, G3, G4, G7, G8, G12, G13)', () => {
  let inventoryService: CustomerInventoryService;
  let rackService: StorageRackService;
  let skuService: CustomerSkuService;

  let contractRepo: ContractRepository;
  let storageUnitRepo: StorageUnitRepository;
  let rackRepo: StorageRackRepository;
  let tierRepo: RackTierRepository;
  let skuRepo: CustomerSkuRepository;
  let inventoryRepo: CustomerInventoryRepository;
  let movementRepo: InventoryMovementRepository;

  const customer1Caller: CallerContext = {
    id: TEST_USERS.customer1.id,
    role: RoleEnum.CUSTOMER,
  };
  const customer2Caller: CallerContext = {
    id: TEST_USERS.customer2.id,
    role: RoleEnum.CUSTOMER,
  };
  const staffACaller: CallerContext = {
    id: TEST_USERS.staffFacilityA.id,
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };
  const staffBCaller: CallerContext = {
    id: TEST_USERS.staffFacilityB.id,
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: TEST_FACILITY_B_ID,
  };

  let facilityAUnitId: string;
  let facilityBUnitId: string;
  let rackAId: string;
  let tierA1Id: string;
  let contractAId: string;
  let skuAId: string;

  beforeAll(async () => {
    await setupTestDB();
    contractRepo = new ContractRepository(Contract);
    storageUnitRepo = new StorageUnitRepository(StorageUnit);
    rackRepo = new StorageRackRepository(StorageRack);
    tierRepo = new RackTierRepository(RackTier);
    skuRepo = new CustomerSkuRepository(CustomerSku);
    inventoryRepo = new CustomerInventoryRepository(CustomerInventory);
    movementRepo = new InventoryMovementRepository(InventoryMovement);

    skuService = new CustomerSkuService(
      skuRepo,
      undefined,
      inventoryRepo,
      contractRepo
    );
    rackService = new StorageRackService(rackRepo, tierRepo, storageUnitRepo);
    inventoryService = new CustomerInventoryService(
      inventoryRepo,
      movementRepo,
      contractRepo,
      skuRepo,
      rackRepo,
      tierRepo,
      storageUnitRepo
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    await Facility.create([
      {
        _id: new Types.ObjectId(TEST_FACILITY_A_ID),
        name: 'Facility A',
        code: 'FA01',
        address: '123 Street A',
        city: 'City A',
        status: 'active',
      },
      {
        _id: new Types.ObjectId(TEST_FACILITY_B_ID),
        name: 'Facility B',
        code: 'FB01',
        address: '456 Street B',
        city: 'City B',
        status: 'active',
      },
    ]);

    // Create Storage Unit in Facility A
    const unitA = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId: new Types.ObjectId(),
      unitNumber: 'UA-101',
      floor: 1,
      zone: 'A',
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    facilityAUnitId = String(unitA._id);

    // Create Storage Unit in Facility B
    const unitB = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_B_ID),
      unitTypeId: new Types.ObjectId(),
      unitNumber: 'UB-101',
      floor: 1,
      zone: 'B',
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    facilityBUnitId = String(unitB._id);

    // Create Rack and Tier in Unit A
    const rackA = await StorageRack.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId: new Types.ObjectId(facilityAUnitId),
      rackCode: 'RA1',
      name: 'Rack A1',
      tierCount: 2,
      status: RackStatusEnum.RENTED,
      aisle: 'Dãy 1',
      bay: 1,
      zone: RackZoneEnum.STANDARD,
      customPrice: 1200000,
      currentContractId: new Types.ObjectId(),
      currentCustomerId: new Types.ObjectId(TEST_USERS.customer1.id),
    });
    rackAId = String(rackA._id);

    const tierA1 = await RackTier.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageRackId: rackA._id,
      storageUnitId: unitA._id,
      tierNumber: 1,
      tierCode: 'RA1-T1',
      status: RackTierStatusEnum.OCCUPIED,
    });
    tierA1Id = String(tierA1._id);

    // Create Active Contract for customer 1
    const contract = await Contract.create({
      contractCode: 'CTR-P1-001',
      source: ContractSourceEnum.RESERVATION,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId: unitA._id,
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      rentedRackIds: [rackA._id],
      status: ContractStatusEnum.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      billingUnit: 'month',
      rentalPrice: 1200000,
      totalPeriodicPrice: 1200000,
      depositAmount: 1000000,
      customerSigned: true,
      staffSigned: true,
    });
    contractAId = String(contract._id);
    await StorageRack.findByIdAndUpdate(rackAId, {
      currentContractId: contract._id,
    });

    // Create SKU for customer 1
    const sku = await CustomerSku.create({
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      skuCode: 'SKU-001',
      name: 'Test Sku Item',
      barcode: '893000111222',
      uom: 'cái',
      status: CustomerSkuStatusEnum.ACTIVE,
    });
    skuAId = String(sku._id);
  });

  describe('G1: Customer Blocked from in/out/adjust, Staff allowed to adjust', () => {
    it('blocks Customer from stockIn with 403 MESSAGE_CODE_103', async () => {
      await expect(
        inventoryService.stockIn(
          {
            contractId: contractAId,
            skuId: skuAId,
            rackTierId: tierA1Id,
            quantity: 10,
          },
          customer1Caller
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });

    it('blocks Customer from stockOut with 403 MESSAGE_CODE_103', async () => {
      await expect(
        inventoryService.stockOut(
          {
            contractId: contractAId,
            skuId: skuAId,
            rackTierId: tierA1Id,
            quantity: 5,
          },
          customer1Caller
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });

    it('blocks Customer from stockAdjust with 403 MESSAGE_CODE_103', async () => {
      await expect(
        inventoryService.stockAdjust(
          {
            contractId: contractAId,
            skuId: skuAId,
            rackTierId: tierA1Id,
            newQuantity: 15,
            reason: 'Kiểm kê định kỳ thực tế',
          },
          customer1Caller
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });

    it('allows Staff of same facility to stockAdjust with reason >= 5 chars', async () => {
      const result = await inventoryService.stockAdjust(
        {
          contractId: contractAId,
          skuId: skuAId,
          rackTierId: tierA1Id,
          newQuantity: 20,
          reason: 'Kiểm kê kho định kỳ cuối tháng',
        },
        staffACaller
      );

      expect(result.quantity).toBe(20);
    });

    it('blocks Staff of different facility from stockAdjust with 403', async () => {
      await expect(
        inventoryService.stockAdjust(
          {
            contractId: contractAId,
            skuId: skuAId,
            rackTierId: tierA1Id,
            newQuantity: 20,
            reason: 'Kiểm kê kho trái chi nhánh',
          },
          staffBCaller
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });
  });

  describe('G3: Staff can query tree, locations, barcode in assigned facility', () => {
    it('allows Staff of same facility to view tree', async () => {
      const tree = await inventoryService.getStorageUnitTree(
        facilityAUnitId,
        staffACaller
      );
      expect(tree).toBeDefined();
      expect(tree.racks.length).toBe(1);
    });

    it('blocks Staff of different facility from viewing tree', async () => {
      await expect(
        inventoryService.getStorageUnitTree(facilityAUnitId, staffBCaller)
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });

    it('allows Staff of same facility to query sku locations by id and barcode', async () => {
      // First populate an inventory item
      await CustomerInventory.create({
        contractId: new Types.ObjectId(contractAId),
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        storageUnitId: new Types.ObjectId(facilityAUnitId),
        storageRackId: new Types.ObjectId(rackAId),
        rackTierId: new Types.ObjectId(tierA1Id),
        skuId: new Types.ObjectId(skuAId),
        quantity: 10,
        status: InventoryItemStatusEnum.NORMAL,
        lastMovementAt: new Date(),
      });

      const locsById = await inventoryService.getSkuLocations(
        skuAId,
        staffACaller
      );
      expect(locsById.locations.length).toBe(1);

      const locsByBarcode = await inventoryService.getSkuLocationsByBarcode(
        '893000111222',
        staffACaller
      );
      expect(locsByBarcode.locations.length).toBe(1);
    });
  });

  describe('G4: Tree response includes rack grid coordinates and item status', () => {
    it('returns aisle, bay, zone, customPrice, isMine and item status in tree response', async () => {
      await CustomerInventory.create({
        contractId: new Types.ObjectId(contractAId),
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        storageUnitId: new Types.ObjectId(facilityAUnitId),
        storageRackId: new Types.ObjectId(rackAId),
        rackTierId: new Types.ObjectId(tierA1Id),
        skuId: new Types.ObjectId(skuAId),
        quantity: 8,
        status: InventoryItemStatusEnum.TEMPORARY_HOLDING,
        holdingReason: 'Chờ di dời tầng',
        lastMovementAt: new Date(),
      });

      const tree = await inventoryService.getStorageUnitTree(
        facilityAUnitId,
        customer1Caller
      );
      expect(tree.racks.length).toBe(1);
      const rack = tree.racks[0];
      expect(rack.aisle).toBe('DÃY 1');
      expect(rack.bay).toBe(1);
      expect(rack.zone).toBe('STANDARD');
      expect(rack.customPrice).toBe(1200000);
      expect(rack.isMine).toBe(true);

      const tier = rack.tiers[0];
      expect(tier.items.length).toBe(1);
      const item = tier.items[0];
      expect(item.status).toBe('temporary_holding');
      expect(item.holdingReason).toBe('Chờ di dời tầng');
    });
  });

  describe('G7: Scoped queries for Staff in findAllInventories and findAllMovements', () => {
    it('scopes findAllInventories to staff assignedFacilityId', async () => {
      // Create item in A
      await CustomerInventory.create({
        contractId: new Types.ObjectId(contractAId),
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        storageUnitId: new Types.ObjectId(facilityAUnitId),
        skuId: new Types.ObjectId(skuAId),
        quantity: 5,
        status: InventoryItemStatusEnum.NORMAL,
        lastMovementAt: new Date(),
      });

      // Create item in B
      await CustomerInventory.create({
        contractId: new Types.ObjectId(),
        customerId: new Types.ObjectId(TEST_USERS.customer2.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_B_ID),
        storageUnitId: new Types.ObjectId(facilityBUnitId),
        skuId: new Types.ObjectId(),
        quantity: 12,
        status: InventoryItemStatusEnum.NORMAL,
        lastMovementAt: new Date(),
      });

      const staffAResult = await inventoryService.findAllInventories(
        { page: 1, limit: 10 },
        staffACaller
      );
      expect(staffAResult.items.length).toBe(1);
      expect(staffAResult.items[0].facilityId).toBe(TEST_FACILITY_A_ID);

      const staffBResult = await inventoryService.findAllInventories(
        { page: 1, limit: 10 },
        staffBCaller
      );
      expect(staffBResult.items.length).toBe(1);
      expect(staffBResult.items[0].facilityId).toBe(TEST_FACILITY_B_ID);
    });
  });

  describe('G8: getRacksByStorageUnit caller privacy & scoping', () => {
    it('masks currentCustomerId as null and sets isMine for Customer', async () => {
      const racks = await rackService.getRacksByStorageUnit(
        facilityAUnitId,
        customer1Caller
      );
      expect(racks.length).toBe(1);
      expect(racks[0].currentCustomerId).toBeNull();
      expect(racks[0].isMine).toBe(true);
    });

    it('blocks Staff of different facility from calling getRacksByStorageUnit', async () => {
      await expect(
        rackService.getRacksByStorageUnit(facilityAUnitId, staffBCaller)
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });
  });

  describe('G12: updateInventoryStatus transition validation', () => {
    it('rejects update to DAMAGED without incidentId', async () => {
      const item = await CustomerInventory.create({
        contractId: new Types.ObjectId(contractAId),
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        storageUnitId: new Types.ObjectId(facilityAUnitId),
        skuId: new Types.ObjectId(skuAId),
        quantity: 5,
        status: InventoryItemStatusEnum.NORMAL,
        lastMovementAt: new Date(),
      });

      await expect(
        inventoryService.updateInventoryStatus(
          String(item._id),
          {
            status: InventoryItemStatusEnum.DAMAGED,
            reason: 'Phát hiện đổ vỡ trong kho',
          },
          staffACaller
        )
      ).rejects.toThrow();
    });

    it('rejects invalid state transition from DISPUTED to TEMPORARY_HOLDING with MESSAGE_CODE_646', async () => {
      const item = await CustomerInventory.create({
        contractId: new Types.ObjectId(contractAId),
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        storageUnitId: new Types.ObjectId(facilityAUnitId),
        skuId: new Types.ObjectId(skuAId),
        quantity: 5,
        status: InventoryItemStatusEnum.DISPUTED,
        lastMovementAt: new Date(),
      });

      await expect(
        inventoryService.updateInventoryStatus(
          String(item._id),
          {
            status: InventoryItemStatusEnum.TEMPORARY_HOLDING,
            reason: 'Chuyển hàng sang tạm lưu',
          },
          staffACaller
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_646,
      });
    });
  });

  describe('G13: SKU default uom and CloudinaryFolderEnum.SKU', () => {
    it('has CloudinaryFolderEnum.SKU defined', () => {
      expect(CloudinaryFolderEnum).toHaveProperty('SKU');
      expect((CloudinaryFolderEnum as Record<string, string>).SKU).toBe(
        'self-storage/skus'
      );
    });

    it('defaults SKU uom to "cái" when empty', async () => {
      const created = await skuService.createSku(
        {
          skuCode: 'SKU-DEFAULT-UOM',
          name: 'Hàng không nhập uom',
        },
        customer1Caller
      );
      expect(created.uom).toBe('cái');
    });
  });

  describe('G6: Multi-tenant shared warehouse privacy scoping in getStorageUnitTree', () => {
    it('masks other customers items and hides contract ID in shared warehouse unit for customer caller', async () => {
      // Setup Customer 1 inventory
      await CustomerInventory.create({
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        contractId: new Types.ObjectId(contractAId),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        storageUnitId: new Types.ObjectId(facilityAUnitId),
        storageRackId: new Types.ObjectId(rackAId),
        rackTierId: new Types.ObjectId(tierA1Id),
        skuId: new Types.ObjectId(skuAId),
        quantity: 10,
        status: InventoryItemStatusEnum.NORMAL,
        lastMovementAt: new Date(),
      });

      // Setup: Create 2nd rack in facilityAUnitId rented by customer 2 with contract 2
      const rack2 = await StorageRack.create({
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        storageUnitId: new Types.ObjectId(facilityAUnitId),
        rackCode: 'R02',
        name: 'Rack 02',
        tierCount: 1,
        status: RackStatusEnum.RENTED,
        currentContractId: new Types.ObjectId(),
        currentCustomerId: new Types.ObjectId(TEST_USERS.customer2.id),
      });

      const contract2 = await Contract.create({
        contractCode: 'CTR-G6-CUST2',
        source: ContractSourceEnum.RESERVATION,
        customerId: new Types.ObjectId(TEST_USERS.customer2.id),
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        storageUnitId: new Types.ObjectId(facilityAUnitId),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        rentedRackIds: [rack2._id],
        status: ContractStatusEnum.ACTIVE,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-11-01'),
        billingUnit: 'month',
        rentalPrice: 1500000,
        totalPeriodicPrice: 1500000,
        depositAmount: 1000000,
        customerSigned: true,
        staffSigned: true,
      });

      await StorageRack.findByIdAndUpdate(rack2._id, {
        currentContractId: contract2._id,
      });

      const tier2 = await RackTier.create({
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        storageUnitId: new Types.ObjectId(facilityAUnitId),
        storageRackId: rack2._id,
        tierNumber: 1,
        tierCode: 'T1',
        status: RackTierStatusEnum.OCCUPIED,
      });

      const sku2 = await CustomerSku.create({
        customerId: new Types.ObjectId(TEST_USERS.customer2.id),
        skuCode: 'SKU-CUST2-SECRET',
        name: 'Bí mật kinh doanh của Khách 2',
        uom: 'hộp',
        status: CustomerSkuStatusEnum.ACTIVE,
      });

      await CustomerInventory.create({
        customerId: new Types.ObjectId(TEST_USERS.customer2.id),
        contractId: contract2._id,
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        storageUnitId: new Types.ObjectId(facilityAUnitId),
        storageRackId: rack2._id,
        rackTierId: tier2._id,
        skuId: sku2._id,
        quantity: 50,
        status: InventoryItemStatusEnum.NORMAL,
        lastMovementAt: new Date(),
      });

      // Customer 1 calls tree
      const cust1Tree = await inventoryService.getStorageUnitTree(
        facilityAUnitId,
        customer1Caller
      );

      // Customer 1 sees their contract
      expect(cust1Tree.contract?.contractCode).toBe('CTR-P1-001');

      // Rack 1 is Customer 1's rack -> items visible
      const cust1Rack1 = cust1Tree.racks.find((r) => r.rackCode === 'RA1');
      expect(cust1Rack1?.isMine).toBe(true);
      expect(cust1Rack1?.tiers[0].items.length).toBeGreaterThan(0);

      // Rack 2 belongs to Customer 2 -> items masked (empty array), contractId null, isMine false
      const cust1Rack2 = cust1Tree.racks.find((r) => r.rackCode === 'R02');
      expect(cust1Rack2?.isMine).toBe(false);
      expect(cust1Rack2?.currentContractId).toBeNull();
      expect(cust1Rack2?.tiers[0].items).toEqual([]);

      // Customer 1 summary only counts their own SKUs/quantity, not Customer 2's 50 items
      expect(cust1Tree.summary.totalQuantity).toBe(10);
      expect(cust1Tree.summary.totalSkus).toBe(1);

      // Customer 2 calls tree -> sees their own rack items, rack 1 masked
      const cust2Tree = await inventoryService.getStorageUnitTree(
        facilityAUnitId,
        customer2Caller
      );
      expect(cust2Tree.contract?.contractCode).toBe('CTR-G6-CUST2');
      const cust2Rack1 = cust2Tree.racks.find((r) => r.rackCode === 'RA1');
      expect(cust2Rack1?.isMine).toBe(false);
      expect(cust2Rack1?.tiers[0].items).toEqual([]);
      const cust2Rack2 = cust2Tree.racks.find((r) => r.rackCode === 'R02');
      expect(cust2Rack2?.isMine).toBe(true);
      expect(cust2Rack2?.tiers[0].items.length).toBe(1);
      expect(cust2Rack2?.tiers[0].items[0].sku.skuCode).toBe(
        'SKU-CUST2-SECRET'
      );
      expect(cust2Tree.summary.totalQuantity).toBe(50);

      // Staff calls tree -> sees all racks and all items
      const staffTree = await inventoryService.getStorageUnitTree(
        facilityAUnitId,
        staffACaller
      );
      const staffRack1 = staffTree.racks.find((r) => r.rackCode === 'RA1');
      const staffRack2 = staffTree.racks.find((r) => r.rackCode === 'R02');
      expect(staffRack1?.tiers[0].items.length).toBeGreaterThan(0);
      expect(staffRack2?.tiers[0].items.length).toBe(1);
      expect(staffTree.summary.totalQuantity).toBe(60); // 10 (cust1) + 50 (cust2)
    });

    it('blocks a customer who has no active or overdue contract in the storage unit with 403', async () => {
      // Customer 2 tries to access facilityBUnitId where only customer 1 has a contract
      await expect(
        inventoryService.getStorageUnitTree(facilityBUnitId, customer2Caller)
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );
    });
  });

  describe('G10: SupportTicketCategoryEnum includes INVENTORY_MOVE_REQUEST', () => {
    it('defines INVENTORY_MOVE_REQUEST category enum member correctly', () => {
      expect(SupportTicketCategoryEnum.INVENTORY_MOVE_REQUEST).toBe(
        'inventory_move_request'
      );
    });
  });
});
