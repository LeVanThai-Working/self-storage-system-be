import z from 'zod';
import { paginationQuerySchema } from '../../../common/schemas/pagination.schema.ts';
import { FacilityStatusEnum } from '../../../common/enums/facility.enum.ts';

const operatingHoursSchema = z.object({
  open: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format HH:mm'),
  close: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format HH:mm'),
});

export const createFacilitySchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5).max(255),
  city: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^0(3|5|7|8|9)[0-9]{8}$/, 'Invalid phone number format')
    .optional(),
  email: z.email().optional(),
  description: z.string().max(1000).optional(),
  operatingHours: operatingHoursSchema.optional(),
});

export const updateFacilitySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  address: z.string().min(5).max(255).optional(),
  city: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^0(3|5|7|8|9)[0-9]{8}$/, 'Invalid phone number format')
    .optional(),
  email: z.email().optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(FacilityStatusEnum).optional(),
  operatingHours: operatingHoursSchema.optional(),
});

export const facilityIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid facility ID format'),
});

export const facilityQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(FacilityStatusEnum).optional(),
  sortBy: z
    .enum(['name', 'city', 'status', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const assignManagerSchema = z.object({
  managerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid manager ID format'),
});

export type CreateFacilityRequest = z.infer<typeof createFacilitySchema>;
export type UpdateFacilityRequest = z.infer<typeof updateFacilitySchema>;
export type FacilityIdParam = z.infer<typeof facilityIdParamSchema>;
export type FacilityQuery = z.infer<typeof facilityQuerySchema>;
export type AssignManagerRequest = z.infer<typeof assignManagerSchema>;
