import { describe, it, expect } from 'vitest';
import {
  invoiceIdParamSchema,
  createManualInvoiceSchema,
  invoiceQuerySchema,
  cancelInvoiceSchema,
  confirmManualInvoicePaymentSchema,
} from '../src/modules/invoice/schemas/invoice.request.schema.ts';
import {
  invoiceResponseSchema,
  invoiceItemResponseSchema,
  paginatedInvoiceResponseSchema,
} from '../src/modules/invoice/schemas/invoice.response.schema.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
} from '../src/common/enums/billing.enum.ts';
import { PaymentMethodEnum } from '../src/common/enums/payment.enum.ts';

describe('billing/T0.2: Invoice Validation & Response Schemas', () => {
  describe('1. invoiceIdParamSchema', () => {
    it('should accept valid 24-character hex ObjectId', () => {
      const result = invoiceIdParamSchema.safeParse({
        id: '507f1f77bcf86cd799439011',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid ObjectId format', () => {
      const result = invoiceIdParamSchema.safeParse({
        id: 'invalid-id-123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Invalid invoice ID format'
        );
      }
    });
  });

  describe('2. createManualInvoiceSchema', () => {
    it('should accept a valid manual invoice creation payload', () => {
      const payload = {
        contractId: '507f1f77bcf86cd799439011',
        periodStartDate: '2026-11-01',
        periodEndDate: '2026-11-30',
        dueDate: '2026-11-05',
        items: [
          {
            name: 'Phí bảo trì bổ sung',
            description: 'Thay khóa cửa',
            quantity: 1,
            unitPrice: 250000,
            amount: 250000,
            itemType: InvoiceItemTypeEnum.OTHER,
          },
          {
            name: 'Thuê pallet gỗ',
            quantity: 2,
            unitPrice: 50000,
            amount: 100000,
            itemType: InvoiceItemTypeEnum.AMENITY,
          },
        ],
        discountAmount: 0,
        taxAmount: 0,
        notes: 'Phát sinh theo yêu cầu khách',
      };

      const result = createManualInvoiceSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items.length).toBe(2);
        expect(result.data.discountAmount).toBe(0);
      }
    });

    it('should reject when items array is empty', () => {
      const payload = {
        contractId: '507f1f77bcf86cd799439011',
        periodStartDate: '2026-11-01',
        periodEndDate: '2026-11-30',
        dueDate: '2026-11-05',
        items: [],
      };

      const result = createManualInvoiceSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Invoice must have at least one item'
        );
      }
    });

    it('should reject invalid contractId format', () => {
      const payload = {
        contractId: '12345',
        periodStartDate: '2026-11-01',
        periodEndDate: '2026-11-30',
        dueDate: '2026-11-05',
        items: [
          {
            name: 'Phí dịch vụ',
            quantity: 1,
            unitPrice: 100000,
            amount: 100000,
            itemType: InvoiceItemTypeEnum.OTHER,
          },
        ],
      };

      const result = createManualInvoiceSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Invalid contract ID format'
        );
      }
    });

    it('should reject invalid quantity (< 1) or unitPrice (< 0)', () => {
      const payload = {
        contractId: '507f1f77bcf86cd799439011',
        periodStartDate: '2026-11-01',
        periodEndDate: '2026-11-30',
        dueDate: '2026-11-05',
        items: [
          {
            name: 'Phí dịch vụ',
            quantity: 0,
            unitPrice: -50000,
            amount: 0,
            itemType: InvoiceItemTypeEnum.OTHER,
          },
        ],
      };

      const result = createManualInvoiceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const payload = {
        contractId: '507f1f77bcf86cd799439011',
        periodStartDate: 'invalid-date',
        periodEndDate: '2026-11-30',
        dueDate: '2026-11-05',
        items: [
          {
            name: 'Phí dịch vụ',
            quantity: 1,
            unitPrice: 100000,
            amount: 100000,
            itemType: InvoiceItemTypeEnum.OTHER,
          },
        ],
      };

      const result = createManualInvoiceSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Invalid period start date format'
        );
      }
    });
  });

  describe('3. invoiceQuerySchema', () => {
    it('should populate default pagination and sorting values', () => {
      const result = invoiceQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.sortBy).toBe('createdAt');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should accept valid filter parameters', () => {
      const result = invoiceQuerySchema.safeParse({
        contractId: '507f1f77bcf86cd799439011',
        facilityId: '507f1f77bcf86cd799439012',
        status: InvoiceStatusEnum.ISSUED,
        type: InvoiceTypeEnum.RECURRING,
        sortBy: 'dueDate',
        sortOrder: 'asc',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(InvoiceStatusEnum.ISSUED);
        expect(result.data.type).toBe(InvoiceTypeEnum.RECURRING);
        expect(result.data.sortBy).toBe('dueDate');
      }
    });

    it('should reject invalid facilityId format in query', () => {
      const result = invoiceQuerySchema.safeParse({
        facilityId: 'not-an-id',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid status in query', () => {
      const result = invoiceQuerySchema.safeParse({
        status: 'UNKNOWN_STATUS',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('4. cancelInvoiceSchema', () => {
    it('should accept cancellation with reason >= 5 characters', () => {
      const result = cancelInvoiceSchema.safeParse({
        reason: 'Hóa đơn tạo nhầm cho khách hàng',
      });
      expect(result.success).toBe(true);
    });

    it('should reject cancellation reason shorter than 5 characters', () => {
      const result = cancelInvoiceSchema.safeParse({
        reason: 'Hủy',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Cancellation reason must be at least 5 characters'
        );
      }
    });
  });

  describe('5. confirmManualInvoicePaymentSchema', () => {
    it('should accept valid manual payment confirmation payload', () => {
      const result = confirmManualInvoicePaymentSchema.safeParse({
        proofImageUrl: 'https://cloudinary.com/storage/proof123.jpg',
        paymentMethod: PaymentMethodEnum.CASH,
        note: 'Đã thu tiền mặt tại quầy',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.paymentMethod).toBe(PaymentMethodEnum.CASH);
      }
    });

    it('should default paymentMethod to CASH when omitted', () => {
      const result = confirmManualInvoicePaymentSchema.safeParse({
        proofImageUrl: 'https://cloudinary.com/storage/proof123.jpg',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.paymentMethod).toBe(PaymentMethodEnum.CASH);
      }
    });

    it('should reject when proofImageUrl is missing', () => {
      const result = confirmManualInvoicePaymentSchema.safeParse({
        paymentMethod: PaymentMethodEnum.CASH,
      });

      expect(result.success).toBe(false);
    });

    it('should reject when proofImageUrl is not a valid URL', () => {
      const result = confirmManualInvoicePaymentSchema.safeParse({
        proofImageUrl: 'not-a-valid-url',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Proof image URL must be a valid URL'
        );
      }
    });
  });

  describe('6. invoiceResponseSchema & paginatedInvoiceResponseSchema', () => {
    it('should parse an invoice item response object', () => {
      const item = {
        name: 'Tiền thuê kho tháng 12/2026',
        description: 'Kho A-101',
        quantity: 1,
        unitPrice: 2000000,
        amount: 2000000,
        itemType: InvoiceItemTypeEnum.RENT,
      };

      const result = invoiceItemResponseSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('should parse a complete invoice response object', () => {
      const sample = {
        id: '507f1f77bcf86cd799439011',
        invoiceCode: 'INV-261031-A1B2',
        contractId: '507f1f77bcf86cd799439012',
        customerId: '507f1f77bcf86cd799439013',
        facilityId: '507f1f77bcf86cd799439014',
        type: InvoiceTypeEnum.RECURRING,
        status: InvoiceStatusEnum.ISSUED,
        billingPeriodIndex: 2,
        periodStartDate: '2026-12-01T00:00:00.000Z',
        periodEndDate: '2026-12-31T23:59:59.999Z',
        dueDate: '2026-12-01T23:59:59.999Z',
        items: [
          {
            name: 'Tiền thuê kho tháng 12/2026',
            description: 'Kho A-101',
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
        paidAt: null,
        paymentId: null,
        paymentMethod: null,
        notes: null,
        issuedAt: '2026-11-24T01:00:00.000Z',
        cancelledAt: null,
        cancelReason: null,
        createdAt: '2026-11-24T01:00:00.000Z',
        updatedAt: '2026-11-24T01:00:00.000Z',
      };

      const result = invoiceResponseSchema.safeParse(sample);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.invoiceCode).toBe('INV-261031-A1B2');
        expect(result.data.totalAmount).toBe(2000000);
      }
    });

    it('should parse a paginated invoice response object', () => {
      const sample = {
        items: [
          {
            id: '507f1f77bcf86cd799439011',
            invoiceCode: 'INV-261031-A1B2',
            contractId: '507f1f77bcf86cd799439012',
            customerId: '507f1f77bcf86cd799439013',
            facilityId: '507f1f77bcf86cd799439014',
            type: InvoiceTypeEnum.RECURRING,
            status: InvoiceStatusEnum.PAID,
            billingPeriodIndex: 1,
            periodStartDate: '2026-11-01T00:00:00.000Z',
            periodEndDate: '2026-11-30T23:59:59.999Z',
            dueDate: '2026-11-01T23:59:59.999Z',
            items: [],
            subtotal: 2000000,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: 2000000,
            paidAmount: 2000000,
            paidAt: '2026-11-01T08:30:00.000Z',
            paymentId: '507f1f77bcf86cd799439015',
            paymentMethod: PaymentMethodEnum.SEPAY_QR,
            notes: null,
            issuedAt: '2026-10-25T01:00:00.000Z',
            cancelledAt: null,
            cancelReason: null,
            createdAt: '2026-10-25T01:00:00.000Z',
            updatedAt: '2026-11-01T08:30:00.000Z',
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      const result = paginatedInvoiceResponseSchema.safeParse(sample);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items.length).toBe(1);
        expect(result.data.pagination.total).toBe(1);
      }
    });
  });
});
