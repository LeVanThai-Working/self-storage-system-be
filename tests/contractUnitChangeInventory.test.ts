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
import { contractService } from '../src/modules/contract/contract.container.ts';
import { customerInventoryService } from '../src/modules/customerInventory/customerInventory.container.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { UnitTypeCategoryEnum } from '../src/common/enums/unitType.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  ContractAddendumStatusEnum,
  ContractAddendumTypeEnum,
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { CustomerSkuStatusEnum } from '../src/common/enums/customerSku.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';

describe('X6: Block UNIT_CHANGE Addendum Activation While Old Storage Unit Has Inventory', () => {
  const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);
  const managerId = new Types.ObjectId(TEST_USERS.managerFacilityA.id);
  const adminId = new Types.ObjectId(TEST_USERS.systemAdmin.id);
  const offeringId = new Types.ObjectId('65d000000000000000000030');
  let oldUnitId: Types.ObjectId;
  let newUnitId: Types.ObjectId;
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
      name: 'X6 Test Facility',
      code: 'FAC-X6-01',
      address: '123 X6 St',
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

    const oldUnit = await StorageUnit.create({
      unitNumber: 'UNIT-X6-OLD',
      facilityId,
      unitTypeId: unitType._id,
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    oldUnitId = oldUnit._id as Types.ObjectId;

    const newUnit = await StorageUnit.create({
      unitNumber: 'UNIT-X6-NEW',
      facilityId,
      unitTypeId: unitType._id,
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    newUnitId = newUnit._id as Types.ObjectId;

    const sku = await CustomerSku.create({
      customerId,
      skuCode: 'SKU-X6-001',
      name: 'X6 Customer Box',
      uom: 'box',
      status: CustomerSkuStatusEnum.ACTIVE,
    });
    skuId = sku._id as Types.ObjectId;
  });

  async function seedActiveContract() {
    const startDate = new Date(Date.now() - 10 * 86400000);
    const endDate = new Date(Date.now() + 20 * 86400000);

    return Contract.create({
      contractCode: `CTR-X6-${Math.floor(100000 + Math.random() * 900000)}`,
      source: ContractSourceEnum.WALK_IN,
      customerId,
      facilityId,
      storageUnitId: oldUnitId,
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
      status: ContractStatusEnum.ACTIVE,
    });
  }

  it('blocks UNIT_CHANGE addendum activation (staffSignAddendum) with 400 MESSAGE_CODE_629 when old unit still contains inventory, and succeeds once old unit is emptied', async () => {
    const contract = await seedActiveContract();

    // Customer stocks in 8 items into old unit
    await customerInventoryService.stockIn(
      {
        contractId: String(contract._id),
        skuId: String(skuId),
        quantity: 8,
      },
      { id: String(adminId), role: RoleEnum.SYSTEM_ADMIN }
    );

    // Facility manager creates UNIT_CHANGE addendum (reserves new unit)
    const afterCreate = await contractService.createAddendum(
      String(contract._id),
      String(managerId),
      RoleEnum.FACILITY_MANAGER,
      {
        type: ContractAddendumTypeEnum.UNIT_CHANGE,
        newStorageUnitId: String(newUnitId),
        notes: 'Switch to new unit on same floor',
      }
    );

    const addendumId = afterCreate.addendums[0].id;
    expect(afterCreate.addendums[0].status).toBe(
      ContractAddendumStatusEnum.DRAFT
    );

    // Customer signs addendum (first step - still DRAFT)
    const afterCustomerSign = await contractService.customerSignAddendum(
      String(contract._id),
      addendumId,
      String(customerId),
      RoleEnum.CUSTOMER,
      { termsAccepted: true }
    );
    expect(afterCustomerSign.addendums[0].customerSigned).toBe(true);
    expect(afterCustomerSign.addendums[0].status).toBe(
      ContractAddendumStatusEnum.DRAFT
    );

    // Manager attempts final sign (activation) while old unit still has 8 items -> blocked with 400 MESSAGE_CODE_629
    await expect(
      contractService.staffSignAddendum(
        String(contract._id),
        addendumId,
        String(managerId),
        RoleEnum.FACILITY_MANAGER,
        { termsAccepted: true }
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_629,
    });

    // Verify contract still points to old unit, old unit is still OCCUPIED, new unit is still RESERVED, addendum is still DRAFT
    const contractUnchanged = await Contract.findById(contract._id);
    expect(String(contractUnchanged?.storageUnitId)).toBe(String(oldUnitId));
    expect(contractUnchanged?.addendums[0].status).toBe(
      ContractAddendumStatusEnum.DRAFT
    );

    const oldUnitCheck = await StorageUnit.findById(oldUnitId);
    expect(oldUnitCheck?.status).toBe(StorageUnitStatusEnum.OCCUPIED);

    const newUnitCheck = await StorageUnit.findById(newUnitId);
    expect(newUnitCheck?.status).toBe(StorageUnitStatusEnum.RESERVED);

    // Customer stocks out all 8 items from old unit
    await customerInventoryService.stockOut(
      {
        contractId: String(contract._id),
        skuId: String(skuId),
        quantity: 8,
        reason: 'Vacating old unit before switching to new unit',
      },
      { id: String(adminId), role: RoleEnum.SYSTEM_ADMIN }
    );

    // Now manager signs addendum -> activation succeeds!
    const afterStaffSign = await contractService.staffSignAddendum(
      String(contract._id),
      addendumId,
      String(managerId),
      RoleEnum.FACILITY_MANAGER,
      { termsAccepted: true }
    );

    expect(afterStaffSign.storageUnitId).toBe(String(newUnitId));
    expect(afterStaffSign.addendums[0].status).toBe(
      ContractAddendumStatusEnum.ACTIVE
    );

    const oldUnitAfter = await StorageUnit.findById(oldUnitId);
    expect(oldUnitAfter?.status).toBe(StorageUnitStatusEnum.UNDER_MAINTENANCE);

    const newUnitAfter = await StorageUnit.findById(newUnitId);
    expect(newUnitAfter?.status).toBe(StorageUnitStatusEnum.OCCUPIED);

    // Customer can now stock in items into the new unit under the same contract
    const stockedInNewUnit = await customerInventoryService.stockIn(
      {
        contractId: String(contract._id),
        skuId: String(skuId),
        quantity: 8,
      },
      { id: String(adminId), role: RoleEnum.SYSTEM_ADMIN }
    );
    expect(stockedInNewUnit.storageUnitId).toBe(String(newUnitId));
    expect(stockedInNewUnit.quantity).toBe(8);
  });

  it('allows RENEW addendum activation even when storage unit contains customer inventory', async () => {
    const contract = await seedActiveContract();

    await customerInventoryService.stockIn(
      {
        contractId: String(contract._id),
        skuId: String(skuId),
        quantity: 10,
      },
      { id: String(adminId), role: RoleEnum.SYSTEM_ADMIN }
    );

    const newEndDate = new Date(
      contract.endDate.getTime() + 30 * 86400000
    ).toISOString();

    const afterCreate = await contractService.createAddendum(
      String(contract._id),
      String(managerId),
      RoleEnum.FACILITY_MANAGER,
      {
        type: ContractAddendumTypeEnum.RENEW,
        newEndDate,
      }
    );
    const addendumId = afterCreate.addendums[0].id;

    await contractService.customerSignAddendum(
      String(contract._id),
      addendumId,
      String(customerId),
      RoleEnum.CUSTOMER,
      { termsAccepted: true }
    );

    const afterStaffSign = await contractService.staffSignAddendum(
      String(contract._id),
      addendumId,
      String(managerId),
      RoleEnum.FACILITY_MANAGER,
      { termsAccepted: true }
    );

    expect(afterStaffSign.addendums[0].status).toBe(
      ContractAddendumStatusEnum.ACTIVE
    );
    expect(afterStaffSign.renewalCount).toBe(1);
  });
});
