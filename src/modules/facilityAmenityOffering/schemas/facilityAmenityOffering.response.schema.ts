import { z } from 'zod';
import { BillingUnitEnum } from '../../../common/enums/billing.enum.ts';
import { FacilityAmenityOfferingStatusEnum } from '../../../common/enums/facilityAmenityOffering.enum.ts';
import {
  AmenityStatusEnum,
  AmenityTypeEnum,
} from '../../../common/enums/amenity.enum.ts';
import { FacilityStatusEnum } from '../../../common/enums/facility.enum.ts';

export const facilitySummaryForAmenityOfferingSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  address: z.string(),
  status: z.nativeEnum(FacilityStatusEnum),
});

export const amenitySummaryForAmenityOfferingSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.nativeEnum(AmenityTypeEnum),
  status: z.nativeEnum(AmenityStatusEnum),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const facilityAmenityOfferingResponseSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  amenityId: z.string(),
  facility: facilitySummaryForAmenityOfferingSchema.optional(),
  amenity: amenitySummaryForAmenityOfferingSchema.optional(),
  pricePerUnit: z.number(),
  billingUnit: z.nativeEnum(BillingUnitEnum),
  totalQuantity: z.number(),
  inUseQuantity: z.number(),
  availableQuantity: z.number(),
  status: z.nativeEnum(FacilityAmenityOfferingStatusEnum),
  notes: z.string().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const facilityAmenityOfferingListResponseSchema = z.array(
  facilityAmenityOfferingResponseSchema
);

export type FacilityAmenityOfferingResponse = z.infer<
  typeof facilityAmenityOfferingResponseSchema
>;
export type FacilityAmenityOfferingListResponse = z.infer<
  typeof facilityAmenityOfferingListResponseSchema
>;

