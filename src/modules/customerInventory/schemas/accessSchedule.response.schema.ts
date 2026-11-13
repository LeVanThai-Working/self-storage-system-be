import { z } from 'zod';
import { AccessScheduleStatusEnum } from '../../../common/enums/customerInventory.enum.ts';

export const paginationMetadataSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const timeSlotSnapshotResponseSchema = z.object({
  slotName: z.string(),
  startTime: z.string(),
  endTime: z.string(),
});

export const availableAccessSlotResponseSchema = z.object({
  timeSlotId: z.string(),
  slotName: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  maxCapacity: z.number(),
  bookedCount: z.number(),
  availableCapacity: z.number(),
  isAvailable: z.boolean(),
});

export const rentedRackItemResponseSchema = z.object({
  rackId: z.string(),
  rackCode: z.string(),
  aisle: z.string().nullable().optional(),
  bay: z.union([z.string(), z.number()]).nullable().optional(),
  zone: z.string().nullable().optional(),
});

export const accessScheduleDetailResponseSchema = z.object({
  id: z.string(),
  scheduleCode: z.string(),
  assignedStaffId: z.string().nullable(),
  assignedStaffName: z.string().nullable(),
  assignedAt: z.string().nullable(),
  assignmentVersion: z.number(),
  status: z.nativeEnum(AccessScheduleStatusEnum),
  customerId: z.string(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  contractId: z.string(),
  contractCode: z.string().nullable().optional(),
  facilityId: z.string(),
  facilityName: z.string().nullable().optional(),
  facilityCode: z.string().nullable().optional(),
  timeSlotId: z.string(),
  timeSlotSnapshot: timeSlotSnapshotResponseSchema,
  scheduledDate: z.string(),
  numberOfPeople: z.number(),
  vehicleType: z.string().nullable().optional(),
  vehiclePlate: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  rawOtpCode: z.string().nullable().optional(),
  expiresAt: z.string(),
  checkedInAt: z.string().nullable().optional(),
  checkedInByName: z.string().nullable().optional(),
  checkedOutAt: z.string().nullable().optional(),
  checkedOutByName: z.string().nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
  cancelledReason: z.string().nullable().optional(),
  staffNotes: z.string().nullable().optional(),
  rentedRacks: z.array(rentedRackItemResponseSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const accessScheduleListItemResponseSchema = z.object({
  id: z.string(),
  scheduleCode: z.string(),
  assignedStaffId: z.string().nullable(),
  assignedStaffName: z.string().nullable(),
  assignedAt: z.string().nullable(),
  assignmentVersion: z.number(),
  status: z.nativeEnum(AccessScheduleStatusEnum),
  customerId: z.string(),
  customerName: z.string().nullable().optional(),
  contractId: z.string(),
  contractCode: z.string().nullable().optional(),
  facilityId: z.string(),
  facilityName: z.string().nullable().optional(),
  slotName: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  scheduledDate: z.string(),
  numberOfPeople: z.number(),
  vehiclePlate: z.string().nullable().optional(),
  expiresAt: z.string(),
  checkedInAt: z.string().nullable().optional(),
  checkedOutAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const accessScheduleCheckInResponseSchema = z.object({
  schedule: accessScheduleDetailResponseSchema,
  rentedRacks: z.array(rentedRackItemResponseSchema),
  message: z.string(),
});

export const paginatedAccessScheduleResponseSchema = z.object({
  items: z.array(accessScheduleListItemResponseSchema),
  pagination: paginationMetadataSchema,
});

export type TimeSlotSnapshotResponse = z.infer<
  typeof timeSlotSnapshotResponseSchema
>;
export type AvailableAccessSlotResponse = z.infer<
  typeof availableAccessSlotResponseSchema
>;
export type RentedRackItemResponse = z.infer<
  typeof rentedRackItemResponseSchema
>;
export type AccessScheduleDetailResponse = z.infer<
  typeof accessScheduleDetailResponseSchema
>;
export type AccessScheduleListItemResponse = z.infer<
  typeof accessScheduleListItemResponseSchema
>;
export type AccessScheduleCheckInResponse = z.infer<
  typeof accessScheduleCheckInResponseSchema
>;
