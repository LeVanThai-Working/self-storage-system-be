import { z } from 'zod';
import {
  RefundRequestReasonEnum,
  RefundRequestStatusEnum,
} from '../../../common/enums/refundRequest.enum.ts';

const entitySummarySchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    role: z.string().optional(),
  })
  .or(z.string());

export const refundRequestResponseSchema = z.object({
  id: z.string(),
  refundCode: z.string(),
  reservationId: z.string().nullable(),
  contractId: z.string().nullable(),
  paymentId: z.string().nullable(),
  facility: entitySummarySchema,
  customer: entitySummarySchema,
  amount: z.number(),
  reason: z.nativeEnum(RefundRequestReasonEnum),
  status: z.nativeEnum(RefundRequestStatusEnum),

  // Sensitive bank data (Always masked in response)
  refundBankName: z.string().nullable(),
  refundAccountNumberMasked: z.string().nullable(),
  refundAccountHolder: z.string().nullable(),

  // Settlement & reconciliation
  referenceCode: z.string().nullable(),
  proofImageUrl: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  note: z.string().nullable(),

  // Actors & Timestamps
  requestedBy: entitySummarySchema,
  requestedAt: z.string(),
  approvedBy: entitySummarySchema.nullable(),
  approvedAt: z.string().nullable(),
  rejectedBy: entitySummarySchema.nullable(),
  rejectedAt: z.string().nullable(),
  paidBy: entitySummarySchema.nullable(),
  paidAt: z.string().nullable(),
  cancelledBy: entitySummarySchema.nullable(),
  cancelledAt: z.string().nullable(),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RefundRequestResponse = z.infer<typeof refundRequestResponseSchema>;
