import { z } from 'zod';
import {
  RefundStatusEnum,
  ReservationCancelSourceEnum,
  ReservationStatusEnum,
} from '../../../common/enums/reservation.enum.ts';
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

export const reservationPendingUnitChangeResponseSchema = z.object({
  newStorageUnitId: z.string(),
  newStorageUnit: storageUnitSnapshotSchema.optional().nullable(),
  newFacilityUnitTypeOfferingId: z.string(),
  newOffering: offeringSnapshotSchema.optional().nullable(),
  newPricePerUnit: z.number(),
  priceDifference: z.number().optional().nullable(),
  reason: z.string(),
  oldUnitStatus: z.string(),
  proposedBy: userSnapshotSchema.optional().nullable(),
  proposedAt: z.string(),
});

export const reservationUnitChangeResponseSchema = z.object({
  fromUnitId: z.string(),
  toUnitId: z.string(),
  fromUnit: storageUnitSnapshotSchema.optional().nullable(),
  toUnit: storageUnitSnapshotSchema.optional().nullable(),
  fromOfferingId: z.string().optional().nullable(),
  toOfferingId: z.string().optional().nullable(),
  fromPrice: z.number().optional().nullable(),
  toPrice: z.number().optional().nullable(),
  reason: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected']).optional().nullable(),
  proposedBy: userSnapshotSchema.optional().nullable(),
  proposedAt: z.string().optional().nullable(),
  decisionBy: userSnapshotSchema.optional().nullable(),
  decisionAt: z.string().optional().nullable(),
  rejectReason: z.string().optional().nullable(),
  changedBy: userSnapshotSchema.optional().nullable(),
  changedAt: z.string().optional().nullable(),
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

export const reservationPolicySnapshotResponseSchema = z.object({
  freeCancelHours: z.number(),
  forfeitPercent: z.number(),
  noShowGraceHours: z.number(),
  cancellationMode: z
    .enum(['slot_start', 'calendar_day'])
    .optional()
    .nullable(),
});

export const reservationResponseSchema = z.object({
  id: z.string(),
  reservationCode: z.string(),
  customerId: z.string(),
  facilityId: z.string(),
  facilityUnitTypeOfferingId: z.string(),
  storageUnitId: z.string().optional().nullable(),
  startDate: z.string(),
  checkInDate: z.string(),
  checkInTimeSlot: z.string(),
  rentalDuration: z.number(),
  billingUnit: z.enum(BillingUnitEnum),
  basePrice: z.number(),
  depositAmount: z.number(),
  amenities: z.array(reservationAmenityResponseSchema),
  totalAmount: z.number(),
  status: z.enum(ReservationStatusEnum),
  expiresAt: z.string().optional().nullable(),
  graceExpiresAt: z.string().optional().nullable(),
  confirmedBy: userSnapshotSchema.optional().nullable(),
  confirmedAt: z.string().optional().nullable(),
  assignedStaffId: z.string().optional().nullable(),
  assignedStaff: userSnapshotSchema.optional().nullable(),
  assignedStaffAt: z.string().optional().nullable(),
  cancellationReason: z.string().optional().nullable(),
  cancelledBy: userSnapshotSchema.optional().nullable(),
  cancelledAt: z.string().optional().nullable(),
  cancellationSource: z.enum(ReservationCancelSourceEnum).optional().nullable(),
  incidentId: z.string().optional().nullable(),
  evidenceImages: z.array(z.string()).optional().default([]),
  forceCancelledBy: userSnapshotSchema.optional().nullable(),
  forceCancelledAt: z.string().optional().nullable(),
  arrivedAt: z.string().optional().nullable(),
  arrivedBy: userSnapshotSchema.optional().nullable(),
  graceExtendedAt: z.string().optional().nullable(),
  graceExtendedBy: userSnapshotSchema.optional().nullable(),
  graceExtensionReason: z.string().optional().nullable(),
  refundAmount: z.number(),
  forfeitedAmount: z.number().default(0),
  refundStatus: z.enum(RefundStatusEnum),
  refundedAt: z.string().optional().nullable(),
  refundedBy: userSnapshotSchema.optional().nullable(),
  refundReference: z.string().optional().nullable(),
  refundNote: z.string().optional().nullable(),
  paidAt: z.string().optional().nullable(),
  paidAmount: z.number().optional().nullable(),
  paymentId: z.string().optional().nullable(),
  termsAccepted: z.boolean().default(false),
  policyVersion: z.string().optional().nullable(),
  acceptedAt: z.string().optional().nullable(),
  policySnapshot: reservationPolicySnapshotResponseSchema.optional().nullable(),
  immediateForfeitWarning: z.boolean().optional().nullable(),
  earlyCheckIn: z.boolean().optional().nullable(),
  outOfSlot: z.boolean().optional().nullable(),
  pendingUnitChange: reservationPendingUnitChangeResponseSchema
    .optional()
    .nullable(),
  unitChangeHistory: z.array(reservationUnitChangeResponseSchema).default([]),
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
export type ReservationPendingUnitChangeResponse = z.infer<
  typeof reservationPendingUnitChangeResponseSchema
>;
export type ReservationUnitChangeResponse = z.infer<
  typeof reservationUnitChangeResponseSchema
>;
export type ReservationPolicySnapshotResponse = z.infer<
  typeof reservationPolicySnapshotResponseSchema
>;
export type ReservationResponse = z.infer<typeof reservationResponseSchema>;
export type ReservationListResponse = z.infer<
  typeof reservationListResponseSchema
>;
