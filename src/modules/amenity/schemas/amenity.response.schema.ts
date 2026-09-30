import { z } from 'zod';
import {
  AmenityStatusEnum,
  AmenityTypeEnum,
} from '../../../common/enums/amenity.enum.ts';

export const amenityResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.nativeEnum(AmenityTypeEnum),
  status: z.nativeEnum(AmenityStatusEnum),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const amenityListResponseSchema = z.array(amenityResponseSchema);

export type AmenityResponse = z.infer<typeof amenityResponseSchema>;
export type AmenityListResponse = z.infer<typeof amenityListResponseSchema>;
