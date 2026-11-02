import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { storageRackService } from '../src/modules/storageRack/storageRack.container.ts';
import { storageUnitService } from '../src/modules/storageUnit/storageUnit.container.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { RackStatusEnum } from '../src/common/enums/storageRack.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import { UnitTypeCategoryEnum } from '../src/common/enums/unitType.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';

describe('Storage Rack Manager Permissions & Rack Capacity', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  const facilityAId = new Types.ObjectId().toString();
  const facilityBId = new Types.ObjectId().toString();

  const managerACaller = {
    id: new Types.ObjectId().toString(),
    role: RoleEnum.FACILITY_MANAGER,
    assignedFacilityId: facilityAId,
  };

  const managerBCaller = {
    id: new Types.ObjectId().toString(),
    role: RoleEnum.FACILITY_MANAGER,
    assignedFacilityId: facilityBId,
  };

  const staffACaller = {
    id: new Types.ObjectId().toString(),
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: facilityAId,
  };

  let warehouseUnitId: string;
  let standardUnitId: string;
  let availableRackId: string;
  let rentedRackId: string;

  beforeEach(async () => {
    await clearTestDB();

    // 1. Create Facilities
    await Facility.create([
      {
        _id: new Types.ObjectId(facilityAId),
        name: 'Facility A',
        code: 'FAC-A',
        address: '123 St A',
        city: 'HCM',
        status: 'active',
      },
      {
        _id: new Types.ObjectId(facilityBId),
        name: 'Facility B',
        code: 'FAC-B',
        address: '456 St B',
        city: 'HCM',
        status: 'active',
      },
    ]);

    // 2. Create Unit Types
    const warehouseUnitType = await UnitType.create({
      name: 'Warehouse Rack Hall',
      category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
      area: 100,
      volume: 500,
      dimensions: { length: 10, width: 10, height: 5 },
      status: 'active',
    });

    const standardUnitType = await UnitType.create({
      name: 'Standard Unit',
      category: UnitTypeCategoryEnum.SMALL,
      area: 10,
      volume: 30,
      dimensions: { length: 3, width: 3.3, height: 3 },
      status: 'active',
    });

    // 3. Create Storage Units
    const warehouseUnit = await StorageUnit.create({
      facilityId: new Types.ObjectId(facilityAId),
      unitTypeId: warehouseUnitType._id,
      unitNumber: 'WR-001',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    warehouseUnitId = warehouseUnit._id.toString();

    const standardUnit = await StorageUnit.create({
      facilityId: new Types.ObjectId(facilityAId),
      unitTypeId: standardUnitType._id,
      unitNumber: 'ST-001',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    standardUnitId = standardUnit._id.toString();

    // 4. Create Racks in Warehouse Unit
    const rack1 = await StorageRack.create({
      facilityId: new Types.ObjectId(facilityAId),
      storageUnitId: warehouseUnit._id,
      rackCode: 'RK-A01',
      aisle: 'A',
      bay: 1,
      tierCount: 3,
      status: RackStatusEnum.AVAILABLE,
    });
    availableRackId = rack1._id.toString();

    const rack2 = await StorageRack.create({
      facilityId: new Types.ObjectId(facilityAId),
      storageUnitId: warehouseUnit._id,
      rackCode: 'RK-A02',
      aisle: 'A',
      bay: 2,
      tierCount: 3,
      status: RackStatusEnum.RENTED,
      currentContractId: new Types.ObjectId(),
    });
    rentedRackId = rack2._id.toString();
  });

  describe('Facility Manager Rack Deletion & Guard checks', () => {
    it('allows Facility Manager to delete an available rack in their assigned facility', async () => {
      await storageRackService.deleteStorageRack(
        availableRackId,
        managerACaller
      );

      const deleted = await StorageRack.findById(availableRackId);
      expect(deleted).toBeNull(); // soft deleted
    });

    it('blocks Facility Manager from deleting a rack that is currently rented', async () => {
      await expect(
        storageRackService.deleteStorageRack(rentedRackId, managerACaller)
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_606,
      });
    });

    it('blocks Facility Manager of Facility B from deleting a rack in Facility A (cross-facility)', async () => {
      await expect(
        storageRackService.deleteStorageRack(availableRackId, managerBCaller)
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_122,
      });
    });

    it('allows Facility Manager to restore a deleted rack in their assigned facility', async () => {
      await storageRackService.deleteStorageRack(
        availableRackId,
        managerACaller
      );
      const restored = await storageRackService.restoreStorageRack(
        availableRackId,
        managerACaller
      );

      expect(restored.id).toBe(availableRackId);
      expect(restored.status).toBe(RackStatusEnum.AVAILABLE);
    });

    it('blocks Staff from deleting a rack', async () => {
      await expect(
        storageRackService.deleteStorageRack(availableRackId, staffACaller)
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('StorageUnit Rack Capacity Calculation', () => {
    it('returns rackCapacity with correct statistics for warehouse_rack category and null for standard unit', async () => {
      const warehouseUnitDetail =
        await storageUnitService.getStorageUnitById(warehouseUnitId);
      expect(warehouseUnitDetail.rackCapacity).toBeDefined();
      expect(warehouseUnitDetail.rackCapacity?.total).toBe(2);
      expect(warehouseUnitDetail.rackCapacity?.available).toBe(1);
      expect(warehouseUnitDetail.rackCapacity?.occupied).toBe(1);
      expect(warehouseUnitDetail.rackCapacity?.availablePercentage).toBe(50);

      const standardUnitDetail =
        await storageUnitService.getStorageUnitById(standardUnitId);
      expect(standardUnitDetail.rackCapacity).toBeNull();
    });
  });
});
