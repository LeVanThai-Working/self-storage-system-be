import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { Invoice } from '../src/modules/invoice/invoice.model.ts';
import { InvoiceRepository } from '../src/modules/invoice/invoice.repository.ts';
import { InvoiceService } from '../src/modules/invoice/invoice.service.ts';
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
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  BillingUnitEnum,
} from '../src/common/enums/billing.enum.ts';
import {
  RoleEnum,
  UserStatusEnum,
  AuthProviderEnum,
} from '../src/common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  ContractStatusEnum,
  ContractSourceEnum,
} from '../src/common/enums/contract.enum.ts';
import { RefundReasonEnum } from '../src/common/enums/refundRequest.enum.ts';

describe('billing/T3.2: Check-out Settlement Invoice Integration Tests', () => {
  let invoiceRepo: InvoiceRepository;
  let contractRepo: ContractRepository;
  let reservationRepo: ReservationRepository;
  let storageUnitRepo: StorageUnitRepository;
  let amenityOfferingRepo: FacilityAmenityOfferingRepository;
  let unitTypeOfferingRepo: FacilityUnitTypeOfferingRepository;
  let facilityRepo: FacilityRepository;
  let userRepo: UserRepository;
  let refundRequestRepo: RefundRequestRepository;
  let refundRequestService: RefundRequestService;
  let invoiceService: InvoiceService;
  let contractService: ContractService;

  let customerUser: InstanceType<typeof User>;
  let staffUser: InstanceType<typeof User>;
  let facilityDoc: InstanceType<typeof Facility>;
  let storageUnitDoc: InstanceType<typeof StorageUnit>;

  beforeAll(async () => {
    await setupTestDB();

    invoiceRepo = new InvoiceRepository(Invoice);
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
      contractRepo,
      reservationRepo,
      userRepo
    );

    invoiceService = new InvoiceService(
      invoiceRepo,
      contractRepo,
      userRepo,
      undefined,
      undefined,
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
      undefined,
      refundRequestService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );

    contractService.setInvoiceService(invoiceService);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    facilityDoc = await Facility.create({
      facilityCode: 'FAC-SETTLE-01',
      name: 'Kho Quyết Toán SSM',
      address: 'Hà Nội',
      city: 'Hà Nội',
      status: FacilityStatusEnum.ACTIVE,
    });

    storageUnitDoc = await StorageUnit.create({
      unitNumber: 'U-SETTLE-101',
      facilityId: facilityDoc._id,
      unitTypeId: new Types.ObjectId(),
      status: StorageUnitStatusEnum.OCCUPIED,
      billingUnit: BillingUnitEnum.MONTH,
    });

    customerUser = await User.create({
      name: 'Khách Hàng Quyết Toán',
      email: 'customer.settle@example.com',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      password: 'password123',
    });

    staffUser = await User.create({
      name: 'Nhân Viên Quyết Toán',
      email: 'staff.settle@example.com',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      assignedFacilityId: facilityDoc._id,
      password: 'password123',
    });
  });

  it('1. should generate a PAID settlement invoice and RefundRequest when deposit covers all fees', async () => {
    const contract = await Contract.create({
      contractCode: 'CTR-SETTLE-01',
      source: ContractSourceEnum.WALK_IN,
      customerId: customerUser._id,
      facilityId: facilityDoc._id,
      storageUnitId: storageUnitDoc._id,
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 2000000,
      depositAmount: 3000000,
      totalPeriodicPrice: 2000000,
      damageFee: 500000,
      status: ContractStatusEnum.ACTIVE,
      termsAccepted: true,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-11-01'),
    });

    const res = await contractService.checkOutContract(
      String(contract._id),
      String(staffUser._id),
      RoleEnum.FACILITY_STAFF,
      {
        damageFee: 200000,
        inspectionNotes: 'Trầy xước nhẹ cửa kho',
        actualCheckOutDate: new Date('2026-11-01T10:00:00Z'),
      }
    );

    expect(res.status).toBe(ContractStatusEnum.COMPLETED);
    expect(res.damageFee).toBe(700000);
    expect(res.refundAmount).toBe(2300000);
    expect(res.additionalPaymentRequired).toBe(0);

    const invoices = await Invoice.find({ contractId: contract._id });
    expect(invoices.length).toBe(1);

    const settlementInv = invoices[0];
    expect(settlementInv.type).toBe(InvoiceTypeEnum.CHECK_OUT_SETTLEMENT);
    expect(settlementInv.status).toBe(InvoiceStatusEnum.PAID);
    expect(settlementInv.totalAmount).toBe(700000);
    expect(settlementInv.paidAmount).toBe(700000);
    expect(settlementInv.items.length).toBeGreaterThanOrEqual(1);

    const refunds = await RefundRequest.find({ contractId: contract._id });
    expect(refunds.length).toBe(1);
    expect(refunds[0].amount).toBe(2300000);
    expect(refunds[0].reason).toBe(RefundReasonEnum.DEPOSIT_SETTLEMENT);
  });

  it('2. should generate an ISSUED settlement invoice with balance due when deposit is insufficient', async () => {
    const contract = await Contract.create({
      contractCode: 'CTR-SETTLE-02',
      source: ContractSourceEnum.WALK_IN,
      customerId: customerUser._id,
      facilityId: facilityDoc._id,
      storageUnitId: storageUnitDoc._id,
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1000000,
      depositAmount: 1000000,
      totalPeriodicPrice: 1000000,
      damageFee: 0,
      status: ContractStatusEnum.ACTIVE,
      termsAccepted: true,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-11-01'),
    });

    const res = await contractService.checkOutContract(
      String(contract._id),
      String(staffUser._id),
      RoleEnum.FACILITY_STAFF,
      {
        damageFee: 1600000,
        inspectionNotes: 'Hỏng khóa và biến dạng vách ngăn',
        actualCheckOutDate: new Date('2026-11-01T10:00:00Z'),
      }
    );

    expect(res.status).toBe(ContractStatusEnum.COMPLETED);
    expect(res.damageFee).toBe(1600000);
    expect(res.refundAmount).toBe(0);
    expect(res.additionalPaymentRequired).toBe(600000);

    const invoices = await Invoice.find({ contractId: contract._id });
    expect(invoices.length).toBe(1);

    const settlementInv = invoices[0];
    expect(settlementInv.type).toBe(InvoiceTypeEnum.CHECK_OUT_SETTLEMENT);
    expect(settlementInv.status).toBe(InvoiceStatusEnum.ISSUED);
    expect(settlementInv.totalAmount).toBe(600000);
    expect(settlementInv.paidAmount).toBe(0);

    const refunds = await RefundRequest.find({ contractId: contract._id });
    expect(refunds.length).toBe(0);
  });
});
