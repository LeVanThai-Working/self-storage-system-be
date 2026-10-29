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
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { StorageUnitService } from '../src/modules/storageUnit/storageUnit.service.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { UnitTypeRepository } from '../src/modules/unitType/unitType.repository.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import {
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
  ContractTerminationTypeEnum,
  ViolationCategoryEnum,
} from '../src/common/enums/contract.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { UnitTypeCategoryEnum } from '../src/common/enums/unitType.enum.ts';
import { CustomerSkuStatusEnum } from '../src/common/enums/customerSku.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { AppError } from '../src/common/errors/appError.error.ts';

describe('T2.10: Safe Contract Termination & Storage Unit Clearance Lifecycle', () => {
  let contractRepo: ContractRepository;
  let contractService: ContractService;
  let reservationRepo: ReservationRepository;
  let storageUnitRepo: StorageUnitRepository;
  let storageUnitService: StorageUnitService;
  let amenityOfferingRepo: FacilityAmenityOfferingRepository;
  let unitTypeOfferingRepo: FacilityUnitTypeOfferingRepository;
  let facilityRepo: FacilityRepository;
  let userRepo: UserRepository;
  let inventoryRepo: CustomerInventoryRepository;

  const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const facilityBId = new Types.ObjectId(TEST_FACILITY_B_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);
  const managerId = new Types.ObjectId(TEST_USERS.managerFacilityA.id);
  const staffId = new Types.ObjectId(TEST_USERS.staffFacilityA.id);
  const offeringId = new Types.ObjectId('65d000000000000000000099');
  let storageUnitId: Types.ObjectId;
  let unitTypeId: Types.ObjectId;
  let skuId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();

    contractRepo = new ContractRepository(Contract);
    reservationRepo = new ReservationRepository(Reservation);
    storageUnitRepo = new StorageUnitRepository(StorageUnit);
    amenityOfferingRepo = new FacilityAmenityOfferingRepository(
      FacilityAmenityOffering
    );
    unitTypeOfferingRepo = new FacilityUnitTypeOfferingRepository(
      FacilityUnitTypeOffering
    );
    facilityRepo = new FacilityRepository(Facility);
    userRepo = new UserRepository(User);
    inventoryRepo = new CustomerInventoryRepository(CustomerInventory);

    storageUnitService = new StorageUnitService(
      storageUnitRepo,
      facilityRepo,
      new UnitTypeRepository(UnitType),
      unitTypeOfferingRepo,
      inventoryRepo,
      undefined
    );

    contractService = new ContractService(
      contractRepo,
      reservationRepo,
      storageUnitRepo,
      amenityOfferingRepo,
      unitTypeOfferingRepo,
      facilityRepo,
      userRepo,
      undefined, // authRedisService
      undefined, // notificationService
      undefined, // auditLogService
      undefined, // refundRequestService
      undefined, // incidentRepository
      inventoryRepo
    );
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
      name: 'Termination Safety Facility',
      code: 'FAC-SAFE-01',
      address: '123 Safe St',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
    });

    await Facility.create({
      _id: facilityBId,
      name: 'Termination Safety Facility B',
      code: 'FAC-SAFE-02',
      address: '456 Safe St',
      city: 'Ho Chi Minh',
      status: FacilityStatusEnum.ACTIVE,
    });

    const unitType = await UnitType.create({
      name: `Type-${Date.now()}`,
      dimensions: { length: 2, width: 2, height: 2 },
      area: 4,
      volume: 8,
      category: UnitTypeCategoryEnum.SMALL,
    });
    unitTypeId = unitType._id as Types.ObjectId;

    const unit = await StorageUnit.create({
      unitNumber: 'UNIT-TERM-01',
      facilityId,
      unitTypeId,
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    storageUnitId = unit._id as Types.ObjectId;

    const sku = await CustomerSku.create({
      customerId,
      facilityId,
      skuCode: 'SKU-TERM-01',
      name: 'Safe Test Cargo',
      uom: 'box',
      status: CustomerSkuStatusEnum.ACTIVE,
    });
    skuId = sku._id as Types.ObjectId;
  });

  async function createTestContract(
    status: ContractStatusEnum = ContractStatusEnum.ACTIVE,
    endDateOffsetDays = 15,
    customFacilityId: Types.ObjectId = facilityId
  ) {
    const startDate = new Date(Date.now() - 15 * 86400000);
    const endDate = new Date(Date.now() + endDateOffsetDays * 86400000);

    return Contract.create({
      contractCode: `CTR-TERM-${Math.floor(100000 + Math.random() * 900000)}`,
      source: ContractSourceEnum.WALK_IN,
      customerId,
      facilityId: customFacilityId,
      storageUnitId,
      facilityUnitTypeOfferingId: offeringId,
      startDate,
      endDate,
      actualCheckInDate: startDate,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 3000000,
      totalPeriodicPrice: 3000000,
      depositAmount: 1500000,
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

  describe('Part 1: Successful Termination Flows (MUTUAL, CUSTOMER_REQUEST, VIOLATION)', () => {
    it('Case 1: terminates contract with MUTUAL, moves storage unit to PENDING_CLEARANCE, forfeits 100% deposit, and records terminationHistory with file hash', async () => {
      const contract = await createTestContract(ContractStatusEnum.ACTIVE);

      const reportUrl = 'https://example.com/reports/mutual_liquidation.pdf';
      const evidenceUrl = 'https://example.com/photos/sealed_unit.jpg';

      const res = await contractService.terminateContract(
        String(contract._id),
        String(managerId),
        RoleEnum.FACILITY_MANAGER,
        {
          terminationType: ContractTerminationTypeEnum.MUTUAL,
          reason: 'Hai ben dong y cham dut truoc han do khach chuyen cong tac',
          reportFileUrls: [reportUrl],
          evidenceFileUrls: [evidenceUrl],
        }
      );

      expect(res.status).toBe(ContractStatusEnum.TERMINATED);
      expect(res.terminationType).toBe(ContractTerminationTypeEnum.MUTUAL);
      expect(res.depositStatus).toBe(ContractDepositStatusEnum.FORFEITED);
      expect(res.refundAmount).toBe(0);
      expect(res.forfeitedAmount).toBe(1500000);

      // Verify unit moved to PENDING_CLEARANCE
      const unit = await StorageUnit.findById(storageUnitId);
      expect(unit?.status).toBe(StorageUnitStatusEnum.PENDING_CLEARANCE);

      // Verify DB record & terminationHistory
      const dbContract = await Contract.findById(contract._id);
      expect(dbContract?.status).toBe(ContractStatusEnum.TERMINATED);
      expect(dbContract?.terminationType).toBe(
        ContractTerminationTypeEnum.MUTUAL
      );
      expect(dbContract?.reportFiles).toHaveLength(1);
      expect(dbContract?.reportFiles?.[0]?.url).toBe(reportUrl);
      expect(dbContract?.reportFiles?.[0]?.fileHash).toBeDefined();
      expect(dbContract?.evidenceFiles).toHaveLength(1);
      expect(dbContract?.evidenceFiles?.[0]?.url).toBe(evidenceUrl);
      expect(dbContract?.evidenceFiles?.[0]?.fileHash).toBeDefined();

      expect(dbContract?.terminationHistory).toHaveLength(1);
      const historyEntry = dbContract?.terminationHistory?.[0];
      expect(historyEntry?.terminationType).toBe(
        ContractTerminationTypeEnum.MUTUAL
      );
      expect(historyEntry?.storageUnitStatus).toBe(
        StorageUnitStatusEnum.PENDING_CLEARANCE
      );
      expect(historyEntry?.depositStatus).toBe(
        ContractDepositStatusEnum.FORFEITED
      );
      expect(historyEntry?.forfeitedAmount).toBe(1500000);
      expect(historyEntry?.terminatedBy.toString()).toBe(String(managerId));
    });

    it('Case 2: terminates contract with VIOLATION (PROHIBITED_GOODS)', async () => {
      const contract = await createTestContract(ContractStatusEnum.ACTIVE);

      const res = await contractService.terminateContract(
        String(contract._id),
        String(managerId),
        RoleEnum.FACILITY_MANAGER,
        {
          terminationType: ContractTerminationTypeEnum.VIOLATION,
          violationCategory: ViolationCategoryEnum.PROHIBITED_GOODS,
          reason: 'Phat hien hang hoa de chay no trai quy dinh',
          reportFileUrls: ['https://example.com/reports/incident_banned.pdf'],
          evidenceFileUrls: ['https://example.com/photos/prohibited_items.jpg'],
        }
      );

      expect(res.status).toBe(ContractStatusEnum.TERMINATED);
      expect(res.terminationType).toBe(ContractTerminationTypeEnum.VIOLATION);
      expect(res.violationCategory).toBe(
        ViolationCategoryEnum.PROHIBITED_GOODS
      );
    });

    it('Case 3: terminates contract with VIOLATION (OVERDUE_PAYMENT) when overdue exceeds grace days (>= 5 days)', async () => {
      // Contract expired 7 days ago (exceeds 5 days threshold)
      const contract = await createTestContract(ContractStatusEnum.OVERDUE, -7);

      const res = await contractService.terminateContract(
        String(contract._id),
        String(managerId),
        RoleEnum.FACILITY_MANAGER,
        {
          terminationType: ContractTerminationTypeEnum.VIOLATION,
          violationCategory: ViolationCategoryEnum.OVERDUE_PAYMENT,
          reason: 'No cuoc thue qua 5 ngay khong lien lac duoc',
          reportFileUrls: ['https://example.com/reports/debt_overdue.pdf'],
          evidenceFileUrls: ['https://example.com/photos/notice_posted.jpg'],
        }
      );

      expect(res.status).toBe(ContractStatusEnum.TERMINATED);
      expect(res.violationCategory).toBe(ViolationCategoryEnum.OVERDUE_PAYMENT);
    });
  });

  describe('Part 2: Anti-Abuse & Validation Guards', () => {
    it('Case 4: blocks OVERDUE_PAYMENT when contract is still ACTIVE', async () => {
      const contract = await createTestContract(ContractStatusEnum.ACTIVE);

      await expect(
        contractService.terminateContract(
          String(contract._id),
          String(managerId),
          RoleEnum.FACILITY_MANAGER,
          {
            terminationType: ContractTerminationTypeEnum.VIOLATION,
            violationCategory: ViolationCategoryEnum.OVERDUE_PAYMENT,
            reason: 'Chua den han nhung bao no tien',
            reportFileUrls: ['https://example.com/reports/premature.pdf'],
            evidenceFileUrls: ['https://example.com/photos/premature.jpg'],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_428,
      });
    });

    it('Case 5: blocks OVERDUE_PAYMENT when contract is OVERDUE for less than 5 days', async () => {
      // Expired only 2 days ago (< 5 days)
      const contract = await createTestContract(ContractStatusEnum.OVERDUE, -2);

      await expect(
        contractService.terminateContract(
          String(contract._id),
          String(managerId),
          RoleEnum.FACILITY_MANAGER,
          {
            terminationType: ContractTerminationTypeEnum.VIOLATION,
            violationCategory: ViolationCategoryEnum.OVERDUE_PAYMENT,
            reason: 'Moi tre 2 ngay da doi cham dut',
            reportFileUrls: ['https://example.com/reports/too_soon.pdf'],
            evidenceFileUrls: ['https://example.com/photos/too_soon.jpg'],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_428,
      });
    });

    it('Case 6: blocks VIOLATION termination when violationCategory is missing', async () => {
      const contract = await createTestContract(ContractStatusEnum.ACTIVE);

      await expect(
        contractService.terminateContract(
          String(contract._id),
          String(managerId),
          RoleEnum.FACILITY_MANAGER,
          {
            terminationType: ContractTerminationTypeEnum.VIOLATION,
            reason: 'Vi pham nhung khong noi loai nao',
            reportFileUrls: ['https://example.com/reports/no_cat.pdf'],
            evidenceFileUrls: ['https://example.com/photos/no_cat.jpg'],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_427,
      });
    });

    it('Case 7: blocks termination when reportFileUrls or evidenceFileUrls are missing or empty', async () => {
      const contract = await createTestContract(ContractStatusEnum.ACTIVE);

      await expect(
        contractService.terminateContract(
          String(contract._id),
          String(managerId),
          RoleEnum.FACILITY_MANAGER,
          {
            terminationType: ContractTerminationTypeEnum.MUTUAL,
            reason: 'Thieu bien ban',
            reportFileUrls: [],
            evidenceFileUrls: ['https://example.com/photos/ok.jpg'],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_426,
      });

      await expect(
        contractService.terminateContract(
          String(contract._id),
          String(managerId),
          RoleEnum.FACILITY_MANAGER,
          {
            terminationType: ContractTerminationTypeEnum.MUTUAL,
            reason: 'Thieu anh bang chung',
            reportFileUrls: ['https://example.com/reports/ok.pdf'],
            evidenceFileUrls: [],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_426,
      });
    });

    it('Case 8: blocks termination by unauthorized role (CUSTOMER or FACILITY_STAFF) or cross-facility', async () => {
      const contract = await createTestContract(ContractStatusEnum.ACTIVE);

      await expect(
        contractService.terminateContract(
          String(contract._id),
          String(customerId),
          RoleEnum.CUSTOMER,
          {
            terminationType: ContractTerminationTypeEnum.CUSTOMER_REQUEST,
            reason: 'Khach muon tu terminate',
            reportFileUrls: ['https://example.com/report.pdf'],
            evidenceFileUrls: ['https://example.com/photo.jpg'],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
      });

      await expect(
        contractService.terminateContract(
          String(contract._id),
          String(staffId),
          RoleEnum.FACILITY_STAFF,
          {
            terminationType: ContractTerminationTypeEnum.MUTUAL,
            reason: 'Nhan vien khong duoc terminate',
            reportFileUrls: ['https://example.com/report.pdf'],
            evidenceFileUrls: ['https://example.com/photo.jpg'],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
      });

      // Cross facility contract
      const contractB = await createTestContract(
        ContractStatusEnum.ACTIVE,
        15,
        facilityBId
      );
      await expect(
        contractService.terminateContract(
          String(contractB._id),
          String(managerId), // Manager of Facility A
          RoleEnum.FACILITY_MANAGER,
          {
            terminationType: ContractTerminationTypeEnum.MUTUAL,
            reason: 'Cheo co so',
            reportFileUrls: ['https://example.com/report.pdf'],
            evidenceFileUrls: ['https://example.com/photo.jpg'],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('Part 3: Storage Unit PENDING_CLEARANCE Lifecycle & Clearance Guard', () => {
    it('Case 9: blocks transitioning PENDING_CLEARANCE unit to UNDER_MAINTENANCE while goods remain inside, and allows transition once goods are cleared', async () => {
      const contract = await createTestContract(ContractStatusEnum.ACTIVE);

      // Seed customer inventory in the unit
      await CustomerInventory.create({
        customerId,
        contractId: contract._id,
        facilityId,
        storageUnitId,
        skuId,
        quantity: 8,
        lastMovementAt: new Date(),
      });

      // Terminate contract -> moves unit to PENDING_CLEARANCE
      await contractService.terminateContract(
        String(contract._id),
        String(managerId),
        RoleEnum.FACILITY_MANAGER,
        {
          terminationType: ContractTerminationTypeEnum.MUTUAL,
          reason: 'Do con trong kho can thanh ly',
          reportFileUrls: ['https://example.com/report.pdf'],
          evidenceFileUrls: ['https://example.com/photo.jpg'],
        }
      );

      const unitAfterTerm = await StorageUnit.findById(storageUnitId);
      expect(unitAfterTerm?.status).toBe(
        StorageUnitStatusEnum.PENDING_CLEARANCE
      );

      // Attempting to directly turn off maintenance to AVAILABLE from PENDING_CLEARANCE -> 400
      await expect(
        storageUnitService.toggleMaintenance(String(storageUnitId), {
          isUnderMaintenance: false,
        })
      ).rejects.toThrow(AppError);

      // Attempting to move from PENDING_CLEARANCE to UNDER_MAINTENANCE while goods remain (quantity 8 > 0) -> 400 MESSAGE_CODE_629
      await expect(
        storageUnitService.toggleMaintenance(String(storageUnitId), {
          isUnderMaintenance: true,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_629,
      });

      // Clear customer inventory (simulate clearance / removal / disposal)
      await CustomerInventory.deleteMany({ storageUnitId });

      // Moving to UNDER_MAINTENANCE now succeeds
      const unitInMaintenance = await storageUnitService.toggleMaintenance(
        String(storageUnitId),
        {
          isUnderMaintenance: true,
          notes: 'Kho da don xong do khach bo lai, bat dau ve sinh',
        }
      );
      expect(unitInMaintenance.status).toBe(
        StorageUnitStatusEnum.UNDER_MAINTENANCE
      );

      // Moving from UNDER_MAINTENANCE to AVAILABLE now succeeds
      const unitAvailable = await storageUnitService.toggleMaintenance(
        String(storageUnitId),
        {
          isUnderMaintenance: false,
        }
      );
      expect(unitAvailable.status).toBe(StorageUnitStatusEnum.AVAILABLE);
    });
  });
});
