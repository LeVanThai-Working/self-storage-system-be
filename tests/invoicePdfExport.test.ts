import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import {
  Invoice,
  type IInvoice,
} from '../src/modules/invoice/invoice.model.ts';
import { InvoiceRepository } from '../src/modules/invoice/invoice.repository.ts';
import { InvoiceService } from '../src/modules/invoice/invoice.service.ts';
import { InvoicePdfService } from '../src/modules/invoice/services/invoicePdf.service.ts';
import {
  Contract,
  type IContract,
} from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { LegalEntity } from '../src/modules/legalEntity/legalEntity.model.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
  BillingUnitEnum,
} from '../src/common/enums/billing.enum.ts';
import {
  RoleEnum,
  UserStatusEnum,
  AuthProviderEnum,
} from '../src/common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import {
  ContractStatusEnum,
  ContractSourceEnum,
} from '../src/common/enums/contract.enum.ts';
import { PaymentMethodEnum } from '../src/common/enums/payment.enum.ts';
import { AppError } from '../src/common/errors/appError.error.ts';

import { Payment } from '../src/modules/payment/payment.model.ts';

describe('billing/T3.1: Invoice PDF Export Service & Endpoint Tests', () => {
  let invoiceRepo: InvoiceRepository;
  let contractRepo: ContractRepository;
  let userRepo: UserRepository;
  let invoiceService: InvoiceService;
  let invoicePdfService: InvoicePdfService;

  let customerUser: InstanceType<typeof User>;
  let otherCustomerUser: InstanceType<typeof User>;
  let staffUser: InstanceType<typeof User>;
  let otherStaffUser: InstanceType<typeof User>;
  let opsUser: InstanceType<typeof User>;
  let facilityDoc: InstanceType<typeof Facility>;
  let otherFacilityDoc: InstanceType<typeof Facility>;
  let legalEntityDoc: InstanceType<typeof LegalEntity>;

  beforeAll(async () => {
    await setupTestDB();
    expect(Payment).toBeDefined();
    invoiceRepo = new InvoiceRepository(Invoice);
    contractRepo = new ContractRepository(Contract);
    userRepo = new UserRepository(User);
    invoicePdfService = new InvoicePdfService();
    invoiceService = new InvoiceService(
      invoiceRepo,
      contractRepo,
      userRepo,
      undefined,
      undefined,
      undefined,
      invoicePdfService
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    legalEntityDoc = await LegalEntity.create({
      code: 'LE-SSM-HN',
      companyName: 'CÔNG TY TNHH HỆ THỐNG LƯU TRỮ THÔNG MINH SSM',
      taxCode: '0109998888',
      registeredAddress: 'Tòa nhà SSM, Cầu Giấy, Hà Nội',
      legalRepresentative: {
        name: 'Lê Văn Thái',
        title: 'Tổng Giám Đốc',
      },
      bankAccount: {
        bankName: 'MB Bank',
        accountNumber: '0988888888',
        accountHolder: 'CONG TY TNHH HE THONG LUU TRU THONG MINH SSM',
      },
      status: 'active',
    });

    facilityDoc = await Facility.create({
      facilityCode: 'FAC-HN-01',
      name: 'Kho Lưu Trữ SSM Cầu Giấy',
      address: 'Số 10 Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
      city: 'Hà Nội',
      status: FacilityStatusEnum.ACTIVE,
      legalEntityId: legalEntityDoc._id,
      operatingHours: {
        open: '08:00',
        close: '20:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      },
    });

    otherFacilityDoc = await Facility.create({
      facilityCode: 'FAC-HCM-01',
      name: 'Kho Lưu Trữ SSM Tân Bình',
      address: 'Số 50 Bạch Đằng, Tân Bình, TP.HCM',
      city: 'Hồ Chí Minh',
      status: FacilityStatusEnum.ACTIVE,
      legalEntityId: legalEntityDoc._id,
      operatingHours: {
        open: '08:00',
        close: '20:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      },
    });

    customerUser = await User.create({
      name: 'Nguyễn Văn Khách',
      email: 'khach.nguyen@example.com',
      phoneNumber: '0988111222',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      password: 'password123',
    });

    otherCustomerUser = await User.create({
      name: 'Trần Thị Khách Khác',
      email: 'khach.khac@example.com',
      phoneNumber: '0977222333',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      password: 'password123',
    });

    staffUser = await User.create({
      name: 'Nhân Viên Cầu Giấy',
      email: 'staff.cg@example.com',
      phoneNumber: '0911333444',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      assignedFacilityId: facilityDoc._id,
      password: 'password123',
    });

    otherStaffUser = await User.create({
      name: 'Nhân Viên Tân Bình',
      email: 'staff.tb@example.com',
      phoneNumber: '0911555666',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      assignedFacilityId: otherFacilityDoc._id,
      password: 'password123',
    });

    opsUser = await User.create({
      name: 'Quản Lý Vận Hành SSM',
      email: 'ops@example.com',
      phoneNumber: '0900999888',
      role: RoleEnum.BUSINESS_OPS_MANAGER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      password: 'password123',
    });
  });

  describe('1. Pure InvoicePdfService Unit Tests', () => {
    it('should generate formal ISO A4 HTML with legal entity, items table and PAID badge', () => {
      const mockContract = {
        contractCode: 'CTR-261101-ABCD',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-12-01'),
        legalEntitySnapshot: {
          companyName: 'CÔNG TY TNHH HỆ THỐNG LƯU TRỮ THÔNG MINH SSM',
          taxCode: '0109998888',
          registeredAddress: 'Tòa nhà SSM, Hà Nội',
          legalRepresentative: {
            name: 'Lê Văn Thái',
            title: 'Tổng Giám Đốc',
          },
        },
      } as unknown as IContract;

      const mockInvoice = {
        invoiceCode: 'INV-261101-1234',
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.PAID,
        billingPeriodIndex: 2,
        periodStartDate: new Date('2026-11-01'),
        periodEndDate: new Date('2026-11-30'),
        dueDate: new Date('2026-11-01'),
        issuedAt: new Date('2026-10-25'),
        items: [
          {
            name: 'Tiền thuê kho kỳ 2 (CTR-261101-ABCD)',
            description: 'Khoang kho tiêu chuẩn L1',
            quantity: 1,
            unitPrice: 1500000,
            amount: 1500000,
            itemType: InvoiceItemTypeEnum.RENT,
          },
          {
            name: 'Tiện ích điều hòa nhiệt độ',
            description: 'Gói bảo quản mát 24/7',
            quantity: 1,
            unitPrice: 200000,
            amount: 200000,
            itemType: InvoiceItemTypeEnum.AMENITY,
          },
        ],
        subtotal: 1700000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 1700000,
        paidAmount: 1700000,
        paidAt: new Date('2026-11-01T10:00:00Z'),
        paymentMethod: PaymentMethodEnum.SEPAY_QR,
      } as unknown as IInvoice;

      const html = invoicePdfService.generateInvoiceHtml({
        invoice: mockInvoice,
        contract: mockContract,
        customer: customerUser,
        facility: facilityDoc,
        legalEntity: legalEntityDoc,
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('INV-261101-1234');
      expect(html).toContain('CÔNG TY TNHH HỆ THỐNG LƯU TRỮ THÔNG MINH SSM');
      expect(html).toContain('0109998888');
      expect(html).toContain('Nguyễn Văn Khách');
      expect(html).toContain('1.500.000');
      expect(html).toContain('1.700.000');
      expect(html).toContain('ĐÃ THANH TOÁN');
      expect(html).toContain('@page');

      const buffer = invoicePdfService.generateInvoicePdfBuffer({
        invoice: mockInvoice,
        contract: mockContract,
        customer: customerUser,
        facility: facilityDoc,
        legalEntity: legalEntityDoc,
      });
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
    });

    it('should embed dynamic VietQR payment code when invoice is ISSUED or OVERDUE', () => {
      const mockContract = {
        contractCode: 'CTR-261101-WXYZ',
      } as unknown as IContract;

      const mockInvoice = {
        invoiceCode: 'INV-261101-9999',
        type: InvoiceTypeEnum.FIRST_PERIOD,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 1,
        periodStartDate: new Date('2026-11-01'),
        periodEndDate: new Date('2026-11-30'),
        dueDate: new Date('2026-11-01'),
        items: [
          {
            name: 'Tiền thuê kỳ 1',
            quantity: 1,
            unitPrice: 2000000,
            amount: 2000000,
            itemType: InvoiceItemTypeEnum.RENT,
          },
        ],
        subtotal: 2000000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 2000000,
        paidAmount: 0,
      } as unknown as IInvoice;

      const html = invoicePdfService.generateInvoiceHtml({
        invoice: mockInvoice,
        contract: mockContract,
        customer: customerUser,
        facility: facilityDoc,
        legalEntity: legalEntityDoc,
      });

      expect(html).toContain('INV-261101-9999');
      expect(html).toContain('qr.sepay.vn');
      expect(html).toContain('2000000');
      expect(html).toContain('Quét mã VietQR để thanh toán');
    });
  });

  describe('2. InvoiceService.getInvoicePdf Authorization & Scoping Tests (Rule 14)', () => {
    let testInvoice: IInvoice;

    beforeEach(async () => {
      const contract = await Contract.create({
        contractCode: 'CTR-261101-TEST',
        source: ContractSourceEnum.WALK_IN,
        customerId: customerUser._id,
        facilityId: facilityDoc._id,
        storageUnitId: new Types.ObjectId(),
        facilityUnitTypeOfferingId: new Types.ObjectId(),
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1500000,
        depositAmount: 1500000,
        totalPeriodicPrice: 1500000,
        status: ContractStatusEnum.ACTIVE,
        termsAccepted: true,
        customerSigned: true,
        staffSigned: true,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-12-01'),
      });

      testInvoice = await Invoice.create({
        invoiceCode: 'INV-261101-AUTH1',
        contractId: contract._id,
        customerId: customerUser._id,
        facilityId: facilityDoc._id,
        type: InvoiceTypeEnum.FIRST_PERIOD,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 1,
        periodStartDate: new Date('2026-11-01'),
        periodEndDate: new Date('2026-12-01'),
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
      });
    });

    it('allows CUSTOMER who owns the invoice to get PDF', async () => {
      const result = await invoiceService.getInvoicePdf(
        String(testInvoice._id),
        String(customerUser._id),
        RoleEnum.CUSTOMER
      );
      expect(result).toBeDefined();
      expect(result.invoiceCode).toBe('INV-261101-AUTH1');
      expect(result.html).toContain('INV-261101-AUTH1');
    });

    it('rejects CUSTOMER attempting to access other customer invoice with 403', async () => {
      await expect(
        invoiceService.getInvoicePdf(
          String(testInvoice._id),
          String(otherCustomerUser._id),
          RoleEnum.CUSTOMER
        )
      ).rejects.toThrow(AppError);
    });

    it('allows FACILITY_STAFF of the same facility to get PDF', async () => {
      const result = await invoiceService.getInvoicePdf(
        String(testInvoice._id),
        String(staffUser._id),
        RoleEnum.FACILITY_STAFF
      );
      expect(result).toBeDefined();
      expect(result.invoiceCode).toBe('INV-261101-AUTH1');
    });

    it('rejects FACILITY_STAFF of another facility with 403', async () => {
      await expect(
        invoiceService.getInvoicePdf(
          String(testInvoice._id),
          String(otherStaffUser._id),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toThrow(AppError);
    });

    it('allows BUSINESS_OPS_MANAGER and SYSTEM_ADMIN to get any invoice PDF', async () => {
      const result = await invoiceService.getInvoicePdf(
        String(testInvoice._id),
        String(opsUser._id),
        RoleEnum.BUSINESS_OPS_MANAGER
      );
      expect(result).toBeDefined();
      expect(result.invoiceCode).toBe('INV-261101-AUTH1');
    });
  });
});
