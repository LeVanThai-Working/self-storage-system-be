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
import { Contract } from '../src/modules/contract/contract.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { RackTier } from '../src/modules/storageRack/rackTier.model.ts';
import type { IFacility } from '../src/modules/facility/facility.model.ts';
import type { IContract } from '../src/modules/contract/contract.model.ts';
import type { IStorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import type { IStorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import type { IRackTier } from '../src/modules/storageRack/rackTier.model.ts';
import type { ICustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import type { ICustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { InventoryRequest } from '../src/modules/customerInventory/inventoryRequest.model.ts';
import {
  inventoryRequestService,
  customerInventoryService,
} from '../src/modules/customerInventory/customerInventory.container.ts';
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
import { InventoryRequestStatusEnum } from '../src/common/enums/customerInventory.enum.ts';
import type { CallerContext } from '../src/modules/customerInventory/inventoryRequest.service.ts';

describe('G11: Inventory Request Expiry, Outbound Reserve & Auto Expiration', () => {
  const customer1Caller: CallerContext = {
    id: TEST_USERS.customer1.id,
    role: RoleEnum.CUSTOMER,
  };
  const staffACaller: CallerContext = {
    id: TEST_USERS.staffFacilityA.id,
    role: RoleEnum.FACILITY_STAFF,
  };

  let facilityA: IFacility;
  let unit: IStorageUnit;
  let rack: IStorageRack;
  let tier: IRackTier;
  let sku: ICustomerSku;
  let contract: IContract;
  let inventoryDoc: ICustomerInventory;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    facilityA = await Facility.create({
      _id: new Types.ObjectId(TEST_FACILITY_A_ID),
      name: 'Facility A Test',
      code: 'FACA01',
      city: 'Ha Noi',
      address: '123 Test Street',
      totalFloors: 2,
      status: 'active',
      isActive: true,
      pricingTiers: [],
    });

    unit = await StorageUnit.create({
      facilityId: facilityA._id,
      unitTypeId: new Types.ObjectId(),
      unitNumber: 'U-101',
      floor: 1,
      zone: 'A',
      type: 'WAREHOUSE_RACK',
      status: StorageUnitStatusEnum.OCCUPIED,
      isActive: true,
    });

    rack = await StorageRack.create({
      facilityId: facilityA._id,
      storageUnitId: unit._id,
      rackCode: 'RACK-01',
      name: 'Rack 1',
      status: RackStatusEnum.RENTED,
      currentCustomerId: new Types.ObjectId(TEST_USERS.customer1.id),
      zone: RackZoneEnum.STANDARD,
      tierCount: 2,
    });

    tier = await RackTier.create({
      facilityId: facilityA._id,
      storageUnitId: unit._id,
      storageRackId: rack._id,
      tierNumber: 1,
      tierCode: 'R1-T1',
      maxWeightKg: 500,
      status: RackTierStatusEnum.OCCUPIED,
    });

    sku = await CustomerSku.create({
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      skuCode: 'SKU-G11-001',
      name: 'Item G11 Test',
      barcode: 'BAR-G11-001',
      uom: 'piece',
      dimensions: { length: 10, width: 10, height: 10 },
      volume: 1000,
      weightKg: 1,
      status: CustomerSkuStatusEnum.ACTIVE,
    });

    contract = await Contract.create({
      contractCode: 'CTR-G11-001',
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: facilityA._id,
      storageUnitId: unit._id,
      rentedRackIds: [rack._id],
      status: ContractStatusEnum.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalPeriodicPrice: 1000000,
      depositAmount: 1000000,
      rentalPrice: 1000000,
      billingUnit: 'month',
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      source: ContractSourceEnum.RESERVATION,
    });

    // Tạo tồn kho ban đầu: 10 sản phẩm
    inventoryDoc = await CustomerInventory.create({
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      contractId: contract._id,
      facilityId: facilityA._id,
      storageUnitId: unit._id,
      storageRackId: rack._id,
      rackTierId: tier._id,
      skuId: sku._id,
      quantity: 10,
      pendingOutboundQuantity: 0,
      lastMovementAt: new Date(),
    });
  });

  it('Ca 1 (Dương): Tạo phiếu xuất thành công -> pendingOutboundQuantity tăng, availableQuantity giảm', async () => {
    const res = await inventoryRequestService.createOutboundRequest(
      {
        contractId: String(contract._id),
        items: [
          {
            skuId: String(sku._id),
            quantity: 4,
            storageRackId: String(rack._id),
            rackTierId: String(tier._id),
          },
        ],
      },
      customer1Caller
    );

    expect(res).toBeDefined();
    expect(res.status).toBe(InventoryRequestStatusEnum.PENDING);

    // Kiểm tra DB
    const updatedInv = await CustomerInventory.findById(inventoryDoc._id);
    expect(updatedInv?.quantity).toBe(10); // Thực tế vẫn là 10
    expect(updatedInv?.pendingOutboundQuantity).toBe(4); // Giữ chỗ 4

    // Kiểm tra API sơ đồ cây tính đúng availableQuantity = 6
    const tree = await customerInventoryService.getStorageUnitTree(
      String(unit._id),
      customer1Caller
    );
    const itemInTree = tree.racks[0].tiers[0].items[0];
    expect(itemInTree.quantity).toBe(10);
    expect(itemInTree.pendingOutboundQuantity).toBe(4);
    expect(itemInTree.availableQuantity).toBe(6);
  });

  it('Ca 2 (Âm - Vượt tồn khả dụng): Tạo tiếp phiếu xuất vượt quá availableQuantity -> bị chặn 400', async () => {
    // Phiếu 1 giữ 7 sản phẩm (còn khả dụng 3)
    await inventoryRequestService.createOutboundRequest(
      {
        contractId: String(contract._id),
        items: [
          {
            skuId: String(sku._id),
            quantity: 7,
            storageRackId: String(rack._id),
            rackTierId: String(tier._id),
          },
        ],
      },
      customer1Caller
    );

    // Phiếu 2 cố tình xin xuất 4 sản phẩm (vượt 1 so với 3 khả dụng) -> Phải throw AppError 400 MESSAGE_CODE_621
    await expect(
      inventoryRequestService.createOutboundRequest(
        {
          contractId: String(contract._id),
          items: [
            {
              skuId: String(sku._id),
              quantity: 4,
              storageRackId: String(rack._id),
              rackTierId: String(tier._id),
            },
          ],
        },
        customer1Caller
      )
    ).rejects.toThrow('Insufficient Inventory Quantity');

    // Đảm bảo số lượng giữ chỗ vẫn dừng ở 7
    const inv = await CustomerInventory.findById(inventoryDoc._id);
    expect(inv?.pendingOutboundQuantity).toBe(7);
  });

  it('Ca 3 (Dương): Khách bấm hủy phiếu PENDING -> pendingOutboundQuantity hồi phục về 0', async () => {
    const req = await inventoryRequestService.createOutboundRequest(
      {
        contractId: String(contract._id),
        items: [
          {
            skuId: String(sku._id),
            quantity: 5,
            storageRackId: String(rack._id),
            rackTierId: String(tier._id),
          },
        ],
      },
      customer1Caller
    );

    let inv = await CustomerInventory.findById(inventoryDoc._id);
    expect(inv?.pendingOutboundQuantity).toBe(5);

    // Khách bấm hủy phiếu
    const cancelled = await inventoryRequestService.cancelOutboundRequest(
      req.id,
      customer1Caller,
      'Tôi đổi ý'
    );
    expect(cancelled.status).toBe(InventoryRequestStatusEnum.CANCELLED);

    // Kiểm tra hàng giữ chỗ đã được giải phóng 100%
    inv = await CustomerInventory.findById(inventoryDoc._id);
    expect(inv?.pendingOutboundQuantity).toBe(0);
    expect(inv?.quantity).toBe(10);
  });

  it('Ca 4 (Tự động hết hạn): Job processExpiredRequests quét phiếu quá hạn -> chuyển EXPIRED và giải phóng tồn', async () => {
    // Tạo phiếu xuất có hạn 2 tiếng nữa
    const req = await inventoryRequestService.createOutboundRequest(
      {
        contractId: String(contract._id),
        items: [
          {
            skuId: String(sku._id),
            quantity: 6,
            storageRackId: String(rack._id),
            rackTierId: String(tier._id),
          },
        ],
      },
      customer1Caller
    );

    let inv = await CustomerInventory.findById(inventoryDoc._id);
    expect(inv?.pendingOutboundQuantity).toBe(6);

    // Giả lập thời gian: chỉnh expiresAt của phiếu về quá khứ (10 phút trước)
    await InventoryRequest.findByIdAndUpdate(req.id, {
      expiresAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    // Chạy job quét hết hạn
    const expiredCount = await inventoryRequestService.processExpiredRequests();
    expect(expiredCount).toBe(1);

    // Kiểm tra trạng thái phiếu
    const updatedReq = await InventoryRequest.findById(req.id);
    expect(updatedReq?.status).toBe(InventoryRequestStatusEnum.EXPIRED);

    // Kiểm tra hàng giữ chỗ được giải phóng về 0
    inv = await CustomerInventory.findById(inventoryDoc._id);
    expect(inv?.pendingOutboundQuantity).toBe(0);
  });

  it('Ca 5 (Hoàn tất giao nhận): Bàn giao xong trừ cả quantity và pendingOutboundQuantity', async () => {
    const req = await inventoryRequestService.createOutboundRequest(
      {
        contractId: String(contract._id),
        items: [
          {
            skuId: String(sku._id),
            quantity: 4,
            storageRackId: String(rack._id),
            rackTierId: String(tier._id),
          },
        ],
      },
      customer1Caller
    );

    // Quét mã xác thực -> chuyển sang PROCESSING
    await inventoryRequestService.verifyPickupCode(
      { pickupCode: `PICKUP:${req.requestCode}:${req.pickupQrToken}` },
      staffACaller
    );

    // Bàn giao xuất kho
    await inventoryRequestService.completeOutboundHandover(
      req.id,
      {
        evidenceImages: ['https://example.com/handover.jpg'],
        actualItems: [
          {
            skuId: String(sku._id),
            actualQuantity: 4,
            storageRackId: String(rack._id),
            rackTierId: String(tier._id),
          },
        ],
      },
      staffACaller
    );

    const inv = await CustomerInventory.findById(inventoryDoc._id);
    expect(inv?.quantity).toBe(6); // 10 - 4 = 6
    expect(inv?.pendingOutboundQuantity).toBe(0); // 4 - 4 = 0
  });
});
