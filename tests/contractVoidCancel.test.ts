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
import {
  Reservation,
  type IReservation,
} from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { Amenity } from '../src/modules/amenity/amenity.model.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
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
  ContractCancellationTypeEnum,
} from '../src/common/enums/contract.enum.ts';
import {
  ReservationStatusEnum,
  RefundStatusEnum,
  ReservationCancelSourceEnum,
} from '../src/common/enums/reservation.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  AmenityTypeEnum,
  AmenityStatusEnum,
} from '../src/common/enums/amenity.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { RefundReasonEnum } from '../src/common/enums/refundRequest.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { AppError } from '../src/common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';

describe('T2.3: Separate VOID and CANCEL for DRAFT Contracts', () => {
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
  const unitTypeId = new Types.ObjectId('65b000000000000000000001');
  const offeringId = new Types.ObjectId('65d000000000000000000001');
  const amenityId = new Types.ObjectId('65e000000000000000000001');
  const amenityOfferingId = new Types.ObjectId('65f000000000000000000001');

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

    await Facility.create({
      _id: facilityId,
      name: 'Facility Alpha',
      address: '123 Test Street',
      city: 'Hanoi',
      phone: '0901234567',
      email: 'alpha@test.com',
      operatingHours: { open: '08:00', close: '20:00' },
      managerId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
      status: 'active',
    });

    await UnitType.create({
      _id: unitTypeId,
      name: 'Small Locker',
      category: UnitTypeCategoryEnum.LOCKER,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { length: 1, width: 1, height: 1 },
      area: 1,
      volume: 1,
    });

    await StorageUnit.create({
      _id: storageUnitId,
      facilityId,
      unitTypeId,
      unitNumber: 'U-101',
      status: StorageUnitStatusEnum.RESERVED,
    });

    await FacilityUnitTypeOffering.create({
      _id: offeringId,
      facilityId,
      unitTypeId,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 1_000_000,
      depositMultiplier: 1,
      minRentalDays: 1,
      status: 'active',
    });

    await Amenity.create({
      _id: amenityId,
      name: 'Pallet Jack',
      type: AmenityTypeEnum.EQUIPMENT,
      status: AmenityStatusEnum.ACTIVE,
    });

    await FacilityAmenityOffering.create({
      _id: amenityOfferingId,
      facilityId,
      amenityId,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 50_000,
      totalQuantity: 10,
      inUseQuantity: 2,
      status: 'active',
    });
  });

  async function createReservationFixture(
    overrides: Partial<IReservation> = {}
  ) {
    return Reservation.create({
      reservationCode: `RES-${Date.now()}`,
      customerId,
      facilityId,
      storageUnitId,
      facilityUnitTypeOfferingId: offeringId,
      checkInDate: new Date(),
      checkInTimeSlot: '09:00 - 11:00',
      rentalDuration: 30,
      startDate: new Date(),
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1_000_000,
      totalAmount: 1_000_000,
      depositAmount: 1_000_000,
      paidAmount: 1_000_000,
      paidAt: new Date(),
      arrivedAt: new Date(),
      status: ReservationStatusEnum.CONFIRMED,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      policySnapshot: {
        freeCancelHours: 24,
        forfeitPercent: 100,
        noShowGraceHours: 24,
        cancellationMode: 'slot_start',
      },
      amenities: [
        {
          facilityAmenityOfferingId: amenityOfferingId,
          amenityId,
          name: 'Pallet Jack',
          quantity: 2,
          pricePerUnit: 50_000,
          billingUnit: BillingUnitEnum.MONTH,
          totalPrice: 100_000,
        },
      ],
      ...overrides,
    });
  }

  async function createDraftContractFromReservation(
    reservationDoc: IReservation
  ) {
    return Contract.create({
      contractCode: `CTR-DRAFT-${Date.now()}`,
      source: ContractSourceEnum.RESERVATION,
      reservationId: reservationDoc._id,
      customerId,
      facilityId,
      storageUnitId,
      facilityUnitTypeOfferingId: offeringId,
      startDate: reservationDoc.startDate,
      endDate: new Date(
        reservationDoc.startDate.getTime() + 30 * 24 * 3600 * 1000
      ),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1_000_000,
      depositAmount: 1_000_000,
      depositPaidAt: reservationDoc.paidAt,
      depositPaymentId: new Types.ObjectId(),
      totalPeriodicPrice: 1_100_000,
      amenities: [
        {
          facilityAmenityOfferingId: amenityOfferingId,
          amenityId,
          name: 'Pallet Jack',
          quantity: 2,
          pricePerUnit: 50_000,
          billingUnit: BillingUnitEnum.MONTH,
          totalPrice: 100_000,
          addedAt: new Date(),
        },
      ],
      status: ContractStatusEnum.DRAFT,
      depositStatus: ContractDepositStatusEnum.HELD,
    });
  }

  describe('Part 1: VOID Contract Flow', () => {
    it('should allow Staff/Manager to VOID a DRAFT contract without forfeiting deposit or releasing reservation hold', async () => {
      const reservation = await createReservationFixture();
      const contract = await createDraftContractFromReservation(reservation);

      const res = await contractService.cancelContract(
        String(contract._id),
        TEST_USERS.staffFacilityA.id,
        RoleEnum.FACILITY_STAFF,
        {
          cancellationType: ContractCancellationTypeEnum.VOID,
          cancellationReason: 'Nhan vien nhap sai thong tin phu luc/tien ich',
        }
      );

      expect(res.status).toBe(ContractStatusEnum.CANCELLED);
      expect(res.cancellationType).toBe(ContractCancellationTypeEnum.VOID);
      expect(res.forfeitedAmount).toBe(0);
      expect(res.refundAmount).toBe(0);

      // Verify linked reservation remains CONFIRMED
      const updatedRes = await Reservation.findById(reservation._id);
      expect(updatedRes?.status).toBe(ReservationStatusEnum.CONFIRMED);
      expect(updatedRes?.forfeitedAmount).toBeFalsy();
      expect(updatedRes?.refundStatus).toBe(RefundStatusEnum.NONE);

      // Verify storageUnit remains RESERVED for this customer reservation
      const unit = await StorageUnit.findById(storageUnitId);
      expect(unit?.status).toBe(StorageUnitStatusEnum.RESERVED);

      // Verify amenity offering inUseQuantity is NOT released
      const amenityOff =
        await FacilityAmenityOffering.findById(amenityOfferingId);
      expect(amenityOff?.inUseQuantity).toBe(2);

      // Verify staff can recreate a new contract for the same reservation now
      const newContract = await contractService.createContract(
        {
          source: ContractSourceEnum.RESERVATION,
          reservationId: String(reservation._id),
        },
        TEST_USERS.staffFacilityA.id,
        RoleEnum.FACILITY_STAFF
      );
      expect(newContract.status).toBe(ContractStatusEnum.DRAFT);
      expect(newContract.id).not.toBe(res.id);
    });

    it('should preserve OVERDUE status when VOID is executed on an OVERDUE reservation contract', async () => {
      const reservation = await createReservationFixture({
        status: ReservationStatusEnum.OVERDUE,
        graceExpiresAt: new Date(Date.now() + 12 * 3600 * 1000),
      });
      const contract = await createDraftContractFromReservation(reservation);

      const res = await contractService.cancelContract(
        String(contract._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          cancellationType: ContractCancellationTypeEnum.VOID,
          cancellationReason:
            'Khach den tre hen, staff tao nham thoi han hop dong',
        }
      );

      expect(res.status).toBe(ContractStatusEnum.CANCELLED);
      expect(res.cancellationType).toBe(ContractCancellationTypeEnum.VOID);

      const updatedRes = await Reservation.findById(reservation._id);
      expect(updatedRes?.status).toBe(ReservationStatusEnum.OVERDUE);
    });

    it('should reject VOID if customer attempts to execute it (CUSTOMER role forbidden)', async () => {
      const reservation = await createReservationFixture();
      const contract = await createDraftContractFromReservation(reservation);

      await expect(
        contractService.cancelContract(
          String(contract._id),
          TEST_USERS.customer1.id,
          RoleEnum.CUSTOMER,
          {
            cancellationType: ContractCancellationTypeEnum.VOID,
            cancellationReason: 'Khach muon tu huy hop dong nhap',
          }
        )
      ).rejects.toThrow(new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103));
    });

    it('should reject VOID with 400 MESSAGE_CODE_422 if linked reservation has already been cancelled or closed', async () => {
      const reservation = await createReservationFixture({
        status: ReservationStatusEnum.CANCELLED,
      });
      const contract = await createDraftContractFromReservation(reservation);

      await expect(
        contractService.cancelContract(
          String(contract._id),
          TEST_USERS.staffFacilityA.id,
          RoleEnum.FACILITY_STAFF,
          {
            cancellationType: ContractCancellationTypeEnum.VOID,
            cancellationReason:
              'Staff muon void hop dong sau khi reservation bi huy',
          }
        )
      ).rejects.toThrow(new AppError(400, MESSAGE_CODE.MESSAGE_CODE_422));
    });

    it('should process VOID for WALK_IN contract with full refund request if deposit was paid', async () => {
      const draftWalkIn = await Contract.create({
        contractCode: `CTR-WALKIN-${Date.now()}`,
        source: ContractSourceEnum.WALK_IN,
        customerId,
        facilityId,
        storageUnitId,
        facilityUnitTypeOfferingId: offeringId,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-12-01'),
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1_000_000,
        depositAmount: 1_000_000,
        depositPaidAt: new Date(),
        depositPaymentId: new Types.ObjectId(),
        totalPeriodicPrice: 1_000_000,
        status: ContractStatusEnum.DRAFT,
        depositStatus: ContractDepositStatusEnum.HELD,
      });

      const res = await contractService.cancelContract(
        String(draftWalkIn._id),
        TEST_USERS.staffFacilityA.id,
        RoleEnum.FACILITY_STAFF,
        {
          cancellationType: ContractCancellationTypeEnum.VOID,
          cancellationReason: 'Staff nhap nham gia thue walk in',
        }
      );

      expect(res.status).toBe(ContractStatusEnum.CANCELLED);
      expect(res.cancellationType).toBe(ContractCancellationTypeEnum.VOID);
      expect(res.depositStatus).toBe(ContractDepositStatusEnum.REFUNDED);
      expect(res.refundAmount).toBe(1_000_000);

      // StorageUnit released to AVAILABLE
      const unit = await StorageUnit.findById(storageUnitId);
      expect(unit?.status).toBe(StorageUnitStatusEnum.AVAILABLE);

      // RefundRequest created for full deposit
      const refund = await RefundRequest.findOne({
        contractId: draftWalkIn._id,
      });
      expect(refund).toBeTruthy();
      expect(refund?.amount).toBe(1_000_000);
      expect(refund?.reason).toBe(RefundReasonEnum.FACILITY_CANCEL);
    });
  });

  describe('Part 2: CANCEL Contract Flow', () => {
    it('should forfeit 100% deposit according to reservation policy when customer cancels past deadline', async () => {
      // checkInDate was yesterday, so now is past free cancel deadline
      const reservation = await createReservationFixture({
        checkInDate: new Date(Date.now() - 3600 * 1000),
      });
      const contract = await createDraftContractFromReservation(reservation);

      const res = await contractService.cancelContract(
        String(contract._id),
        TEST_USERS.customer1.id,
        RoleEnum.CUSTOMER,
        {
          cancellationType: ContractCancellationTypeEnum.CANCEL,
          cancellationReason: 'Khach doi y khong thue kho nua',
        }
      );

      expect(res.status).toBe(ContractStatusEnum.CANCELLED);
      expect(res.cancellationType).toBe(ContractCancellationTypeEnum.CANCEL);
      expect(res.forfeitedAmount).toBe(1_000_000);
      expect(res.refundAmount).toBe(0);
      expect(res.depositStatus).toBe(ContractDepositStatusEnum.FORFEITED);

      // Reservation is cancelled with forfeiture and source CUSTOMER
      const updatedRes = await Reservation.findById(reservation._id);
      expect(updatedRes?.status).toBe(ReservationStatusEnum.CANCELLED);
      expect(updatedRes?.forfeitedAmount).toBe(1_000_000);
      expect(updatedRes?.refundAmount).toBe(0);
      expect(updatedRes?.cancellationSource).toBe(
        ReservationCancelSourceEnum.CUSTOMER
      );

      // StorageUnit released to AVAILABLE
      const unit = await StorageUnit.findById(storageUnitId);
      expect(unit?.status).toBe(StorageUnitStatusEnum.AVAILABLE);

      // Amenity released
      const amenityOff =
        await FacilityAmenityOffering.findById(amenityOfferingId);
      expect(amenityOff?.inUseQuantity).toBe(0);
    });

    it('should refund 100% deposit and create RefundRequest if cancelled within free cancellation window', async () => {
      // checkInDate is 5 days in the future -> free cancel
      const reservation = await createReservationFixture({
        checkInDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      });
      const contract = await createDraftContractFromReservation(reservation);

      const res = await contractService.cancelContract(
        String(contract._id),
        TEST_USERS.customer1.id,
        RoleEnum.CUSTOMER,
        {
          cancellationType: ContractCancellationTypeEnum.CANCEL,
          cancellationReason: 'Khach huy truoc han nhan kho',
          refundBankName: 'Vietcombank',
          refundAccountNumber: '0123456789',
          refundAccountHolder: 'NGUYEN VAN A',
        }
      );

      expect(res.status).toBe(ContractStatusEnum.CANCELLED);
      expect(res.cancellationType).toBe(ContractCancellationTypeEnum.CANCEL);
      expect(res.refundAmount).toBe(1_000_000);
      expect(res.forfeitedAmount).toBe(0);
      expect(res.depositStatus).toBe(ContractDepositStatusEnum.REFUNDED);

      const updatedRes = await Reservation.findById(reservation._id);
      expect(updatedRes?.status).toBe(ReservationStatusEnum.CANCELLED);
      expect(updatedRes?.refundAmount).toBe(1_000_000);
      expect(updatedRes?.refundStatus).toBe(RefundStatusEnum.PENDING);

      // RefundRequest is created linked to reservationId
      const refund = await RefundRequest.findOne({
        reservationId: reservation._id,
      });
      expect(refund).toBeTruthy();
      expect(refund?.amount).toBe(1_000_000);
      expect(refund?.reason).toBe(RefundReasonEnum.CUSTOMER_CANCEL);
    });

    it('should forfeit 100% deposit on WALK_IN cancellation when deposit was already paid', async () => {
      const draftWalkIn = await Contract.create({
        contractCode: `CTR-WALKIN-${Date.now()}`,
        source: ContractSourceEnum.WALK_IN,
        customerId,
        facilityId,
        storageUnitId,
        facilityUnitTypeOfferingId: offeringId,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-12-01'),
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1_000_000,
        depositAmount: 1_000_000,
        depositPaidAt: new Date(),
        depositPaymentId: new Types.ObjectId(),
        totalPeriodicPrice: 1_000_000,
        status: ContractStatusEnum.DRAFT,
        depositStatus: ContractDepositStatusEnum.HELD,
      });

      const res = await contractService.cancelContract(
        String(draftWalkIn._id),
        TEST_USERS.customer1.id,
        RoleEnum.CUSTOMER,
        {
          cancellationType: ContractCancellationTypeEnum.CANCEL,
          cancellationReason:
            'Khach walk-in doi y huy hop dong sau khi da nop coc',
        }
      );

      expect(res.status).toBe(ContractStatusEnum.CANCELLED);
      expect(res.cancellationType).toBe(ContractCancellationTypeEnum.CANCEL);
      expect(res.forfeitedAmount).toBe(1_000_000);
      expect(res.refundAmount).toBe(0);
      expect(res.depositStatus).toBe(ContractDepositStatusEnum.FORFEITED);

      // Unit is released
      const unit = await StorageUnit.findById(storageUnitId);
      expect(unit?.status).toBe(StorageUnitStatusEnum.AVAILABLE);
    });

    it('should default to cancellationType CANCEL when not explicitly provided (backward compatibility)', async () => {
      const reservation = await createReservationFixture({
        checkInDate: new Date(Date.now() - 3600 * 1000),
      });
      const contract = await createDraftContractFromReservation(reservation);

      const res = await contractService.cancelContract(
        String(contract._id),
        TEST_USERS.staffFacilityA.id,
        RoleEnum.FACILITY_STAFF,
        {
          cancellationReason:
            'Staff huy giup khach hang cu khong truyen cancellationType',
        }
      );

      expect(res.status).toBe(ContractStatusEnum.CANCELLED);
      expect(res.cancellationType).toBe(ContractCancellationTypeEnum.CANCEL);
      expect(res.forfeitedAmount).toBe(1_000_000);
    });
  });

  describe('Part 3: Authorization & Boundary Checks', () => {
    it('should reject when staff from a different facility tries to cancel/void contract', async () => {
      const reservation = await createReservationFixture();
      const contract = await createDraftContractFromReservation(reservation);

      await expect(
        contractService.cancelContract(
          String(contract._id),
          TEST_USERS.staffFacilityB.id,
          RoleEnum.FACILITY_STAFF,
          {
            cancellationType: ContractCancellationTypeEnum.VOID,
            cancellationReason: 'Staff trai co so',
          }
        )
      ).rejects.toThrow(
        new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility'])
      );
    });

    it('should reject when customer attempts to cancel another customer contract', async () => {
      const reservation = await createReservationFixture();
      const contract = await createDraftContractFromReservation(reservation);

      await expect(
        contractService.cancelContract(
          String(contract._id),
          TEST_USERS.customer2.id,
          RoleEnum.CUSTOMER,
          {
            cancellationType: ContractCancellationTypeEnum.CANCEL,
            cancellationReason: 'Khach khac huy trom',
          }
        )
      ).rejects.toThrow(new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103));
    });

    it('should reject cancelling a contract that is not in DRAFT status', async () => {
      const reservation = await createReservationFixture();
      const contract = await createDraftContractFromReservation(reservation);
      await Contract.updateOne(
        { _id: contract._id },
        { status: ContractStatusEnum.ACTIVE }
      );

      await expect(
        contractService.cancelContract(
          String(contract._id),
          TEST_USERS.staffFacilityA.id,
          RoleEnum.FACILITY_STAFF,
          {
            cancellationType: ContractCancellationTypeEnum.CANCEL,
            cancellationReason: 'Huy hop dong da active',
          }
        )
      ).rejects.toThrow(new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401));
    });
  });
});
