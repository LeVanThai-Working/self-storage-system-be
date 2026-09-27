import z from 'zod';
import { FacilityStatusEnum } from '../../../common/enums/facility.enum.ts';

const operatingHoursResponseSchema = z.object({
  open: z.string(),
  close: z.string(),
});

export const facilityResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(FacilityStatusEnum),
  managerId: z.string().optional().nullable(),
  operatingHours: operatingHoursResponseSchema.optional().nullable(),
  createdAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.iso.datetime(),
  ]),
  updatedAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.iso.datetime(),
  ]),
});

export const facilityListResponseSchema = z.array(facilityResponseSchema);

export type FacilityResponse = z.infer<typeof facilityResponseSchema>;
export type FacilityListResponse = z.infer<typeof facilityListResponseSchema>;
