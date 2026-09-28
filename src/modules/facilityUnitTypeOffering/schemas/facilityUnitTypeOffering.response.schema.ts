import z from 'zod';
import { BillingUnitEnum } from '../../../common/enums/billing.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../../../common/enums/facilityUnitTypeOffering.enum.ts';
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

export const facilityUnitTypeOfferingResponseSchema = z.object({
  id: z.string(),
  facility: facilitySnapshotSchema,
  unitType: unitTypeSnapshotSchema,
  billingUnit: z.enum(BillingUnitEnum),
  pricePerUnit: z.number(),
  depositMultiplier: z.number(),
  minRentalDays: z.number(),
  status: z.enum(FacilityUnitTypeOfferingStatusEnum),
  notes: z.string().optional().nullable(),
  createdAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.iso.datetime(),
  ]),
  updatedAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.iso.datetime(),
  ]),
});

export const facilityUnitTypeOfferingListResponseSchema = z.array(
  facilityUnitTypeOfferingResponseSchema
);

export type FacilityUnitTypeOfferingResponse = z.infer<
  typeof facilityUnitTypeOfferingResponseSchema
>;
export type FacilityUnitTypeOfferingListResponse = z.infer<
  typeof facilityUnitTypeOfferingListResponseSchema
>;
