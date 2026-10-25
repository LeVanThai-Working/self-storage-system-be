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
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
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
import { RefundReasonEnum } from '../src/common/enums/refundRequest.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { AppError } from '../src/common/errors/appError.error.ts';

describe('T1.5: Contract Deposit Lifecycle & Settlement Integration', () => {
  let contractRepo: ContractRepository;
  let contractService: ContractService;
  let refundRequestRepo: RefundRequestRepository;
  let refundRequestService: RefundRequestService;
  let reservationRepo: ReservationRepository;
  let storageUnitRepo: StorageUnitRepository;
  let amenityOfferingRepo: FacilityAmenityOfferingRepository;
  let unitTypeOfferingRepo: FacilityUnitTypeOfferingRepository;
  let facilityRepo: FacilityRepository;
  let userRepo: UserRepository;

  const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);
  const storageUnitId = new Types.ObjectId('65c000000000000000000001');
  const offeringId = new Types.ObjectId('65d000000000000000000001');

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

    refundRequestRepo = new RefundRequestRepository(RefundRequest);
    refundRequestService = new RefundRequestService(
      refundRequestRepo,
      userRepo,
      reservationRepo,
      contractRepo
    );

    contractService = new ContractService(
      contractRepo,
      reservationRepo,
      storageUnitRepo,
      amenityOfferingRepo,
      unitTypeOfferingRepo,
      facilityRepo,
      userRepo,
      undefined, // auditLogService
      refundRequestService
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    // Create facility & storage unit
    await Facility.create({
      _id: facilityId,
      name: 'Facility Alpha',
      address: '123 Test Street',
      city: 'Ho Chi Minh',
      status: 'active',
    });

    const unitTypeId = new Types.ObjectId();
    await StorageUnit.create({
      _id: storageUnitId,
      facilityId,
      unitTypeId,
      unitNumber: 'A101',
      floor: 1,
      status: StorageUnitStatusEnum.RENTED,
    });
  });

  async function createActiveContract(
    customData: Record<string, unknown> = {}
  ) {
    return Contract.create({
      contractCode: `CTR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      source: ContractSourceEnum.WALK_IN,
      customerId,
      facilityId,
      storageUnitId,
      facilityUnitTypeOfferingId: offeringId,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-02-01'),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1_000_000,
      depositAmount: 1_000_000,
      depositPaidAt: new Date('2026-01-01'),
      totalPeriodicPrice: 1_000_000,
      status: ContractStatusEnum.ACTIVE,
      depositStatus: ContractDepositStatusEnum.HELD,
      termsAccepted: true,
      customerSigned: true,
      staffSigned: true,
      ...customData,
    });
  }

  it('Case 1: Check-out without damage or overdue -> REFUNDED and creates RefundRequest for full deposit', async () => {
    const contract = await createActiveContract();

    const res = await contractService.checkOutContract(
      String(contract._id),
      TEST_USERS.staffFacilityA.id,
      RoleEnum.FACILITY_STAFF,
      {
        damageFee: 0,
        inspectionNotes: 'Kho tra nguyen ven, sach dep',
        actualCheckOutDate: new Date('2026-02-01').toISOString(),
      }
    );

    expect(res.status).toBe(ContractStatusEnum.COMPLETED);
    expect(res.damageFee).toBe(0);
    expect(res.refundAmount).toBe(1_000_000);
    expect(res.additionalPaymentRequired).toBe(0);
    expect(res.depositStatus).toBe(ContractDepositStatusEnum.REFUNDED);

    // Verify RefundRequest created in DB
    const refunds = await RefundRequest.find({ contractId: contract._id });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBe(1_000_000);
    expect(refunds[0].reason).toBe(RefundReasonEnum.DEPOSIT_SETTLEMENT);
    expect(String(refunds[0].facilityId)).toBe(TEST_FACILITY_A_ID);
    expect(String(refunds[0].customerId)).toBe(TEST_USERS.customer1.id);
  });

  it('Case 2: Check-out with partial damage deductions -> PARTIALLY_REFUNDED and creates RefundRequest for remaining amount', async () => {
    const contract = await createActiveContract();

    const res = await contractService.checkOutContract(
      String(contract._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        damageFee: 300_000,
        inspectionNotes: 'Tray xuoc nhe o vach tuong',
        inspectionPhotos: ['https://cloudinary.com/test-damage.jpg'],
        actualCheckOutDate: new Date('2026-02-01').toISOString(),
      }
    );

    expect(res.status).toBe(ContractStatusEnum.COMPLETED);
    expect(res.damageFee).toBe(300_000);
    expect(res.refundAmount).toBe(700_000);
    expect(res.additionalPaymentRequired).toBe(0);
    expect(res.depositStatus).toBe(
      ContractDepositStatusEnum.PARTIALLY_REFUNDED
    );
    expect(res.inspectionPhotos).toContain(
      'https://cloudinary.com/test-damage.jpg'
    );

    const refunds = await RefundRequest.find({ contractId: contract._id });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBe(700_000);
    expect(refunds[0].reason).toBe(RefundReasonEnum.DEPOSIT_SETTLEMENT);
  });

  it('Case 3: Check-out with damage exceeding deposit -> APPLIED and additionalPaymentRequired > 0 with NO refund request', async () => {
    const contract = await createActiveContract();

    const res = await contractService.checkOutContract(
      String(contract._id),
      TEST_USERS.staffFacilityA.id,
      RoleEnum.FACILITY_STAFF,
      {
        damageFee: 1_500_000,
        inspectionNotes: 'Hong toan bo cua cuon va o khoa',
        actualCheckOutDate: new Date('2026-02-01').toISOString(),
      }
    );

    expect(res.status).toBe(ContractStatusEnum.COMPLETED);
    expect(res.damageFee).toBe(1_500_000);
    expect(res.refundAmount).toBe(0);
    expect(res.additionalPaymentRequired).toBe(500_000);
    expect(res.depositStatus).toBe(ContractDepositStatusEnum.APPLIED);

    // No refund request created because refundAmount is 0
    const refunds = await RefundRequest.find({ contractId: contract._id });
    expect(refunds).toHaveLength(0);
  });

  it('Case 4: Terminate contract early due to violation -> FORFEITED with 0 refund', async () => {
    const contract = await createActiveContract();

    const res = await contractService.terminateContract(
      String(contract._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        terminationReason: 'Vi pham quy dinh chua chat cam trong kho',
      }
    );

    expect(res.status).toBe(ContractStatusEnum.TERMINATED);
    expect(res.depositStatus).toBe(ContractDepositStatusEnum.FORFEITED);

    const refunds = await RefundRequest.find({ contractId: contract._id });
    expect(refunds).toHaveLength(0);
  });

  it('Case 5: Cancel DRAFT contract with deposit -> FORFEITED', async () => {
    const draftContract = await Contract.create({
      contractCode: `CTR-DRAFT-${Date.now()}`,
      source: ContractSourceEnum.WALK_IN,
      customerId,
      facilityId,
      storageUnitId,
      facilityUnitTypeOfferingId: offeringId,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-02-01'),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1_000_000,
      depositAmount: 1_000_000,
      depositPaidAt: new Date('2026-01-01'),
      depositPaymentId: new Types.ObjectId(),
      totalPeriodicPrice: 1_000_000,
      status: ContractStatusEnum.DRAFT,
      depositStatus: ContractDepositStatusEnum.HELD,
    });

    const res = await contractService.cancelContract(
      String(draftContract._id),
      TEST_USERS.customer1.id,
      RoleEnum.CUSTOMER,
      {
        cancellationReason: 'Khach doi y khong thue nua',
      }
    );

    expect(res.status).toBe(ContractStatusEnum.CANCELLED);
    expect(res.depositStatus).toBe(ContractDepositStatusEnum.FORFEITED);
  });

  it('Case 6: Customer confirms settlement -> settlementConfirmedAt is recorded', async () => {
    const contract = await createActiveContract();
    await contractService.checkOutContract(
      String(contract._id),
      TEST_USERS.staffFacilityA.id,
      RoleEnum.FACILITY_STAFF,
      {
        damageFee: 200_000,
        actualCheckOutDate: new Date('2026-02-01').toISOString(),
      }
    );

    const res = await contractService.confirmSettlement(
      String(contract._id),
      TEST_USERS.customer1.id,
      RoleEnum.CUSTOMER
    );

    expect(res.settlementConfirmedAt).toBeTruthy();
  });

  it('Case 7: Customer disputes settlement -> depositStatus becomes DISPUTED', async () => {
    const contract = await createActiveContract();
    await contractService.checkOutContract(
      String(contract._id),
      TEST_USERS.staffFacilityA.id,
      RoleEnum.FACILITY_STAFF,
      {
        damageFee: 500_000,
        actualCheckOutDate: new Date('2026-02-01').toISOString(),
      }
    );

    const res = await contractService.disputeSettlement(
      String(contract._id),
      TEST_USERS.customer1.id,
      RoleEnum.CUSTOMER,
      {
        disputeReason: 'Toi khong lam hong khoa, o khoa da cu tu truoc',
      }
    );

    expect(res.depositStatus).toBe(ContractDepositStatusEnum.DISPUTED);
    expect(res.disputeReason).toBe(
      'Toi khong lam hong khoa, o khoa da cu tu truoc'
    );
    expect(res.disputedAt).toBeTruthy();
  });

  it('Case 8: Security checks: unauthorized customer or foreign facility staff rejected (403)', async () => {
    const contract = await createActiveContract();

    // Staff from facility B cannot checkout contract at facility A
    await expect(
      contractService.checkOutContract(
        String(contract._id),
        TEST_USERS.staffFacilityB.id,
        RoleEnum.FACILITY_STAFF,
        {
          damageFee: 0,
        }
      )
    ).rejects.toThrow(AppError);

    // Customer 2 cannot dispute Customer 1's contract
    await expect(
      contractService.disputeSettlement(
        String(contract._id),
        TEST_USERS.customer2.id,
        RoleEnum.CUSTOMER,
        {
          disputeReason: 'Khieu nai gia mao',
        }
      )
    ).rejects.toThrow(AppError);
  });
});
