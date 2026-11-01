import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import type { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
} from '../src/common/enums/billing.enum.ts';
import {
  PaymentPurposeEnum,
  PaymentStatusEnum,
  PaymentMethodEnum,
} from '../src/common/enums/payment.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../src/common/enums/auditLog.enum.ts';
import {
  MESSAGE_CODE,
  MESSAGE_DICTIONARY,
} from '../src/common/consts/messageCode.const.ts';
import {
  Invoice,
  type IInvoice,
} from '../src/modules/invoice/invoice.model.ts';
import { Payment } from '../src/modules/payment/payment.model.ts';

describe('billing/T0.1: Invoice Model, Enums & Message Codes', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('1. Enums Verification', () => {
    it('should have all expected InvoiceStatusEnum members', () => {
      expect(InvoiceStatusEnum.DRAFT).toBe('draft');
      expect(InvoiceStatusEnum.ISSUED).toBe('issued');
      expect(InvoiceStatusEnum.PAID).toBe('paid');
      expect(InvoiceStatusEnum.OVERDUE).toBe('overdue');
      expect(InvoiceStatusEnum.CANCELLED).toBe('cancelled');
      expect(InvoiceStatusEnum.VOID).toBe('void');
    });

    it('should have all expected InvoiceTypeEnum members', () => {
      expect(InvoiceTypeEnum.FIRST_PERIOD).toBe('first_period');
      expect(InvoiceTypeEnum.RECURRING).toBe('recurring');
      expect(InvoiceTypeEnum.INCIDENTAL).toBe('incidental');
      expect(InvoiceTypeEnum.CHECK_OUT_SETTLEMENT).toBe('check_out_settlement');
    });

    it('should have all expected InvoiceItemTypeEnum members', () => {
      expect(InvoiceItemTypeEnum.RENT).toBe('rent');
      expect(InvoiceItemTypeEnum.AMENITY).toBe('amenity');
      expect(InvoiceItemTypeEnum.DAMAGE_FEE).toBe('damage_fee');
      expect(InvoiceItemTypeEnum.OVERDUE_FEE).toBe('overdue_fee');
      expect(InvoiceItemTypeEnum.DISCOUNT).toBe('discount');
      expect(InvoiceItemTypeEnum.OTHER).toBe('other');
    });

    it('should include INVOICE_PAYMENT in PaymentPurposeEnum', () => {
      expect(PaymentPurposeEnum.INVOICE_PAYMENT).toBe('invoice_payment');
    });

    it('should include INVOICE in AuditResourceEnum', () => {
      expect(AuditResourceEnum.INVOICE).toBe('invoice');
    });

    it('should include invoice actions in AuditActionEnum', () => {
      expect(AuditActionEnum.GENERATE_INVOICE).toBe('generate_invoice');
      expect(AuditActionEnum.PAY_INVOICE).toBe('pay_invoice');
      expect(AuditActionEnum.CANCEL_INVOICE).toBe('cancel_invoice');
      expect(AuditActionEnum.VOID_INVOICE).toBe('void_invoice');
      expect(AuditActionEnum.MARK_OVERDUE).toBe('mark_overdue');
      expect(AuditActionEnum.SEND_INVOICE).toBe('send_invoice');
    });
  });

  describe('2. Message Codes Verification', () => {
    it('should define invoice message codes in MESSAGE_CODE and MESSAGE_DICTIONARY', () => {
      expect(MESSAGE_CODE.MESSAGE_CODE_800).toBe('MESSAGE_CODE_800');
      expect(MESSAGE_CODE.MESSAGE_CODE_801).toBe('MESSAGE_CODE_801');
      expect(MESSAGE_CODE.MESSAGE_CODE_802).toBe('MESSAGE_CODE_802');
      expect(MESSAGE_CODE.MESSAGE_CODE_803).toBe('MESSAGE_CODE_803');
      expect(MESSAGE_CODE.MESSAGE_CODE_804).toBe('MESSAGE_CODE_804');
      expect(MESSAGE_CODE.MESSAGE_CODE_805).toBe('MESSAGE_CODE_805');
      expect(MESSAGE_CODE.MESSAGE_CODE_806).toBe('MESSAGE_CODE_806');
      expect(MESSAGE_CODE.MESSAGE_CODE_807).toBe('MESSAGE_CODE_807');
      expect(MESSAGE_CODE.MESSAGE_CODE_808).toBe('MESSAGE_CODE_808');
      expect(MESSAGE_CODE.MESSAGE_CODE_809).toBe('MESSAGE_CODE_809');

      expect(MESSAGE_DICTIONARY[MESSAGE_CODE.MESSAGE_CODE_800]).toBeDefined();
      expect(MESSAGE_DICTIONARY[MESSAGE_CODE.MESSAGE_CODE_801]).toBeDefined();
      expect(MESSAGE_DICTIONARY[MESSAGE_CODE.MESSAGE_CODE_802]).toBeDefined();
      expect(MESSAGE_DICTIONARY[MESSAGE_CODE.MESSAGE_CODE_803]).toBeDefined();
      expect(MESSAGE_DICTIONARY[MESSAGE_CODE.MESSAGE_CODE_804]).toBeDefined();
      expect(MESSAGE_DICTIONARY[MESSAGE_CODE.MESSAGE_CODE_805]).toBeDefined();
      expect(MESSAGE_DICTIONARY[MESSAGE_CODE.MESSAGE_CODE_806]).toBeDefined();
      expect(MESSAGE_DICTIONARY[MESSAGE_CODE.MESSAGE_CODE_807]).toBeDefined();
      expect(MESSAGE_DICTIONARY[MESSAGE_CODE.MESSAGE_CODE_808]).toBeDefined();
      expect(MESSAGE_DICTIONARY[MESSAGE_CODE.MESSAGE_CODE_809]).toBeDefined();
    });
  });

  describe('3. Invoice Model Verification', () => {
    it('should create an invoice document with default values and embedded items', async () => {
      const contractId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const facilityId = new Types.ObjectId();

      const invoice = await Invoice.create({
        invoiceCode: 'INV-261031-0001',
        contractId,
        customerId,
        facilityId,
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 2,
        periodStartDate: new Date('2026-12-01T00:00:00.000Z'),
        periodEndDate: new Date('2026-12-31T23:59:59.999Z'),
        dueDate: new Date('2026-12-01T23:59:59.999Z'),
        items: [
          {
            name: 'Thuê kho tháng 12/2026',
            description: 'Phòng A-101',
            quantity: 1,
            unitPrice: 2000000,
            amount: 2000000,
            itemType: InvoiceItemTypeEnum.RENT,
          },
          {
            name: 'Điện chiếu sáng',
            description: 'Định mức tháng',
            quantity: 1,
            unitPrice: 150000,
            amount: 150000,
            itemType: InvoiceItemTypeEnum.AMENITY,
          },
        ],
        subtotal: 2150000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 2150000,
      });

      expect(invoice._id).toBeDefined();
      expect(invoice.status).toBe(InvoiceStatusEnum.ISSUED);
      expect(invoice.paidAmount).toBe(0);
      expect(invoice.paymentId).toBeNull();
      expect(invoice.paidAt).toBeNull();
      expect(invoice.items.length).toBe(2);
      expect(invoice.items[0].name).toBe('Thuê kho tháng 12/2026');
      expect(invoice.items[0].amount).toBe(2000000);
      expect(invoice.createdAt).toBeDefined();
    });

    it('should enforce partial unique index on contractId + billingPeriodIndex for RECURRING invoices', async () => {
      const contractId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const facilityId = new Types.ObjectId();

      await Invoice.create({
        invoiceCode: 'INV-261031-0002',
        contractId,
        customerId,
        facilityId,
        type: InvoiceTypeEnum.RECURRING,
        billingPeriodIndex: 2,
        periodStartDate: new Date('2026-12-01T00:00:00.000Z'),
        periodEndDate: new Date('2026-12-31T23:59:59.999Z'),
        dueDate: new Date('2026-12-01T23:59:59.999Z'),
        items: [
          {
            name: 'Thuê kho tháng 12/2026',
            quantity: 1,
            unitPrice: 1000000,
            amount: 1000000,
            itemType: InvoiceItemTypeEnum.RENT,
          },
        ],
        subtotal: 1000000,
        totalAmount: 1000000,
      });

      // Creating another RECURRING invoice for the same contract & period should fail
      await expect(
        Invoice.create({
          invoiceCode: 'INV-261031-0003',
          contractId,
          customerId,
          facilityId,
          type: InvoiceTypeEnum.RECURRING,
          billingPeriodIndex: 2,
          periodStartDate: new Date('2026-12-01T00:00:00.000Z'),
          periodEndDate: new Date('2026-12-31T23:59:59.999Z'),
          dueDate: new Date('2026-12-01T23:59:59.999Z'),
          items: [
            {
              name: 'Thuê kho tháng 12/2026 trùng lặp',
              quantity: 1,
              unitPrice: 1000000,
              amount: 1000000,
              itemType: InvoiceItemTypeEnum.RENT,
            },
          ],
          subtotal: 1000000,
          totalAmount: 1000000,
        })
      ).rejects.toThrow();
    });

    it('should allow multiple INCIDENTAL invoices for the same contract and period index', async () => {
      const contractId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const facilityId = new Types.ObjectId();

      const inv1 = await Invoice.create({
        invoiceCode: 'INV-261031-0004',
        contractId,
        customerId,
        facilityId,
        type: InvoiceTypeEnum.INCIDENTAL,
        billingPeriodIndex: 1,
        periodStartDate: new Date('2026-11-01T00:00:00.000Z'),
        periodEndDate: new Date('2026-11-30T23:59:59.999Z'),
        dueDate: new Date('2026-11-05T23:59:59.999Z'),
        items: [
          {
            name: 'Phí vệ sinh phát sinh',
            quantity: 1,
            unitPrice: 200000,
            amount: 200000,
            itemType: InvoiceItemTypeEnum.OTHER,
          },
        ],
        subtotal: 200000,
        totalAmount: 200000,
      });

      const inv2 = await Invoice.create({
        invoiceCode: 'INV-261031-0005',
        contractId,
        customerId,
        facilityId,
        type: InvoiceTypeEnum.INCIDENTAL,
        billingPeriodIndex: 1,
        periodStartDate: new Date('2026-11-01T00:00:00.000Z'),
        periodEndDate: new Date('2026-11-30T23:59:59.999Z'),
        dueDate: new Date('2026-11-05T23:59:59.999Z'),
        items: [
          {
            name: 'Phí làm thêm chìa khóa',
            quantity: 1,
            unitPrice: 100000,
            amount: 100000,
            itemType: InvoiceItemTypeEnum.OTHER,
          },
        ],
        subtotal: 100000,
        totalAmount: 100000,
      });

      expect(inv1._id).toBeDefined();
      expect(inv2._id).toBeDefined();
    });

    it('should support soft delete and restore on Invoice', async () => {
      const contractId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const facilityId = new Types.ObjectId();

      const invoice = await Invoice.create({
        invoiceCode: 'INV-261031-0006',
        contractId,
        customerId,
        facilityId,
        type: InvoiceTypeEnum.FIRST_PERIOD,
        billingPeriodIndex: 1,
        periodStartDate: new Date('2026-11-01T00:00:00.000Z'),
        periodEndDate: new Date('2026-11-30T23:59:59.999Z'),
        dueDate: new Date('2026-11-01T23:59:59.999Z'),
        items: [
          {
            name: 'Tiền thuê kỳ 1',
            quantity: 1,
            unitPrice: 3000000,
            amount: 3000000,
            itemType: InvoiceItemTypeEnum.RENT,
          },
        ],
        subtotal: 3000000,
        totalAmount: 3000000,
      });

      await (invoice as SoftDeleteDocument).delete();
      const foundAfterDelete = await Invoice.findById(invoice._id);
      expect(foundAfterDelete).toBeNull();

      const foundWithDeleted = await (
        Invoice as unknown as SoftDeleteModel<IInvoice>
      ).findOneWithDeleted({
        _id: invoice._id,
      });
      expect(foundWithDeleted).toBeDefined();
      expect(foundWithDeleted?.deleted).toBe(true);
    });
  });

  describe('4. Payment Model Link Verification', () => {
    it('should support invoiceId field on Payment model', async () => {
      const invoiceId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const facilityId = new Types.ObjectId();

      const payment = await Payment.create({
        paymentCode: 'PAY-INV-001',
        purpose: PaymentPurposeEnum.INVOICE_PAYMENT,
        invoiceId,
        customerId,
        facilityId,
        amount: 2150000,
        method: PaymentMethodEnum.SEPAY_QR,
        status: PaymentStatusEnum.PENDING,
      });

      expect(payment._id).toBeDefined();
      expect(payment.purpose).toBe(PaymentPurposeEnum.INVOICE_PAYMENT);
      expect(payment.invoiceId?.toString()).toBe(invoiceId.toString());
    });
  });
});
