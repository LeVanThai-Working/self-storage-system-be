import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { seedTestUsers, TEST_USERS } from './helpers/auth.helper.ts';
import { RegisterRoutes } from '../src/routes/routes.ts';
import { errorMiddleware } from '../src/middlewares/error.middleware.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
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
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import { InventoryMovement } from '../src/modules/customerInventory/inventoryMovement.model.ts';
import { InventoryMovementRepository } from '../src/modules/customerInventory/inventoryMovement.repository.ts';
import { CustomerInventoryService } from '../src/modules/customerInventory/customerInventory.service.ts';
import { skuLocatorQuerySchema } from '../src/modules/customerInventory/schemas/customerInventory.request.schema.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { ContractStatusEnum } from '../src/common/enums/contract.enum.ts';
import { ContractSourceEnum } from '../src/common/enums/contract.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import { UnitTypeCategoryEnum } from '../src/common/enums/unitType.enum.ts';
import { RentalTargetTypeEnum } from '../src/common/enums/rental.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
} from '../src/common/enums/storageRack.enum.ts';
import {
  InventoryItemStatusEnum,
  SkuPlacementEnum,
} from '../src/common/enums/customerInventory.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';

/**
 * One customer renting racks of the same unit under two contracts, next to another customer.
 * Contract views must stay separate while the SKU locator ignores contract boundaries.
 */
