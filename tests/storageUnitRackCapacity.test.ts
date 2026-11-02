import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { StorageRackRepository } from '../src/modules/storageRack/storageRack.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { UnitTypeRepository } from '../src/modules/unitType/unitType.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import { StorageUnitService } from '../src/modules/storageUnit/storageUnit.service.ts';
import {
  RackStatusEnum,
  RackZoneEnum,
} from '../src/common/enums/storageRack.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';

describe('StorageUnit Rack Capacity (WAREHOUSE_RACK)', () => {
  let storageRackRepository: StorageRackRepository;
  let storageUnitRepository: StorageUnitRepository;
  let storageUnitService: StorageUnitService;

  let facilityId: Types.ObjectId;
  let warehouseUnitTypeId: Types.ObjectId;
  let standardUnitTypeId: Types.ObjectId;
  let warehouseUnitId: Types.ObjectId;
  let standardUnitId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();

    storageRackRepository = new StorageRackRepository(StorageRack);
    storageUnitRepository = new StorageUnitRepository(StorageUnit);
    const facilityRepository = new FacilityRepository(Facility);
    const unitTypeRepository = new UnitTypeRepository(UnitType);
    const offeringRepository = new FacilityUnitTypeOfferingRepository(
      FacilityUnitTypeOffering
    );
    const customerInventoryRepository = new CustomerInventoryRepository(
      CustomerInventory
    );

    storageUnitService = new StorageUnitService(
      storageUnitRepository,
      facilityRepository,
      unitTypeRepository,
      offeringRepository,
      customerInventoryRepository,
      undefined,
      undefined,
      undefined,
      storageRackRepository
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    facilityId = new Types.ObjectId();
    await Facility.create({
      _id: facilityId,
      name: 'Main Facility',
      code: 'FAC-01',
      address: '123 Test Street',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
      operatingHours: { open: '08:00', close: '20:00' },
    });

    warehouseUnitTypeId = new Types.ObjectId();
    await UnitType.create({
      _id: warehouseUnitTypeId,
      name: 'Warehouse Rack Section',
      category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
      area: 50,
      volume: 150,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { length: 10, width: 5, height: 3 },
    });

    standardUnitTypeId = new Types.ObjectId();
    await UnitType.create({
      _id: standardUnitTypeId,
      name: 'Standard Locker',
      category: UnitTypeCategoryEnum.LOCKER,
      area: 2,
      volume: 4,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { length: 1, width: 2, height: 2 },
    });

    warehouseUnitId = new Types.ObjectId();
    await StorageUnit.create({
      _id: warehouseUnitId,
      facilityId,
      unitTypeId: warehouseUnitTypeId,
      unitNumber: 'WR-101',
      floor: 1,
      zone: 'A',
      status: StorageUnitStatusEnum.AVAILABLE,
    });

    standardUnitId = new Types.ObjectId();
    await StorageUnit.create({
      _id: standardUnitId,
      facilityId,
      unitTypeId: standardUnitTypeId,
      unitNumber: 'LK-201',
      floor: 2,
      zone: 'B',
      status: StorageUnitStatusEnum.AVAILABLE,
    });
  });

  describe('StorageRackRepository.getRackCapacityByStorageUnitIds', () => {
    it('should aggregate total, available, occupied and availablePercentage correctly', async () => {
      // Create racks for warehouseUnitId: 2 available, 1 rented, 1 reserved, 1 maintenance
      await StorageRack.create([
        {
          facilityId,
          storageUnitId: warehouseUnitId,
          rackCode: 'RACK-01',
          aisle: 'A',
          bay: 1,
          zone: RackZoneEnum.STANDARD,
          tierCount: 3,
          status: RackStatusEnum.AVAILABLE,
        },
        {
          facilityId,
          storageUnitId: warehouseUnitId,
          rackCode: 'RACK-02',
          aisle: 'A',
          bay: 2,
          zone: RackZoneEnum.STANDARD,
          tierCount: 3,
          status: RackStatusEnum.AVAILABLE,
        },
        {
          facilityId,
          storageUnitId: warehouseUnitId,
          rackCode: 'RACK-03',
          aisle: 'A',
          bay: 3,
          zone: RackZoneEnum.STANDARD,
          tierCount: 3,
          status: RackStatusEnum.RENTED,
        },
        {
          facilityId,
          storageUnitId: warehouseUnitId,
          rackCode: 'RACK-04',
          aisle: 'A',
          bay: 4,
          zone: RackZoneEnum.STANDARD,
          tierCount: 3,
          status: RackStatusEnum.RESERVED,
        },
        {
          facilityId,
          storageUnitId: warehouseUnitId,
          rackCode: 'RACK-05',
          aisle: 'A',
          bay: 5,
          zone: RackZoneEnum.STANDARD,
          tierCount: 3,
          status: RackStatusEnum.MAINTENANCE,
        },
      ]);

      const res = await storageRackRepository.getRackCapacityByStorageUnitIds([
        warehouseUnitId.toString(),
      ]);

      expect(res[warehouseUnitId.toString()]).toEqual({
        total: 5,
        available: 2,
        occupied: 2, // 1 rented + 1 reserved
        availablePercentage: 40, // (2 / 5) * 100 = 40%
      });
    });

    it('should exclude soft-deleted racks', async () => {
      await StorageRack.create({
        facilityId,
        storageUnitId: warehouseUnitId,
        rackCode: 'RACK-ACTIVE',
        aisle: 'A',
        bay: 1,
        zone: RackZoneEnum.STANDARD,
        tierCount: 2,
        status: RackStatusEnum.AVAILABLE,
      });

      const deletedRack = await StorageRack.create({
        facilityId,
        storageUnitId: warehouseUnitId,
        rackCode: 'RACK-DELETED',
        aisle: 'A',
        bay: 2,
        zone: RackZoneEnum.STANDARD,
        tierCount: 2,
        status: RackStatusEnum.AVAILABLE,
      });

      await storageRackRepository.softDelete(deletedRack._id.toString());

      const res = await storageRackRepository.getRackCapacityByStorageUnitIds([
        warehouseUnitId.toString(),
      ]);

      expect(res[warehouseUnitId.toString()]).toEqual({
        total: 1,
        available: 1,
        occupied: 0,
        availablePercentage: 100,
      });
    });

    it('should return 0 stats for units with no racks', async () => {
      const res = await storageRackRepository.getRackCapacityByStorageUnitIds([
        warehouseUnitId.toString(),
      ]);

      expect(res[warehouseUnitId.toString()]).toEqual({
        total: 0,
        available: 0,
        occupied: 0,
        availablePercentage: 0,
      });
    });
  });

  describe('StorageUnitService - getStorageUnits and getStorageUnitById', () => {
    beforeEach(async () => {
      await StorageRack.create([
        {
          facilityId,
          storageUnitId: warehouseUnitId,
          rackCode: 'WR-R1',
          aisle: 'A',
          bay: 1,
          zone: RackZoneEnum.STANDARD,
          tierCount: 4,
          status: RackStatusEnum.AVAILABLE,
        },
        {
          facilityId,
          storageUnitId: warehouseUnitId,
          rackCode: 'WR-R2',
          aisle: 'A',
          bay: 2,
          zone: RackZoneEnum.STANDARD,
          tierCount: 4,
          status: RackStatusEnum.RENTED,
        },
      ]);
    });

    it('should include rackCapacity for warehouse_rack and null for non-warehouse units in getStorageUnits', async () => {
      const result = await storageUnitService.getStorageUnits();

      const warehouseUnit = result.items.find(
        (u) => u.id === warehouseUnitId.toString()
      );
      const standardUnit = result.items.find(
        (u) => u.id === standardUnitId.toString()
      );

      expect(warehouseUnit).toBeDefined();
      expect(warehouseUnit?.rackCapacity).toEqual({
        total: 2,
        available: 1,
        occupied: 1,
        availablePercentage: 50,
      });

      expect(standardUnit).toBeDefined();
      expect(standardUnit?.rackCapacity).toBeNull();
    });

    it('should include rackCapacity for warehouse_rack in getStorageUnitById', async () => {
      const result = await storageUnitService.getStorageUnitById(
        warehouseUnitId.toString()
      );

      expect(result.rackCapacity).toEqual({
        total: 2,
        available: 1,
        occupied: 1,
        availablePercentage: 50,
      });
    });

    it('should return null rackCapacity for non-warehouse units in getStorageUnitById', async () => {
      const result = await storageUnitService.getStorageUnitById(
        standardUnitId.toString()
      );

      expect(result.rackCapacity).toBeNull();
    });
  });
});
