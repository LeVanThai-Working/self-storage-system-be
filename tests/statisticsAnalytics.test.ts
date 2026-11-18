import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { Amenity } from '../src/modules/amenity/amenity.model.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { FacilityTimeSlot } from '../src/modules/facilityTimeSlot/facilityTimeSlot.model.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { Invoice } from '../src/modules/invoice/invoice.model.ts';
import {
  Payment,
  PaymentTransaction,
} from '../src/modules/payment/payment.model.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { Incident } from '../src/modules/incident/incident.model.ts';
import { SupportTicket } from '../src/modules/support/supportTicket.model.ts';
import { AccessSchedule } from '../src/modules/customerInventory/accessSchedule.model.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import { InventoryMovement } from '../src/modules/customerInventory/inventoryMovement.model.ts';
import { ApprovalRequest } from '../src/modules/approvalRequest/approvalRequest.model.ts';

import type { Request as ExpressRequest } from 'express';
import { StatisticsRepository } from '../src/modules/statistics/statistics.repository.ts';
import { StatisticsService } from '../src/modules/statistics/statistics.service.ts';
import { statisticsController } from '../src/modules/statistics/statistics.container.ts';
import { rentalTrendsQuerySchema } from '../src/modules/statistics/schemas/statistics.request.schema.ts';

