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
import { Contract } from '../src/modules/contract/contract.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { RackTier } from '../src/modules/storageRack/rackTier.model.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { inventoryRequestService } from '../src/modules/customerInventory/customerInventory.container.ts';
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
import {
  InventoryRequestStatusEnum,
  InventoryRequestTypeEnum,
} from '../src/common/enums/customerInventory.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import type { CallerContext } from '../src/modules/customerInventory/inventoryRequest.service.ts';

describe('Phase A2: Pre-advised Inbound Request & Regenerate OTP (G2)', () => {
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

  let rackAId: string;
  let tierA1Id: string;
  let contractAId: string;
  let skuAId: string;

  beforeAll(async () => {
    await setupTestDB();
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

    const unitA = await StorageUnit.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitNumber: 'A101',
      unitTypeId: new Types.ObjectId(),
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });

    const rackA = await StorageRack.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId: unitA._id,
      rackCode: 'RA1',
      tierCount: 2,
      aisle: 'A',
      bay: 1,
      zone: RackZoneEnum.STANDARD,
      status: RackStatusEnum.RENTED,
    });
    rackAId = String(rackA._id);

    const tierA1 = await RackTier.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageRackId: rackA._id,
      storageUnitId: unitA._id,
      tierNumber: 1,
      tierCode: 'RA1-T1',
      status: RackTierStatusEnum.AVAILABLE,
    });
    tierA1Id = String(tierA1._id);

    const contract = await Contract.create({
      contractCode: 'CTR-A2-001',
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

    const sku = await CustomerSku.create({
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      skuCode: 'SKU-A2-01',
      name: 'Pre-advised Box',
      barcode: '893999888777',
      uom: 'cái',
      status: CustomerSkuStatusEnum.ACTIVE,
    });
    skuAId = String(sku._id);
  });

  describe('1. Create Pre-advised Inbound Request', () => {
    it('allows Customer to create pre-advised inbound request, returns rawOtpCode & pickupQrPayload', async () => {
      const created =
        await inventoryRequestService.createPreAdvisedInboundRequest(
          {
            contractId: contractAId,
            items: [
              {
                skuId: skuAId,
                quantity: 15,
                storageRackId: rackAId,
                rackTierId: tierA1Id,
              },
            ],
            transporterInfo: {
              name: 'Giao Hang Nhanh',
              phoneNumber: '0988112233',
              deliveryCompany: 'GHN',
              vehiclePlate: '59P1-12345',
            },
            notes: 'Hang de vo xin nhe tay',
          },
          customer1Caller
        );

      expect(created).toBeDefined();
      expect(created.type).toBe(InventoryRequestTypeEnum.INBOUND);
      expect(created.status).toBe(InventoryRequestStatusEnum.PENDING);
      expect(created.rawOtpCode).toBeDefined();
      expect(created.rawOtpCode).toMatch(/^\d{6}$/);
      expect(created.pickupQrPayload).toBeDefined();
      expect(created.pickupQrPayload).toMatch(/^INBOUND:REQ-IN-/);
      expect(created.items).toHaveLength(1);
      expect(created.items[0].quantity).toBe(15);
    });

    it('blocks Customer from creating pre-advised inbound request for another customer contract', async () => {
      await expect(
        inventoryRequestService.createPreAdvisedInboundRequest(
          {
            contractId: contractAId,
            items: [{ skuId: skuAId, quantity: 5 }],
          },
          customer2Caller
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });

    it('blocks Customer from creating pre-advised inbound on non-ACTIVE contract', async () => {
      await Contract.findByIdAndUpdate(contractAId, {
        status: ContractStatusEnum.CANCELLED,
      });

      await expect(
        inventoryRequestService.createPreAdvisedInboundRequest(
          {
            contractId: contractAId,
            items: [{ skuId: skuAId, quantity: 5 }],
          },
          customer1Caller
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_622,
      });
    });
  });

  describe('2. Query Details and QR/OTP Lifecycle', () => {
    it('getRequestById preserves pickupQrPayload for pending pre-advised request without leaking rawOtpCode', async () => {
      const created =
        await inventoryRequestService.createPreAdvisedInboundRequest(
          {
            contractId: contractAId,
            items: [{ skuId: skuAId, quantity: 10 }],
          },
          customer1Caller
        );

      const queried = await inventoryRequestService.getRequestById(
        created.id,
        customer1Caller
      );

      expect(queried.pickupQrPayload).toBe(created.pickupQrPayload);
      expect(queried.pickupQrPayload).toMatch(/^INBOUND:/);
      expect(queried.rawOtpCode).toBeNull();
    });

    it('allows Customer to regenerate OTP while request is PENDING', async () => {
      const created =
        await inventoryRequestService.createPreAdvisedInboundRequest(
          {
            contractId: contractAId,
            items: [{ skuId: skuAId, quantity: 10 }],
          },
          customer1Caller
        );
      const originalOtp = created.rawOtpCode;

      const regenerated = await inventoryRequestService.regenerateOtp(
        created.id,
        customer1Caller
      );

      expect(regenerated).toBeDefined();
      expect(regenerated.rawOtpCode).toMatch(/^\d{6}$/);
      expect(regenerated.rawOtpCode).not.toBe(originalOtp);

      // Verify old OTP fails with 404 MESSAGE_CODE_631
      await expect(
        inventoryRequestService.verifyPickupCode(
          {
            requestCode: created.requestCode,
            pickupCode: originalOtp || '',
          },
          staffACaller
        )
      ).rejects.toMatchObject({
        statusCode: 404,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_631,
      });

      // Verify new OTP succeeds
      const verifyResult = await inventoryRequestService.verifyPickupCode(
        {
          requestCode: created.requestCode,
          pickupCode: regenerated.rawOtpCode,
        },
        staffACaller
      );
      expect(verifyResult.status).toBe(InventoryRequestStatusEnum.PROCESSING);
    });

    it('blocks another Customer from regenerating OTP on someone else request', async () => {
      const created =
        await inventoryRequestService.createPreAdvisedInboundRequest(
          {
            contractId: contractAId,
            items: [{ skuId: skuAId, quantity: 10 }],
          },
          customer1Caller
        );

      await expect(
        inventoryRequestService.regenerateOtp(created.id, customer2Caller)
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });
  });

  describe('3. Customer Cancellation Flow', () => {
    it('allows Customer to cancel pre-advised request while PENDING', async () => {
      const created =
        await inventoryRequestService.createPreAdvisedInboundRequest(
          {
            contractId: contractAId,
            items: [{ skuId: skuAId, quantity: 10 }],
          },
          customer1Caller
        );

      const cancelled = await inventoryRequestService.cancelInboundRequest(
        created.id,
        customer1Caller,
        'Khong co nhu cau gui hang nua'
      );

      expect(cancelled.status).toBe(InventoryRequestStatusEnum.CANCELLED);

      // Verify OTP and QR are now invalidated
      const queried = await inventoryRequestService.getRequestById(
        created.id,
        customer1Caller
      );
      expect(queried.pickupQrPayload).toBeNull();
    });

    it('blocks Customer from cancelling request once Staff has verified (PROCESSING)', async () => {
      const created =
        await inventoryRequestService.createPreAdvisedInboundRequest(
          {
            contractId: contractAId,
            items: [{ skuId: skuAId, quantity: 10 }],
          },
          customer1Caller
        );

      await inventoryRequestService.verifyPickupCode(
        {
          requestCode: created.requestCode,
          pickupCode: created.pickupQrPayload || '',
        },
        staffACaller
      );

      // Attempt to cancel after verification
      await expect(
        inventoryRequestService.cancelInboundRequest(
          created.id,
          customer1Caller,
          'Muon huy khi hang da toi'
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_634,
      });
    });
  });

  describe('4. Staff Verification and Putaway Lifecycle', () => {
    it('completes the entire pre-advised inbound lifecycle: create -> verify QR -> putaway -> completed inventory', async () => {
      // Step 1: Customer creates pre-advised inbound
      const created =
        await inventoryRequestService.createPreAdvisedInboundRequest(
          {
            contractId: contractAId,
            items: [
              {
                skuId: skuAId,
                quantity: 20,
                storageRackId: rackAId,
                rackTierId: tierA1Id,
              },
            ],
          },
          customer1Caller
        );

      // Step 2: Staff scans QR code payload
      const verified = await inventoryRequestService.verifyPickupCode(
        {
          requestCode: created.requestCode,
          pickupCode: created.pickupQrPayload || '',
        },
        staffACaller
      );
      expect(verified.status).toBe(InventoryRequestStatusEnum.PROCESSING);

      // Step 3: Staff puts away goods from PROCESSING state
      const putawayResult = await inventoryRequestService.putawayInboundRequest(
        created.id,
        {
          placements: [
            {
              skuId: skuAId,
              quantity: 20,
              storageRackId: rackAId,
              rackTierId: tierA1Id,
            },
          ],
        },
        staffACaller
      );
      expect(putawayResult.status).toBe(InventoryRequestStatusEnum.COMPLETED);

      // Step 4: Verify stock in database
      const inv = await CustomerInventory.findOne({
        contractId: new Types.ObjectId(contractAId),
        skuId: new Types.ObjectId(skuAId),
        rackTierId: new Types.ObjectId(tierA1Id),
      });
      expect(inv).toBeDefined();
      expect(inv?.quantity).toBe(20);

      const tier = await RackTier.findById(tierA1Id);
      expect(tier?.status).toBe(RackTierStatusEnum.OCCUPIED);
    });

    it('blocks Staff from another facility from verifying pre-advised inbound QR code', async () => {
      const created =
        await inventoryRequestService.createPreAdvisedInboundRequest(
          {
            contractId: contractAId,
            items: [{ skuId: skuAId, quantity: 5 }],
          },
          customer1Caller
        );

      await expect(
        inventoryRequestService.verifyPickupCode(
          {
            requestCode: created.requestCode,
            pickupCode: created.pickupQrPayload || '',
          },
          staffBCaller
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });
  });
});
