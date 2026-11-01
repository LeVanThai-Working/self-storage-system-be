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
import { InvoicePdfService } from '../src/modules/invoice/services/invoicePdf.service.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import type { ReservationService } from '../src/modules/reservation/reservation.service.ts';
import {
  Payment,
  PaymentTransaction,
} from '../src/modules/payment/payment.model.ts';
import { PaymentRepository } from '../src/modules/payment/payment.repository.ts';
import { PaymentService } from '../src/modules/payment/payment.service.ts';
import { SepayService } from '../src/modules/payment/sepay.service.ts';
import { getSepayConfig } from '../src/config/sepay.config.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { LegalEntity } from '../src/modules/legalEntity/legalEntity.model.ts';
import { SigningAuthorization } from '../src/modules/signingAuthorization/signingAuthorization.model.ts';
import { SigningAuthorizationRepository } from '../src/modules/signingAuthorization/signingAuthorization.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { Profile } from '../src/modules/profile/profile.model.ts';
import { ProfileRepository } from '../src/modules/profile/profile.repository.ts';

import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
  BillingUnitEnum,
} from '../src/common/enums/billing.enum.ts';
import {
  PaymentPurposeEnum,
  PaymentStatusEnum,
  PaymentMethodEnum,
} from '../src/common/enums/payment.enum.ts';
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
  ContractAddendumTypeEnum,
  ContractAddendumStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import {
  RefundReasonEnum,
  RefundRequestStatusEnum,
} from '../src/common/enums/refundRequest.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';