import {
  RoleEnum,
  UserStatusEnum,
  AuthProviderEnum,
} from '../src/common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import {
  AmenityTypeEnum,
  AmenityStatusEnum,
} from '../src/common/enums/amenity.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../src/common/enums/facilityUnitTypeOffering.enum.ts';
import { FacilityAmenityOfferingStatusEnum } from '../src/common/enums/facilityAmenityOffering.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  RackStatusEnum,
  RackZoneEnum,
} from '../src/common/enums/storageRack.enum.ts';
import {
  ReservationStatusEnum,
  RefundStatusEnum,
  ReservationCancelSourceEnum,
} from '../src/common/enums/reservation.enum.ts';
import {
  ContractStatusEnum,
  ContractSourceEnum,
  ContractDepositStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import {
  BillingUnitEnum,
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
} from '../src/common/enums/billing.enum.ts';
import {
  PaymentPurposeEnum,
  PaymentStatusEnum,
  PaymentMethodEnum,
  PaymentTransactionResultEnum,
} from '../src/common/enums/payment.enum.ts';
import {
  RefundRequestReasonEnum,
  RefundRequestStatusEnum,
} from '../src/common/enums/refundRequest.enum.ts';
import {
  IncidentStatusEnum,
  IncidentCategoryEnum,
  IncidentSeverityEnum,
  IncidentLiablePartyEnum,
} from '../src/common/enums/incident.enum.ts';
import {
  SupportTicketCategoryEnum,
  SupportTicketPriorityEnum,
  SupportTicketStatusEnum,
} from '../src/common/enums/supportTicket.enum.ts';
import {
  AccessScheduleStatusEnum,
  MovementTypeEnum,
} from '../src/common/enums/customerInventory.enum.ts';
import {
  ApprovalRequestActionEnum,
  ApprovalRequestStatusEnum,
  ApprovalRequestTargetTypeEnum,
} from '../src/common/enums/approvalRequest.enum.ts';
import {
  RentalTrendsGranularityEnum,
  FacilityKpiTierEnum,
  FacilityKpiSortByEnum,
} from '../src/common/enums/statistics.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';

describe('statistics/T0.1-T1.5: Business Operations Statistics, Temporal Trends & Facility KPI Suite', () => {
  let statisticsRepo: StatisticsRepository;
  let userRepo: UserRepository;
  let facilityRepo: FacilityRepository;
  let statisticsService: StatisticsService;

  let opsUser: InstanceType<typeof User>;
  let adminUser: InstanceType<typeof User>;
  let managerFacilityA: InstanceType<typeof User>;
  let managerFacilityB: InstanceType<typeof User>;
  let staffUser: InstanceType<typeof User>;
  let customerUser: InstanceType<typeof User>;

  let facilityA: InstanceType<typeof Facility>; // High KPI facility
  let facilityB: InstanceType<typeof Facility>; // Low KPI facility

  beforeAll(async () => {
    await setupTestDB();
    statisticsRepo = new StatisticsRepository();
    userRepo = new UserRepository(User);
    facilityRepo = new FacilityRepository(Facility);
    statisticsService = new StatisticsService(
      statisticsRepo,
      userRepo,
      facilityRepo
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // 1. Seed Users
    opsUser = await User.create({
      name: 'Ops Manager',
      email: 'ops@storage.vn',
      password: 'hashedpassword',
      role: RoleEnum.BUSINESS_OPS_MANAGER,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
    });

    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@storage.vn',
      password: 'hashedpassword',
      role: RoleEnum.SYSTEM_ADMIN,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
    });

    facilityA = await Facility.create({
      name: 'Chi nhánh Quận 1 (High KPI)',
      code: 'SGN01',
      address: '123 Lê Lợi, Q1',
      city: 'Hồ Chí Minh',
      status: FacilityStatusEnum.ACTIVE,
      operatingHours: { open: '08:00', close: '20:00' },
    });

    facilityB = await Facility.create({
      name: 'Chi nhánh Cầu Giấy (Low KPI)',
      code: 'HAN01',
      address: '456 Xuân Thủy, Cầu Giấy',
      city: 'Hà Nội',
      status: FacilityStatusEnum.ACTIVE,
      operatingHours: { open: '08:00', close: '20:00' },
    });

    managerFacilityA = await User.create({
      name: 'Manager Facility A',
      email: 'fm.a@storage.vn',
      password: 'hashedpassword',
      role: RoleEnum.FACILITY_MANAGER,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityA._id,
    });

    managerFacilityB = await User.create({
      name: 'Manager Facility B',
      email: 'fm.b@storage.vn',
      password: 'hashedpassword',
      role: RoleEnum.FACILITY_MANAGER,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityB._id,
    });

    await Facility.findByIdAndUpdate(facilityA._id, {
      managerId: managerFacilityA._id,
    });
    await Facility.findByIdAndUpdate(facilityB._id, {
      managerId: managerFacilityB._id,
    });

    staffUser = await User.create({
      name: 'Facility Staff A',
      email: 'staff.a@storage.vn',
      password: 'hashedpassword',
      role: RoleEnum.FACILITY_STAFF,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityA._id,
    });

    customerUser = await User.create({
      name: 'Khách hàng Nguyễn Văn A',
      email: 'customer@storage.vn',
      password: 'hashedpassword',
      role: RoleEnum.CUSTOMER,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
    });

    // 2. Seed UnitTypes & Offerings
    const smallUnitType = await UnitType.create({
      name: 'Kho Nhỏ 5m2',
      dimensions: { length: 2.5, width: 2, height: 2.5 },
      area: 5,
      volume: 12.5,
      category: UnitTypeCategoryEnum.SMALL,
      status: UnitTypeStatusEnum.ACTIVE,
    });

    const rackUnitType = await UnitType.create({
      name: 'Kho Kệ Chung 50m2',
      dimensions: { length: 10, width: 5, height: 4 },
      area: 50,
      volume: 200,
      category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
      status: UnitTypeStatusEnum.ACTIVE,
    });

    const offeringSmallA = await FacilityUnitTypeOffering.create({
      facilityId: facilityA._id,
      unitTypeId: smallUnitType._id,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 2000000,
      depositMultiplier: 1,
      minRentalDays: 30,
      status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
    });

    const offeringSmallB = await FacilityUnitTypeOffering.create({
      facilityId: facilityB._id,
      unitTypeId: smallUnitType._id,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 1800000,
      depositMultiplier: 1,
      minRentalDays: 30,
      status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
    });

    const amenity = await Amenity.create({
      name: 'Khóa thông minh',
      type: AmenityTypeEnum.SECURITY,
      status: AmenityStatusEnum.ACTIVE,
    });

    const amenityOfferingA = await FacilityAmenityOffering.create({
      facilityId: facilityA._id,
      amenityId: amenity._id,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 200000,
      totalQuantity: 20,
      inUseQuantity: 10,
      status: FacilityAmenityOfferingStatusEnum.ACTIVE,
    });

    // 3. Seed StorageUnits & Racks
    // Facility A: 4 units -> 3 OCCUPIED, 1 AVAILABLE (75% occupancy)
    const unitA1 = await StorageUnit.create({
      facilityId: facilityA._id,
      unitTypeId: smallUnitType._id,
      unitNumber: 'A-101',
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    const unitA2 = await StorageUnit.create({
      facilityId: facilityA._id,
      unitTypeId: smallUnitType._id,
      unitNumber: 'A-102',
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    const unitA3 = await StorageUnit.create({
      facilityId: facilityA._id,
      unitTypeId: smallUnitType._id,
      unitNumber: 'A-103',
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    const unitA4 = await StorageUnit.create({
      facilityId: facilityA._id,
      unitTypeId: rackUnitType._id,
      unitNumber: 'A-RACK',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });

    // Racks in Facility A: 2 PRIME RENTED, 1 ECONOMY AVAILABLE
    await StorageRack.create([
      {
        facilityId: facilityA._id,
        storageUnitId: unitA4._id,
        rackCode: 'R-01',
        aisle: 'A',
        bay: 1,
        zone: RackZoneEnum.PRIME,
        tierCount: 3,
        status: RackStatusEnum.RENTED,
      },
      {
        facilityId: facilityA._id,
        storageUnitId: unitA4._id,
        rackCode: 'R-02',
        aisle: 'A',
        bay: 2,
        zone: RackZoneEnum.PRIME,
        tierCount: 3,
        status: RackStatusEnum.RENTED,
      },
      {
        facilityId: facilityA._id,
        storageUnitId: unitA4._id,
        rackCode: 'R-03',
        aisle: 'B',
        bay: 1,
        zone: RackZoneEnum.ECONOMY,
        tierCount: 3,
        status: RackStatusEnum.AVAILABLE,
      },
    ]);

    // Facility B: 4 units -> 0 OCCUPIED, 2 AVAILABLE, 2 UNDER_MAINTENANCE (0% occupancy, 50% maintenance drag)
    const unitB1 = await StorageUnit.create({
      facilityId: facilityB._id,
      unitTypeId: smallUnitType._id,
      unitNumber: 'B-101',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    const unitB2 = await StorageUnit.create({
      facilityId: facilityB._id,
      unitTypeId: smallUnitType._id,
      unitNumber: 'B-102',
      floor: 1,
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    await StorageUnit.create({
      facilityId: facilityB._id,
      unitTypeId: smallUnitType._id,
      unitNumber: 'B-103',
      floor: 1,
      status: StorageUnitStatusEnum.UNDER_MAINTENANCE,
    });
    await StorageUnit.create({
      facilityId: facilityB._id,
      unitTypeId: smallUnitType._id,
      unitNumber: 'B-104',
      floor: 1,
      status: StorageUnitStatusEnum.UNDER_MAINTENANCE,
    });

    // 4. Seed TimeSlots
    const slotMorningA = await FacilityTimeSlot.create({
      facilityId: facilityA._id,
      slotName: 'Ca Sáng',
      startTime: '08:00',
      endTime: '10:00',
      maxCapacity: 5,
      isActive: true,
    });
    await FacilityTimeSlot.create({
      facilityId: facilityA._id,
      slotName: 'Ca Chiều',
      startTime: '14:00',
      endTime: '16:00',
      maxCapacity: 5,
      isActive: true,
    });

    // 5. Seed Reservations & Contracts across dates within the last 20 days
    const now = new Date();
    const peakDay = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const lowDay = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);

    // Facility A: 3 COMPLETED reservations on peakDay (slot 08:00 - 10:00), 1 on lowDay (slot 14:00 - 16:00)
    const resA1 = await Reservation.create({
      reservationCode: 'RES-A1',
      customerId: customerUser._id,
      facilityId: facilityA._id,
      facilityUnitTypeOfferingId: offeringSmallA._id,
      storageUnitId: unitA1._id,
      startDate: peakDay,
      checkInDate: peakDay,
      checkInTimeSlot: '08:00 - 10:00',
      rentalDuration: 3,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 2000000,
      depositAmount: 2000000,
      totalAmount: 2200000,
      status: ReservationStatusEnum.COMPLETED,
      paidAt: new Date(peakDay.getTime() - 60 * 60 * 1000),
      confirmedAt: new Date(peakDay.getTime() - 45 * 60 * 1000), // 15 mins confirm SLA
      arrivedAt: peakDay,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      createdAt: peakDay,
    });

    const resA2 = await Reservation.create({
      reservationCode: 'RES-A2',
      customerId: customerUser._id,
      facilityId: facilityA._id,
      facilityUnitTypeOfferingId: offeringSmallA._id,
      storageUnitId: unitA2._id,
      startDate: peakDay,
      checkInDate: peakDay,
      checkInTimeSlot: '08:00 - 10:00',
      rentalDuration: 6,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 2000000,
      depositAmount: 2000000,
      totalAmount: 2000000,
      status: ReservationStatusEnum.COMPLETED,
      paidAt: new Date(peakDay.getTime() - 60 * 60 * 1000),
      confirmedAt: new Date(peakDay.getTime() - 40 * 60 * 1000), // 20 mins confirm SLA
      arrivedAt: peakDay,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      createdAt: peakDay,
    });

    const resA3 = await Reservation.create({
      reservationCode: 'RES-A3',
      customerId: customerUser._id,
      facilityId: facilityA._id,
      facilityUnitTypeOfferingId: offeringSmallA._id,
      storageUnitId: unitA3._id,
      startDate: lowDay,
      checkInDate: lowDay,
      checkInTimeSlot: '14:00 - 16:00',
      rentalDuration: 10,
      billingUnit: BillingUnitEnum.DAY,
      basePrice: 150000,
      depositAmount: 500000,
      totalAmount: 1500000,
      status: ReservationStatusEnum.COMPLETED,
      paidAt: new Date(lowDay.getTime() - 60 * 60 * 1000),
      confirmedAt: new Date(lowDay.getTime() - 30 * 60 * 1000),
      arrivedAt: lowDay,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      createdAt: lowDay,
    });

    // Facility B: 2 reservations -> 1 CANCELLED by FACILITY_FAULT, 1 EXPIRED
    await Reservation.create({
      reservationCode: 'RES-B1',
      customerId: customerUser._id,
      facilityId: facilityB._id,
      facilityUnitTypeOfferingId: offeringSmallB._id,
      storageUnitId: unitB1._id,
      startDate: peakDay,
      checkInDate: peakDay,
      checkInTimeSlot: '08:00 - 10:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1800000,
      depositAmount: 1800000,
      totalAmount: 1800000,
      status: ReservationStatusEnum.CANCELLED,
      cancellationSource: ReservationCancelSourceEnum.FACILITY_FAULT,
      cancelledAt: peakDay,
      paidAt: new Date(peakDay.getTime() - 120 * 60 * 1000),
      refundAmount: 1800000,
      refundStatus: RefundStatusEnum.PENDING,
      termsAccepted: true,
      createdAt: peakDay,
    });

    await Reservation.create({
      reservationCode: 'RES-B2',
      customerId: customerUser._id,
      facilityId: facilityB._id,
      facilityUnitTypeOfferingId: offeringSmallB._id,
      storageUnitId: unitB2._id,
      startDate: lowDay,
      checkInDate: lowDay,
      checkInTimeSlot: '14:00 - 16:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1800000,
      depositAmount: 1800000,
      totalAmount: 1800000,
      status: ReservationStatusEnum.EXPIRED,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      createdAt: lowDay,
    });

    // 6. Seed Contracts
    const contractA1 = await Contract.create({
      contractCode: 'CTR-A1',
      source: ContractSourceEnum.RESERVATION,
      reservationId: resA1._id,
      customerId: customerUser._id,
      facilityId: facilityA._id,
      storageUnitId: unitA1._id,
      facilityUnitTypeOfferingId: offeringSmallA._id,
      startDate: peakDay,
      endDate: new Date(peakDay.getTime() + 90 * 24 * 60 * 60 * 1000),
      actualCheckInDate: peakDay,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 2000000,
      depositAmount: 2000000,
      depositStatus: ContractDepositStatusEnum.HELD,
      totalPeriodicPrice: 2200000,
      renewalCount: 1, // Renewed!
      amenities: [
        {
          facilityAmenityOfferingId: amenityOfferingA._id,
          amenityId: amenity._id,
          name: 'Khóa thông minh',
          quantity: 1,
          pricePerUnit: 200000,
          billingUnit: BillingUnitEnum.MONTH,
          totalPrice: 200000,
          addedAt: peakDay,
        },
      ],
      status: ContractStatusEnum.ACTIVE,
      termsAccepted: true,
      customerSigned: true,
      staffSigned: true,
      createdAt: peakDay,
    });

    const contractA2 = await Contract.create({
      contractCode: 'CTR-A2',
      source: ContractSourceEnum.RESERVATION,
      reservationId: resA2._id,
      customerId: customerUser._id,
      facilityId: facilityA._id,
      storageUnitId: unitA2._id,
      facilityUnitTypeOfferingId: offeringSmallA._id,
      startDate: peakDay,
      endDate: new Date(peakDay.getTime() + 180 * 24 * 60 * 60 * 1000),
      actualCheckInDate: peakDay,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 2000000,
      depositAmount: 2000000,
      depositStatus: ContractDepositStatusEnum.HELD,
      totalPeriodicPrice: 2000000,
      renewalCount: 0,
      amenities: [],
      status: ContractStatusEnum.ACTIVE,
      termsAccepted: true,
      customerSigned: true,
      staffSigned: true,
      createdAt: peakDay,
    });

    const contractB1 = await Contract.create({
      contractCode: 'CTR-B1',
      source: ContractSourceEnum.WALK_IN,
      customerId: customerUser._id,
      facilityId: facilityB._id,
      storageUnitId: unitB1._id,
      facilityUnitTypeOfferingId: offeringSmallB._id,
      startDate: lowDay,
      endDate: new Date(lowDay.getTime() + 30 * 24 * 60 * 60 * 1000),
      actualCheckInDate: lowDay,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1800000,
      depositAmount: 1800000,
      depositStatus: ContractDepositStatusEnum.HELD,
      totalPeriodicPrice: 1800000,
      overdueFee: 270000,
      status: ContractStatusEnum.OVERDUE,
      termsAccepted: true,
      customerSigned: true,
      staffSigned: true,
      createdAt: lowDay,
    });

    void resA3;
    void contractA2;

    // 7. Seed Invoices & Payments
    const invoiceA1 = await Invoice.create({
      invoiceCode: 'INV-A1',
      contractId: contractA1._id,
      customerId: customerUser._id,
      facilityId: facilityA._id,
      type: InvoiceTypeEnum.FIRST_PERIOD,
      status: InvoiceStatusEnum.PAID,
      billingPeriodIndex: 1,
      periodStartDate: peakDay,
      periodEndDate: new Date(peakDay.getTime() + 30 * 24 * 60 * 60 * 1000),
      dueDate: peakDay,
      items: [
        {
          name: 'Tiền thuê kho A-101',
          quantity: 1,
          unitPrice: 2000000,
          amount: 2000000,
          itemType: InvoiceItemTypeEnum.RENT,
        },
        {
          name: 'Khóa thông minh',
          quantity: 1,
          unitPrice: 200000,
          amount: 200000,
          itemType: InvoiceItemTypeEnum.AMENITY,
        },
      ],
      subtotal: 2200000,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 2200000,
      paidAmount: 2200000,
      paidAt: peakDay,
      paymentMethod: PaymentMethodEnum.SEPAY_QR,
      issuedAt: peakDay,
      createdAt: peakDay,
    });

    await Invoice.create({
      invoiceCode: 'INV-B1',
      contractId: contractB1._id,
      customerId: customerUser._id,
      facilityId: facilityB._id,
      type: InvoiceTypeEnum.RECURRING,
      status: InvoiceStatusEnum.OVERDUE,
      billingPeriodIndex: 2,
      periodStartDate: lowDay,
      periodEndDate: new Date(lowDay.getTime() + 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days overdue (8-15d bucket)
      items: [
        {
          name: 'Tiền thuê kho B-101',
          quantity: 1,
          unitPrice: 1800000,
          amount: 1800000,
          itemType: InvoiceItemTypeEnum.RENT,
        },
      ],
      subtotal: 1800000,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 1800000,
      paidAmount: 0,
      issuedAt: lowDay,
      createdAt: lowDay,
    });

    await Payment.create({
      paymentCode: 'PAY-A1',
      purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
      invoiceId: invoiceA1._id,
      contractId: contractA1._id,
      customerId: customerUser._id,
      facilityId: facilityA._id,
      amount: 2200000,
      paidAmount: 2200000,
      method: PaymentMethodEnum.SEPAY_QR,
      status: PaymentStatusEnum.PAID,
      paidAt: peakDay,
      createdAt: peakDay,
    });

    await Payment.create({
      paymentCode: 'PAY-DEP-A1',
      purpose: PaymentPurposeEnum.RESERVATION_DEPOSIT,
      reservationId: resA1._id,
      customerId: customerUser._id,
      facilityId: facilityA._id,
      amount: 2000000,
      paidAmount: 2000000,
      method: PaymentMethodEnum.SEPAY_QR,
      status: PaymentStatusEnum.PAID,
      paidAt: peakDay,
      createdAt: peakDay,
    });

    await PaymentTransaction.create([
      {
        sepayId: 10001,
        transferAmount: 2200000,
        result: PaymentTransactionResultEnum.MATCHED,
      },
      {
        sepayId: 10002,
        transferAmount: 500000,
        result: PaymentTransactionResultEnum.UNMATCHED,
      },
    ]);

    // 8. Seed RefundRequest, Incident, SupportTicket, ApprovalRequest, AccessSchedule, InventoryMovement
    await RefundRequest.create({
      refundCode: 'REF-B1',
      facilityId: facilityB._id,
      customerId: customerUser._id,
      amount: 12000000, // >= 10M VND -> requires OPS approval
      reason: RefundRequestReasonEnum.FACILITY_FAULT,
      status: RefundRequestStatusEnum.PENDING_APPROVAL,
      requestedBy: managerFacilityB._id,
      requestedAt: peakDay,
      createdAt: peakDay,
    });

    await Incident.create({
      incidentCode: 'INC-A1',
      facilityId: facilityA._id,
      storageUnitId: unitA1._id,
      contractId: contractA1._id,
      reporterId: customerUser._id,
      reporterRole: RoleEnum.CUSTOMER,
      category: IncidentCategoryEnum.CLEANLINESS,
      severity: IncidentSeverityEnum.LOW,
      title: 'Vệ sinh hành lang',
      description: 'Cần lau dọn hành lang',
      images: ['https://example.com/inc1.jpg'],
      status: IncidentStatusEnum.CLOSED,
      resolution: {
        staffEvidenceImages: ['https://example.com/res1.jpg'],
        resolutionNotes: 'Đã vệ sinh sạch sẽ',
        repairCost: 0,
        liableParty: IncidentLiablePartyEnum.FACILITY,
        damageFee: 0,
        resolvedBy: managerFacilityA._id,
        resolvedAt: new Date(peakDay.getTime() + 2 * 60 * 60 * 1000),
      },
      closedAt: new Date(peakDay.getTime() + 3 * 60 * 60 * 1000),
      createdAt: peakDay,
    });

    await Incident.create({
      incidentCode: 'INC-B1',
      facilityId: facilityB._id,
      storageUnitId: unitB1._id,
      reporterId: managerFacilityB._id,
      reporterRole: RoleEnum.FACILITY_MANAGER,
      category: IncidentCategoryEnum.WATER_LEAK,
      severity: IncidentSeverityEnum.CRITICAL,
      title: 'Thấm dột mái kho B',
      description: 'Thấm nước nghiêm trọng',
      images: ['https://example.com/incb1.jpg'],
      status: IncidentStatusEnum.REPORTED,
      createdAt: peakDay,
    });

    await SupportTicket.create({
      ticketCode: 'SUP-A1',
      customerId: customerUser._id,
      facilityId: facilityA._id,
      contractId: contractA1._id,
      category: SupportTicketCategoryEnum.GENERAL_INQUIRY,
      priority: SupportTicketPriorityEnum.MEDIUM,
      title: 'Hỏi giờ mở cửa lễ',
      description: 'Cho hỏi lịch mở cửa',
      status: SupportTicketStatusEnum.COMPLETED,
      staffResponse: {
        responseMessage: 'Mở cửa bình thường từ 8h-20h',
        attachments: [],
        respondedBy: staffUser._id,
        respondedAt: new Date(peakDay.getTime() + 30 * 60 * 1000),
      },
      completedAt: new Date(peakDay.getTime() + 30 * 60 * 1000),
      createdAt: peakDay,
    });

    await ApprovalRequest.create({
      requesterId: managerFacilityB._id,
      facilityId: facilityB._id,
      targetType: ApprovalRequestTargetTypeEnum.FACILITY_UNIT_TYPE_OFFERING,
      action: ApprovalRequestActionEnum.UPDATE,
      payload: { description: 'Xin sửa giá kho' },
      reason: 'Cập nhật thông tin giá thuê kho',
      status: ApprovalRequestStatusEnum.PENDING,
      createdAt: peakDay,
    });

    await AccessSchedule.create({
      scheduleCode: 'ACC-A1',
      status: AccessScheduleStatusEnum.COMPLETED,
      customerId: customerUser._id,
      contractId: contractA1._id,
      facilityId: facilityA._id,
      timeSlotId: slotMorningA._id,
      scheduledDate: peakDay,
      timeSlotSnapshot: {
        slotName: 'Ca Sáng',
        startTime: '08:00',
        endTime: '10:00',
      },
      numberOfPeople: 3,
      vehicleType: 'TRUCK',
      expiresAt: new Date(peakDay.getTime() + 4 * 60 * 60 * 1000),
      checkedInAt: peakDay,
      checkedOutAt: new Date(peakDay.getTime() + 60 * 60 * 1000),
      createdAt: peakDay,
    });

    const sku = await CustomerSku.create({
      customerId: customerUser._id,
      skuCode: 'SKU-001',
      name: 'Thùng hàng điện tử',
      uom: 'thùng',
    });

    await InventoryMovement.create({
      movementCode: 'MOV-A1',
      type: MovementTypeEnum.IN,
      customerId: customerUser._id,
      contractId: contractA1._id,
      facilityId: facilityA._id,
      storageUnitId: unitA1._id,
      skuId: sku._id,
      quantity: 25,
      previousQuantity: 0,
      newQuantity: 25,
      performedBy: customerUser._id,
      createdAt: peakDay,
    });
  });

  describe('1. Executive Overview Statistics (GET /statistics/overview)', () => {
    it('should return comprehensive chain-wide overview and action items for BUSINESS_OPS_MANAGER', async () => {
      const result = await statisticsService.getOverview(
        opsUser._id.toString(),
        {}
      );

      expect(result.facilities.totalActive).toBe(2);
      expect(result.occupancy.storageUnits.total).toBe(8);
      expect(result.occupancy.storageUnits.occupied).toBe(3);
      expect(result.occupancy.storageUnits.underMaintenance).toBe(2);
      expect(result.occupancy.storageUnits.occupancyRate).toBe(37.5);

      expect(result.occupancy.storageRacks.total).toBe(3);
      expect(result.occupancy.storageRacks.rented).toBe(2);
      expect(result.occupancy.storageRacks.occupancyRate).toBeCloseTo(66.67, 1);

      expect(result.financials.collectedRevenue).toBe(4200000);
      expect(result.financials.heldDeposits).toBe(5800000);
      expect(result.financials.overdueReceivables).toBe(1800000);

      expect(result.actionRequired.pendingApprovals).toBe(1);
      expect(result.actionRequired.pendingOpsRefunds).toBe(1);
      expect(result.actionRequired.unmatchedSepayTransactions).toBe(1);
      expect(result.actionRequired.openHighCriticalIncidents).toBe(1);
    });
  });

  describe('2. Rental Trends, Peak/Low Periods & Time-Slot Demand (GET /statistics/rental-trends)', () => {
    it('should validate rentalTrendsQuerySchema to only allow month and quarter (default month)', () => {
      const defaultParsed = rentalTrendsQuerySchema.safeParse({});
      expect(defaultParsed.success).toBe(true);
      if (defaultParsed.success) {
        expect(defaultParsed.data.granularity).toBe('month');
      }

      expect(
        rentalTrendsQuerySchema.safeParse({ granularity: 'quarter' }).success
      ).toBe(true);
      expect(
        rentalTrendsQuerySchema.safeParse({ granularity: 'day' }).success
      ).toBe(false);
      expect(
        rentalTrendsQuerySchema.safeParse({ granularity: 'week' }).success
      ).toBe(false);
    });

    it('should default to 365-day month range, zero-fill all months, mark 1 peak and 1 low without overlap, and simplify dayOfWeek & timeSlot', async () => {
      const result = await statisticsService.getRentalTrends(
        opsUser._id.toString(),
        {}
      );

      expect(result.period.granularity).toBe('month');
      // 365-day default range covers at least 12 calendar months
      expect(result.timeSeries.length).toBeGreaterThanOrEqual(12);

      // Peak & Low: Top 1 each and disjoint
      expect(result.peakAndLowAnalysis.peakPeriods).toHaveLength(1);
      expect(result.peakAndLowAnalysis.lowPeriods).toHaveLength(1);

      const topPeak = result.peakAndLowAnalysis.peakPeriods[0];
      const topLow = result.peakAndLowAnalysis.lowPeriods[0];
      expect(topPeak.period).not.toBe(topLow.period);
      expect(topPeak.reservationsCreated).toBe(5);
      expect(topPeak.isPeak).toBe(true);
      expect(topPeak.isLow).toBe(false);

      expect(topLow.reservationsCreated).toBe(0);
      expect(topLow.isPeak).toBe(false);
      expect(topLow.isLow).toBe(true);

      // Walk-in contracts are separated from Reservation check-ins
      const totalResCheckIns = result.timeSeries.reduce(
        (sum, p) => sum + p.contractsCheckedIn,
        0
      );
      const totalWalkInContracts = result.timeSeries.reduce(
        (sum, p) => sum + p.walkInContracts,
        0
      );
      expect(totalResCheckIns).toBe(2); // CTR-A1, CTR-A2 (RESERVATION)
      expect(totalWalkInContracts).toBe(1); // CTR-B1 (WALK_IN)

      // timeSeries marks exact 1 peak and 1 low
      const markedPeaks = result.timeSeries.filter((p) => p.isPeak);
      const markedLows = result.timeSeries.filter((p) => p.isLow);
      expect(markedPeaks).toHaveLength(1);
      expect(markedLows).toHaveLength(1);
      expect(markedPeaks[0].period).toBe(topPeak.period);
      expect(markedLows[0].period).toBe(topLow.period);
      expect(result.timeSeries.some((p) => p.isPeak && p.isLow)).toBe(false);

      // Day of week: only reservationsCreated + busiestDay (no quietestDay / totalActivity)
      expect(result.dayOfWeekDistribution.items).toHaveLength(7);
      expect(result.dayOfWeekDistribution.busiestDay).not.toBeNull();
      expect('quietestDay' in result.dayOfWeekDistribution).toBe(false);
      for (const item of result.dayOfWeekDistribution.items) {
        expect(Object.keys(item).sort()).toEqual([
          'dayName',
          'dayOfWeek',
          'reservationsCreated',
        ]);
      }

      // TimeSlot: object { mostBookedTimeSlot, items } with only timeSlot & reservationCount
      expect(result.timeSlotDemand.mostBookedTimeSlot).toEqual({
        timeSlot: '08:00 - 10:00',
        reservationCount: 3,
      });
      const morningSlot = result.timeSlotDemand.items.find((s) =>
        s.timeSlot.includes('08:00')
      );
      const afternoonSlot = result.timeSlotDemand.items.find((s) =>
        s.timeSlot.includes('14:00')
      );
      expect(morningSlot).toEqual({
        timeSlot: '08:00 - 10:00',
        reservationCount: 3,
      });
      expect(afternoonSlot).toEqual({
        timeSlot: '14:00 - 16:00',
        reservationCount: 2,
      });
      for (const item of result.timeSlotDemand.items) {
        expect(Object.keys(item).sort()).toEqual([
          'reservationCount',
          'timeSlot',
        ]);
      }

      // Billing unit breakdown: 4 MONTH vs 1 DAY
      const monthUnit = result.durationBreakdown.byBillingUnit.find(
        (b) => b.billingUnit === BillingUnitEnum.MONTH
      );
      const dayUnit = result.durationBreakdown.byBillingUnit.find(
        (b) => b.billingUnit === BillingUnitEnum.DAY
      );
      expect(monthUnit?.reservationCount).toBe(4);
      expect(dayUnit?.reservationCount).toBe(1);
      expect(result.hourOfDayDistribution).toHaveLength(24);
    });

    it('should support quarter granularity and zero-fill quarters accurately', async () => {
      const result = await statisticsService.getRentalTrends(
        opsUser._id.toString(),
        {
          fromDate: '2026-01-01',
          toDate: '2026-12-31',
          granularity: RentalTrendsGranularityEnum.QUARTER,
        }
      );

      expect(result.period.granularity).toBe('quarter');
      expect(result.timeSeries.map((p) => p.period)).toEqual([
        '2026-Q1',
        '2026-Q2',
        '2026-Q3',
        '2026-Q4',
      ]);
      expect(result.peakAndLowAnalysis.peakPeriods).toHaveLength(1);
      expect(result.peakAndLowAnalysis.lowPeriods).toHaveLength(1);
      expect(result.peakAndLowAnalysis.peakPeriods[0].period).not.toBe(
        result.peakAndLowAnalysis.lowPeriods[0].period
      );
      expect(result.timeSeries.filter((p) => p.isPeak)).toHaveLength(1);
      expect(result.timeSeries.filter((p) => p.isLow)).toHaveLength(1);
    });

    it('should keep peak and return empty lowPeriods when periods tie or only 1 period exists, and empty both when zero bookings', async () => {
      // Seed 2 equal months in Q2/Q3 2025 (isolated from beforeEach 2026 data)
      const offering = await FacilityUnitTypeOffering.findOne({
        facilityId: facilityA._id,
      });
      const unit = await StorageUnit.findOne({ facilityId: facilityA._id });

      await Reservation.create([
        {
          reservationCode: 'RES-TIE-1',
          customerId: customerUser._id,
          facilityId: facilityA._id,
          facilityUnitTypeOfferingId: offering!._id,
          storageUnitId: unit!._id,
          startDate: new Date('2025-04-10T03:00:00.000Z'),
          checkInDate: new Date('2025-04-10T03:00:00.000Z'),
          checkInTimeSlot: '08:00 - 10:00',
          rentalDuration: 1,
          billingUnit: BillingUnitEnum.MONTH,
          basePrice: 2000000,
          depositAmount: 2000000,
          totalAmount: 2000000,
          status: ReservationStatusEnum.COMPLETED,
          refundStatus: RefundStatusEnum.NONE,
          termsAccepted: true,
          createdAt: new Date('2025-04-10T03:00:00.000Z'),
        },
        {
          reservationCode: 'RES-TIE-2',
          customerId: customerUser._id,
          facilityId: facilityA._id,
          facilityUnitTypeOfferingId: offering!._id,
          storageUnitId: unit!._id,
          startDate: new Date('2025-05-10T03:00:00.000Z'),
          checkInDate: new Date('2025-05-10T03:00:00.000Z'),
          checkInTimeSlot: '08:00 - 10:00',
          rentalDuration: 1,
          billingUnit: BillingUnitEnum.MONTH,
          basePrice: 2000000,
          depositAmount: 2000000,
          totalAmount: 2000000,
          status: ReservationStatusEnum.COMPLETED,
          refundStatus: RefundStatusEnum.NONE,
          termsAccepted: true,
          createdAt: new Date('2025-05-10T03:00:00.000Z'),
        },
      ]);

      // 1. Two months tied at 1 booking each -> peak = latest (2025-05), low = []
      const tiedRes = await statisticsService.getRentalTrends(
        opsUser._id.toString(),
        {
          fromDate: '2025-04-01',
          toDate: '2025-05-31',
          granularity: RentalTrendsGranularityEnum.MONTH,
        }
      );
      expect(tiedRes.timeSeries.map((p) => p.period)).toEqual([
        '2025-04',
        '2025-05',
      ]);
      expect(tiedRes.peakAndLowAnalysis.peakPeriods).toHaveLength(1);
      expect(tiedRes.peakAndLowAnalysis.peakPeriods[0].period).toBe('2025-05');
      expect(tiedRes.peakAndLowAnalysis.lowPeriods).toEqual([]);
      expect(
        tiedRes.timeSeries.find((p) => p.period === '2025-05')?.isPeak
      ).toBe(true);
      expect(tiedRes.timeSeries.every((p) => !p.isLow)).toBe(true);

      // 2. Single month -> peak = 2025-04, low = []
      const singleRes = await statisticsService.getRentalTrends(
        opsUser._id.toString(),
        {
          fromDate: '2025-04-01',
          toDate: '2025-04-30',
          granularity: RentalTrendsGranularityEnum.MONTH,
        }
      );
      expect(singleRes.peakAndLowAnalysis.peakPeriods).toHaveLength(1);
      expect(singleRes.peakAndLowAnalysis.peakPeriods[0].period).toBe(
        '2025-04'
      );
      expect(singleRes.peakAndLowAnalysis.lowPeriods).toEqual([]);

      // 3. Zero bookings in entire range -> both empty, busiestDay null, mostBookedTimeSlot null
      const zeroRes = await statisticsService.getRentalTrends(
        opsUser._id.toString(),
        {
          fromDate: '2024-01-01',
          toDate: '2024-03-31',
          granularity: RentalTrendsGranularityEnum.MONTH,
        }
      );
      expect(zeroRes.timeSeries).toHaveLength(3);
      expect(zeroRes.peakAndLowAnalysis.peakPeriods).toEqual([]);
      expect(zeroRes.peakAndLowAnalysis.lowPeriods).toEqual([]);
      expect(zeroRes.timeSeries.every((p) => !p.isPeak && !p.isLow)).toBe(true);
      expect(zeroRes.dayOfWeekDistribution.busiestDay).toBeNull();
      expect(zeroRes.timeSlotDemand.mostBookedTimeSlot).toBeNull();
    });
  });

  describe('3. Facility KPI Leaderboard & Scorecard (GET /statistics/facilities-kpi)', () => {
    it('should accurately score and rank Facility A (High KPI) above Facility B (Low KPI)', async () => {
      const result = await statisticsService.getFacilitiesKpi(
        opsUser._id.toString(),
        {
          sortBy: FacilityKpiSortByEnum.KPI_SCORE,
          sortOrder: 'desc',
        }
      );

      expect(result.items).toHaveLength(2);

      const firstRank = result.items[0];
      const secondRank = result.items[1];

      expect(firstRank.facility.code).toBe('SGN01');
      expect(firstRank.rank).toBe(1);
      expect(secondRank.facility.code).toBe('HAN01');
      expect(secondRank.rank).toBe(2);

      expect(firstRank.kpiScore).toBeGreaterThan(secondRank.kpiScore);
      expect([
        FacilityKpiTierEnum.EXCELLENT,
        FacilityKpiTierEnum.GOOD,
      ]).toContain(firstRank.kpiTier);
      expect(secondRank.kpiTier).toBe(FacilityKpiTierEnum.NEEDS_IMPROVEMENT);

      // Facility B should have operational alerts for facility fault & low occupancy & overdue
      expect(secondRank.alerts.length).toBeGreaterThan(0);
      expect(secondRank.operations.facilityFaultCount).toBe(1);
    });
  });

  describe('4. Financial, AR Overdue Aging & Refund Analytics (GET /statistics/financial-analytics)', () => {
    it('should return itemized revenue breakdown, overdue aging buckets, and refund reasons', async () => {
      const result = await statisticsService.getFinancialAnalytics(
        opsUser._id.toString(),
        {}
      );

      const rentItem = result.revenueByItemType.find(
        (i) => i.itemType === InvoiceItemTypeEnum.RENT
      );
      const amenityItem = result.revenueByItemType.find(
        (i) => i.itemType === InvoiceItemTypeEnum.AMENITY
      );
      expect(rentItem?.paidAmount).toBe(2000000);
      expect(amenityItem?.paidAmount).toBe(200000);

      // Overdue aging: INV-B1 is 10 days overdue -> bucket '8_to_15_days'
      const agingBucket = result.overdueAging.buckets.find(
        (b) => b.bucket === '8_to_15_days'
      );
      expect(agingBucket?.invoiceCount).toBe(1);
      expect(agingBucket?.overdueAmount).toBe(1800000);

      // Refund analytics: REF-B1 (12,000,000 VND, FACILITY_FAULT)
      const faultRefund = result.refundAnalytics.byReason.find(
        (r) => r.reason === RefundRequestReasonEnum.FACILITY_FAULT
      );
      expect(faultRefund?.count).toBe(1);
      expect(faultRefund?.totalAmount).toBe(12000000);
    });
  });

  describe('5. Product Mix, Amenity Attach Rate & Operations Funnel (GET /statistics/product-and-operations)', () => {
    it('should return unit type performance, rack zone performance, amenity attach rate, booking funnel and warehouse traffic', async () => {
      const result = await statisticsService.getProductAndOperations(
        opsUser._id.toString(),
        {}
      );

      expect(result.unitTypePerformance.length).toBeGreaterThanOrEqual(2);
      const primeZone = result.rackZonePerformance.find(
        (z) => z.zone === RackZoneEnum.PRIME
      );
      expect(primeZone?.totalRacks).toBe(2);
      expect(primeZone?.rentedRacks).toBe(2);
      expect(primeZone?.occupancyRate).toBe(100);

      // 1 out of 3 contracts has an amenity -> 33.33% attach rate
      expect(result.amenityPerformance.contractAttachRate).toBeCloseTo(
        33.33,
        1
      );

      // Booking funnel: 5 created, 4 paid, 3 completed
      expect(result.bookingFunnel.totalCreated).toBe(5);
      expect(result.bookingFunnel.paidCount).toBe(4);
      expect(result.bookingFunnel.completedCount).toBe(3);

      // Warehouse traffic
      expect(result.warehouseTraffic.accessSchedules.completedCount).toBe(1);
      expect(result.warehouseTraffic.accessSchedules.totalVisitors).toBe(3);
      expect(result.warehouseTraffic.inventoryMovements.inboundQuantity).toBe(
        25
      );
    });
  });

  describe('6. Two-Layer RBAC & Date Range Validation (Rule 14)', () => {
    it('should allow FACILITY_MANAGER to view only their assigned facility and block cross-facility access (403 MESSAGE_CODE_122)', async () => {
      // Facility Manager A querying without facilityId -> auto-scoped to Facility A
      const scopedOverview = await statisticsService.getOverview(
        managerFacilityA._id.toString(),
        {}
      );
      expect(scopedOverview.facilities.totalActive).toBe(1);
      expect(scopedOverview.occupancy.storageUnits.total).toBe(4);

      const scopedKpi = await statisticsService.getFacilitiesKpi(
        managerFacilityA._id.toString(),
        {}
      );
      expect(scopedKpi.items).toHaveLength(1);
      expect(scopedKpi.items[0].facility.code).toBe('SGN01');

      // Facility Manager A attempting to query Facility B -> 403 MESSAGE_CODE_122
      await expect(
        statisticsService.getOverview(managerFacilityA._id.toString(), {
          facilityId: facilityB._id.toString(),
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_122,
      });
    });

    it('should block CUSTOMER and FACILITY_STAFF from accessing statistics endpoints (403 MESSAGE_CODE_103)', async () => {
      await expect(
        statisticsService.getOverview(customerUser._id.toString(), {})
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });

      await expect(
        statisticsService.getFacilitiesKpi(staffUser._id.toString(), {})
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });

    it('should reject invalid date ranges or ranges exceeding 366 days (400 MESSAGE_CODE_820)', async () => {
      await expect(
        statisticsService.getOverview(adminUser._id.toString(), {
          fromDate: '2026-10-20',
          toDate: '2026-10-10', // fromDate > toDate
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_820,
      });

      await expect(
        statisticsService.getRentalTrends(adminUser._id.toString(), {
          fromDate: '2025-01-01',
          toDate: '2026-06-01', // > 366 days
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_820,
      });
    });

    it('should return standard ApiResponse<T> envelope in StatisticsController and throw 401 when caller is missing', async () => {
      const mockReq = {
        user: { _id: opsUser._id, role: RoleEnum.BUSINESS_OPS_MANAGER },
        headers: {},
        cookies: {},
      } as unknown as ExpressRequest;

      const apiRes = await statisticsController.getOverview(mockReq, {});
      expect(apiRes.success).toBe(true);
      expect(apiRes.statusCode).toBe(200);
      expect(apiRes.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_001);
      expect(apiRes.data?.facilities.totalActive).toBe(2);

      const unauthReq = {
        headers: {},
        cookies: {},
      } as unknown as ExpressRequest;

      await expect(
        statisticsController.getOverview(unauthReq, {})
      ).rejects.toMatchObject({
        statusCode: 401,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_102,
      });
    });
  });
});
