import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/schemas/pagination.schema.ts';
import { BillingUnitEnum } from '../../../common/enums/billing.enum.ts';
import {
  ContractAddendumTypeEnum,
  ContractCancellationTypeEnum,
  ContractSourceEnum,
  ContractStatusEnum,
  ContractTerminationTypeEnum,
  ViolationCategoryEnum,
} from '../../../common/enums/contract.enum.ts';

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format (must be ISO-8601)',
  });

export const contractAmenityInputSchema = z.object({
  facilityAmenityOfferingId: objectIdSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const createContractSchema = z
  .object({
    source: z.nativeEnum(ContractSourceEnum),
    reservationId: objectIdSchema.optional(),

    customerId: objectIdSchema.optional(),
    facilityId: objectIdSchema.optional(),
    storageUnitId: objectIdSchema.optional(),
    facilityUnitTypeOfferingId: objectIdSchema.optional(),

    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),

    billingUnit: z.nativeEnum(BillingUnitEnum).optional(),
    rentalPrice: z.number().min(0).optional(),
    depositAmount: z.number().min(0).optional(),

    amenities: z.array(contractAmenityInputSchema).optional(),
    assignedStaffId: objectIdSchema.optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.source === ContractSourceEnum.RESERVATION) {
      if (!data.reservationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'reservationId is required when source is RESERVATION',
          path: ['reservationId'],
        });
      }
    } else if (data.source === ContractSourceEnum.WALK_IN) {
      if (!data.customerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'customerId is required for WALK_IN contracts',
          path: ['customerId'],
        });
      }
      if (!data.facilityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'facilityId is required for WALK_IN contracts',
          path: ['facilityId'],
        });
      }
      if (!data.storageUnitId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'storageUnitId is required for WALK_IN contracts',
          path: ['storageUnitId'],
        });
      }
      if (!data.facilityUnitTypeOfferingId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'facilityUnitTypeOfferingId is required for WALK_IN contracts',
          path: ['facilityUnitTypeOfferingId'],
        });
      }
      if (!data.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'startDate is required for WALK_IN contracts',
          path: ['startDate'],
        });
      }
      if (!data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'endDate is required for WALK_IN contracts',
          path: ['endDate'],
        });
      }
      if (!data.billingUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'billingUnit is required for WALK_IN contracts',
          path: ['billingUnit'],
        });
      }
      if (data.rentalPrice === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'rentalPrice is required for WALK_IN contracts',
          path: ['rentalPrice'],
        });
      }
      if (data.depositAmount === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'depositAmount is required for WALK_IN contracts',
          path: ['depositAmount'],
        });
      }
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate).getTime();
        const end = new Date(data.endDate).getTime();
        if (end <= start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'endDate must be greater than startDate',
            path: ['endDate'],
          });
        }
      }
    }
  });

export const checkInContractSchema = z.object({
  termsAccepted: z.boolean().default(true),
  actualCheckInDate: dateStringSchema.optional(),
  signedContractFileUrls: z
    .array(z.string().url('Invalid contract scan URL'))
    .min(1, 'At least one signed contract document scan/photo is required')
    .optional(),
  notes: z.string().max(1000).optional(),
});

export const customerSignContractSchema = z.object({
  termsAccepted: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
});

export const cancelContractSchema = z
  .object({
    cancellationType: z
      .enum(ContractCancellationTypeEnum)
      .default(ContractCancellationTypeEnum.CANCEL),
    cancellationReason: z
      .string()
      .min(1, 'Cancellation reason is required')
      .max(1000),
    refundBankName: z.string().min(2).max(100).optional(),
    refundAccountNumber: z
      .string()
      .regex(/^[0-9A-Za-z]{6,30}$/, 'Invalid bank account number format')
      .optional(),
    refundAccountHolder: z.string().min(2).max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.cancellationType === ContractCancellationTypeEnum.VOID) {
      if (
        !data.cancellationReason ||
        data.cancellationReason.trim().length < 3
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cancellation reason for VOID must be at least 3 characters',
          path: ['cancellationReason'],
        });
      }
    }
  });

export const renewContractSchema = z.object({
  newEndDate: dateStringSchema,
  note: z.string().max(1000).optional(),
});

export const createContractAddendumSchema = z
  .object({
    type: z.nativeEnum(ContractAddendumTypeEnum),
    newEndDate: dateStringSchema.optional(),
    newStorageUnitId: objectIdSchema.optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === ContractAddendumTypeEnum.RENEW) {
      if (!data.newEndDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'newEndDate is required when addendum type is RENEW',
          path: ['newEndDate'],
        });
      }
    } else if (data.type === ContractAddendumTypeEnum.UNIT_CHANGE) {
      if (!data.newStorageUnitId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'newStorageUnitId is required when addendum type is UNIT_CHANGE',
          path: ['newStorageUnitId'],
        });
      }
    }
  });

export const approveContractAddendumSchema = z.object({
  assignedStaffId: objectIdSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export const rejectContractAddendumSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(1000),
});

