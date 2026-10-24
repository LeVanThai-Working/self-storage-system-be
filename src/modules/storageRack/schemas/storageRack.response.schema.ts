import z from 'zod';
import {
  RackStatusEnum,
  RackTierStatusEnum,
  RackZoneEnum,
} from '../../../common/enums/storageRack.enum.ts';

const dimensionsResponseSchema = z.object({
  length: z.number(),
  width: z.number(),
  height: z.number(),
});

export const rackTierResponseSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  storageUnitId: z.string(),
  storageRackId: z.string(),
  tierNumber: z.number(),
  tierCode: z.string(),
  maxWeightKg: z.number().optional().nullable(),
  dimensions: dimensionsResponseSchema.optional().nullable(),
  volume: z.number().optional().nullable(),
  status: z.enum(RackTierStatusEnum),
  notes: z.string().optional().nullable(),
  createdAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.string().datetime(),
  ]),
  updatedAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.string().datetime(),
  ]),
});

export const storageRackResponseSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  storageUnitId: z.string(),
  rackCode: z.string(),
  aisle: z.string().optional().nullable(),
  bay: z.number().optional().nullable(),
  zone: z.enum(RackZoneEnum).optional().nullable(),
  customPrice: z.number().optional().nullable(),
  currentContractId: z.string().optional().nullable(),
  currentCustomerId: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  tierCount: z.number(),
  status: z.enum(RackStatusEnum),
  notes: z.string().optional().nullable(),
  tiers: z.array(rackTierResponseSchema).optional().nullable(),
  facility: z
    .object({
      id: z.string(),
      name: z.string(),
      city: z.string().optional(),
      address: z.string().optional(),
      status: z.string().optional(),
    })
    .optional()
    .nullable(),
  storageUnit: z
    .object({
      id: z.string(),
      unitNumber: z.string(),
      floor: z.number().optional(),
      zone: z.string().optional(),
      status: z.string().optional(),
    })
    .optional()
    .nullable(),
  createdAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.string().datetime(),
  ]),
  updatedAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.string().datetime(),
  ]),
});

export const storageRackListResponseSchema = z.array(storageRackResponseSchema);
export const rackTierListResponseSchema = z.array(rackTierResponseSchema);

export type RackTierResponse = z.infer<typeof rackTierResponseSchema>;
export type StorageRackResponse = z.infer<typeof storageRackResponseSchema>;
export type StorageRackListResponse = z.infer<
  typeof storageRackListResponseSchema
>;
