import z from 'zod';
import { FacilityStatusEnum } from '../../../common/enums/facility.enum.ts';
import { BillingUnitEnum } from '../../../common/enums/billing.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../../../common/enums/facilityUnitTypeOffering.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../../../common/enums/unitType.enum.ts';
import {
  AmenityTypeEnum,
  AmenityStatusEnum,
} from '../../../common/enums/amenity.enum.ts';
import { FacilityAmenityOfferingStatusEnum } from '../../../common/enums/facilityAmenityOffering.enum.ts';

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

const publicUnitTypeDimensionsSchema = z.object({
  length: z.number(),
  width: z.number(),
  height: z.number(),
});

const publicUnitTypeDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(UnitTypeCategoryEnum),
  dimensions: publicUnitTypeDimensionsSchema,
  area: z.number(),
  volume: z.number(),
  description: z.string().optional().nullable(),
  status: z.enum(UnitTypeStatusEnum),
});

export const publicUnitTypeOfferingSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  unitTypeId: z.string(),
  unitType: publicUnitTypeDetailSchema,
  pricePerUnit: z.number(),
  depositMultiplier: z.number(),
  billingUnit: z.enum(BillingUnitEnum),
  minRentalDays: z.number(),
  status: z.enum(FacilityUnitTypeOfferingStatusEnum),
  availableUnitsCount: z.number(),
});

const publicAmenityDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  type: z.enum(AmenityTypeEnum),
  status: z.enum(AmenityStatusEnum),
  images: z.array(z.string()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export const publicAmenityOfferingSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  amenityId: z.string(),
  amenity: publicAmenityDetailSchema,
  pricePerUnit: z.number(),
  billingUnit: z.enum(BillingUnitEnum),
  totalQuantity: z.number(),
  inUseQuantity: z.number(),
  availableQuantity: z.number(),
  status: z.enum(FacilityAmenityOfferingStatusEnum),
});

export const facilityPublicDetailResponseSchema = z.object({
  facility: facilityResponseSchema,
  unitTypeOfferings: z.array(publicUnitTypeOfferingSchema),
  amenityOfferings: z.array(publicAmenityOfferingSchema),
});

export type FacilityResponse = z.infer<typeof facilityResponseSchema>;
export type FacilityListResponse = z.infer<typeof facilityListResponseSchema>;
export type PublicUnitTypeOfferingResponse = z.infer<
  typeof publicUnitTypeOfferingSchema
>;
export type PublicAmenityOfferingResponse = z.infer<
  typeof publicAmenityOfferingSchema
>;
export type FacilityPublicDetailResponse = z.infer<
  typeof facilityPublicDetailResponseSchema
>;
