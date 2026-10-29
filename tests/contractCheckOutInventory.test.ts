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
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { AuditLog } from '../src/modules/auditLog/auditLog.model.ts';
import { contractService } from '../src/modules/contract/contract.container.ts';
import { customerInventoryService } from '../src/modules/customerInventory/customerInventory.container.ts';
import { storageUnitService } from '../src/modules/storageUnit/storageUnit.container.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { UnitTypeCategoryEnum } from '../src/common/enums/unitType.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
  ContractTerminationTypeEnum,
  ViolationCategoryEnum,
} from '../src/common/enums/contract.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { CustomerSkuStatusEnum } from '../src/common/enums/customerSku.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { AuditActionEnum } from '../src/common/enums/auditLog.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { AppError } from '../src/common/errors/appError.error.ts';

describe('X3: Contract Check-out & Terminate with Remaining Customer Inventory', () => {
  const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);
  const staffId = new Types.ObjectId(TEST_USERS.staffFacilityA.id);
  const managerId = new Types.ObjectId(TEST_USERS.managerFacilityA.id);
  const offeringId = new Types.ObjectId('65d000000000000000000020');
  let storageUnitId: Types.ObjectId;
  let skuId: Types.ObjectId;

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

    await Facility.create({
      _id: facilityId,
      name: 'X3 Test Facility',
      code: 'FAC-X3-01',
      address: '123 X3 St',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
    });

    const unitType = await UnitType.create({
      name: `Standard Unit Type ${Date.now()}`,
      dimensions: { length: 3, width: 3, height: 3 },
      area: 9,
      volume: 27,
      category: UnitTypeCategoryEnum.MEDIUM,
    });

    const unit = await StorageUnit.create({
      unitNumber: 'UNIT-X3-101',
      facilityId,
      unitTypeId: unitType._id,
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    storageUnitId = unit._id as Types.ObjectId;

    const sku = await CustomerSku.create({
      customerId,
      skuCode: 'SKU-X3-001',
      name: 'X3 Customer Carton',
      uom: 'box',
      status: CustomerSkuStatusEnum.ACTIVE,
    });
    skuId = sku._id as Types.ObjectId;
  });

  async function seedContract(
    status: ContractStatusEnum = ContractStatusEnum.ACTIVE,
    unitId: Types.ObjectId = storageUnitId
  ) {
    const startDate = new Date(Date.now() - 15 * 86400000);
    const endDate =
      status === ContractStatusEnum.OVERDUE
        ? new Date(Date.now() - 2 * 86400000)
        : new Date(Date.now() + 15 * 86400000);

    return Contract.create({
      contractCode: `CTR-X3-${Math.floor(100000 + Math.random() * 900000)}`,
      source: ContractSourceEnum.WALK_IN,
      customerId,
      facilityId,
      storageUnitId: unitId,
      facilityUnitTypeOfferingId: offeringId,
      startDate,
      endDate,
      actualCheckInDate: startDate,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 2000000,
      totalPeriodicPrice: 2000000,
      depositAmount: 1000000,
      depositPaidAt: startDate,
      firstPeriodPaidAt: startDate,
      depositStatus: ContractDepositStatusEnum.HELD,
      customerSigned: true,
      customerSignedAt: startDate,
      staffSigned: true,
      staffSignedAt: startDate,
      termsAccepted: true,
      status,
    });
  }

  describe('Part 1: checkOutContract blocked when customer inventory remains (MESSAGE_CODE_420)', () => {
    it('rejects checkOutContract on ACTIVE contract with 400 MESSAGE_CODE_420 when quantity > 0 remains', async () => {
      const contract = await seedContract(ContractStatusEnum.ACTIVE);

      await customerInventoryService.stockIn(
        {
          contractId: String(contract._id),
          skuId: String(skuId),
          quantity: 5,
        },
        { id: String(customerId), role: RoleEnum.CUSTOMER }
      );

      await expect(
        contractService.checkOutContract(
          String(contract._id),
          String(staffId),
          RoleEnum.FACILITY_STAFF,
          { damageFee: 0, inspectionNotes: 'Attempt check-out with goods' }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_420,
      });

      const unchangedContract = await Contract.findById(contract._id);
      expect(unchangedContract?.status).toBe(ContractStatusEnum.ACTIVE);

      const unchangedUnit = await StorageUnit.findById(storageUnitId);
      expect(unchangedUnit?.status).toBe(StorageUnitStatusEnum.OCCUPIED);
    });

    it('rejects checkOutContract on OVERDUE contract with 400 MESSAGE_CODE_420 when quantity > 0 remains', async () => {
      const contract = await seedContract(ContractStatusEnum.OVERDUE);

      await CustomerInventory.create({
        customerId,
        contractId: contract._id,
        facilityId,
        storageUnitId,
        skuId,
        quantity: 3,
        lastMovementAt: new Date(),
      });

      await expect(
        contractService.checkOutContract(
          String(contract._id),
          String(staffId),
          RoleEnum.FACILITY_STAFF,
          { damageFee: 0 }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_420,
      });

      const unchangedContract = await Contract.findById(contract._id);
      expect(unchangedContract?.status).toBe(ContractStatusEnum.OVERDUE);
    });

    it('allows checkOutContract after customer stocks out all remaining items (quantity === 0)', async () => {
      const contract = await seedContract(ContractStatusEnum.ACTIVE);

      await customerInventoryService.stockIn(
        {
          contractId: String(contract._id),
          skuId: String(skuId),
          quantity: 5,
        },
        { id: String(customerId), role: RoleEnum.CUSTOMER }
      );

      // Customer stocks out all 5 items
      await customerInventoryService.stockOut(
        {
          contractId: String(contract._id),
          skuId: String(skuId),
          quantity: 5,
          reason: 'Clearing unit before check-out',
        },
        { id: String(customerId), role: RoleEnum.CUSTOMER }
      );

      const checkedOut = await contractService.checkOutContract(
        String(contract._id),
        String(staffId),
        RoleEnum.FACILITY_STAFF,
        { damageFee: 0, inspectionNotes: 'Unit is empty and clean' }
      );

      expect(checkedOut.status).toBe(ContractStatusEnum.COMPLETED);

      // Unit moves to UNDER_MAINTENANCE for post-checkout inspection/cleaning
      const unitAfterCheckout = await StorageUnit.findById(storageUnitId);
      expect(unitAfterCheckout?.status).toBe(
        StorageUnitStatusEnum.UNDER_MAINTENANCE
      );

      // Turning maintenance off succeeds and releases unit to AVAILABLE
      const unitReleased = await storageUnitService.toggleMaintenance(
        String(storageUnitId),
        { isUnderMaintenance: false }
      );
      expect(unitReleased.status).toBe(StorageUnitStatusEnum.AVAILABLE);
    });

    it('allows checkOutContract when inventory on contract is soft-deleted or belongs to another contract', async () => {
      const contract = await seedContract(ContractStatusEnum.ACTIVE);

      const doc = await CustomerInventory.create({
        customerId,
        contractId: contract._id,
        facilityId,
        storageUnitId,
        skuId,
        quantity: 4,
        lastMovementAt: new Date(),
      });
      await doc.delete();

      const checkedOut = await contractService.checkOutContract(
        String(contract._id),
        String(staffId),
        RoleEnum.FACILITY_STAFF,
        { damageFee: 0 }
      );

      expect(checkedOut.status).toBe(ContractStatusEnum.COMPLETED);
    });
  });

  describe('Part 2: terminateContract with remaining inventory & X1 maintenance guard', () => {
    it('allows terminateContract when goods remain, records remainingInventoryItems in audit metadata, and blocks turning maintenance off until goods are cleared', async () => {
      const contract = await seedContract(ContractStatusEnum.OVERDUE);

      const inv = await CustomerInventory.create({
        customerId,
        contractId: contract._id,
        facilityId,
        storageUnitId,
        skuId,
        quantity: 12,
        lastMovementAt: new Date(),
      });

      const terminated = await contractService.terminateContract(
        String(contract._id),
        String(managerId),
        RoleEnum.FACILITY_MANAGER,
        {
          terminationType: ContractTerminationTypeEnum.VIOLATION,
          violationCategory: ViolationCategoryEnum.PROHIBITED_GOODS,
          terminationReason: 'Overdue beyond threshold with goods inside',
          reportFileUrls: ['https://example.com/reports/inv_term.pdf'],
          evidenceFileUrls: ['https://example.com/photos/inv_term.jpg'],
        }
      );

      expect(terminated.status).toBe(ContractStatusEnum.TERMINATED);

      // Storage unit is placed in PENDING_CLEARANCE [CHỐT D14]
      const unitAfterTerminate = await StorageUnit.findById(storageUnitId);
      expect(unitAfterTerminate?.status).toBe(
        StorageUnitStatusEnum.PENDING_CLEARANCE
      );

      // Wait briefly for fire-and-forget audit log buffer flush after transaction commit
      await new Promise((resolve) => setTimeout(resolve, 100));
      const auditEntry = await AuditLog.findOne({
        action: AuditActionEnum.TERMINATE,
        resourceId: String(contract._id),
      }).lean();
      expect(auditEntry).toBeTruthy();
      expect(
        (auditEntry?.metadata as { remainingInventoryItems?: number } | null)
          ?.remainingInventoryItems
      ).toBe(1);

      // Direct turn-off from PENDING_CLEARANCE is rejected
      await expect(
        storageUnitService.toggleMaintenance(String(storageUnitId), {
          isUnderMaintenance: false,
        })
      ).rejects.toThrow(AppError);

      // Transition to UNDER_MAINTENANCE while goods remain is blocked by MESSAGE_CODE_629
      await expect(
        storageUnitService.toggleMaintenance(String(storageUnitId), {
          isUnderMaintenance: true,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_629,
      });

      // Once goods are cleared from the unit, moving to maintenance succeeds
      await CustomerInventory.findByIdAndUpdate(inv._id, { quantity: 0 });

      const unitInMaintenance = await storageUnitService.toggleMaintenance(
        String(storageUnitId),
        { isUnderMaintenance: true }
      );
      expect(unitInMaintenance.status).toBe(
        StorageUnitStatusEnum.UNDER_MAINTENANCE
      );

      // Then turning maintenance off succeeds -> AVAILABLE
      const releasedUnit = await storageUnitService.toggleMaintenance(
        String(storageUnitId),
        { isUnderMaintenance: false }
      );
      expect(releasedUnit.status).toBe(StorageUnitStatusEnum.AVAILABLE);
    });
  });
});
