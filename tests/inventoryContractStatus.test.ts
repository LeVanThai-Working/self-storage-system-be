import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
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
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
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
import {
  CustomerInventoryService,
  type CallerContext,
} from '../src/modules/customerInventory/customerInventory.service.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import {
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
  RackZoneEnum,
} from '../src/common/enums/storageRack.enum.ts';
import { UnitTypeCategoryEnum } from '../src/common/enums/unitType.enum.ts';
import { CustomerSkuStatusEnum } from '../src/common/enums/customerSku.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';

/**
 * X2: Contract-status permission matrix for inventory operations,
 * atomic contract touch to eliminate write-skew with check-out,
 * and storage unit tree support for OVERDUE contracts.
 */
describe('X2: Inventory operations by contract status & contract lock', () => {
  let contractRepo: ContractRepository;
  let contractService: ContractService;
  let inventoryRepo: CustomerInventoryRepository;
  let movementRepo: InventoryMovementRepository;
  let skuRepo: CustomerSkuRepository;
  let storageRackRepo: StorageRackRepository;
  let rackTierRepo: RackTierRepository;
  let storageUnitRepo: StorageUnitRepository;
  let inventoryService: CustomerInventoryService;

  const facilityAId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const customer1Id = new Types.ObjectId(TEST_USERS.customer1.id);
  const storageUnitId = new Types.ObjectId('65c000000000000000000010');
  const rackId = new Types.ObjectId('65c100000000000000000010');
  const tier1Id = new Types.ObjectId('65c200000000000000000011');
  const tier2Id = new Types.ObjectId('65c200000000000000000012');
  const skuId = new Types.ObjectId('65c300000000000000000010');
  const offeringId = new Types.ObjectId('65d000000000000000000010');

  const customer1Caller: CallerContext = {
    id: TEST_USERS.customer1.id,
    role: RoleEnum.CUSTOMER,
  };
  const customer2Caller: CallerContext = {
    id: TEST_USERS.customer2.id,
    role: RoleEnum.CUSTOMER,
  };
  const managerACaller: CallerContext = {
    id: TEST_USERS.managerFacilityA.id,
    role: RoleEnum.FACILITY_MANAGER,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };
  const managerBCaller: CallerContext = {
    id: TEST_USERS.managerFacilityB.id,
    role: RoleEnum.FACILITY_MANAGER,
    assignedFacilityId: TEST_FACILITY_B_ID,
  };
  const staffACaller: CallerContext = {
    id: TEST_USERS.staffFacilityA.id,
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };

  beforeAll(async () => {
    await setupTestDB();
    contractRepo = new ContractRepository(Contract);
    const reservationRepo = new ReservationRepository(Reservation);
    storageUnitRepo = new StorageUnitRepository(StorageUnit);
    storageRackRepo = new StorageRackRepository(StorageRack);
    rackTierRepo = new RackTierRepository(RackTier);
    skuRepo = new CustomerSkuRepository(CustomerSku);
    inventoryRepo = new CustomerInventoryRepository(CustomerInventory);
    movementRepo = new InventoryMovementRepository(InventoryMovement);
    const userRepo = new UserRepository(User);
    const refundRequestRepo = new RefundRequestRepository(RefundRequest);
    const refundRequestService = new RefundRequestService(
      refundRequestRepo,
      userRepo,
      reservationRepo,
      contractRepo
    );

    contractService = new ContractService(
      contractRepo,
      reservationRepo,
      storageUnitRepo,
      new FacilityAmenityOfferingRepository(FacilityAmenityOffering),
      new FacilityUnitTypeOfferingRepository(FacilityUnitTypeOffering),
      new FacilityRepository(Facility),
      userRepo,
      undefined,
      refundRequestService
    );

    inventoryService = new CustomerInventoryService(
      inventoryRepo,
      movementRepo,
      contractRepo,
      skuRepo,
      storageRackRepo,
      rackTierRepo,
      storageUnitRepo,
      undefined
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    await Facility.create({
      _id: facilityAId,
      code: 'FAC-A',
      name: 'Facility Alpha',
      address: '123 Test Street',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
    });

    const unitType = await UnitType.create({
      name: `Unit Type ${Date.now()}`,
      dimensions: { length: 3, width: 3, height: 3 },
      area: 9,
      volume: 27,
      category: UnitTypeCategoryEnum.MEDIUM,
    });

    await StorageUnit.create({
      _id: storageUnitId,
      facilityId: facilityAId,
      unitTypeId: unitType._id,
      unitNumber: 'A101',
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });

    await StorageRack.create({
      _id: rackId,
      facilityId: facilityAId,
      storageUnitId,
      rackCode: 'R-01',
      aisle: 'A',
      bay: 1,
      zone: RackZoneEnum.STANDARD,
      tierCount: 2,
      status: RackStatusEnum.AVAILABLE,
    });

    await RackTier.create([
      {
        _id: tier1Id,
        facilityId: facilityAId,
        storageUnitId,
        storageRackId: rackId,
        tierNumber: 1,
        tierCode: 'R-01-T1',
        status: RackTierStatusEnum.AVAILABLE,
      },
      {
        _id: tier2Id,
        facilityId: facilityAId,
        storageUnitId,
        storageRackId: rackId,
        tierNumber: 2,
        tierCode: 'R-01-T2',
        status: RackTierStatusEnum.AVAILABLE,
      },
    ]);

    await CustomerSku.create({
      _id: skuId,
      customerId: customer1Id,
      skuCode: 'SKU-001',
      name: 'Test Item Box',
      uom: 'box',
      status: CustomerSkuStatusEnum.ACTIVE,
    });
  });

  async function seedContract(
    status: ContractStatusEnum,
    overrides: Record<string, unknown> = {}
  ) {
    return Contract.create({
      contractCode: `CTR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      source: ContractSourceEnum.WALK_IN,
      customerId: customer1Id,
      facilityId: facilityAId,
      storageUnitId,
      facilityUnitTypeOfferingId: offeringId,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-02-01'),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1_000_000,
      depositAmount: 1_000_000,
      depositPaidAt: new Date('2026-01-01'),
      firstPeriodPaidAt: new Date('2026-01-01'),
      totalPeriodicPrice: 1_000_000,
      status,
      depositStatus: ContractDepositStatusEnum.HELD,
      termsAccepted: true,
      customerSigned: true,
      staffSigned: true,
      ...overrides,
    });
  }

  async function seedStockOnTier1(contractId: Types.ObjectId, quantity = 10) {
    await RackTier.updateOne(
      { _id: tier1Id },
      { status: RackTierStatusEnum.OCCUPIED }
    );
    return CustomerInventory.create({
      customerId: customer1Id,
      contractId,
      facilityId: facilityAId,
      storageUnitId,
      storageRackId: rackId,
      rackTierId: tier1Id,
      skuId,
      quantity,
      lastMovementAt: new Date(),
    });
  }

  describe('Part 1: Status × Operation Matrix', () => {
    it('ACTIVE contract allows IN, OUT, MOVE, and ADJUST and records lastInventoryActivityAt', async () => {
      const contract = await seedContract(ContractStatusEnum.ACTIVE);
      const contractId = String(contract._id);

      const afterIn = await inventoryService.stockIn(
        {
          contractId,
          skuId: String(skuId),
          rackTierId: String(tier1Id),
          quantity: 10,
        },
        customer1Caller
      );
      expect(afterIn.quantity).toBe(10);

      const afterOut = await inventoryService.stockOut(
        {
          contractId,
          skuId: String(skuId),
          rackTierId: String(tier1Id),
          quantity: 3,
        },
        customer1Caller
      );
      expect(afterOut.quantity).toBe(7);

      const afterMove = await inventoryService.stockMove(
        {
          contractId,
          skuId: String(skuId),
          fromRackTierId: String(tier1Id),
          toRackTierId: String(tier2Id),
          quantity: 4,
        },
        customer1Caller
      );
      expect(afterMove.quantity).toBe(4);

      const afterAdjust = await inventoryService.stockAdjust(
        {
          contractId,
          skuId: String(skuId),
          rackTierId: String(tier2Id),
          newQuantity: 5,
          reason: 'Cycle count adjustment',
        },
        customer1Caller
      );
      expect(afterAdjust.quantity).toBe(5);

      const refreshedContract = await Contract.findById(contract._id);
      expect(refreshedContract?.lastInventoryActivityAt).toBeInstanceOf(Date);
    });

    it('OVERDUE contract allows OUT and MOVE so customer can retrieve or reorganize goods', async () => {
      const contract = await seedContract(ContractStatusEnum.OVERDUE);
      await seedStockOnTier1(contract._id, 10);
      const contractId = String(contract._id);

      const afterMove = await inventoryService.stockMove(
        {
          contractId,
          skuId: String(skuId),
          fromRackTierId: String(tier1Id),
          toRackTierId: String(tier2Id),
          quantity: 4,
        },
        customer1Caller
      );
      expect(afterMove.quantity).toBe(4);

      const afterOut = await inventoryService.stockOut(
        {
          contractId,
          skuId: String(skuId),
          rackTierId: String(tier1Id),
          quantity: 6,
        },
        customer1Caller
      );
      expect(afterOut.quantity).toBe(0);
    });

    it('OVERDUE contract blocks IN and ADJUST with MESSAGE_CODE_644', async () => {
      const contract = await seedContract(ContractStatusEnum.OVERDUE);
      await seedStockOnTier1(contract._id, 5);
      const contractId = String(contract._id);

      await expect(
        inventoryService.stockIn(
          {
            contractId,
            skuId: String(skuId),
            rackTierId: String(tier1Id),
            quantity: 2,
          },
          customer1Caller
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_644,
      });

      await expect(
        inventoryService.stockAdjust(
          {
            contractId,
            skuId: String(skuId),
            rackTierId: String(tier1Id),
            newQuantity: 10,
            reason: 'Attempted adjust while overdue',
          },
          customer1Caller
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_644,
      });
    });

    it.each([
      ContractStatusEnum.DRAFT,
      ContractStatusEnum.COMPLETED,
      ContractStatusEnum.TERMINATED,
      ContractStatusEnum.CANCELLED,
    ])(
      'non-operational contract (%s) blocks IN, OUT, MOVE, and ADJUST with MESSAGE_CODE_622',
      async (status) => {
        const contract = await seedContract(status);
        await seedStockOnTier1(contract._id, 5);
        const contractId = String(contract._id);

        await expect(
          inventoryService.stockIn(
            {
              contractId,
              skuId: String(skuId),
              rackTierId: String(tier1Id),
              quantity: 1,
            },
            customer1Caller
          )
        ).rejects.toMatchObject({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_622,
        });

        await expect(
          inventoryService.stockOut(
            {
              contractId,
              skuId: String(skuId),
              rackTierId: String(tier1Id),
              quantity: 1,
            },
            customer1Caller
          )
        ).rejects.toMatchObject({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_622,
        });

        await expect(
          inventoryService.stockMove(
            {
              contractId,
              skuId: String(skuId),
              fromRackTierId: String(tier1Id),
              toRackTierId: String(tier2Id),
              quantity: 1,
            },
            customer1Caller
          )
        ).rejects.toMatchObject({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_622,
        });

        await expect(
          inventoryService.stockAdjust(
            {
              contractId,
              skuId: String(skuId),
              rackTierId: String(tier1Id),
              newQuantity: 2,
              reason: 'Blocked adjust',
            },
            customer1Caller
          )
        ).rejects.toMatchObject({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_622,
        });
      }
    );
  });

  describe('Part 2: Storage Unit Tree & Cross-Customer / Cross-Facility Authorization for OVERDUE', () => {
    it('allows contract owner to view storage unit tree when contract is OVERDUE', async () => {
      const contract = await seedContract(ContractStatusEnum.OVERDUE);
      await seedStockOnTier1(contract._id, 8);

      const tree = await inventoryService.getStorageUnitTree(
        String(storageUnitId),
        customer1Caller
      );

      expect(tree.contract).not.toBeNull();
      expect(tree.contract?.id).toBe(String(contract._id));
      expect(tree.contract?.status).toBe(ContractStatusEnum.OVERDUE);
      expect(tree.summary.totalQuantity).toBe(8);
    });

    it('allows Facility Manager of same facility to view tree with OVERDUE contract summary', async () => {
      const contract = await seedContract(ContractStatusEnum.OVERDUE);
      await seedStockOnTier1(contract._id, 6);

      const tree = await inventoryService.getStorageUnitTree(
        String(storageUnitId),
        managerACaller
      );

      expect(tree.contract?.id).toBe(String(contract._id));
      expect(tree.contract?.status).toBe(ContractStatusEnum.OVERDUE);
    });

    it('blocks another customer, another facility manager, and facility staff from viewing OVERDUE tree', async () => {
      const contract = await seedContract(ContractStatusEnum.OVERDUE);
      await seedStockOnTier1(contract._id, 6);

      await expect(
        inventoryService.getStorageUnitTree(
          String(storageUnitId),
          customer2Caller
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });

      await expect(
        inventoryService.getStorageUnitTree(
          String(storageUnitId),
          managerBCaller
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });

      await expect(
        inventoryService.getStorageUnitTree(String(storageUnitId), staffACaller)
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });

    it('blocks another customer from withdrawing goods on an OVERDUE contract without touching lastInventoryActivityAt', async () => {
      const contract = await seedContract(ContractStatusEnum.OVERDUE);
      await seedStockOnTier1(contract._id, 6);

      await expect(
        inventoryService.stockOut(
          {
            contractId: String(contract._id),
            skuId: String(skuId),
            rackTierId: String(tier1Id),
            quantity: 1,
          },
          customer2Caller
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });

      const refreshed = await Contract.findById(contract._id);
      expect(refreshed?.lastInventoryActivityAt ?? null).toBeNull();
    });
  });

  describe('Part 3: Atomic Contract Lock & Write-Skew Prevention', () => {
    it(' prevents stockIn from committing goods when checkOutContract completes the contract mid-flight', async () => {
      const contract = await seedContract(ContractStatusEnum.ACTIVE);
      const contractId = String(contract._id);

      // Simulate write-skew window: stockIn has opened its transaction snapshot and read the ACTIVE contract,
      // and right while SKU lookup is happening, checkOutContract runs and commits COMPLETED.
      const originalSkuFindById = skuRepo.findById.bind(skuRepo);
      let triggeredConcurrentCheckOut = false;

      const spy = vi
        .spyOn(skuRepo, 'findById')
        .mockImplementation(async (id: string) => {
          const sku = await originalSkuFindById(id);
          if (!triggeredConcurrentCheckOut) {
            triggeredConcurrentCheckOut = true;
            await contractService.checkOutContract(
              contractId,
              TEST_USERS.managerFacilityA.id,
              RoleEnum.FACILITY_MANAGER,
              {
                actualCheckOutDate: new Date('2026-01-20').toISOString(),
                damageFee: 0,
              }
            );
          }
          return sku;
        });

      try {
        await expect(
          inventoryService.stockIn(
            {
              contractId,
              skuId: String(skuId),
              rackTierId: String(tier1Id),
              quantity: 10,
            },
            customer1Caller
          )
        ).rejects.toMatchObject({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_622,
        });
      } finally {
        spy.mockRestore();
      }

      const finalContract = await Contract.findById(contract._id);
      expect(finalContract?.status).toBe(ContractStatusEnum.COMPLETED);

      const remainingCount =
        await inventoryRepo.countRemainingByContract(contractId);
      expect(remainingCount).toBe(0);
    });
  });
});
