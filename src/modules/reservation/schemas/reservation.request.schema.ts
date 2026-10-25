import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/schemas/pagination.schema.ts';
import {
  RefundStatusEnum,
  ReservationStatusEnum,
} from '../../../common/enums/reservation.enum.ts';

export const reservationIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid reservation ID format'),
});

export const reservationAmenityInputSchema = z.object({
  facilityAmenityOfferingId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid facility amenity offering ID format'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format (must be a valid ISO 8601 date string)',
  });

export const createReservationSchema = z.object({
  facilityId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid facility ID format'),
  storageUnitId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid storage unit ID format'),
  checkInDate: dateStringSchema,
  checkInTimeSlot: z.string().min(3).max(50).trim(),
  facilityUnitTypeOfferingId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid facility unit type offering ID format')
    .optional(),
  startDate: dateStringSchema.optional(),
  rentalDuration: z.number().int().min(1, 'Rental duration must be at least 1'),
  amenities: z.array(reservationAmenityInputSchema).optional().default([]),
  notes: z.string().max(1000).optional(),
});

export const reassignStorageUnitSchema = z.object({
  newStorageUnitId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid storage unit ID format'),
  reason: z.string().min(3).max(500),
  oldUnitStatus: z
    .enum(['under_maintenance', 'available'])
    .default('under_maintenance')
    .optional(),
});

export const confirmReservationSchema = z.object({
  assignedStaffId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid staff ID format'),
  notes: z.string().max(1000).optional(),
});

export const cancelReservationSchema = z.object({
  cancellationReason: z
    .string()
    .min(3, 'Cancellation reason must be at least 3 characters')
    .max(500),
  refundBankName: z.string().min(2).max(100).optional(),
  refundAccountNumber: z
    .string()
    .regex(/^[0-9A-Za-z]{6,30}$/, 'Invalid bank account number format')
    .optional(),
  refundAccountHolder: z.string().min(2).max(100).optional(),
});

export const assignReservationStaffSchema = z.object({
  staffId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid staff ID format'),
  notes: z.string().max(1000).optional(),
});

export const confirmRefundSchema = z.object({
  referenceCode: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const reservationQuerySchema = paginationQuerySchema.extend({
  customerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
  facilityId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
  facilityUnitTypeOfferingId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
  storageUnitId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
  status: z.nativeEnum(ReservationStatusEnum).optional(),
  refundStatus: z.nativeEnum(RefundStatusEnum).optional(),
  reservationCode: z.string().optional(),
  startDateFrom: dateStringSchema.optional(),
  startDateTo: dateStringSchema.optional(),
  checkInDateFrom: dateStringSchema.optional(),
  checkInDateTo: dateStringSchema.optional(),
  sortBy: z
    .enum(['createdAt', 'startDate', 'checkInDate', 'totalAmount', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateReservationRequest = z.infer<typeof createReservationSchema>;
export type ReassignStorageUnitRequest = z.infer<
  typeof reassignStorageUnitSchema
>;
export type ConfirmReservationRequest = z.infer<
  typeof confirmReservationSchema
>;
export type CancelReservationRequest = z.infer<typeof cancelReservationSchema>;
export type AssignReservationStaffRequest = z.infer<
  typeof assignReservationStaffSchema
>;
export type ConfirmRefundRequest = z.infer<typeof confirmRefundSchema>;
export type ReservationQuery = z.infer<typeof reservationQuerySchema>;
export type ReservationIdParam = z.infer<typeof reservationIdParamSchema>;