export const signContractAddendumSchema = z.object({
  termsAccepted: z.boolean().default(true),
  damageFee: z.number().min(0).optional(),
  signedAddendumFileUrls: z
    .array(z.string().url('Invalid addendum scan URL'))
    .min(1, 'At least one signed addendum document scan/photo is required')
    .optional(),
  notes: z.string().max(1000).optional(),
});

export const walkInContractSchema = z.object({
  facilityId: objectIdSchema,
  storageUnitId: objectIdSchema,
  rentedRackIds: z.array(objectIdSchema).optional(),
  facilityUnitTypeOfferingId: objectIdSchema,
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  billingUnit: z.nativeEnum(BillingUnitEnum).default(BillingUnitEnum.MONTH),
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10).max(15),
  dateOfBirth: dateStringSchema,
  address: z.string().min(5).max(255).optional(),
  idCardNumber: z.string().min(9).max(20),
  idCardFrontPhotoUrl: z.string().url().optional(),
  idCardBackPhotoUrl: z.string().url().optional(),
  assignedStaffId: objectIdSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export const cancelContractAddendumSchema = z.object({
  cancellationReason: z
    .string()
    .min(1, 'Cancellation reason is required')
    .max(1000),
});

export const checkOutContractSchema = z.object({
  damageFee: z.number().min(0).default(0),
  inspectionNotes: z.string().max(1000).optional(),
  inspectionPhotos: z.array(z.string()).optional(),
  actualCheckOutDate: dateStringSchema.optional(),
});

export const terminateContractSchema = z
  .object({
    terminationType: z.nativeEnum(ContractTerminationTypeEnum),
    violationCategory: z
      .nativeEnum(ViolationCategoryEnum)
      .optional()
      .nullable(),
    reason: z
      .string()
      .min(1, 'Termination reason is required')
      .max(2000)
      .optional(),
    terminationReason: z
      .string()
      .min(1, 'Termination reason is required')
      .max(2000)
      .optional(),
    reportFileUrls: z
      .array(z.string().url('Invalid report file URL'))
      .min(1, 'At least one report file is required'),
    evidenceFileUrls: z
      .array(z.string().url('Invalid evidence photo URL'))
      .min(1, 'At least one evidence photo is required'),
  })
  .superRefine((data, ctx) => {
    if (!data.reason && !data.terminationReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Termination reason is required',
        path: ['reason'],
      });
    }
    if (
      data.terminationType === ContractTerminationTypeEnum.VIOLATION &&
      !data.violationCategory
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Violation category is required when termination type is VIOLATION',
        path: ['violationCategory'],
      });
    }
  });

export const disputeSettlementSchema = z.object({
  disputeReason: z.string().min(1, 'Dispute reason is required').max(1000),
});

export const contractQuerySchema = paginationQuerySchema.extend({
  customerId: objectIdSchema.optional(),
  facilityId: objectIdSchema.optional(),
  storageUnitId: objectIdSchema.optional(),
  facilityUnitTypeOfferingId: objectIdSchema.optional(),
  status: z.nativeEnum(ContractStatusEnum).optional(),
  source: z.nativeEnum(ContractSourceEnum).optional(),
  contractCode: z.string().optional(),
  startDateFrom: dateStringSchema.optional(),
  startDateTo: dateStringSchema.optional(),
  endDateFrom: dateStringSchema.optional(),
  endDateTo: dateStringSchema.optional(),
});

export const contractIdParamSchema = z.object({
  id: objectIdSchema,
});

export const contractAddendumParamSchema = z.object({
  id: objectIdSchema,
  addendumId: objectIdSchema,
});

export const processContractOverdueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export type ProcessContractOverdueQuery = z.infer<
  typeof processContractOverdueQuerySchema
>;

export type DisputeSettlementRequest = z.infer<typeof disputeSettlementSchema>;
export type CreateContractRequest = z.infer<typeof createContractSchema>;
export type CheckInContractRequest = z.infer<typeof checkInContractSchema>;
export type CustomerSignContractRequest = z.infer<
  typeof customerSignContractSchema
>;
export type CancelContractRequest = z.infer<typeof cancelContractSchema>;
export type RenewContractRequest = z.infer<typeof renewContractSchema>;
export type CreateContractAddendumRequest = z.infer<
  typeof createContractAddendumSchema
>;
export type ApproveContractAddendumRequest = z.infer<
  typeof approveContractAddendumSchema
>;
export type RejectContractAddendumRequest = z.infer<
  typeof rejectContractAddendumSchema
>;
export type SignContractAddendumRequest = z.infer<
  typeof signContractAddendumSchema
>;
export type CancelContractAddendumRequest = z.infer<
  typeof cancelContractAddendumSchema
>;
export type WalkInContractRequest = z.infer<typeof walkInContractSchema>;
export type CheckOutContractRequest = z.infer<typeof checkOutContractSchema>;
export type TerminateContractRequest = z.infer<typeof terminateContractSchema>;
export type ContractQuery = z.infer<typeof contractQuerySchema>;
