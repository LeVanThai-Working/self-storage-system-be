import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { TEST_FACILITY_A_ID } from './helpers/auth.helper.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { StorageUnitService } from '../src/modules/storageUnit/storageUnit.service.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { UnitTypeRepository } from '../src/modules/unitType/unitType.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { UnitTypeCategoryEnum } from '../src/common/enums/unitType.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { AppError } from '../src/common/errors/appError.error.ts';

/**
 * X1: Atomic storage unit status transitions + inventory counting helpers.
 * Guards against re-opening a unit (UNDER_MAINTENANCE -> AVAILABLE)
 * while customer goods still remain inside.
 */
describe('X1: Storage unit guards when customer inventory remains', () => {
  let storageUnitRepo: StorageUnitRepository;
  let inventoryRepo: CustomerInventoryRepository;
  let storageUnitService: StorageUnitService;

  const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const customerId = new Types.ObjectId('65a000000000000000000001');
  const contractId = new Types.ObjectId('65e000000000000000000001');
  const otherContractId = new Types.ObjectId('65e000000000000000000002');
  const storageUnitId = new Types.ObjectId('65c000000000000000000001');
  const otherUnitId = new Types.ObjectId('65c000000000000000000002');
  let unitTypeId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    storageUnitRepo = new StorageUnitRepository(StorageUnit);
    inventoryRepo = new CustomerInventoryRepository(CustomerInventory);
    storageUnitService = new StorageUnitService(
      storageUnitRepo,
      new FacilityRepository(Facility),
      new UnitTypeRepository(UnitType),
      new FacilityUnitTypeOfferingRepository(FacilityUnitTypeOffering),
      inventoryRepo,
      undefined // auditLogService
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    await Facility.create({
      _id: facilityId,
      name: 'Facility Alpha',
      address: '123 Test Street',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
    });

    const unitType = await UnitType.create({
      name: `Unit Type ${Date.now()}`,
      dimensions: { length: 2, width: 2, height: 2 },
      area: 4,
      volume: 8,
      category: UnitTypeCategoryEnum.SMALL,
    });
    unitTypeId = unitType._id as Types.ObjectId;

    await StorageUnit.create({
      _id: storageUnitId,
      facilityId,
      unitTypeId,
      unitNumber: 'A101',
      floor: 1,
      status: StorageUnitStatusEnum.UNDER_MAINTENANCE,
    });
  });

  async function seedInventory(
    quantity: number,
    overrides: Record<string, unknown> = {}
  ) {
    return CustomerInventory.create({
      customerId,
      contractId,
      facilityId,
      storageUnitId,
      skuId: new Types.ObjectId(),
      quantity,
      lastMovementAt: new Date(),
      ...overrides,
    });
  }

  describe('Part 1: toggleMaintenance (turn off) with remaining inventory', () => {
    it('should block turning maintenance off when goods remain (MESSAGE_CODE_629)', async () => {
      await seedInventory(5);

      await expect(
        storageUnitService.toggleMaintenance(String(storageUnitId), {
          isUnderMaintenance: false,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_629,
      });

      const unit = await StorageUnit.findById(storageUnitId);
      expect(unit?.status).toBe(StorageUnitStatusEnum.UNDER_MAINTENANCE);
    });

    it('should allow turning maintenance off when the unit has no goods left', async () => {
      await seedInventory(0); // fully withdrawn goods keep a zero-quantity row

      const result = await storageUnitService.toggleMaintenance(
        String(storageUnitId),
        { isUnderMaintenance: false }
      );

      expect(result.status).toBe(StorageUnitStatusEnum.AVAILABLE);
    });

    it('should allow turning maintenance off when no inventory rows exist', async () => {
      const result = await storageUnitService.toggleMaintenance(
        String(storageUnitId),
        { isUnderMaintenance: false }
      );

      expect(result.status).toBe(StorageUnitStatusEnum.AVAILABLE);
    });

    it('should still reject turning maintenance off for a unit that is not under maintenance', async () => {
      await StorageUnit.updateOne(
        { _id: storageUnitId },
        { status: StorageUnitStatusEnum.AVAILABLE }
      );

      await expect(
        storageUnitService.toggleMaintenance(String(storageUnitId), {
          isUnderMaintenance: false,
        })
      ).rejects.toThrow(AppError);
    });

    it('should apply exactly one of two concurrent turn-off requests', async () => {
      const results = await Promise.allSettled([
        storageUnitService.toggleMaintenance(String(storageUnitId), {
          isUnderMaintenance: false,
        }),
        storageUnitService.toggleMaintenance(String(storageUnitId), {
          isUnderMaintenance: false,
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const unit = await StorageUnit.findById(storageUnitId);
      expect(unit?.status).toBe(StorageUnitStatusEnum.AVAILABLE);
    });
  });

  describe('Part 2: StorageUnitRepository.transitionStatusAtomic', () => {
    it('should transition when the current status is in the expected list', async () => {
      const updated = await storageUnitRepo.transitionStatusAtomic(
        String(storageUnitId),
        [StorageUnitStatusEnum.UNDER_MAINTENANCE],
        StorageUnitStatusEnum.AVAILABLE
      );

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe(StorageUnitStatusEnum.AVAILABLE);
    });

    it('should return null and leave the unit untouched when the status does not match', async () => {
      const updated = await storageUnitRepo.transitionStatusAtomic(
        String(storageUnitId),
        [StorageUnitStatusEnum.AVAILABLE],
        StorageUnitStatusEnum.UNDER_MAINTENANCE
      );

      expect(updated).toBeNull();
      const unit = await StorageUnit.findById(storageUnitId);
      expect(unit?.status).toBe(StorageUnitStatusEnum.UNDER_MAINTENANCE);
    });

    it('should return null for a soft-deleted unit', async () => {
      await StorageUnit.updateOne({ _id: storageUnitId }, { deleted: true });

      const updated = await storageUnitRepo.transitionStatusAtomic(
        String(storageUnitId),
        [StorageUnitStatusEnum.UNDER_MAINTENANCE],
        StorageUnitStatusEnum.AVAILABLE
      );

      expect(updated).toBeNull();
    });
  });

  describe('Part 3: CustomerInventoryRepository remaining-goods counters', () => {
    it('countRemainingByContract should count only rows with quantity > 0 for that contract', async () => {
      await seedInventory(3);
      await seedInventory(7);
      await seedInventory(0); // emptied row is ignored
      await seedInventory(4, { contractId: otherContractId }); // other contract

      const count = await inventoryRepo.countRemainingByContract(
        String(contractId)
      );
      expect(count).toBe(2);
    });

    it('countRemainingByContract should ignore soft-deleted rows', async () => {
      const doc = await seedInventory(3);
      await CustomerInventory.updateOne({ _id: doc._id }, { deleted: true });

      const count = await inventoryRepo.countRemainingByContract(
        String(contractId)
      );
      expect(count).toBe(0);
    });

    it('countRemainingByStorageUnit should count only rows with quantity > 0 for that unit', async () => {
      await seedInventory(3);
      await seedInventory(0);
      await seedInventory(5, { storageUnitId: otherUnitId });

      const count = await inventoryRepo.countRemainingByStorageUnit(
        String(storageUnitId)
      );
      expect(count).toBe(1);
    });

    it('counters should return 0 when nothing is stored', async () => {
      expect(
        await inventoryRepo.countRemainingByContract(String(contractId))
      ).toBe(0);
      expect(
        await inventoryRepo.countRemainingByStorageUnit(String(storageUnitId))
      ).toBe(0);
    });
  });
});
