import { z } from 'zod';
import { FacilityStatusEnum } from '../../../common/enums/facility.enum.ts';

export const myFacilityDashboardFacilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  status: z.enum(FacilityStatusEnum),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
});

export const myFacilityStorageUnitsBreakdownSchema = z.object({
  total: z.number(),
  available: z.number(),
  underMaintenance: z.number(),
  occupied: z.number(),
  reserved: z.number(),
  inactive: z.number(),
  occupancyRate: z.number(),
});

export const myFacilityAmenitiesSummarySchema = z.object({
  totalOfferings: z.number(),
  totalQuantity: z.number(),
  inUseQuantity: z.number(),
  availableQuantity: z.number(),
  outOfStockOfferingsCount: z.number(),
});

export const myFacilityDashboardResponseSchema = z.object({
  facility: myFacilityDashboardFacilitySchema,
  storageUnits: myFacilityStorageUnitsBreakdownSchema,
  amenities: myFacilityAmenitiesSummarySchema,
});

export interface MyFacilityDashboardFacility {
  id: string;
  name: string;
  address: string;
  city: string;
  status: FacilityStatusEnum;
  phone?: string | null;
  email?: string | null;
}

export interface MyFacilityStorageUnitsBreakdown {
  total: number;
  available: number;
  underMaintenance: number;
  occupied: number;
  reserved: number;
  inactive: number;
  occupancyRate: number;
}

export interface MyFacilityAmenitiesSummary {
  totalOfferings: number;
  totalQuantity: number;
  inUseQuantity: number;
  availableQuantity: number;
  outOfStockOfferingsCount: number;
}

export interface MyFacilityDashboardResponse {
  facility: MyFacilityDashboardFacility;
  storageUnits: MyFacilityStorageUnitsBreakdown;
  amenities: MyFacilityAmenitiesSummary;
}
