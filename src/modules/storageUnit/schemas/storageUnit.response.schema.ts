import z from 'zod';
import { StorageUnitStatusEnum } from '../../../common/enums/storageUnit.enum.ts';
import { FacilityStatusEnum } from '../../../common/enums/facility.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../../../common/enums/unitType.enum.ts';

const facilitySnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  address: z.string(),
  status: z.enum(FacilityStatusEnum),
});

const unitTypeSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(UnitTypeCategoryEnum).optional().nullable(),
  area: z.number(),
  volume: z.number(),
  status: z.enum(UnitTypeStatusEnum),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
  }),
});

export const storageUnitResponseSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  unitTypeId: z.string(),
  unitNumber: z.string(),
  floor: z.number(),
  zone: z.string().optional().nullable(),
  status: z.enum(StorageUnitStatusEnum),
  notes: z.string().optional().nullable(),
  facility: facilitySnapshotSchema.optional().nullable(),
  unitType: unitTypeSnapshotSchema.optional().nullable(),
  createdAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.iso.datetime(),
  ]),
  updatedAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.iso.datetime(),
  ]),
});

export const storageUnitListResponseSchema = z.array(storageUnitResponseSchema);

export type StorageUnitResponse = z.infer<typeof storageUnitResponseSchema>;
export type StorageUnitListResponse = z.infer<
  typeof storageUnitListResponseSchema
>;
