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
import type { Request as ExpressRequest } from 'express';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { Invoice } from '../src/modules/invoice/invoice.model.ts';
import { InvoiceRepository } from '../src/modules/invoice/invoice.repository.ts';
import { InvoiceService } from '../src/modules/invoice/invoice.service.ts';
import { InvoiceController } from '../src/modules/invoice/invoice.controller.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import {
  Payment,
  PaymentTransaction,
} from '../src/modules/payment/payment.model.ts';
import { PaymentRepository } from '../src/modules/payment/payment.repository.ts';
import type { PaymentService } from '../src/modules/payment/payment.service.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
  BillingUnitEnum,
} from '../src/common/enums/billing.enum.ts';
import {
  ContractStatusEnum,
  ContractSourceEnum,
  ContractDepositStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import {
  PaymentMethodEnum,
  PaymentPurposeEnum,
  PaymentStatusEnum,
} from '../src/common/enums/payment.enum.ts';
import {
  UserStatusEnum,
  RoleEnum,
  AuthProviderEnum,
} from '../src/common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { AppError } from '../src/common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import type { AuditLogService } from '../src/modules/auditLog/auditLog.service.ts';

describe('InvoiceController & Two-Layer RBAC Integration Tests (billing/T1.5)', () => {
  let invoiceRepo: InvoiceRepository;
  let contractRepo: ContractRepository;
  let userRepo: UserRepository;
  let paymentRepo: PaymentRepository;
  let invoiceService: InvoiceService;
  let invoiceController: InvoiceController;
  let mockPaymentService: PaymentService;

  const mockAuditLogService = {
    record: vi.fn(),
  } as unknown as AuditLogService;

  const makeReq = (user?: { _id: string | Types.ObjectId; role?: string }) => {
    return {
      user: user
        ? {
            _id: { toString: () => String(user._id) },
            role: user.role || RoleEnum.CUSTOMER,
          }
        : undefined,
      headers: {},
      cookies: {},
    } as unknown as ExpressRequest;
  };

  beforeAll(async () => {
    await setupTestDB();
    expect(StorageUnit).toBeDefined();
    expect(FacilityUnitTypeOffering).toBeDefined();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    vi.clearAllMocks();

    invoiceRepo = new InvoiceRepository(Invoice);
    contractRepo = new ContractRepository(Contract);
    userRepo = new UserRepository(User);
    paymentRepo = new PaymentRepository(Payment, PaymentTransaction);

    invoiceService = new InvoiceService(
      invoiceRepo,
      contractRepo,
      userRepo,
      mockAuditLogService,
      paymentRepo
    );

    mockPaymentService = {
      createPayment: vi
        .fn()
        .mockImplementation(async (callerId, callerRole, data) => {
          return {
            id: new Types.ObjectId().toString(),
            paymentCode: 'PAY-TEST-001',
            purpose: data.purpose,
            invoiceId: data.invoiceId,
            amount: 2000000,
            paidAmount: 0,
            status: PaymentStatusEnum.PENDING,
            method: PaymentMethodEnum.SEPAY_QR,
            vietQrDataUrl: 'https://qr.sepay.vn/test',
          };
        }),
    } as unknown as PaymentService;

    invoiceController = new InvoiceController(
      invoiceService,
      () => mockPaymentService
    );
  });

  async function createFixtures() {
    const customer1 = await User.create({
      name: 'Khách Hàng 1',
      email: 'customer1@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0901111111',
    });

    const customer2 = await User.create({
      name: 'Khách Hàng 2',
      email: 'customer2@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0902222222',
    });

    const facility1 = await Facility.create({
      name: 'Cơ sở Quận 3',
      code: 'Q301',
      city: 'TP. Hồ Chí Minh',
      address: '15 Võ Văn Tần, Q3',
      status: FacilityStatusEnum.ACTIVE,
      timezone: 'Asia/Ho_Chi_Minh',
    });

    const facility2 = await Facility.create({
      name: 'Cơ sở Quận 7',
      code: 'Q701',
      city: 'TP. Hồ Chí Minh',
      address: '25 Nguyễn Lương Bằng, Q7',
      status: FacilityStatusEnum.ACTIVE,
      timezone: 'Asia/Ho_Chi_Minh',
    });

    const staffFacility1 = await User.create({
      name: 'Nhân viên Cơ sở Q3',
      email: 'staff_q3@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0903333333',
      assignedFacilityId: facility1._id,
    });

    const staffFacility2 = await User.create({
      name: 'Nhân viên Cơ sở Q7',
      email: 'staff_q7@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0904444444',
      assignedFacilityId: facility2._id,
    });

    const managerFacility1 = await User.create({
      name: 'Quản lý Cơ sở Q3',
      email: 'manager_q3@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_MANAGER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0905555555',
      assignedFacilityId: facility1._id,
    });

    const staffNoFacility = await User.create({
      name: 'Nhân viên chưa gán cơ sở',
      email: 'staff_no_fac@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.FACILITY_STAFF,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0906666666',
    });

    const opsManager = await User.create({
      name: 'Quản lý vận hành toàn quốc',
      email: 'ops@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.BUSINESS_OPS_MANAGER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0907777777',
    });

    const admin = await User.create({
      name: 'Quản trị hệ thống',
      email: 'admin@example.com',
      password: 'HashedPassword123!',
      role: RoleEnum.SYSTEM_ADMIN,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      phoneNumber: '0908888888',
    });

    const contract1 = await Contract.create({
      contractCode: 'HD-2026-F1-001',
      source: ContractSourceEnum.WALK_IN,
      customerId: customer1._id,
      facilityId: facility1._id,
      storageUnitId: new Types.ObjectId(),
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      rentalPrice: 2000000,
      depositAmount: 2000000,
      depositStatus: ContractDepositStatusEnum.HELD,
      depositPaidAt: new Date(),
      billingUnit: BillingUnitEnum.MONTH,
      rentalDuration: 6,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2027-05-01T00:00:00.000Z'),
      totalPeriodicPrice: 2000000,
      status: ContractStatusEnum.ACTIVE,
    });

    const contract2 = await Contract.create({
      contractCode: 'HD-2026-F2-002',
      source: ContractSourceEnum.WALK_IN,
      customerId: customer2._id,
      facilityId: facility2._id,
      storageUnitId: new Types.ObjectId(),
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      rentalPrice: 3000000,
      depositAmount: 3000000,
      depositStatus: ContractDepositStatusEnum.HELD,
      depositPaidAt: new Date(),
      billingUnit: BillingUnitEnum.MONTH,
      rentalDuration: 6,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2027-05-01T00:00:00.000Z'),
      totalPeriodicPrice: 3000000,
      status: ContractStatusEnum.ACTIVE,
    });

    // Invoice 1 for Customer 1 at Facility 1
    const invoice1 = await Invoice.create({
      invoiceCode: 'INV-261101-0001',
      contractId: contract1._id,
      customerId: customer1._id,
      facilityId: facility1._id,
      type: InvoiceTypeEnum.FIRST_PERIOD,
      status: InvoiceStatusEnum.ISSUED,
      billingPeriodIndex: 1,
      periodStartDate: new Date('2026-11-01T00:00:00.000Z'),
      periodEndDate: new Date('2026-11-30T23:59:59.999Z'),
      dueDate: new Date('2026-11-01T23:59:59.999Z'),
      items: [
        {
          name: 'Tiền thuê tháng 11/2026',
          quantity: 1,
          unitPrice: 2000000,
          amount: 2000000,
          itemType: InvoiceItemTypeEnum.RENT,
        },
      ],
      subtotal: 2000000,
      totalAmount: 2000000,
      paidAmount: 0,
      issuedAt: new Date(),
    });

    // Invoice 2 for Customer 2 at Facility 2
    const invoice2 = await Invoice.create({
      invoiceCode: 'INV-261101-0002',
      contractId: contract2._id,
      customerId: customer2._id,
      facilityId: facility2._id,
      type: InvoiceTypeEnum.FIRST_PERIOD,
      status: InvoiceStatusEnum.ISSUED,
      billingPeriodIndex: 1,
      periodStartDate: new Date('2026-11-01T00:00:00.000Z'),
      periodEndDate: new Date('2026-11-30T23:59:59.999Z'),
      dueDate: new Date('2026-11-01T23:59:59.999Z'),
      items: [
        {
          name: 'Tiền thuê tháng 11/2026 (Cơ sở 2)',
          quantity: 1,
          unitPrice: 3000000,
          amount: 3000000,
          itemType: InvoiceItemTypeEnum.RENT,
        },
      ],
      subtotal: 3000000,
      totalAmount: 3000000,
      paidAmount: 0,
      issuedAt: new Date(),
    });

    return {
      customer1,
      customer2,
      facility1,
      facility2,
      staffFacility1,
      staffFacility2,
      managerFacility1,
      staffNoFacility,
      opsManager,
      admin,
      contract1,
      contract2,
      invoice1,
      invoice2,
    };
  }

  describe('1. GET /invoices (getInvoices) Scoping and Pagination', () => {
    it('should reject unauthenticated caller with 401', async () => {
      await expect(
        invoiceController.getInvoices(makeReq(undefined), {
          page: 1,
          limit: 10,
        })
      ).rejects.toThrow(new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102));
    });

    it('should scope CUSTOMER to only their own invoices', async () => {
      const { customer1, invoice1 } = await createFixtures();

      // Customer 1 queries without filters -> gets only invoice 1
      const res = await invoiceController.getInvoices(
        makeReq({ _id: customer1._id, role: RoleEnum.CUSTOMER }),
        { page: 1, limit: 10 }
      );

      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].id).toBe(invoice1._id.toString());
      expect(res.data.items[0].customerId).toBe(customer1._id.toString());
    });

    it('should prevent CUSTOMER from spoofing query.customerId to view others', async () => {
      const { customer1, customer2, invoice1 } = await createFixtures();

      // Customer 1 passes query.customerId = customer2._id
      const res = await invoiceController.getInvoices(
        makeReq({ _id: customer1._id, role: RoleEnum.CUSTOMER }),
        { page: 1, limit: 10, customerId: customer2._id.toString() }
      );

      // System overrides query.customerId with caller.userId, returning invoice 1
      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].id).toBe(invoice1._id.toString());
    });

    it('should scope FACILITY_STAFF to only their assignedFacilityId', async () => {
      const { staffFacility1, invoice1 } = await createFixtures();

      const res = await invoiceController.getInvoices(
        makeReq({ _id: staffFacility1._id, role: RoleEnum.FACILITY_STAFF }),
        { page: 1, limit: 10 }
      );

      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].id).toBe(invoice1._id.toString());
      expect(res.data.items[0].facilityId).toBe(invoice1.facilityId.toString());
    });

    it('should reject staff with no assignedFacilityId with 403', async () => {
      const { staffNoFacility } = await createFixtures();

      await expect(
        invoiceController.getInvoices(
          makeReq({ _id: staffNoFacility._id, role: RoleEnum.FACILITY_STAFF }),
          { page: 1, limit: 10 }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_122,
      });
    });

    it('should allow OPS_MANAGER and SYSTEM_ADMIN to view all invoices system-wide', async () => {
      const { opsManager, admin } = await createFixtures();

      const opsRes = await invoiceController.getInvoices(
        makeReq({ _id: opsManager._id, role: RoleEnum.BUSINESS_OPS_MANAGER }),
        { page: 1, limit: 10 }
      );
      expect(opsRes.data.items.length).toBe(2);

      const adminRes = await invoiceController.getInvoices(
        makeReq({ _id: admin._id, role: RoleEnum.SYSTEM_ADMIN }),
        { page: 1, limit: 10 }
      );
      expect(adminRes.data.items.length).toBe(2);
    });
  });

  describe('2. GET /invoices/:id (getInvoiceById) Resource Scoping', () => {
    it('should allow customer to view own invoice', async () => {
      const { customer1, invoice1 } = await createFixtures();

      const res = await invoiceController.getInvoiceById(
        makeReq({ _id: customer1._id, role: RoleEnum.CUSTOMER }),
        invoice1._id.toString()
      );

      expect(res.success).toBe(true);
      expect(res.data.id).toBe(invoice1._id.toString());
    });

    it('should reject cross-customer viewing with 403', async () => {
      const { customer2, invoice1 } = await createFixtures();

      await expect(
        invoiceController.getInvoiceById(
          makeReq({ _id: customer2._id, role: RoleEnum.CUSTOMER }),
          invoice1._id.toString()
        )
      ).rejects.toThrow(new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103));
    });

    it('should allow facility staff to view invoice in their facility', async () => {
      const { staffFacility1, invoice1 } = await createFixtures();

      const res = await invoiceController.getInvoiceById(
        makeReq({ _id: staffFacility1._id, role: RoleEnum.FACILITY_STAFF }),
        invoice1._id.toString()
      );

      expect(res.success).toBe(true);
      expect(res.data.id).toBe(invoice1._id.toString());
    });

    it('should reject cross-facility staff viewing with 403', async () => {
      const { staffFacility2, invoice1 } = await createFixtures();

      await expect(
        invoiceController.getInvoiceById(
          makeReq({ _id: staffFacility2._id, role: RoleEnum.FACILITY_STAFF }),
          invoice1._id.toString()
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_122,
      });
    });

    it('should return 404 for non-existent invoice', async () => {
      const { admin } = await createFixtures();
      const fakeId = new Types.ObjectId().toString();

      await expect(
        invoiceController.getInvoiceById(
          makeReq({ _id: admin._id, role: RoleEnum.SYSTEM_ADMIN }),
          fakeId
        )
      ).rejects.toMatchObject({
        statusCode: 404,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_800,
      });
    });
  });

  describe('3. POST /invoices/:id/payments (createInvoicePayment)', () => {
    it('should create payment QR for customer on their own invoice', async () => {
      const { customer1, invoice1 } = await createFixtures();

      const res = await invoiceController.createInvoicePayment(
        makeReq({ _id: customer1._id, role: RoleEnum.CUSTOMER }),
        invoice1._id.toString()
      );

      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(201);
      expect(res.data.purpose).toBe(PaymentPurposeEnum.INVOICE_PAYMENT);
      expect(res.data.invoiceId).toBe(invoice1._id.toString());
      expect(mockPaymentService.createPayment).toHaveBeenCalledWith(
        customer1._id.toString(),
        RoleEnum.CUSTOMER,
        {
          purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
          invoiceId: invoice1._id.toString(),
        }
      );
    });

    it('should throw 500 if PaymentService is unavailable', async () => {
      const { customer1, invoice1 } = await createFixtures();
      const controllerWithoutPaymentService = new InvoiceController(
        invoiceService,
        () => undefined
      );

      await expect(
        controllerWithoutPaymentService.createInvoicePayment(
          makeReq({ _id: customer1._id, role: RoleEnum.CUSTOMER }),
          invoice1._id.toString()
        )
      ).rejects.toMatchObject({
        statusCode: 500,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_106,
      });
    });
  });

  describe('4. POST /invoices/:id/confirm-manual (confirmManualPayment)', () => {
    it('should reject CUSTOMER from confirming manual payment with 403', async () => {
      const { customer1, invoice1 } = await createFixtures();

      await expect(
        invoiceController.confirmManualPayment(
          makeReq({ _id: customer1._id, role: RoleEnum.CUSTOMER }),
          invoice1._id.toString(),
          {
            proofImageUrl: 'https://example.com/receipt.jpg',
            paymentMethod: PaymentMethodEnum.CASH,
          }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_121,
      });
    });

    it('should reject cross-facility staff from confirming manual payment with 403', async () => {
      const { staffFacility2, invoice1 } = await createFixtures();

      await expect(
        invoiceController.confirmManualPayment(
          makeReq({ _id: staffFacility2._id, role: RoleEnum.FACILITY_STAFF }),
          invoice1._id.toString(),
          {
            proofImageUrl: 'https://example.com/receipt.jpg',
            paymentMethod: PaymentMethodEnum.CASH,
          }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_122,
      });
    });

    it('should confirm manual cash payment by facility staff and update status to PAID', async () => {
      const { staffFacility1, invoice1 } = await createFixtures();

      const res = await invoiceController.confirmManualPayment(
        makeReq({ _id: staffFacility1._id, role: RoleEnum.FACILITY_STAFF }),
        invoice1._id.toString(),
        {
          proofImageUrl: 'https://example.com/receipt.jpg',
          paymentMethod: PaymentMethodEnum.CASH,
          referenceCode: 'REC-00123',
        }
      );

      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.data.status).toBe(InvoiceStatusEnum.PAID);
      expect(res.data.paidAmount).toBe(2000000);
      expect(res.data.paymentMethod).toBe(PaymentMethodEnum.CASH);
    });
  });

  describe('5. POST /invoices/:id/cancel (cancelInvoice)', () => {
    it('should reject CUSTOMER from cancelling invoice with 403', async () => {
      const { customer1, invoice1 } = await createFixtures();

      await expect(
        invoiceController.cancelInvoice(
          makeReq({ _id: customer1._id, role: RoleEnum.CUSTOMER }),
          invoice1._id.toString(),
          { reason: 'Khách hàng không muốn trả tiền' }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_121,
      });
    });

    it('should reject staff from different facility from cancelling with 403', async () => {
      const { staffFacility2, invoice1 } = await createFixtures();

      await expect(
        invoiceController.cancelInvoice(
          makeReq({ _id: staffFacility2._id, role: RoleEnum.FACILITY_STAFF }),
          invoice1._id.toString(),
          { reason: 'Hủy nhầm cơ sở' }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_122,
      });
    });

    it('should allow facility manager to cancel invoice with valid reason', async () => {
      const { managerFacility1, invoice1 } = await createFixtures();

      const res = await invoiceController.cancelInvoice(
        makeReq({ _id: managerFacility1._id, role: RoleEnum.FACILITY_MANAGER }),
        invoice1._id.toString(),
        { reason: 'Miễn phí kỳ thuê do sự cố phòng kho' }
      );

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(InvoiceStatusEnum.CANCELLED);
      expect(res.data.cancelReason).toBe('Miễn phí kỳ thuê do sự cố phòng kho');
    });
  });

  describe('6. POST /invoices/manual (createManualInvoice)', () => {
    it('should reject CUSTOMER from creating manual invoice with 403', async () => {
      const { customer1, contract1 } = await createFixtures();

      await expect(
        invoiceController.createManualInvoice(
          makeReq({ _id: customer1._id, role: RoleEnum.CUSTOMER }),
          {
            contractId: contract1._id.toString(),
            periodStartDate: '2026-11-01',
            periodEndDate: '2026-11-30',
            dueDate: '2026-11-05',
            items: [
              {
                name: 'Phí làm sạch phòng kho',
                quantity: 1,
                unitPrice: 300000,
                itemType: InvoiceItemTypeEnum.AMENITY,
              },
            ],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
      });
    });

    it('should reject staff from different facility with 403', async () => {
      const { staffFacility2, contract1 } = await createFixtures();

      await expect(
        invoiceController.createManualInvoice(
          makeReq({ _id: staffFacility2._id, role: RoleEnum.FACILITY_STAFF }),
          {
            contractId: contract1._id.toString(),
            periodStartDate: '2026-11-01',
            periodEndDate: '2026-11-30',
            dueDate: '2026-11-05',
            items: [
              {
                name: 'Phí làm sạch phòng kho',
                quantity: 1,
                unitPrice: 300000,
                itemType: InvoiceItemTypeEnum.AMENITY,
              },
            ],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_122,
      });
    });

    it('should allow facility staff of contract facility to create manual incidental invoice', async () => {
      const { staffFacility1, contract1 } = await createFixtures();

      const res = await invoiceController.createManualInvoice(
        makeReq({ _id: staffFacility1._id, role: RoleEnum.FACILITY_STAFF }),
        {
          contractId: contract1._id.toString(),
          periodStartDate: '2026-11-01',
          periodEndDate: '2026-11-30',
          dueDate: '2026-11-05',
          items: [
            {
              name: 'Phí đền bù hư hỏng khóa',
              quantity: 1,
              unitPrice: 350000,
              itemType: InvoiceItemTypeEnum.DAMAGE_FEE,
            },
          ],
          notes: 'Khách làm hỏng khóa tủ cơ sở',
        }
      );

      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(201);
      expect(res.data.type).toBe(InvoiceTypeEnum.INCIDENTAL);
      expect(res.data.totalAmount).toBe(350000);
      expect(res.data.items[0].itemType).toBe(InvoiceItemTypeEnum.DAMAGE_FEE);
    });
  });
});