describe('billing/T4.1: End-to-End Invoice Lifecycle & Multi-Role Security Matrix Tests', () => {
  let invoiceRepo: InvoiceRepository;
  let contractRepo: ContractRepository;
  let reservationRepo: ReservationRepository;
  let paymentRepo: PaymentRepository;
  let refundRepo: RefundRequestRepository;
  let storageUnitRepo: StorageUnitRepository;
  let amenityOfferingRepo: FacilityAmenityOfferingRepository;
  let unitTypeOfferingRepo: FacilityUnitTypeOfferingRepository;
  let facilityRepo: FacilityRepository;
  let userRepo: UserRepository;
  let profileRepo: ProfileRepository;
  let signingAuthRepo: SigningAuthorizationRepository;

  let invoiceService: InvoiceService;
  let contractService: ContractService;
  let paymentService: PaymentService;
  let refundService: RefundRequestService;
  let invoicePdfService: InvoicePdfService;

  let customerUser: InstanceType<typeof User>;
  let otherCustomerUser: InstanceType<typeof User>;
  let staffUser: InstanceType<typeof User>;
  let otherFacilityStaff: InstanceType<typeof User>;
  let managerUser: InstanceType<typeof User>;
  let opsUser: InstanceType<typeof User>;

  let legalEntityDoc: InstanceType<typeof LegalEntity>;
  let facilityDoc: InstanceType<typeof Facility>;
  let otherFacilityDoc: InstanceType<typeof Facility>;
  let storageUnitDoc: InstanceType<typeof StorageUnit>;
  let upgradedUnitDoc: InstanceType<typeof StorageUnit>;
  let offeringDoc: InstanceType<typeof FacilityUnitTypeOffering>;

  beforeAll(async () => {
    await setupTestDB();

    invoiceRepo = new InvoiceRepository(Invoice);
    contractRepo = new ContractRepository(Contract);
    reservationRepo = new ReservationRepository(Reservation);
    paymentRepo = new PaymentRepository(Payment, PaymentTransaction);
    refundRepo = new RefundRequestRepository(RefundRequest);
    storageUnitRepo = new StorageUnitRepository(StorageUnit);
    amenityOfferingRepo = new FacilityAmenityOfferingRepository(
      FacilityAmenityOffering
    );
    unitTypeOfferingRepo = new FacilityUnitTypeOfferingRepository(
      FacilityUnitTypeOffering
    );
    facilityRepo = new FacilityRepository(Facility);
    userRepo = new UserRepository(User);
    profileRepo = new ProfileRepository(Profile);
    signingAuthRepo = new SigningAuthorizationRepository(SigningAuthorization);
    invoicePdfService = new InvoicePdfService();

    refundService = new RefundRequestService(
      refundRepo,
      userRepo,
      undefined,
      undefined
    );

    invoiceService = new InvoiceService(
      invoiceRepo,
      contractRepo,
      userRepo,
      undefined,
      paymentRepo,
      undefined,
      invoicePdfService
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
      refundService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      signingAuthRepo,
      profileRepo,
      undefined,
      undefined
    );

    const sepayService = new SepayService(getSepayConfig());

    paymentService = new PaymentService(
      paymentRepo,
      sepayService,
      reservationRepo,
      contractRepo,
      {} as unknown as ReservationService,
      contractService,
      undefined,
      userRepo,
      refundService,
      invoiceRepo,
      invoiceService
    );

    contractService.setInvoiceService(invoiceService);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    legalEntityDoc = await LegalEntity.create({
      code: 'LE-E2E-SSM',
      companyName: 'CÔNG TY TNHH HỆ THỐNG LƯU TRỮ THÔNG MINH SSM',
      taxCode: '0109998888',
      registeredAddress: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
      legalRepresentative: {
        name: 'Trần Văn Giám Đốc',
        title: 'Tổng Giám Đốc',
        idNumber: '001099000123',
      },
      bankAccount: {
        bankName: 'MB Bank',
        accountNumber: '0988888888',
        accountHolder: 'CONG TY TNHH HE THONG LUU TRU THONG MINH SSM',
      },
      phone: '0243999999',
      email: 'legal@smartstorage.vn',
      status: 'active',
    });

    facilityDoc = await Facility.create({
      facilityCode: 'FAC-E2E-01',
      name: 'Kho Cơ Sở 1 SSM',
      address: '123 Phố Huế, Hà Nội',
      city: 'Hà Nội',
      status: FacilityStatusEnum.ACTIVE,
      legalEntityId: legalEntityDoc._id,
    });

    otherFacilityDoc = await Facility.create({
      facilityCode: 'FAC-E2E-02',
      name: 'Kho Cơ Sở 2 SSM',
      address: '456 Nguyễn Huệ, TP.HCM',
      city: 'Hồ Chí Minh',
      status: FacilityStatusEnum.ACTIVE,
      legalEntityId: legalEntityDoc._id,
    });

    storageUnitDoc = await StorageUnit.create({
      unitNumber: 'U-E2E-101',
      facilityId: facilityDoc._id,
      unitTypeId: new Types.ObjectId(),
      status: StorageUnitStatusEnum.AVAILABLE,
      billingUnit: BillingUnitEnum.MONTH,
    });

    upgradedUnitDoc = await StorageUnit.create({
      unitNumber: 'U-E2E-102-VIP',
      facilityId: facilityDoc._id,
      unitTypeId: new Types.ObjectId(),
      status: StorageUnitStatusEnum.AVAILABLE,
      billingUnit: BillingUnitEnum.MONTH,
    });

    offeringDoc = await FacilityUnitTypeOffering.create({
      facilityId: facilityDoc._id,
      unitTypeId: new Types.ObjectId(),
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 1500000,
      depositMultiplier: 1,
      minRentalDays: 30,
      status: 'active',
    });

    customerUser = await User.create({
      name: 'Khách Hàng E2E',
      email: 'customer.e2e@example.com',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      password: 'password123',
    });

    otherCustomerUser = await User.create({
      name: 'Khách Hàng Khác',
      email: 'other.customer@example.com',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      password: 'password123',
    });

    staffUser = await User.create({
      name: 'Nhân Viên Cơ Sở 1',
      email: 'staff1@example.com',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      assignedFacilityId: facilityDoc._id,
      password: 'password123',
    });

    otherFacilityStaff = await User.create({
      name: 'Nhân Viên Cơ Sở 2',
      email: 'staff2@example.com',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      assignedFacilityId: otherFacilityDoc._id,
      password: 'password123',
    });

    managerUser = await User.create({
      name: 'Quản Lý Cơ Sở 1',
      email: 'manager1@example.com',
      role: RoleEnum.FACILITY_MANAGER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      assignedFacilityId: facilityDoc._id,
      password: 'password123',
    });

    opsUser = await User.create({
      name: 'Vận Hành Toàn Hệ Thống',
      email: 'ops@example.com',
      role: RoleEnum.BUSINESS_OPS_MANAGER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      password: 'password123',
    });

    await SigningAuthorization.create({
      legalEntityId: legalEntityDoc._id,
      authorizedUserId: managerUser._id,
      facilityIds: [facilityDoc._id],
      authorizationNumber: 'AUTH-E2E-2026',
      issuedDate: new Date('2026-01-01'),
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2027-01-01'),
      documentUrl: 'https://example.com/auth.pdf',
      fileHash: 'sha256-mock-auth-hash',
      status: 'active',
    });
  });

  describe('Part 1: Full E2E Invoice Lifecycle Walkthrough', () => {
    it('walks through contract creation, SePay payment, T-7 recurring invoice, overdue lock, repayment restore, addendum upgrade incidental, and check-out liquidation', async () => {
      const now = new Date('2026-11-01T08:00:00Z');
      const contractStartDate = new Date('2026-11-01T00:00:00Z');
      const contractEndDate = new Date('2027-02-01T00:00:00Z'); // 3 months

      // 1. Create Walk-In Contract & First Period Invoice
      const contract = await Contract.create({
        contractCode: 'CTR-E2E-001',
        source: ContractSourceEnum.WALK_IN,
        customerId: customerUser._id,
        facilityId: facilityDoc._id,
        storageUnitId: storageUnitDoc._id,
        facilityUnitTypeOfferingId: offeringDoc._id,
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1500000,
        depositAmount: 1500000,
        totalPeriodicPrice: 1500000,
        status: ContractStatusEnum.DRAFT,
        termsAccepted: true,
        startDate: contractStartDate,
        endDate: contractEndDate,
      });

      const invPeriod1 =
        await invoiceService.generateFirstPeriodInvoice(contract);
      expect(invPeriod1.status).toBe(InvoiceStatusEnum.ISSUED);
      expect(invPeriod1.type).toBe(InvoiceTypeEnum.FIRST_PERIOD);
      expect(invPeriod1.billingPeriodIndex).toBe(1);
      expect(invPeriod1.totalAmount).toBe(1500000);

      // 2. Customer creates payment order for Period 1 Invoice
      const paymentOrder = await paymentService.createPayment(
        String(customerUser._id),
        RoleEnum.CUSTOMER,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: String(invPeriod1._id),
        }
      );
      expect(paymentOrder.purpose).toBe(PaymentPurposeEnum.INVOICE_PAYMENT);
      expect(paymentOrder.status).toBe(PaymentStatusEnum.PENDING);
      expect(paymentOrder.qrUrl).toContain('sepay');

      // 3. SePay Webhook arrives: settle Period 1 Invoice
      const sepayConfig = getSepayConfig();
      const webhookPayload = {
        id: 998811,
        gateway: sepayConfig.bankName,
        transactionDate: '2026-11-01 08:30:00',
        accountNumber: sepayConfig.accountNumber,
        code: null,
        content: `Thanh toan hoa don ${paymentOrder.paymentCode}`,
        transferType: 'in' as const,
        transferAmount: 1500000,
        accumulated: 1500000,
        subAccount: null,
        referenceCode: 'FT261101998811',
        description: 'SePay Webhook transfer in',
      };

      const webhookResult =
        await paymentService.handleSepayWebhook(webhookPayload);
      expect(webhookResult.success).toBe(true);

      const paidInv1 = await Invoice.findById(invPeriod1._id);
      expect(paidInv1?.status).toBe(InvoiceStatusEnum.PAID);
      expect(paidInv1?.paidAmount).toBe(1500000);

      // Mark contract active after initial settlement
      await Contract.findByIdAndUpdate(contract._id, {
        status: ContractStatusEnum.ACTIVE,
        firstPeriodPaidAt: now,
      });

      // 4. Automation at T-7: Recurring invoice generation scan for Period 2
      // Simulate advance to 2026-11-24 (7 days before period 2 starts on 2026-12-01)
      const t7ScanResult = await invoiceService.processRecurringInvoicesScan({
        now: new Date('2026-11-24T01:00:00Z'),
      });
      expect(t7ScanResult.scannedCount).toBeGreaterThanOrEqual(1);

      const invPeriod2 = await invoiceRepo.findActiveByContractAndPeriod(
        String(contract._id),
        2,
        InvoiceTypeEnum.RECURRING
      );
      expect(invPeriod2).toBeDefined();
      expect(invPeriod2?.status).toBe(InvoiceStatusEnum.ISSUED);
      expect(invPeriod2?.totalAmount).toBe(1500000);

      // 5. Automation Grace Period scan: Invoice Period 2 goes OVERDUE (due 2026-12-01, +3d grace = 2026-12-04)
      const overdueScanResult = await invoiceService.processOverdueInvoicesScan(
        {
          now: new Date('2026-12-05T02:00:00Z'),
        }
      );
      expect(overdueScanResult.markedOverdueCount).toBeGreaterThanOrEqual(1);

      const overdueInv2 = await Invoice.findById(invPeriod2?._id);
      expect(overdueInv2?.status).toBe(InvoiceStatusEnum.OVERDUE);

      const overdueContract = await Contract.findById(contract._id);
      expect(overdueContract?.status).toBe(ContractStatusEnum.OVERDUE);

      // 6. Customer pays overdue invoice via SePay: invoice PAID and contract restored to ACTIVE
      const overduePayment = await paymentService.createPayment(
        String(customerUser._id),
        RoleEnum.CUSTOMER,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: String(overdueInv2?._id),
        }
      );

      await paymentService.handleSepayWebhook({
        id: 998822,
        gateway: sepayConfig.bankName,
        transactionDate: '2026-11-01 11:30:00',
        accountNumber: sepayConfig.accountNumber,
        code: null,
        content: `Tra no hoa don ${overduePayment.paymentCode}`,
        transferType: 'in' as const,
        transferAmount: 1500000,
        accumulated: 3000000,
        subAccount: null,
        referenceCode: 'FT261205998822',
        description: 'SePay Webhook repay overdue invoice',
      });

      const clearedInv2 = await Invoice.findById(invPeriod2?._id);
      expect(clearedInv2?.status).toBe(InvoiceStatusEnum.PAID);

      const restoredContract = await Contract.findById(contract._id);
      expect(restoredContract?.status).toBe(ContractStatusEnum.ACTIVE);

      // 7. Addendum Upgrade: UNIT_CHANGE pro-rata calculation and INCIDENTAL invoice
      const addendumId = new Types.ObjectId();
      await Contract.findByIdAndUpdate(contract._id, {
        addendums: [
          {
            _id: addendumId,
            addendumCode: 'ADD-E2E-VIP-01',
            type: ContractAddendumTypeEnum.UNIT_CHANGE,
            previousStorageUnitId: storageUnitDoc._id,
            newStorageUnitId: upgradedUnitDoc._id,
            status: ContractAddendumStatusEnum.DRAFT,
            requestedBy: customerUser._id,
            requestedAt: new Date('2026-12-15'),
            customerSigned: true,
            customerSignedAt: new Date('2026-12-15'),
            staffSigned: false,
            amenities: [],
            totalPeriodicPrice: 2100000, // 70k/day vs 50k/day -> diff 20k/day
            damageFee: 0,
          },
        ],
      });

      await contractService.staffSignAddendum(
        String(contract._id),
        String(addendumId),
        String(managerUser._id),
        RoleEnum.FACILITY_MANAGER,
        {
          termsAccepted: true,
          signedAddendumFileUrls: ['https://example.com/scan-addendum.pdf'],
        }
      );

      const incidentalInvoices = await Invoice.find({
        contractId: contract._id,
        type: InvoiceTypeEnum.INCIDENTAL,
      });
      expect(incidentalInvoices.length).toBe(1);
      const incidentalInv = incidentalInvoices[0];
      expect(incidentalInv.status).toBe(InvoiceStatusEnum.ISSUED);
      expect(incidentalInv.totalAmount).toBeGreaterThan(0);

      // Staff confirms manual cash payment for incidental invoice
      const confirmManualResult = await invoiceService.confirmManualPayment(
        String(incidentalInv._id),
        {
          paymentMethod: PaymentMethodEnum.CASH,
          proofImageUrl: 'https://example.com/cash-receipt.jpg',
          note: 'Thu tiền mặt chênh lệch nâng hạng phòng kho tại quầy',
        },
        String(staffUser._id),
        RoleEnum.FACILITY_STAFF
      );
      expect(confirmManualResult.status).toBe(InvoiceStatusEnum.PAID);
      expect(confirmManualResult.paidAmount).toBe(incidentalInv.totalAmount);

      // 8. Contract Check-Out Liquidation: damageFee + deposit offset -> Refund excess deposit
      // Contract depositAmount: 1,500,000 VND. Damage fee: 500,000 VND -> Refund 1,000,000 VND
      const checkedOut = await contractService.checkOutContract(
        String(contract._id),
        String(managerUser._id),
        RoleEnum.FACILITY_MANAGER,
        {
          termsAccepted: true,
          damageFee: 500000,
          notes: 'Khách hàng hoàn tất trả kho, bồi thường xước sàn',
        }
      );
      expect(checkedOut.status).toBe(ContractStatusEnum.COMPLETED);

      const checkoutInvoices = await Invoice.find({
        contractId: contract._id,
        type: InvoiceTypeEnum.CHECK_OUT_SETTLEMENT,
      });
      expect(checkoutInvoices.length).toBe(1);
      const settlementInv = checkoutInvoices[0];
      expect(settlementInv.status).toBe(InvoiceStatusEnum.PAID);
      expect(settlementInv.totalAmount).toBe(500000);

      // Verify excess deposit created RefundRequest
      const refundRequests = await RefundRequest.find({
        contractId: contract._id,
        reason: RefundReasonEnum.DEPOSIT_SETTLEMENT,
      });
      expect(refundRequests.length).toBe(1);
      expect(refundRequests[0].amount).toBe(1000000); // 1,500,000 - 500,000 = 1,000,000 VND
      expect(refundRequests[0].status).toBe(
        RefundRequestStatusEnum.PENDING_APPROVAL
      );
    });
  });

  describe('Part 2: Two-Layer Authorization & Security Matrix (Rule 14)', () => {
    let sampleInvoice: InstanceType<typeof Invoice>;

    beforeEach(async () => {
      const contract = await Contract.create({
        contractCode: 'CTR-SEC-001',
        source: ContractSourceEnum.WALK_IN,
        customerId: customerUser._id,
        facilityId: facilityDoc._id,
        storageUnitId: storageUnitDoc._id,
        facilityUnitTypeOfferingId: offeringDoc._id,
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1500000,
        depositAmount: 1500000,
        totalPeriodicPrice: 1500000,
        status: ContractStatusEnum.ACTIVE,
        termsAccepted: true,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-12-01'),
      });

      sampleInvoice = await Invoice.create({
        invoiceCode: 'INV-SEC-261101-0001',
        contractId: contract._id,
        customerId: customerUser._id,
        facilityId: facilityDoc._id,
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 1,
        periodStartDate: new Date('2026-11-01'),
        periodEndDate: new Date('2026-11-30'),
        dueDate: new Date('2026-11-01'),
        items: [
          {
            name: 'Tiền thuê kho',
            quantity: 1,
            unitPrice: 1500000,
            amount: 1500000,
            itemType: InvoiceItemTypeEnum.RENT,
          },
        ],
        subtotal: 1500000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 1500000,
        paidAmount: 0,
        issuedAt: new Date(),
      });
    });

    it('1. CUSTOMER: can view own invoice and PDF; blocked from viewing other customers invoices with 403', async () => {
      // Positive: own invoice
      const ownInv = await invoiceService.getInvoiceById(
        String(sampleInvoice._id),
        String(customerUser._id),
        RoleEnum.CUSTOMER
      );
      expect(ownInv.id).toBe(String(sampleInvoice._id));

      const ownPdf = await invoiceService.getInvoicePdf(
        String(sampleInvoice._id),
        String(customerUser._id),
        RoleEnum.CUSTOMER
      );
      expect(ownPdf.html).toContain('INV-SEC-261101-0001');

      // Negative: other customer tries to access
      await expect(
        invoiceService.getInvoiceById(
          String(sampleInvoice._id),
          String(otherCustomerUser._id),
          RoleEnum.CUSTOMER
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });

      await expect(
        invoiceService.getInvoicePdf(
          String(sampleInvoice._id),
          String(otherCustomerUser._id),
          RoleEnum.CUSTOMER
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });

    it('2. FACILITY_STAFF: can view and confirm invoice for assigned facility; blocked from other facility with 403', async () => {
      // Positive: staff at facilityDoc can view
      const staffView = await invoiceService.getInvoiceById(
        String(sampleInvoice._id),
        String(staffUser._id),
        RoleEnum.FACILITY_STAFF
      );
      expect(staffView.id).toBe(String(sampleInvoice._id));

      // Negative: staff at other facility is rejected
      await expect(
        invoiceService.getInvoiceById(
          String(sampleInvoice._id),
          String(otherFacilityStaff._id),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_122,
      });

      await expect(
        invoiceService.confirmManualPayment(
          String(sampleInvoice._id),
          {
            paymentMethod: PaymentMethodEnum.CASH,
            proofImageUrl: 'https://example.com/receipt.jpg',
          },
          String(otherFacilityStaff._id),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_122,
      });
    });

    it('3. BUSINESS_OPS_MANAGER: has cross-facility global access', async () => {
      const opsView = await invoiceService.getInvoiceById(
        String(sampleInvoice._id),
        String(opsUser._id),
        RoleEnum.BUSINESS_OPS_MANAGER
      );
      expect(opsView.id).toBe(String(sampleInvoice._id));

      const opsPdf = await invoiceService.getInvoicePdf(
        String(sampleInvoice._id),
        String(opsUser._id),
        RoleEnum.BUSINESS_OPS_MANAGER
      );
      expect(opsPdf.invoiceCode).toBe(sampleInvoice.invoiceCode);
    });

    it('4. CUSTOMER: blocked from staff-only actions (cancel and confirm-manual)', async () => {
      await expect(
        invoiceService.confirmManualPayment(
          String(sampleInvoice._id),
          {
            paymentMethod: PaymentMethodEnum.CASH,
            proofImageUrl: 'https://example.com/receipt.jpg',
          },
          String(customerUser._id),
          RoleEnum.CUSTOMER
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_121,
      });

      await expect(
        invoiceService.cancelInvoice(
          String(sampleInvoice._id),
          'Khách hàng tự ý muốn hủy hóa đơn nợ',
          String(customerUser._id),
          RoleEnum.CUSTOMER
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_121,
      });
    });
  });
});