describe('Customer stock across several contracts of one storage unit', () => {
  let service: CustomerInventoryService;
  let app: Express;

  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);
  const otherCustomerId = new Types.ObjectId(TEST_USERS.customer2.id);
  const caller = { id: String(customerId), role: RoleEnum.CUSTOMER };
  const otherCaller = { id: String(otherCustomerId), role: RoleEnum.CUSTOMER };

  let facilityId: Types.ObjectId;
  let unitId: string;
  let contractAId: string;
  let contractBId: string;
  let otherContractId: string;
  let rackAId: Types.ObjectId;
  let tierAId: Types.ObjectId;
  let rackBId: Types.ObjectId;
  let tierBId: Types.ObjectId;

  const createContract = async (
    code: string,
    owner: Types.ObjectId,
    unit: Types.ObjectId,
    rentedRackIds: Types.ObjectId[],
    status = ContractStatusEnum.ACTIVE
  ) =>
    Contract.create({
      contractCode: code,
      source: ContractSourceEnum.RESERVATION,
      customerId: owner,
      facilityId,
      storageUnitId: unit,
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      rentalTargetType: RentalTargetTypeEnum.STORAGE_RACK,
      rentedRackIds,
      status,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-10-01'),
      billingUnit: 'month',
      rentalPrice: 1000000,
      totalPeriodicPrice: 1000000,
      depositAmount: 1000000,
      customerSigned: true,
      staffSigned: true,
    });

  const createRack = async (
    unit: Types.ObjectId,
    rackCode: string,
    owner: Types.ObjectId
  ) => {
    const rack = await StorageRack.create({
      facilityId,
      storageUnitId: unit,
      rackCode,
      aisle: 'B',
      bay: Number(rackCode.slice(1)),
      tierCount: 1,
      status: RackStatusEnum.RENTED,
      currentCustomerId: owner,
    });
    const tier = await RackTier.create({
      facilityId,
      storageUnitId: unit,
      storageRackId: rack._id,
      tierNumber: 1,
      tierCode: `${rackCode}-T01`,
      status: RackTierStatusEnum.OCCUPIED,
    });
    return { rackId: rack._id as Types.ObjectId, tierId: tier._id };
  };

  const createSku = async (
    skuCode: string,
    name: string,
    owner = customerId,
    barcode?: string
  ) => {
    const sku = await CustomerSku.create({
      customerId: owner,
      skuCode,
      name,
      barcode,
      uom: 'cái',
    });
    return sku._id;
  };

  const stock = (
    contractId: string,
    skuId: unknown,
    quantity: number,
    position: { rackId?: Types.ObjectId; tierId?: unknown } = {},
    owner = customerId,
    storageUnitId = unitId
  ) =>
    CustomerInventory.create({
      customerId: owner,
      contractId: new Types.ObjectId(contractId),
      facilityId,
      storageUnitId: new Types.ObjectId(storageUnitId),
      storageRackId: position.rackId ?? null,
      rackTierId: position.tierId ?? null,
      skuId,
      quantity,
      status: position.tierId
        ? InventoryItemStatusEnum.NORMAL
        : InventoryItemStatusEnum.TEMPORARY_HOLDING,
      lastMovementAt: new Date(),
    });

  const search = (query: Record<string, unknown> = {}, as = caller) =>
    service.findSkuLocator(skuLocatorQuerySchema.parse(query), as);

  beforeAll(async () => {
    await setupTestDB();
    app = express();
    app.use(express.json());
    RegisterRoutes(app);
    app.use(errorMiddleware);
    service = new CustomerInventoryService(
      new CustomerInventoryRepository(CustomerInventory),
      new InventoryMovementRepository(InventoryMovement),
      new ContractRepository(Contract),
      new CustomerSkuRepository(CustomerSku),
      new StorageRackRepository(StorageRack),
      new RackTierRepository(RackTier),
      new StorageUnitRepository(StorageUnit)
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    const facility = await Facility.create({
      name: 'Kho Quận 7',
      code: 'Q7',
      address: '1 Nguyễn Lương Bằng',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
    });
    facilityId = facility._id as Types.ObjectId;

    const unitType = await UnitType.create({
      name: `Warehouse ${new Types.ObjectId()}`,
      dimensions: { length: 5, width: 5, height: 3 },
      area: 25,
      volume: 75,
      category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
    });
    const unit = await StorageUnit.create({
      facilityId,
      unitTypeId: unitType._id,
      unitNumber: 'A101',
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    const unitObjectId = unit._id as Types.ObjectId;
    unitId = String(unitObjectId);

    const rackA = await createRack(unitObjectId, 'R01', customerId);
    const rackB = await createRack(unitObjectId, 'R02', customerId);
    const otherRack = await createRack(unitObjectId, 'R03', otherCustomerId);
    rackAId = rackA.rackId;
    tierAId = rackA.tierId as Types.ObjectId;
    rackBId = rackB.rackId;
    tierBId = rackB.tierId as Types.ObjectId;

    const contractA = await createContract('CTR-A', customerId, unitObjectId, [
      rackAId,
    ]);
    const contractB = await createContract('CTR-B', customerId, unitObjectId, [
      rackBId,
    ]);
    const otherContract = await createContract(
      'CTR-OTHER',
      otherCustomerId,
      unitObjectId,
      [otherRack.rackId]
    );
    contractAId = String(contractA._id);
    contractBId = String(contractB._id);
    otherContractId = String(otherContract._id);

    await StorageRack.updateOne(
      { _id: rackAId },
      { currentContractId: contractA._id }
    );
    await StorageRack.updateOne(
      { _id: rackBId },
      { currentContractId: contractB._id }
    );
    await StorageRack.updateOne(
      { _id: otherRack.rackId },
      { currentContractId: otherContract._id }
    );
  });

  describe('Rack map of one contract', () => {
    it('returns only the racks and stock of the requested contract', async () => {
      const shared = await createSku('SKU-SHARED', 'Hàng ở hai hợp đồng');
      const onlyB = await createSku('SKU-B', 'Hàng hợp đồng B');
      await stock(contractAId, shared, 5, { rackId: rackAId, tierId: tierAId });
      await stock(contractBId, shared, 7, { rackId: rackBId, tierId: tierBId });
      await stock(contractBId, onlyB, 2, { rackId: rackBId, tierId: tierBId });
      await stock(contractAId, onlyB, 3);
      await stock(contractBId, onlyB, 4);

      const tree = await service.getStorageUnitTree(
        unitId,
        caller,
        contractAId
      );

      expect(tree.contract?.contractCode).toBe('CTR-A');
      expect(tree.racks.map((rack) => rack.rackCode)).toEqual(['R01']);
      expect(tree.racks[0].tiers[0].items.map((i) => i.quantity)).toEqual([5]);
      expect(tree.unrackedItems.map((i) => i.quantity)).toEqual([3]);
      expect(tree.summary).toEqual({
        totalRacks: 1,
        totalTiers: 1,
        occupiedTiers: 1,
        availableTiers: 0,
        totalSkus: 2,
        totalQuantity: 8,
      });
    });

    it('accepts the contract as a query parameter of the tree route', async () => {
      const res = await request(app)
        .get(`/customer-inventories/unit/${unitId}/tree`)
        .query({ contractId: contractBId })
        .set('x-user-id', caller.id)
        .set('x-user-role', caller.role);

      expect(res.status).toBe(200);
      expect(
        res.body.data.racks.map((rack: { rackCode: string }) => rack.rackCode)
      ).toEqual(['R02']);
    });

    it('keeps the whole unit view when no contract is requested', async () => {
      const tree = await service.getStorageUnitTree(unitId, caller);

      expect(tree.racks.map((rack) => rack.rackCode).sort()).toEqual([
        'R01',
        'R02',
        'R03',
      ]);
    });

    it('shows the stock of an ended contract even after its rack was released', async () => {
      await StorageRack.updateOne(
        { _id: rackAId },
        { currentContractId: null, currentCustomerId: null }
      );
      await Contract.updateOne(
        { _id: contractAId },
        { status: ContractStatusEnum.COMPLETED }
      );

      const tree = await service.getStorageUnitTree(
        unitId,
        caller,
        contractAId
      );

      expect(tree.racks.map((rack) => rack.rackCode)).toEqual(['R01']);
      expect(tree.racks[0].isMine).toBe(false);
    });

    it('rejects a contract of another customer', async () => {
      await expect(
        service.getStorageUnitTree(unitId, caller, otherContractId)
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });

    it('rejects a contract that is not in the storage unit', async () => {
      const otherUnit = await StorageUnit.create({
        facilityId,
        unitTypeId: (await UnitType.findOne())!._id,
        unitNumber: 'A102',
        floor: 1,
        status: StorageUnitStatusEnum.OCCUPIED,
      });

      await expect(
        service.getStorageUnitTree(String(otherUnit._id), caller, contractAId)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('Inventory list of one contract', () => {
    it('returns only the stock of that contract', async () => {
      const sku = await createSku('SKU-LIST', 'Hàng theo hợp đồng');
      await stock(contractAId, sku, 5, { rackId: rackAId, tierId: tierAId });
      await stock(contractBId, sku, 7, { rackId: rackBId, tierId: tierBId });

      const res = await request(app)
        .get('/customer-inventories')
        .query({ contractId: contractAId, minQuantity: 1, limit: 100 })
        .set('x-user-id', caller.id)
        .set('x-user-role', caller.role);

      expect(res.status).toBe(200);
      expect(
        res.body.data.items.map((item: { quantity: number }) => item.quantity)
      ).toEqual([5]);
    });
  });

  describe('SKU locator', () => {
    it('finds a SKU on every contract, with facility, area, rack and tier', async () => {
      const sku = await createSku('SKU-TRA', 'Bộ tách trà');
      await stock(contractAId, sku, 16, { rackId: rackAId, tierId: tierAId });
      await stock(contractBId, sku, 8, { rackId: rackBId, tierId: tierBId });

      const { items } = await search({ search: 'tách trà' });

      expect(items).toHaveLength(1);
      expect(items[0].totalQuantity).toBe(24);
      expect(items[0].rackQuantity).toBe(24);
      expect(
        items[0].locations.map((l) => l.contract?.contractCode).sort()
      ).toEqual(['CTR-A', 'CTR-B']);

      const location = items[0].locations.find(
        (l) => l.contract?.contractCode === 'CTR-A'
      );
      expect(location?.facility?.name).toBe('Kho Quận 7');
      expect(location?.facility?.code).toBe('Q7');
      expect(location?.storageUnit?.unitNumber).toBe('A101');
      expect(location?.storageRack?.rackCode).toBe('R01');
      expect(location?.storageRack?.aisle).toBe('B');
      expect(location?.rackTier?.tierCode).toBe('R01-T01');
      expect(location?.quantity).toBe(16);
    });

    it('classifies racked, holding and never stored SKUs', async () => {
      const racked = await createSku('SKU-1-RACK', 'Trên kệ');
      const holding = await createSku('SKU-2-HOLD', 'Lưu tạm');
      await createSku('SKU-3-NONE', 'Tạo dư');
      await stock(contractAId, racked, 1, { rackId: rackAId, tierId: tierAId });
      await stock(contractAId, holding, 2);

      const all = await search();
      expect(all.counts).toEqual({
        all: 3,
        onRack: 1,
        holding: 1,
        notStored: 1,
      });

      const notStored = await search({
        placement: SkuPlacementEnum.NOT_STORED,
      });
      expect(notStored.items.map((i) => i.sku.skuCode)).toEqual(['SKU-3-NONE']);
      expect(notStored.items[0].locations).toEqual([]);
      expect(notStored.pagination.totalItems).toBe(1);
      // Filtering must not change the counts shown on the other chips.
      expect(notStored.counts.all).toBe(3);

      const onHold = await search({ placement: SkuPlacementEnum.HOLDING });
      expect(onHold.items[0].holdingQuantity).toBe(2);
      expect(onHold.items[0].locations[0].rackTier).toBeNull();
      expect(onHold.items[0].locations[0].status).toBe(
        InventoryItemStatusEnum.TEMPORARY_HOLDING
      );
    });

    it('lists stored SKUs before the ones never put in storage', async () => {
      await createSku('SKU-A-NONE', 'Tạo dư');
      const stored = await createSku('SKU-Z-RACK', 'Trên kệ');
      await stock(contractAId, stored, 1, { rackId: rackAId, tierId: tierAId });

      const { items } = await search();

      expect(items.map((i) => i.sku.skuCode)).toEqual([
        'SKU-Z-RACK',
        'SKU-A-NONE',
      ]);
    });

    it('still lists a SKU after its stock left, since it outlives the rental', async () => {
      const sku = await createSku('SKU-KEEP', 'Giữ lại sau khi trả kho');
      await stock(contractAId, sku, 0, { rackId: rackAId, tierId: tierAId });
      await Contract.updateOne(
        { _id: contractAId },
        { status: ContractStatusEnum.COMPLETED }
      );

      const { items, counts } = await search();

      expect(items.map((i) => i.sku.skuCode)).toEqual(['SKU-KEEP']);
      expect(items[0].locations).toEqual([]);
      expect(counts.notStored).toBe(1);
    });

    it('searches by code and barcode, treating the keyword as plain text', async () => {
      await createSku('SKU-CODE', 'Hàng A', customerId, '8931234567890');

      expect((await search({ search: 'sku-co' })).items).toHaveLength(1);
      expect((await search({ search: '893123' })).items).toHaveLength(1);
      expect((await search({ search: 'H.ng' })).items).toHaveLength(0);
      expect((await search({ search: '(' })).items).toHaveLength(0);
    });

    it('never exposes the SKUs or stock of another customer', async () => {
      const mine = await createSku('SKU-MINE', 'Của tôi');
      const theirs = await createSku(
        'SKU-THEIRS',
        'Của người khác',
        otherCustomerId
      );
      await stock(contractAId, mine, 1, { rackId: rackAId, tierId: tierAId });
      await stock(otherContractId, theirs, 9, {}, otherCustomerId);

      const { items, counts } = await search();
      expect(items.map((i) => i.sku.skuCode)).toEqual(['SKU-MINE']);
      expect(counts.all).toBe(1);

      const other = await search({}, otherCaller);
      expect(other.items.map((i) => i.sku.skuCode)).toEqual(['SKU-THEIRS']);
    });

    it('paginates on SKUs, not on locations', async () => {
      for (const code of ['SKU-1', 'SKU-2', 'SKU-3']) {
        const sku = await createSku(code, code);
        await stock(contractAId, sku, 1, { rackId: rackAId, tierId: tierAId });
        await stock(contractBId, sku, 1, { rackId: rackBId, tierId: tierBId });
      }

      const first = await search({ page: 1, limit: 2 });
      expect(first.items.map((i) => i.sku.skuCode)).toEqual(['SKU-1', 'SKU-2']);
      expect(first.items[0].locations).toHaveLength(2);
      expect(first.pagination).toMatchObject({
        totalItems: 3,
        totalPages: 2,
        hasNextPage: true,
      });

      const second = await search({ page: 2, limit: 2 });
      expect(second.items.map((i) => i.sku.skuCode)).toEqual(['SKU-3']);
      expect(second.pagination.hasNextPage).toBe(false);
    });

    it('is served on its own route, ahead of the inventory detail route', async () => {
      const sku = await createSku('SKU-HTTP', 'Hàng HTTP');
      await stock(contractAId, sku, 2, { rackId: rackAId, tierId: tierAId });

      const res = await request(app)
        .get('/customer-inventories/sku-locator')
        .query({ search: 'http', placement: SkuPlacementEnum.ON_RACK })
        .set('x-user-id', caller.id)
        .set('x-user-role', caller.role);

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].sku.skuCode).toBe('SKU-HTTP');
      expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 10 });
    });

    it('rejects an unknown placement filter', async () => {
      const res = await request(app)
        .get('/customer-inventories/sku-locator')
        .query({ placement: 'somewhere' })
        .set('x-user-id', caller.id)
        .set('x-user-role', caller.role);

      expect(res.status).toBe(400);
    });

    it('is only available to customers', async () => {
      await expect(
        search({}, { id: String(customerId), role: RoleEnum.FACILITY_STAFF })
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
