import { z } from 'zod';
import { ReservationStatusEnum } from '../../../common/enums/reservation.enum.ts';
import { BillingUnitEnum } from '../../../common/enums/billing.enum.ts';

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

const offeringSnapshotSchema = z.object({
  id: z.string(),
  unitTypeId: z.string().optional().nullable(),
  billingUnit: z.string(),
  pricePerUnit: z.number(),
  depositMultiplier: z.number().optional().nullable(),
  minRentalDays: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
});

const storageUnitSnapshotSchema = z.object({
  id: z.string(),
  unitNumber: z.string(),
  floor: z.number(),
  zone: z.string().optional().nullable(),
  status: z.string(),
});

export const reservationAmenityResponseSchema = z.object({
  facilityAmenityOfferingId: z.string(),
  amenityId: z.string(),
  name: z.string(),
  quantity: z.number(),
  pricePerUnit: z.number(),
  billingUnit: z.enum(BillingUnitEnum),
  totalPrice: z.number(),
});

export const reservationResponseSchema = z.object({
  id: z.string(),
  reservationCode: z.string(),
  customerId: z.string(),
  facilityId: z.string(),
  facilityUnitTypeOfferingId: z.string(),
  storageUnitId: z.string().optional().nullable(),
  startDate: z.string(),
  rentalDuration: z.number(),
  billingUnit: z.enum(BillingUnitEnum),
  basePrice: z.number(),
  depositAmount: z.number(),
  amenities: z.array(reservationAmenityResponseSchema),
  totalAmount: z.number(),
  status: z.enum(ReservationStatusEnum),
  expiresAt: z.string().optional().nullable(),
  receivedBy: userSnapshotSchema.optional().nullable(),
  receivedAt: z.string().optional().nullable(),
  assignedBy: userSnapshotSchema.optional().nullable(),
  assignedAt: z.string().optional().nullable(),
  confirmedBy: userSnapshotSchema.optional().nullable(),
  confirmedAt: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  cancellationReason: z.string().optional().nullable(),
  cancelledBy: userSnapshotSchema.optional().nullable(),
  cancelledAt: z.string().optional().nullable(),
  refundAmount: z.number(),
  paidAt: z.string().optional().nullable(),
  paidAmount: z.number().optional().nullable(),
  paymentId: z.string().optional().nullable(),
  lastPaymentError: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customer: userSnapshotSchema.optional().nullable(),
  facility: facilitySnapshotSchema.optional().nullable(),
  offering: offeringSnapshotSchema.optional().nullable(),
  storageUnit: storageUnitSnapshotSchema.optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const reservationListResponseSchema = z.array(reservationResponseSchema);

export type ReservationAmenityResponse = z.infer<
  typeof reservationAmenityResponseSchema
>;
export type ReservationResponse = z.infer<typeof reservationResponseSchema>;
export type ReservationListResponse = z.infer<
  typeof reservationListResponseSchema
>;
