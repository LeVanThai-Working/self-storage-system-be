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
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import type { AuditLogService } from '../src/modules/auditLog/auditLog.service.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import { Incident } from '../src/modules/incident/incident.model.ts';
import { IncidentRepository } from '../src/modules/incident/incident.repository.ts';
import '../src/modules/storageRack/storageRack.model.ts';
import '../src/modules/storageRack/rackTier.model.ts';
import {
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import {
  ReservationStatusEnum,
  RefundStatusEnum,
} from '../src/common/enums/reservation.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { AuditActionEnum } from '../src/common/enums/auditLog.enum.ts';
import { getVNDateString, startOfDayVN } from '../src/utils/date.util.ts';

const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86400000);

describe('T2.8 — Early Check-in and Out-of-Slot Soft Warning & Audit Logging', () => {
  let reservationService: ReservationService;
  let contractService: ContractService;
  let facilityUnitTypeOfferingId: Types.ObjectId;
  let storageUnitId: Types.ObjectId;
  let recordedAuditLogs: Array<{
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }> = [];

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();
    recordedAuditLogs = [];

    const mockAuditLogService = {
      record: (entry: {
        action: string;
        resourceType: string;
        resourceId: string;
        metadata?: Record<string, unknown>;
      }) => {
        recordedAuditLogs.push(entry);
      },
    } as unknown as AuditLogService;

    const facilityRepo = new FacilityRepository(Facility);
    const userRepo = new UserRepository(User);
    const suRepo = new StorageUnitRepository(StorageUnit);
    const fatoRepo = new FacilityAmenityOfferingRepository(
      FacilityAmenityOffering
    );
    const futoRepo = new FacilityUnitTypeOfferingRepository(
      FacilityUnitTypeOffering
    );
    const resRepo = new ReservationRepository(Reservation);
    const contractRepo = new ContractRepository(Contract);
    const refundRepo = new RefundRequestRepository(RefundRequest);
    const refundService = new RefundRequestService(refundRepo);
    const incidentRepo = new IncidentRepository(Incident);
    const inventoryRepo = new CustomerInventoryRepository(CustomerInventory);

    reservationService = new ReservationService(
      resRepo,
      facilityRepo,
      futoRepo,
      fatoRepo,
      suRepo,
      userRepo,
      undefined,
      undefined,
      mockAuditLogService,
      undefined,
      undefined,
      contractRepo,
      refundService,
      incidentRepo
    );

    contractService = new ContractService(
      contractRepo,
      resRepo,
      suRepo,
      fatoRepo,
      futoRepo,
      facilityRepo,
      userRepo,
      mockAuditLogService,
      refundService,
      inventoryRepo,
      incidentRepo
    );

    await Facility.create({
      _id: new Types.ObjectId(TEST_FACILITY_A_ID),
      name: 'Facility A Test',
      city: 'Hanoi',
      address: '123 Test St',
      status: 'active',
      operatingHours: { open: '08:00', close: '20:00' },
      managerId: new Types.ObjectId(TEST_USERS.managerFacilityA.id),
    });

    const unitType = await UnitType.create({
      name: 'Standard Unit',
      category: UnitTypeCategoryEnum.STORAGE,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { length: 2, width: 2, height: 2 },
      area: 4,
      volume: 8,
    });

    const futo = await FacilityUnitTypeOffering.create({
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId: unitType._id,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 1000000,
      depositMultiplier: 1,
      minRentalDays: 30,
      status: 'active',
    });
    facilityUnitTypeOfferingId = futo._id;

    const su = await StorageUnit.create({
      unitNumber: 'U-101',
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      unitTypeId: unitType._id,
      floor: 1,
      status: StorageUnitStatusEnum.RESERVED,
    });
    storageUnitId = su._id;
  });

  it('1. Standard check-in (on date, in slot, within operating hours) sets flags to false', async () => {
    const todayDateStr = getVNDateString(new Date());
    const today = new Date(`${todayDateStr}T00:00:00.000+07:00`);
    const res = await Reservation.create({
      reservationCode: 'RES-STD-01',
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      facilityUnitTypeOfferingId,
      storageUnitId,
      startDate: today,
      checkInDate: today,
      checkInTimeSlot: '08:00 - 12:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1000000,
      depositAmount: 1000000,
      totalAmount: 1000000,
      status: ReservationStatusEnum.CONFIRMED,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      paidAt: new Date(),
      paidAmount: 1000000,
    });

    const contract = await Contract.create({
      contractCode: 'CTR-STD-01',
      source: ContractSourceEnum.RESERVATION,
      reservationId: res._id,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId,
      facilityUnitTypeOfferingId,
      startDate: today,
      endDate: addDays(today, 30),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1000000,
      depositAmount: 1000000,
      totalPeriodicPrice: 1000000,
      status: ContractStatusEnum.DRAFT,
      customerSigned: true,
      customerSignedAt: new Date(),
      firstPeriodPaidAt: new Date(),
      depositPaidAt: new Date(),
      termsAccepted: true,
    });

    // Check in at 10:00 (within 08:00 - 12:00 slot and 08:00 - 20:00 operating hours)
    const checkInTime = new Date(`${todayDateStr}T10:00:00.000+07:00`);
    const result = await contractService.checkInContract(
      contract._id.toString(),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        actualCheckInDate: checkInTime.toISOString(),
        notes: 'Standard check-in completed',
      }
    );

    expect(result.status).toBe(ContractStatusEnum.ACTIVE);
    expect(result.earlyCheckIn).toBe(false);
    expect(result.outOfSlot).toBe(false);

    // Verify DB persistence
    const updatedContract = await Contract.findById(contract._id);
    expect(updatedContract?.earlyCheckIn).toBe(false);
    expect(updatedContract?.outOfSlot).toBe(false);

    const updatedRes = await Reservation.findById(res._id);
    expect(updatedRes?.status).toBe(ReservationStatusEnum.COMPLETED);
    expect(updatedRes?.earlyCheckIn).toBe(false);
    expect(updatedRes?.outOfSlot).toBe(false);

    // Verify audit log
    const checkInLog = recordedAuditLogs.find(
      (l) => l.action === AuditActionEnum.CHECK_IN
    );
    expect(checkInLog).toBeDefined();
    expect(checkInLog?.metadata?.earlyCheckIn).toBe(false);
    expect(checkInLog?.metadata?.outOfSlot).toBe(false);
    expect(checkInLog?.metadata?.outsideOperatingHours).toBe(false);
  });

  it('2. Early check-in before checkInDate is allowed (soft warning) and records earlyCheckIn = true', async () => {
    const todayDateStr = getVNDateString(new Date());
    const today = new Date(`${todayDateStr}T00:00:00.000+07:00`);
    const tomorrow = addDays(today, 1);

    const res = await Reservation.create({
      reservationCode: 'RES-EARLY-01',
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      facilityUnitTypeOfferingId,
      storageUnitId,
      startDate: tomorrow,
      checkInDate: tomorrow,
      checkInTimeSlot: '09:00 - 11:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1000000,
      depositAmount: 1000000,
      totalAmount: 1000000,
      status: ReservationStatusEnum.CONFIRMED,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      paidAt: new Date(),
      paidAmount: 1000000,
    });

    const contract = await Contract.create({
      contractCode: 'CTR-EARLY-01',
      source: ContractSourceEnum.RESERVATION,
      reservationId: res._id,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId,
      facilityUnitTypeOfferingId,
      startDate: tomorrow,
      endDate: addDays(tomorrow, 30),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1000000,
      depositAmount: 1000000,
      totalPeriodicPrice: 1000000,
      status: ContractStatusEnum.DRAFT,
      customerSigned: true,
      customerSignedAt: new Date(),
      firstPeriodPaidAt: new Date(),
      depositPaidAt: new Date(),
      termsAccepted: true,
    });

    // Check in today (1 day early), at 10:00 VN time
    const checkInTime = new Date(`${todayDateStr}T10:00:00.000+07:00`);
    const result = await contractService.checkInContract(
      contract._id.toString(),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        actualCheckInDate: checkInTime.toISOString(),
        notes: 'Customer arrived 1 day early',
      }
    );

    // MUST NOT THROW 400! Soft warning only.
    expect(result.status).toBe(ContractStatusEnum.ACTIVE);
    expect(result.earlyCheckIn).toBe(true);
    expect(result.outOfSlot).toBe(true);

    const updatedRes = await Reservation.findById(res._id);
    expect(updatedRes?.earlyCheckIn).toBe(true);
    expect(updatedRes?.outOfSlot).toBe(true);

    const checkInLog = recordedAuditLogs.find(
      (l) => l.action === AuditActionEnum.CHECK_IN
    );
    expect(checkInLog?.metadata?.earlyCheckIn).toBe(true);
    expect(checkInLog?.metadata?.outOfSlot).toBe(true);
  });

  it('3. Check-in on same day but outside time slot is allowed (soft warning) and records outOfSlot = true', async () => {
    const todayDateStr = getVNDateString(new Date());
    const today = new Date(`${todayDateStr}T00:00:00.000+07:00`);

    const res = await Reservation.create({
      reservationCode: 'RES-OUTSLOT-01',
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      facilityUnitTypeOfferingId,
      storageUnitId,
      startDate: today,
      checkInDate: today,
      checkInTimeSlot: '14:00 - 16:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1000000,
      depositAmount: 1000000,
      totalAmount: 1000000,
      status: ReservationStatusEnum.CONFIRMED,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      paidAt: new Date(),
      paidAmount: 1000000,
    });

    const contract = await Contract.create({
      contractCode: 'CTR-OUTSLOT-01',
      source: ContractSourceEnum.RESERVATION,
      reservationId: res._id,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId,
      facilityUnitTypeOfferingId,
      startDate: today,
      endDate: addDays(today, 30),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1000000,
      depositAmount: 1000000,
      totalPeriodicPrice: 1000000,
      status: ContractStatusEnum.DRAFT,
      customerSigned: true,
      customerSignedAt: new Date(),
      firstPeriodPaidAt: new Date(),
      depositPaidAt: new Date(),
      termsAccepted: true,
    });

    // Check in at 10:00 (slot is 14:00 - 16:00)
    const checkInTime = new Date(`${todayDateStr}T10:00:00.000+07:00`);
    const result = await contractService.checkInContract(
      contract._id.toString(),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        actualCheckInDate: checkInTime.toISOString(),
      }
    );

    expect(result.status).toBe(ContractStatusEnum.ACTIVE);
    expect(result.earlyCheckIn).toBe(false);
    expect(result.outOfSlot).toBe(true);

    const checkInLog = recordedAuditLogs.find(
      (l) => l.action === AuditActionEnum.CHECK_IN
    );
    expect(checkInLog?.metadata?.earlyCheckIn).toBe(false);
    expect(checkInLog?.metadata?.outOfSlot).toBe(true);
    expect(checkInLog?.metadata?.outsideOperatingHours).toBe(false);
  });

  it('4. Check-in outside facility operating hours logs outsideOperatingHours = true', async () => {
    const todayDateStr = getVNDateString(new Date());
    const today = new Date(`${todayDateStr}T00:00:00.000+07:00`);

    const res = await Reservation.create({
      reservationCode: 'RES-OPH-01',
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      facilityUnitTypeOfferingId,
      storageUnitId,
      startDate: today,
      checkInDate: today,
      checkInTimeSlot: '21:00 - 22:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1000000,
      depositAmount: 1000000,
      totalAmount: 1000000,
      status: ReservationStatusEnum.CONFIRMED,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      paidAt: new Date(),
      paidAmount: 1000000,
    });

    const contract = await Contract.create({
      contractCode: 'CTR-OPH-01',
      source: ContractSourceEnum.RESERVATION,
      reservationId: res._id,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId,
      facilityUnitTypeOfferingId,
      startDate: today,
      endDate: addDays(today, 30),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1000000,
      depositAmount: 1000000,
      totalPeriodicPrice: 1000000,
      status: ContractStatusEnum.DRAFT,
      customerSigned: true,
      customerSignedAt: new Date(),
      firstPeriodPaidAt: new Date(),
      depositPaidAt: new Date(),
      termsAccepted: true,
    });

    // Facility A operating hours are 08:00 - 20:00. Check in at 21:30.
    const checkInTime = new Date(`${todayDateStr}T21:30:00.000+07:00`);
    const result = await contractService.checkInContract(
      contract._id.toString(),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        actualCheckInDate: checkInTime.toISOString(),
      }
    );

    expect(result.status).toBe(ContractStatusEnum.ACTIVE);

    const checkInLog = recordedAuditLogs.find(
      (l) => l.action === AuditActionEnum.CHECK_IN
    );
    expect(checkInLog?.metadata?.outsideOperatingHours).toBe(true);
  });

  it('5. Customer signs contract outside facility operating hours logs outsideOperatingHours = true in SIGN_CONTRACT', async () => {
    const today = startOfDayVN(new Date());

    // Update Facility A to have operating hours outside the current time
    const now = new Date();
    const currentVNHour = parseInt(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        hour12: false,
      }).format(now),
      10
    );
    const outsideOpenHour =
      ((currentVNHour + 6) % 24).toString().padStart(2, '0') + ':00';
    const outsideCloseHour =
      ((currentVNHour + 7) % 24).toString().padStart(2, '0') + ':00';

    await Facility.findByIdAndUpdate(TEST_FACILITY_A_ID, {
      operatingHours: { open: outsideOpenHour, close: outsideCloseHour },
    });

    const contract = await Contract.create({
      contractCode: 'CTR-CUST-SIGN-01',
      source: ContractSourceEnum.RESERVATION,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId,
      facilityUnitTypeOfferingId,
      startDate: today,
      endDate: addDays(today, 30),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1000000,
      depositAmount: 1000000,
      totalPeriodicPrice: 1000000,
      status: ContractStatusEnum.DRAFT,
      customerSigned: false,
      firstPeriodPaidAt: new Date(),
      depositPaidAt: new Date(),
      termsAccepted: false,
    });

    const result = await contractService.customerSignContract(
      contract._id.toString(),
      TEST_USERS.customer1.id,
      RoleEnum.CUSTOMER,
      { termsAccepted: true, notes: 'Signed from home late at night' }
    );

    // MUST NOT THROW 400! Customer signature succeeds.
    expect(result.customerSigned).toBe(true);

    const signLog = recordedAuditLogs.find(
      (l) => l.action === AuditActionEnum.SIGN_CONTRACT
    );
    expect(signLog).toBeDefined();
    expect(signLog?.metadata?.party).toBe('customer');
    expect(signLog?.metadata?.outsideOperatingHours).toBe(true);
    expect(signLog?.metadata?.operatingHours).toEqual({
      open: outsideOpenHour,
      close: outsideCloseHour,
    });
  });

  it('6. Walk-in contract check-in without reservation leaves earlyCheckIn and outOfSlot as null', async () => {
    const today = startOfDayVN(new Date());

    const contract = await Contract.create({
      contractCode: 'CTR-WALKIN-01',
      source: ContractSourceEnum.WALK_IN,
      reservationId: null,
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      storageUnitId,
      facilityUnitTypeOfferingId,
      startDate: today,
      endDate: addDays(today, 30),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1000000,
      depositAmount: 1000000,
      totalPeriodicPrice: 1000000,
      status: ContractStatusEnum.DRAFT,
      customerSigned: true,
      customerSignedAt: new Date(),
      firstPeriodPaidAt: new Date(),
      depositPaidAt: new Date(),
      termsAccepted: true,
    });

    const result = await contractService.checkInContract(
      contract._id.toString(),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        notes: 'Walk-in customer checked in directly',
      }
    );

    expect(result.status).toBe(ContractStatusEnum.ACTIVE);
    expect(result.earlyCheckIn).toBeNull();
    expect(result.outOfSlot).toBeNull();

    const checkInLog = recordedAuditLogs.find(
      (l) => l.action === AuditActionEnum.CHECK_IN
    );
    expect(checkInLog?.metadata?.earlyCheckIn).toBeNull();
    expect(checkInLog?.metadata?.outOfSlot).toBeNull();
  });

  it('7. Reservation markCustomerArrived records earlyCheckIn, outOfSlot, outsideOperatingHours, and notes in audit log', async () => {
    const today = startOfDayVN(new Date());
    const tomorrow = addDays(today, 1);

    const res = await Reservation.create({
      reservationCode: 'RES-ARRIVE-01',
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      facilityUnitTypeOfferingId,
      storageUnitId,
      startDate: tomorrow,
      checkInDate: tomorrow,
      checkInTimeSlot: '09:00 - 11:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1000000,
      depositAmount: 1000000,
      totalAmount: 1000000,
      status: ReservationStatusEnum.CONFIRMED,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      paidAt: new Date(),
      paidAmount: 1000000,
    });

    const result = await reservationService.markCustomerArrived(
      res._id.toString(),
      {
        userId: TEST_USERS.staffFacilityA.id,
        role: RoleEnum.FACILITY_STAFF,
        facilityId: TEST_FACILITY_A_ID,
      },
      {
        notes: 'Customer arrived early with moving van',
      }
    );

    expect(result.arrivedAt).toBeDefined();
    expect(result.earlyCheckIn).toBe(true);
    expect(result.outOfSlot).toBe(true);

    const arriveLog = recordedAuditLogs.find(
      (l) => l.action === AuditActionEnum.MARK_ARRIVED
    );
    expect(arriveLog).toBeDefined();
    expect(arriveLog?.metadata?.earlyCheckIn).toBe(true);
    expect(arriveLog?.metadata?.outOfSlot).toBe(true);
    expect(arriveLog?.metadata?.notes).toBe(
      'Customer arrived early with moving van'
    );
  });
});
