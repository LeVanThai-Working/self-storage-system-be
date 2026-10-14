import { z } from 'zod';

export const facilityTimeSlotResponseSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  slotName: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  maxCapacity: z.number(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const availableTimeSlotItemResponseSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  slotName: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  maxCapacity: z.number(),
  bookedCount: z.number(),
  availableCapacity: z.number(),
  isAvailable: z.boolean(),
});

export type FacilityTimeSlotResponse = z.infer<
  typeof facilityTimeSlotResponseSchema
>;
export type AvailableTimeSlotItemResponse = z.infer<
  typeof availableTimeSlotItemResponseSchema
>;
