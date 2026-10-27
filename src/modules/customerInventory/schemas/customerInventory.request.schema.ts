import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/schemas/pagination.schema.ts';
import { MovementTypeEnum } from '../../../common/enums/customerInventory.enum.ts';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const stockInRequestSchema = z.object({
  contractId: z.string().regex(objectIdRegex, 'Invalid contractId format'),
  skuId: z.string().regex(objectIdRegex, 'Invalid skuId format'),
  rackTierId: z
    .string()
    .regex(objectIdRegex, 'Invalid rackTierId format')
    .nullable()
    .optional(),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
  referenceCode: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const stockOutRequestSchema = z.object({
  contractId: z.string().regex(objectIdRegex, 'Invalid contractId format'),
  skuId: z.string().regex(objectIdRegex, 'Invalid skuId format'),
  rackTierId: z
    .string()
    .regex(objectIdRegex, 'Invalid rackTierId format')
    .nullable()
    .optional(),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
  reason: z.string().trim().max(1000).optional(),
  referenceCode: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const stockMoveRequestSchema = z
  .object({
    contractId: z.string().regex(objectIdRegex, 'Invalid contractId format'),
    skuId: z.string().regex(objectIdRegex, 'Invalid skuId format'),
    fromRackTierId: z
      .string()
      .regex(objectIdRegex, 'Invalid fromRackTierId format')
      .nullable()
      .optional(),
    toRackTierId: z
      .string()
      .regex(objectIdRegex, 'Invalid toRackTierId format')
      .nullable()
      .optional(),
    quantity: z
      .number()
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1'),
    reason: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => {
      const from = data.fromRackTierId || null;
      const to = data.toRackTierId || null;
      return from !== to;
    },
    {
      message: 'Destination position must be different from source position',
      path: ['toRackTierId'],
    }
  );

export const stockAdjustRequestSchema = z.object({
  contractId: z.string().regex(objectIdRegex, 'Invalid contractId format'),
  skuId: z.string().regex(objectIdRegex, 'Invalid skuId format'),
  rackTierId: z
    .string()
    .regex(objectIdRegex, 'Invalid rackTierId format')
    .nullable()
    .optional(),
  newQuantity: z
    .number()
    .int('Quantity must be an integer')
    .min(0, 'Quantity cannot be negative'),
  reason: z
    .string()
    .trim()
    .min(3, 'Reason must be at least 3 characters')
    .max(1000),
  notes: z.string().trim().max(1000).optional(),
});

export const customerInventoryQuerySchema = paginationQuerySchema.extend({
  contractId: z.string().regex(objectIdRegex).optional(),
  facilityId: z.string().regex(objectIdRegex).optional(),
  storageUnitId: z.string().regex(objectIdRegex).optional(),
  storageRackId: z.string().regex(objectIdRegex).optional(),
  rackTierId: z.string().regex(objectIdRegex).optional(),
  skuId: z.string().regex(objectIdRegex).optional(),
  customerId: z.string().regex(objectIdRegex).optional(),
  minQuantity: z.coerce.number().int().min(0).optional(),
  sortBy: z
    .enum(['quantity', 'lastMovementAt', 'createdAt'])
    .default('lastMovementAt'),
});

export const inventoryMovementQuerySchema = paginationQuerySchema.extend({
  contractId: z.string().regex(objectIdRegex).optional(),
  facilityId: z.string().regex(objectIdRegex).optional(),
  storageUnitId: z.string().regex(objectIdRegex).optional(),
  skuId: z.string().regex(objectIdRegex).optional(),
  rackTierId: z
    .string()
    .regex(objectIdRegex, 'Invalid rackTierId format')
    .optional(),
  customerId: z.string().regex(objectIdRegex).optional(),
  type: z.nativeEnum(MovementTypeEnum).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'quantity', 'type']).default('createdAt'),
});

export const customerInventorySummaryQuerySchema = z.object({
  customerId: z
    .string()
    .regex(objectIdRegex, 'Invalid customerId format')
    .optional(),
  userId: z.string().regex(objectIdRegex, 'Invalid userId format').optional(),
});

export const inventoryIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid inventory ID format'),
});

export const storageUnitTreeParamSchema = z.object({
  storageUnitId: z
    .string()
    .regex(objectIdRegex, 'Invalid storageUnitId format'),
});

export const skuLocationsParamSchema = z.object({
  skuId: z.string().regex(objectIdRegex, 'Invalid skuId format'),
});

export const barcodeParamSchema = z.object({
  barcode: z.string().trim().min(1, 'Barcode cannot be empty'),
});

// Explicit interfaces so TSOA generates union with null in parameter schemas
export interface StockInRequest {
  contractId: string;
  skuId: string;
  rackTierId?: string | null;
  quantity: number;
  referenceCode?: string;
  notes?: string;
}

export interface StockOutRequest {
  contractId: string;
  skuId: string;
  rackTierId?: string | null;
  quantity: number;
  reason?: string;
  referenceCode?: string;
  notes?: string;
}

export interface StockMoveRequest {
  contractId: string;
  skuId: string;
  fromRackTierId?: string | null;
  toRackTierId?: string | null;
  quantity: number;
  reason?: string;
  notes?: string;
}

export interface StockAdjustRequest {
  contractId: string;
  skuId: string;
  rackTierId?: string | null;
  newQuantity: number;
  reason: string;
  notes?: string;
}

export interface CustomerInventorySummaryQuery {
  customerId?: string;
  userId?: string;
}

export type CustomerInventoryQuery = z.infer<
  typeof customerInventoryQuerySchema
>;
export type InventoryMovementQuery = z.infer<
  typeof inventoryMovementQuerySchema
>;
export type InventoryIdParam = z.infer<typeof inventoryIdParamSchema>;
export type StorageUnitTreeParam = z.infer<typeof storageUnitTreeParamSchema>;
export type SkuLocationsParam = z.infer<typeof skuLocationsParamSchema>;
export type BarcodeParam = z.infer<typeof barcodeParamSchema>;

export const batchMigrateRackRequestSchema = z
  .object({
    fromRackId: z.string().regex(objectIdRegex, 'Invalid fromRackId format'),
    toRackId: z.string().regex(objectIdRegex, 'Invalid toRackId format'),
    contractId: z
      .string()
      .regex(objectIdRegex, 'Invalid contractId format')
      .optional(),
    addendumId: z
      .string()
      .regex(objectIdRegex, 'Invalid addendumId format')
      .optional(),
    incidentId: z
      .string()
      .regex(objectIdRegex, 'Invalid incidentId format')
      .optional(),
    emergencyReason: z
      .string()
      .trim()
      .min(10, 'Emergency reason must be at least 10 characters')
      .max(1000)
      .optional(),
    reason: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((data) => data.fromRackId !== data.toRackId, {
    message: 'Destination rack must be different from source rack',
    path: ['toRackId'],
  })
  .refine(
    (data) =>
      Boolean(data.addendumId || data.emergencyReason || data.incidentId),
    {
      message:
        'Either addendumId (signed Addendum), incidentId (Incident Report), or emergencyReason (at least 10 characters) is required',
      path: ['emergencyReason'],
    }
  );

export type BatchMigrateRackRequest = z.infer<
  typeof batchMigrateRackRequestSchema
>;
