import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { StorageRackRepository } from '../src/modules/storageRack/storageRack.repository.ts';
import { RackTier } from '../src/modules/storageRack/rackTier.model.ts';
import { RackTierRepository } from '../src/modules/storageRack/rackTier.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { StorageRackService } from '../src/modules/storageRack/storageRack.service.ts';
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

describe('Storage Rack Auto-Provisioning & Duplicate Safety', () => {
  let storageRackService: StorageRackService;
  let facilityId: Types.ObjectId;
  let warehouseUnitTypeId: Types.ObjectId;
  let storageUnitId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();

    const storageRackRepository = new StorageRackRepository(StorageRack);
    const rackTierRepository = new RackTierRepository(RackTier);
    const storageUnitRepository = new StorageUnitRepository(StorageUnit);
    const facilityRepository = new FacilityRepository(Facility);

    storageRackService = new StorageRackService(
      storageRackRepository,
      rackTierRepository,
      storageUnitRepository,
      facilityRepository
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
      name: 'Test Facility Q7',
      code: 'Q7',
      city: 'Ho Chi Minh',
      address: '123 Nguyen Thi Thap',
      status: FacilityStatusEnum.ACTIVE,
    });

    warehouseUnitTypeId = new Types.ObjectId();
    await UnitType.create({
      _id: warehouseUnitTypeId,
      name: 'Kho Phân Khu Kệ Pallet 100m²',
      category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
      dimensions: { length: 16.0, width: 6.25, height: 5.5 },
      area: 100.0,
      volume: 550.0,
      status: UnitTypeStatusEnum.ACTIVE,
      defaultRackConfig: {
        rackCount: 10,
        tiersPerRack: 5,
        tierDimensions: { length: 2.5, width: 1.2, height: 0.9 },
        tierMaxWeightKg: 800,
      },
    });

    storageUnitId = new Types.ObjectId();
    await StorageUnit.create({
      _id: storageUnitId,
      facilityId,
      unitTypeId: warehouseUnitTypeId,
      unitNumber: 'Q7-WR-A01',
      floor: 1,
      zone: 'Logistics',
      status: StorageUnitStatusEnum.AVAILABLE,
    });
  });

  it('should provision remaining racks without MongoServerError E11000 when some racks already exist with different rackCode format', async () => {
    // 1. Pre-seed 2 racks with custom codes at Bay 1 & Bay 2
    await StorageRack.create([
      {
        facilityId,
        storageUnitId,
        rackCode: 'RACK-A01',
        aisle: 'A',
        bay: 1,
        zone: RackZoneEnum.PRIME,
        tierCount: 4,
        status: RackStatusEnum.RENTED,
      },
      {
        facilityId,
        storageUnitId,
        rackCode: 'RACK-A02',
        aisle: 'A',
        bay: 2,
        zone: RackZoneEnum.STANDARD,
        tierCount: 4,
        status: RackStatusEnum.AVAILABLE,
      },
    ]);

    // 2. Call provision endpoint (default is 10 racks)
    const result = await storageRackService.provisionRacksForUnitEndpoint(
      String(storageUnitId)
    );

    // 3. Verify total racks is 10
    expect(result).toHaveLength(10);

    // 4. Verify existing racks are preserved
    const codes = result.map((r) => r.rackCode);
    expect(codes).toContain('RACK-A01');
    expect(codes).toContain('RACK-A02');
    expect(codes).toContain('R03');
    expect(codes).toContain('R10');

    // 5. Verify R03 has 5 tiers
    const rack03 = result.find((r) => r.rackCode === 'R03');
    expect(rack03).toBeDefined();
    expect(rack03?.tierCount).toBe(5);

    // 6. Test Idempotency: calling provision again should not fail or duplicate
    const secondCall = await storageRackService.provisionRacksForUnitEndpoint(
      String(storageUnitId)
    );
    expect(secondCall).toHaveLength(10);
  });
});
