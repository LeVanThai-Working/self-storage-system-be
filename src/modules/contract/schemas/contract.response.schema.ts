import { z } from 'zod';
import {
  ContractAddendumStatusEnum,
  ContractAddendumTypeEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../../../common/enums/contract.enum.ts';
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

export const contractAmenityResponseSchema = z.object({
  facilityAmenityOfferingId: z.string(),
  amenityId: z.string(),
  name: z.string(),
  quantity: z.number(),
  pricePerUnit: z.number(),
  billingUnit: z.enum(BillingUnitEnum),
  totalPrice: z.number(),
  addedAt: z.string(),
});

export const contractAddendumResponseSchema = z.object({
  id: z.string(),
  addendumCode: z.string(),
  type: z.enum(ContractAddendumTypeEnum),
  amenities: z.array(contractAmenityResponseSchema),
  totalPeriodicPrice: z.number(),
  damageFee: z.number(),
  status: z.enum(ContractAddendumStatusEnum),
  requestedBy: userSnapshotSchema.optional().nullable(),
  requestedAt: z.string(),
  approvedBy: userSnapshotSchema.optional().nullable(),
  approvedAt: z.string().optional().nullable(),
  assignedStaffId: z.string().optional().nullable(),
  assignedStaff: userSnapshotSchema.optional().nullable(),
  customerSigned: z.boolean(),
  customerSignedAt: z.string().optional().nullable(),
  staffSigned: z.boolean(),
  staffSignedAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  rejectedBy: userSnapshotSchema.optional().nullable(),
  rejectedAt: z.string().optional().nullable(),
  cancellationReason: z.string().optional().nullable(),
  cancelledBy: userSnapshotSchema.optional().nullable(),
  cancelledAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const contractRenewalResponseSchema = z.object({
  previousEndDate: z.string(),
  newEndDate: z.string(),
  renewedAt: z.string(),
  renewedBy: userSnapshotSchema.optional().nullable(),
  note: z.string().optional().nullable(),
});

export const contractResponseSchema = z.object({
  id: z.string(),
  contractCode: z.string(),
  source: z.enum(ContractSourceEnum),
  reservationId: z.string().optional().nullable(),
  customerId: z.string(),
  facilityId: z.string(),
  storageUnitId: z.string(),
  facilityUnitTypeOfferingId: z.string(),
  assignedStaffId: z.string().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  actualCheckInDate: z.string().optional().nullable(),
  actualCheckOutDate: z.string().optional().nullable(),
  billingUnit: z.enum(BillingUnitEnum),
  rentalPrice: z.number(),
  depositAmount: z.number(),
  depositPaidAt: z.string().optional().nullable(),
  depositPaymentId: z.string().optional().nullable(),
  totalPeriodicPrice: z.number(),
  amenities: z.array(contractAmenityResponseSchema),
  addendums: z.array(contractAddendumResponseSchema),
  renewals: z.array(contractRenewalResponseSchema),
  renewalCount: z.number(),
  inspectedBy: userSnapshotSchema.optional().nullable(),
  damageFee: z.number(),
  overdueFee: z.number(),
  refundAmount: z.number(),
  additionalPaymentRequired: z.number(),
  inspectionNotes: z.string().optional().nullable(),
  cancellationReason: z.string().optional().nullable(),
  cancelledBy: userSnapshotSchema.optional().nullable(),
  cancelledAt: z.string().optional().nullable(),
  terminationReason: z.string().optional().nullable(),
  terminatedBy: userSnapshotSchema.optional().nullable(),
  terminatedAt: z.string().optional().nullable(),
  status: z.enum(ContractStatusEnum),
  termsAccepted: z.boolean(),
  customerSigned: z.boolean(),
  customerSignedAt: z.string().optional().nullable(),
  staffSigned: z.boolean(),
  staffSignedAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customer: userSnapshotSchema.optional().nullable(),
  facility: facilitySnapshotSchema.optional().nullable(),
  offering: offeringSnapshotSchema.optional().nullable(),
  storageUnit: storageUnitSnapshotSchema.optional().nullable(),
  assignedStaff: userSnapshotSchema.optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const contractListResponseSchema = z.array(contractResponseSchema);

export type ContractAmenityResponse = z.infer<
  typeof contractAmenityResponseSchema
>;
export type ContractAddendumResponse = z.infer<
  typeof contractAddendumResponseSchema
>;
export type ContractRenewalResponse = z.infer<
  typeof contractRenewalResponseSchema
>;
export type ContractResponse = z.infer<typeof contractResponseSchema>;
export type ContractListResponse = z.infer<typeof contractListResponseSchema>;
