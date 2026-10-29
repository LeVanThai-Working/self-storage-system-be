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
import {
  Reservation,
  type IReservation,
} from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
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
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import { Incident } from '../src/modules/incident/incident.model.ts';
import { IncidentRepository } from '../src/modules/incident/incident.repository.ts';
import '../src/modules/storageRack/storageRack.model.ts';
import '../src/modules/storageRack/rackTier.model.ts';
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
import {
  IncidentCategoryEnum,
  IncidentSeverityEnum,
  IncidentStatusEnum,
} from '../src/common/enums/incident.enum.ts';
import { RefundReasonEnum } from '../src/common/enums/refundRequest.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { AppError } from '../src/common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';

describe('T2.4: Force Cancel Reservation (Facility Fault / Undeliverable Unit)', () => {
  let reservationRepo: ReservationRepository;
  let reservationService: ReservationService;
  let contractRepo: ContractRepository;
  let storageUnitRepo: StorageUnitRepository;
  let amenityOfferingRepo: FacilityAmenityOfferingRepository;
  let unitTypeOfferingRepo: FacilityUnitTypeOfferingRepository;
  let facilityRepo: FacilityRepository;
  let userRepo: UserRepository;
  let refundRequestRepo: RefundRequestRepository;
  let refundRequestService: RefundRequestService;
  let incidentRepo: IncidentRepository;

  const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const otherFacilityId = new Types.ObjectId(TEST_FACILITY_B_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);
  const storageUnitId = new Types.ObjectId('65c000000000000000000001');
  const unitTypeId = new Types.ObjectId('65b000000000000000000001');
  const offeringId = new Types.ObjectId('65d000000000000000000001');
  const amenityId = new Types.ObjectId('65e000000000000000000001');
  const amenityOfferingId = new Types.ObjectId('65f000000000000000000001');

  beforeAll(async () => {
    await setupTestDB();

    reservationRepo = new ReservationRepository(Reservation);
    contractRepo = new ContractRepository(Contract);
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
    incidentRepo = new IncidentRepository(Incident);

    reservationService = new ReservationService(
      reservationRepo,
      facilityRepo,
      unitTypeOfferingRepo,
      amenityOfferingRepo,
      storageUnitRepo,
      userRepo,
      undefined, // paymentRepo
      undefined, // facilityTimeSlotRepo
      undefined, // auditLogService
      undefined, // notificationService
      undefined, // reservationQueue
      contractRepo,
      refundRequestService,
      incidentRepo
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    // Create facility A
    await Facility.create({
      _id: facilityId,
      name: 'Storage Facility District 7',
      address: '123 Nguyen Huu Tho',
      city: 'Ho Chi Minh',
      status: 'active',
    });

    // Create facility B
    await Facility.create({
      _id: otherFacilityId,
      name: 'Storage Facility District 2',
      address: '456 Mai Chi Tho',
      city: 'Ho Chi Minh',
      status: 'active',
    });

    // Create unit type
    await UnitType.create({
      _id: unitTypeId,
      name: 'Standard Unit 10m2',
      category: UnitTypeCategoryEnum.STORAGE_UNIT,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { length: 3, width: 3.3, height: 2.5 },
      area: 10,
      volume: 25,
    });

    // Create offering
    await FacilityUnitTypeOffering.create({
      _id: offeringId,
      facilityId,
      unitTypeId,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 1_000_000,
      depositMultiplier: 1,
      minRentalDays: 30,
      status: 'active',
    });

    // Create storage unit (RESERVED for customer)
    await StorageUnit.create({
      _id: storageUnitId,
      facilityId,
      unitTypeId,
      unitNumber: 'U-701',
      floor: 1,
      status: StorageUnitStatusEnum.RESERVED,
    });

    // Create amenity and offering
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
      checkInDate: new Date('2026-11-01T00:00:00.000Z'),
      checkInTimeSlot: '09:00 - 11:00',
      rentalDuration: 30,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1_000_000,
      totalAmount: 1_000_000,
      depositAmount: 1_000_000,
      paidAmount: 1_000_000,
      paidAt: new Date('2026-10-25T10:00:00.000Z'),
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

  describe('Part 1: Successful Force Cancel Flow', () => {
    it('should force cancel a CONFIRMED reservation, move unit to UNDER_MAINTENANCE, release amenities, and issue 100% refund via RefundRequest', async () => {
      const reservation = await createReservationFixture();

      // Create an existing incident
      const incident = await Incident.create({
        incidentCode: 'INC-20261028-0001',
        facilityId,
        storageUnitId,
        reporterId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
        reporterRole: RoleEnum.FACILITY_MANAGER,
        category: IncidentCategoryEnum.STRUCTURAL,
        severity: IncidentSeverityEnum.HIGH,
        title: 'Cua cuon bi ket va dot nuoc tren mai',
        description:
          'Kho bi dot nuoc nghiem trong do mua bao, khong the giao cho khach',
        images: ['https://storage.com/proof1.jpg'],
        status: IncidentStatusEnum.REPORTED,
        putUnitUnderMaintenance: true,
        requiresRelocation: true,
      });

      const res = await reservationService.forceCancelReservation(
        String(reservation._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          reason:
            'Kho bi dot nuoc do mua bao va co so da het phong trong cung hang',
          incidentId: String(incident._id),
          refundBankName: 'Vietcombank',
          refundAccountNumber: '0123456789',
          refundAccountHolder: 'NGUYEN VAN A',
        }
      );

      // Verify Reservation status
      expect(res.status).toBe(ReservationStatusEnum.CANCELLED);
      expect(res.cancellationSource).toBe(
        (ReservationCancelSourceEnum as Record<string, string>)
          .FACILITY_FAULT || 'facility_fault'
      );
      expect(res.refundAmount).toBe(1_000_000);
      expect(res.forfeitedAmount).toBe(0);
      expect(res.refundStatus).toBe(RefundStatusEnum.PENDING);
      expect(res.incidentId).toBe(String(incident._id));

      // Verify StorageUnit moved to UNDER_MAINTENANCE
      const unit = await StorageUnit.findById(storageUnitId);
      expect(unit?.status).toBe(StorageUnitStatusEnum.UNDER_MAINTENANCE);

      // Verify amenities released
      const amenityOff =
        await FacilityAmenityOffering.findById(amenityOfferingId);
      expect(amenityOff?.inUseQuantity).toBe(0);

      // Verify RefundRequest created with reason FACILITY_FAULT
      const refunds = await RefundRequest.find({
        reservationId: reservation._id,
      });
      expect(refunds).toHaveLength(1);
      expect(refunds[0].amount).toBe(1_000_000);
      expect(refunds[0].reason).toBe(RefundReasonEnum.FACILITY_FAULT);
      expect(refunds[0].refundBankName).toBe('Vietcombank');
      expect(refunds[0].refundAccountNumberMasked).toBeTruthy();
    });

    it('should force cancel an OVERDUE reservation without forfeiting deposit, issuing 100% refund', async () => {
      const reservation = await createReservationFixture({
        status: ReservationStatusEnum.OVERDUE,
        graceExpiresAt: new Date(Date.now() + 12 * 3600 * 1000),
      });

      const res = await reservationService.forceCancelReservation(
        String(reservation._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          reason:
            'Khach den muon trong han grace nhung kho phat sinh su co hong khoa dien tu',
          incidentDetails: {
            title: 'Hong khoa dien tu tai kho U-701',
            category: IncidentCategoryEnum.SECURITY,
            description: 'Khoa thong minh khong the mo duoc tu xa va mat ma',
            images: ['https://storage.com/smartlock-error.jpg'],
          },
        }
      );

      expect(res.status).toBe(ReservationStatusEnum.CANCELLED);
      expect(res.refundAmount).toBe(1_000_000);
      expect(res.forfeitedAmount).toBe(0);
      expect(res.refundStatus).toBe(RefundStatusEnum.PENDING);

      // Verify StorageUnit moved to UNDER_MAINTENANCE
      const unit = await StorageUnit.findById(storageUnitId);
      expect(unit?.status).toBe(StorageUnitStatusEnum.UNDER_MAINTENANCE);
    });

    it('should automatically create an Incident record when incidentDetails is provided without incidentId', async () => {
      const reservation = await createReservationFixture();

      const res = await reservationService.forceCancelReservation(
        String(reservation._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          reason:
            'Kho bi chap dien he thong den chieu sang can sua chua khap khu vuc',
          incidentDetails: {
            title: 'Chap he thong dien chieu sang khu vuc A',
            category: IncidentCategoryEnum.STRUCTURAL,
            description:
              'Chap chay he thong day dien khien ca day kho mat dien',
            images: ['https://storage.com/power-cut.jpg'],
          },
        }
      );

      expect(res.incidentId).toBeTruthy();

      // Check incident in DB
      const createdIncident = await Incident.findById(res.incidentId);
      expect(createdIncident).toBeTruthy();
      expect(createdIncident?.title).toBe(
        'Chap he thong dien chieu sang khu vuc A'
      );
      expect(String(createdIncident?.facilityId)).toBe(String(facilityId));
      expect(String(createdIncident?.storageUnitId)).toBe(
        String(storageUnitId)
      );
      expect(createdIncident?.putUnitUnderMaintenance).toBe(true);
    });

    it('should automatically VOID any linked DRAFT contract in the same transaction', async () => {
      const reservation = await createReservationFixture();

      // Create linked DRAFT contract
      const draftContract = await Contract.create({
        contractCode: `CTR-DRAFT-${Date.now()}`,
        source: ContractSourceEnum.RESERVATION,
        reservationId: reservation._id,
        customerId,
        facilityId,
        storageUnitId,
        facilityUnitTypeOfferingId: offeringId,
        startDate: reservation.startDate,
        endDate: new Date(
          reservation.startDate.getTime() + 30 * 24 * 3600 * 1000
        ),
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1_000_000,
        depositAmount: 1_000_000,
        depositPaidAt: reservation.paidAt,
        depositPaymentId: new Types.ObjectId(),
        totalPeriodicPrice: 1_100_000,
        status: ContractStatusEnum.DRAFT,
        depositStatus: ContractDepositStatusEnum.HELD,
      });

      const res = await reservationService.forceCancelReservation(
        String(reservation._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          reason: 'Kho bi ngap nuoc do con mua lon bat ngo khong the ban giao',
          incidentDetails: {
            title: 'Ngap nuoc san kho',
            category: IncidentCategoryEnum.WATER_LEAK,
            images: ['https://storage.com/flood.jpg'],
          },
        }
      );

      expect(res.status).toBe(ReservationStatusEnum.CANCELLED);

      // Verify DRAFT contract is automatically VOIDed
      const updatedContract = await Contract.findById(draftContract._id);
      expect(updatedContract?.status).toBe(ContractStatusEnum.CANCELLED);
      expect(updatedContract?.cancellationType).toBe(
        ContractCancellationTypeEnum.VOID
      );
      expect(updatedContract?.forfeitedAmount).toBe(0);
    });
  });

  describe('Part 2: Authorization Checks', () => {
    it('should reject when CUSTOMER attempts to force cancel (403 MESSAGE_CODE_103)', async () => {
      const reservation = await createReservationFixture();

      await expect(
        reservationService.forceCancelReservation(
          String(reservation._id),
          TEST_USERS.customer1.id,
          RoleEnum.CUSTOMER,
          {
            reason: 'Khach muon tu y force cancel de doi phong',
            incidentDetails: {
              title: 'Su co gia mao',
              category: IncidentCategoryEnum.OTHER,
              images: ['https://storage.com/fake.jpg'],
            },
          }
        )
      ).rejects.toThrow(new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103));
    });

    it('should reject when FACILITY_STAFF attempts to force cancel (403 MESSAGE_CODE_120)', async () => {
      const reservation = await createReservationFixture();

      await expect(
        reservationService.forceCancelReservation(
          String(reservation._id),
          TEST_USERS.staffFacilityA.id,
          RoleEnum.FACILITY_STAFF,
          {
            reason: 'Nhan vien quay khong co tham quyen force cancel',
            incidentDetails: {
              title: 'Staff unauthorized',
              category: IncidentCategoryEnum.OTHER,
              images: ['https://storage.com/fake.jpg'],
            },
          }
        )
      ).rejects.toThrow(new AppError(403, MESSAGE_CODE.MESSAGE_CODE_120));
    });

    it('should reject when FACILITY_MANAGER from a different facility attempts to force cancel (403 MESSAGE_CODE_122)', async () => {
      const reservation = await createReservationFixture();

      await expect(
        reservationService.forceCancelReservation(
          String(reservation._id),
          TEST_USERS.managerFacilityB.id,
          RoleEnum.FACILITY_MANAGER,
          {
            reason: 'Manager co so B can thiep co so A',
            incidentDetails: {
              title: 'Manager B cross facility',
              category: IncidentCategoryEnum.OTHER,
              images: ['https://storage.com/fake.jpg'],
            },
          }
        )
      ).rejects.toThrow(
        new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility'])
      );
    });

    it('should allow BUSINESS_OPS_MANAGER and SYSTEM_ADMIN to force cancel regardless of facility assignment', async () => {
      const reservation1 = await createReservationFixture();

      const resOps = await reservationService.forceCancelReservation(
        String(reservation1._id),
        TEST_USERS.opsManager.id,
        RoleEnum.BUSINESS_OPS_MANAGER,
        {
          reason: 'Ops Manager quyet dinh force cancel giai quyet khieu nai',
          incidentDetails: {
            title: 'Ops intervention incident',
            category: IncidentCategoryEnum.OTHER,
            images: ['https://storage.com/ops-evidence.jpg'],
          },
        }
      );
      expect(resOps.status).toBe(ReservationStatusEnum.CANCELLED);

      const reservation2 = await createReservationFixture();
      const resAdmin = await reservationService.forceCancelReservation(
        String(reservation2._id),
        TEST_USERS.systemAdmin.id,
        RoleEnum.SYSTEM_ADMIN,
        {
          reason:
            'System Admin force cancel do he thong gap su co bat kha khang',
          incidentDetails: {
            title: 'Admin override incident',
            category: IncidentCategoryEnum.OTHER,
            images: ['https://storage.com/admin-evidence.jpg'],
          },
        }
      );
      expect(resAdmin.status).toBe(ReservationStatusEnum.CANCELLED);
    });
  });

  describe('Part 3: Boundary & Validation Checks', () => {
    it('should reject force cancel if reservation is already CANCELLED or COMPLETED (400 MESSAGE_CODE_324)', async () => {
      const reservation = await createReservationFixture({
        status: ReservationStatusEnum.CANCELLED,
      });

      await expect(
        reservationService.forceCancelReservation(
          String(reservation._id),
          TEST_USERS.managerFacilityA.id,
          RoleEnum.FACILITY_MANAGER,
          {
            reason: 'Don da bi huy tu truoc khong the force cancel nua',
            incidentDetails: {
              title: 'Late force cancel',
              category: IncidentCategoryEnum.OTHER,
              images: ['https://storage.com/test.jpg'],
            },
          }
        )
      ).rejects.toThrow(AppError);
    });

    it('should reject if provided incidentId does not exist or belongs to another facility', async () => {
      const reservation = await createReservationFixture();
      const fakeIncidentId = new Types.ObjectId().toString();

      await expect(
        reservationService.forceCancelReservation(
          String(reservation._id),
          TEST_USERS.managerFacilityA.id,
          RoleEnum.FACILITY_MANAGER,
          {
            reason: 'Incident khong ton tai trong he thong co so',
            incidentId: fakeIncidentId,
          }
        )
      ).rejects.toThrow(AppError);
    });
  });
});
