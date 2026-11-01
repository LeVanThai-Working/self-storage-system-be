import { z } from 'zod';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
} from '../../../common/enums/billing.enum.ts';
import { PaymentMethodEnum } from '../../../common/enums/payment.enum.ts';

const entitySummarySchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    code: z.string().optional(),
  })
  .or(z.string());

export const invoiceItemResponseSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
  itemType: z.nativeEnum(InvoiceItemTypeEnum),
});

export const invoiceResponseSchema = z.object({
  id: z.string(),
  invoiceCode: z.string(),
  contractId: z.string(),
  customerId: z.string(),
  facilityId: z.string(),
  facility: entitySummarySchema.nullable().optional(),
  customer: entitySummarySchema.nullable().optional(),
  contract: entitySummarySchema.nullable().optional(),
  type: z.nativeEnum(InvoiceTypeEnum),
  status: z.nativeEnum(InvoiceStatusEnum),
  billingPeriodIndex: z.number(),
  periodStartDate: z.string(),
  periodEndDate: z.string(),
  dueDate: z.string(),
  items: z.array(invoiceItemResponseSchema),
  subtotal: z.number(),
  discountAmount: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  paidAmount: z.number(),
  paidAt: z.string().nullable().optional(),
  paymentId: z.string().nullable().optional(),
  paymentMethod: z.nativeEnum(PaymentMethodEnum).nullable().optional(),
  notes: z.string().nullable().optional(),
  issuedAt: z.string().nullable().optional(),
  createdBy: entitySummarySchema.nullable().optional(),
  confirmedBy: entitySummarySchema.nullable().optional(),
  confirmedAt: z.string().nullable().optional(),
  proofImageUrl: z.string().nullable().optional(),
  cancelledBy: entitySummarySchema.nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
  cancelReason: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paginatedInvoiceResponseSchema = z.object({
  items: z.array(invoiceResponseSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

export type InvoiceItemResponse = z.infer<typeof invoiceItemResponseSchema>;
export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;
export type PaginatedInvoiceResponse = z.infer<
  typeof paginatedInvoiceResponseSchema
>;

export const recurringInvoiceScanResultSchema = z.object({
  scannedCount: z.number().int().nonnegative(),
  generatedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
});

export type RecurringInvoiceScanResult = z.infer<
  typeof recurringInvoiceScanResultSchema
>;

export const overdueInvoiceScanResultSchema = z.object({
  scannedCount: z.number().int().nonnegative(),
  markedOverdueCount: z.number().int().nonnegative(),
  contractsLockedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
});

export type OverdueInvoiceScanResult = z.infer<
  typeof overdueInvoiceScanResultSchema
>;

export const remindInvoicesScanResultSchema = z.object({
  scannedCount: z.number().int().nonnegative(),
  remindedT3Count: z.number().int().nonnegative(),
  remindedT1Count: z.number().int().nonnegative(),
  remindedT0Count: z.number().int().nonnegative(),
  totalRemindedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
});

export type RemindInvoicesScanResult = z.infer<
  typeof remindInvoicesScanResultSchema
>;

export const invoicePdfResponseSchema = z.object({
  html: z.string(),
  invoiceCode: z.string(),
});

export type InvoicePdfResponse = z.infer<typeof invoicePdfResponseSchema>;
