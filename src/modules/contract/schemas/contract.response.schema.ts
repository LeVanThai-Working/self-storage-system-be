import { z } from 'zod';
import {
  ContractAddendumStatusEnum,
  ContractAddendumTypeEnum,
  ContractCancellationTypeEnum,
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
  ContractTerminationTypeEnum,
  ViolationCategoryEnum,
} from '../../../common/enums/contract.enum.ts';
import { StorageUnitStatusEnum } from '../../../common/enums/storageUnit.enum.ts';
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

export const contractTerminationFileResponseSchema = z.object({
  url: z.string(),
  fileHash: z.string().optional().nullable(),
  uploadedAt: z.string(),
});

export const contractAddendumResponseSchema = z.object({
  id: z.string(),
  addendumCode: z.string(),
  type: z.enum(ContractAddendumTypeEnum),
  previousEndDate: z.string().optional().nullable(),
  newEndDate: z.string().optional().nullable(),
  previousStorageUnitId: z.string().optional().nullable(),
  previousStorageUnit: storageUnitSnapshotSchema.optional().nullable(),
  newStorageUnitId: z.string().optional().nullable(),
  newStorageUnit: storageUnitSnapshotSchema.optional().nullable(),
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
  signedAddendumFiles: z
    .array(contractTerminationFileResponseSchema)
    .default([]),
  notes: z.string().optional().nullable(),
});

export const contractRenewalResponseSchema = z.object({
  previousEndDate: z.string(),
  newEndDate: z.string(),
  renewedAt: z.string(),
  renewedBy: userSnapshotSchema.optional().nullable(),
  note: z.string().optional().nullable(),
});

export const contractSignatureHistoryResponseSchema = z.object({
  party: z.enum(['customer', 'staff']),
  signedAt: z.string(),
  previousStartDate: z.string(),
  previousEndDate: z.string(),
  resetAt: z.string(),
  resetReason: z.string(),
});

export const contractTerminationHistoryResponseSchema = z.object({
  terminationType: z.enum(ContractTerminationTypeEnum),
  violationCategory: z.enum(ViolationCategoryEnum).optional().nullable(),
  reason: z.string(),
  reportFiles: z.array(contractTerminationFileResponseSchema).default([]),
  evidenceFiles: z.array(contractTerminationFileResponseSchema).default([]),
  terminatedBy: userSnapshotSchema.optional().nullable(),
  terminatedAt: z.string(),
  storageUnitStatus: z.enum(StorageUnitStatusEnum),
  depositStatus: z.enum(ContractDepositStatusEnum),
  forfeitedAmount: z.number(),
});

export const contractResponseSchema = z.object({
  id: z.string(),
  contractCode: z.string(),
  source: z.enum(ContractSourceEnum),
  reservationId: z.string().optional().nullable(),
  customerId: z.string(),
  facilityId: z.string(),
  storageUnitId: z.string(),
  rentalTargetType: z.string().optional().nullable(),
  rentedRackIds: z.array(z.string()).optional().default([]),
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
  firstPeriodPaidAt: z.string().optional().nullable(),
  firstPeriodPaymentId: z.string().optional().nullable(),
  totalPeriodicPrice: z.number(),
  amenities: z.array(contractAmenityResponseSchema),
  addendums: z.array(contractAddendumResponseSchema),
  renewals: z.array(contractRenewalResponseSchema),
  renewalCount: z.number(),
  inspectedBy: userSnapshotSchema.optional().nullable(),
  damageFee: z.number(),
  overdueFee: z.number(),
  refundAmount: z.number(),
  forfeitedAmount: z.number().default(0),
  additionalPaymentRequired: z.number(),
  inspectionNotes: z.string().optional().nullable(),
  inspectionPhotos: z.array(z.string()).default([]),
  depositStatus: z.enum(ContractDepositStatusEnum).optional().nullable(),
  settlementConfirmedAt: z.string().optional().nullable(),
  disputedAt: z.string().optional().nullable(),
  disputeReason: z.string().optional().nullable(),
  cancellationType: z.enum(ContractCancellationTypeEnum).optional().nullable(),
  cancellationReason: z.string().optional().nullable(),
  cancelledBy: userSnapshotSchema.optional().nullable(),
  cancelledAt: z.string().optional().nullable(),
  terminationType: z.enum(ContractTerminationTypeEnum).optional().nullable(),
  violationCategory: z.enum(ViolationCategoryEnum).optional().nullable(),
  terminationReason: z.string().optional().nullable(),
  terminatedBy: userSnapshotSchema.optional().nullable(),
  terminatedAt: z.string().optional().nullable(),
  reportFiles: z.array(contractTerminationFileResponseSchema).default([]),
  evidenceFiles: z.array(contractTerminationFileResponseSchema).default([]),
  terminationHistory: z
    .array(contractTerminationHistoryResponseSchema)
    .default([]),
  signedContractFiles: z
    .array(contractTerminationFileResponseSchema)
    .default([]),
  legalEntitySnapshot: z.any().optional().nullable(),
  customerSnapshot: z.any().optional().nullable(),
  signingAuthorizationSnapshot: z.any().optional().nullable(),
  status: z.enum(ContractStatusEnum),
  termsAccepted: z.boolean(),
  customerSigned: z.boolean(),
  customerSignedAt: z.string().optional().nullable(),
  staffSigned: z.boolean(),
  staffSignedAt: z.string().optional().nullable(),
  signatureHistory: z.array(contractSignatureHistoryResponseSchema).default([]),
  earlyCheckIn: z.boolean().optional().nullable(),
  outOfSlot: z.boolean().optional().nullable(),
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

export const processContractOverdueResponseSchema = z.object({
  overdueCount: z.number(),
  processedCount: z.number(),
  failedCount: z.number(),
});

export type ProcessContractOverdueResponse = z.infer<
  typeof processContractOverdueResponseSchema
>;

export type ContractAmenityResponse = z.infer<
  typeof contractAmenityResponseSchema
>;
export type ContractAddendumResponse = z.infer<
  typeof contractAddendumResponseSchema
>;
export type ContractRenewalResponse = z.infer<
  typeof contractRenewalResponseSchema
>;
export type ContractSignatureHistoryResponse = z.infer<
  typeof contractSignatureHistoryResponseSchema
>;
export type ContractTerminationFileResponse = z.infer<
  typeof contractTerminationFileResponseSchema
>;
export type ContractTerminationHistoryResponse = z.infer<
  typeof contractTerminationHistoryResponseSchema
>;
export type ContractResponse = z.infer<typeof contractResponseSchema>;
export type ContractListResponse = z.infer<typeof contractListResponseSchema>;
