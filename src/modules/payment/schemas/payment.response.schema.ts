import { z } from 'zod';
import {
  PaymentMethodEnum,
  PaymentPurposeEnum,
  PaymentStatusEnum,
} from '../../../common/enums/payment.enum.ts';

const userSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
});

const facilitySnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  address: z.string(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

export const bankInfoSchema = z.object({
  bankCode: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
});

export const paymentResponseSchema = z.object({
  id: z.string(),
  paymentCode: z.string(),
  purpose: z.enum(PaymentPurposeEnum),
  reservationId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  customerId: z.string(),
  facilityId: z.string(),
  amount: z.number(),
  paidAmount: z.number(),
  overpaidAmount: z.number(),
  method: z.enum(PaymentMethodEnum),
  status: z.enum(PaymentStatusEnum),
  qrUrl: z.string().optional().nullable(),
  bankInfo: bankInfoSchema.optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  paidAt: z.string().optional().nullable(),
  sepayTransactionId: z.number().optional().nullable(),
  referenceCode: z.string().optional().nullable(),
  confirmedBy: userSnapshotSchema.optional().nullable(),
  confirmedAt: z.string().optional().nullable(),
  cancelledBy: userSnapshotSchema.optional().nullable(),
  cancelledAt: z.string().optional().nullable(),
  cancellationReason: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  customer: userSnapshotSchema.optional().nullable(),
  facility: facilitySnapshotSchema.optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paymentListResponseSchema = z.array(paymentResponseSchema);

export type PaymentResponse = z.infer<typeof paymentResponseSchema>;
export type PaymentListResponse = z.infer<typeof paymentListResponseSchema>;
