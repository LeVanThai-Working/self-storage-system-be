import z from 'zod';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../../../common/enums/unitType.enum.ts';

const dimensionsResponseSchema = z.object({
  length: z.number(),
  width: z.number(),
  height: z.number(),
});

export const unitTypeResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  dimensions: dimensionsResponseSchema,
  area: z.number(),
  volume: z.number(),
  category: z.enum(UnitTypeCategoryEnum).optional().nullable(),
  status: z.enum(UnitTypeStatusEnum),
  images: z.array(z.string()).optional().nullable(),
  features: z.array(z.string()).optional().nullable(),
  basePrice: z.number().optional().nullable(),
  createdAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.iso.datetime(),
  ]),
  updatedAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.iso.datetime(),
  ]),
});

export const unitTypeListResponseSchema = z.array(unitTypeResponseSchema);

export type UnitTypeResponse = z.infer<typeof unitTypeResponseSchema>;
export type UnitTypeListResponse = z.infer<typeof unitTypeListResponseSchema>;
