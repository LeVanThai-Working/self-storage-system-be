import z from 'zod';
import { CustomerSkuStatusEnum } from '../../../common/enums/customerSku.enum.ts';

export const paginationMetadataSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const dimensionsResponseSchema = z.object({
  length: z.number(),
  width: z.number(),
  height: z.number(),
});

export const customerSkuCustomerResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  phoneNumber: z.string().optional().nullable(),
  role: z.string().optional(),
  status: z.string().optional(),
});

export const customerSkuResponseSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  skuCode: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  uom: z.string(),
  dimensions: dimensionsResponseSchema.optional().nullable(),
  volume: z.number().optional().nullable(),
  weightKg: z.number().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  status: z.enum(CustomerSkuStatusEnum),
  notes: z.string().optional().nullable(),
  customer: customerSkuCustomerResponseSchema.optional().nullable(),
  createdAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.string().datetime(),
  ]),
  updatedAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.string().datetime(),
  ]),
});

export const paginatedCustomerSkuResponseSchema = z.object({
  items: z.array(customerSkuResponseSchema),
  pagination: paginationMetadataSchema,
});

export type DimensionsResponse = z.infer<typeof dimensionsResponseSchema>;
export type CustomerSkuResponse = z.infer<typeof customerSkuResponseSchema>;
export type PaginatedCustomerSkuResponse = z.infer<
  typeof paginatedCustomerSkuResponseSchema
>;
