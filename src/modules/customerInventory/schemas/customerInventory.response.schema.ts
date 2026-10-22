import z from 'zod';
import { MovementTypeEnum } from '../../../common/enums/customerInventory.enum.ts';

export const paginationMetadataSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const inventoryCustomerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
});

export const inventoryContractSummarySchema = z.object({
  id: z.string(),
  contractCode: z.string(),
  status: z.string(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export const inventoryFacilitySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const inventoryStorageUnitSummarySchema = z.object({
  id: z.string(),
  unitNumber: z.string(),
  floor: z.number().optional().nullable(),
  zone: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

export const inventoryStorageRackSummarySchema = z.object({
  id: z.string(),
  rackCode: z.string(),
  name: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

export const inventoryRackTierSummarySchema = z.object({
  id: z.string(),
  tierNumber: z.number(),
  tierCode: z.string(),
  maxWeightKg: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
});

export const inventorySkuSummarySchema = z.object({
  id: z.string(),
  skuCode: z.string(),
  name: z.string(),
  category: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  uom: z.string(),
  imageUrl: z.string().optional().nullable(),
});

export const inventoryPerformerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
});

export const customerInventoryResponseSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  contractId: z.string(),
  facilityId: z.string(),
  storageUnitId: z.string(),
  storageRackId: z.string().optional().nullable(),
  rackTierId: z.string().optional().nullable(),
  skuId: z.string(),
  quantity: z.number(),
  lastMovementAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.string(),
  ]),
  notes: z.string().optional().nullable(),
  customer: inventoryCustomerSummarySchema.optional().nullable(),
  contract: inventoryContractSummarySchema.optional().nullable(),
  facility: inventoryFacilitySummarySchema.optional().nullable(),
  storageUnit: inventoryStorageUnitSummarySchema.optional().nullable(),
  storageRack: inventoryStorageRackSummarySchema.optional().nullable(),
  rackTier: inventoryRackTierSummarySchema.optional().nullable(),
  sku: inventorySkuSummarySchema.optional().nullable(),
  createdAt: z.union([z.date().transform((d) => d.toISOString()), z.string()]),
  updatedAt: z.union([z.date().transform((d) => d.toISOString()), z.string()]),
});

export const inventoryMovementResponseSchema = z.object({
  id: z.string(),
  movementCode: z.string(),
  type: z.nativeEnum(MovementTypeEnum),
  customerInventoryId: z.string().optional().nullable(),
  customerId: z.string(),
  contractId: z.string(),
  facilityId: z.string(),
  storageUnitId: z.string(),
  skuId: z.string(),
  fromRackTierId: z.string().optional().nullable(),
  toRackTierId: z.string().optional().nullable(),
  quantity: z.number(),
  previousQuantity: z.number(),
  newQuantity: z.number(),
  performedBy: z.string(),
  reason: z.string().optional().nullable(),
  referenceCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customer: inventoryCustomerSummarySchema.optional().nullable(),
  contract: inventoryContractSummarySchema.optional().nullable(),
  facility: inventoryFacilitySummarySchema.optional().nullable(),
  storageUnit: inventoryStorageUnitSummarySchema.optional().nullable(),
  sku: inventorySkuSummarySchema.optional().nullable(),
  fromRackTier: inventoryRackTierSummarySchema.optional().nullable(),
  toRackTier: inventoryRackTierSummarySchema.optional().nullable(),
  performer: inventoryPerformerSummarySchema.optional().nullable(),
  createdAt: z.union([z.date().transform((d) => d.toISOString()), z.string()]),
  updatedAt: z.union([z.date().transform((d) => d.toISOString()), z.string()]),
});

export const paginatedCustomerInventoryResponseSchema = z.object({
  items: z.array(customerInventoryResponseSchema),
  pagination: paginationMetadataSchema,
});

export const paginatedInventoryMovementResponseSchema = z.object({
  items: z.array(inventoryMovementResponseSchema),
  pagination: paginationMetadataSchema,
});

export type CustomerInventoryResponse = z.infer<
  typeof customerInventoryResponseSchema
>;
export type InventoryMovementResponse = z.infer<
  typeof inventoryMovementResponseSchema
>;
export type PaginatedCustomerInventoryResponse = z.infer<
  typeof paginatedCustomerInventoryResponseSchema
>;
export type PaginatedInventoryMovementResponse = z.infer<
  typeof paginatedInventoryMovementResponseSchema
>;

// --- Schemas for Task 6D: Tree Layout, SKU Locations & Dashboard Summary ---

export const treeTierItemSchema = z.object({
  inventoryId: z.string(),
  quantity: z.number(),
  lastMovementAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.string(),
  ]),
  notes: z.string().optional().nullable(),
  sku: z.object({
    id: z.string(),
    skuCode: z.string(),
    name: z.string(),
    category: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    uom: z.string(),
    dimensions: z
      .object({
        length: z.number(),
        width: z.number(),
        height: z.number(),
      })
      .optional()
      .nullable(),
    volume: z.number().optional().nullable(),
    weightKg: z.number().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
  }),
});

export const treeTierSchema = z.object({
  id: z.string(),
  tierNumber: z.number(),
  tierCode: z.string(),
  maxWeightKg: z.number().optional().nullable(),
  dimensions: z
    .object({
      length: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional()
    .nullable(),
  volume: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  items: z.array(treeTierItemSchema),
});

export const treeRackSchema = z.object({
  id: z.string(),
  rackCode: z.string(),
  name: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  tierCount: z.number(),
  tiers: z.array(treeTierSchema),
});

export const storageUnitInventoryTreeSummarySchema = z.object({
  totalRacks: z.number(),
  totalTiers: z.number(),
  occupiedTiers: z.number(),
  availableTiers: z.number(),
  totalSkus: z.number(),
  totalQuantity: z.number(),
});

export const storageUnitInventoryTreeResponseSchema = z.object({
  facility: inventoryFacilitySummarySchema.optional().nullable(),
  storageUnit: inventoryStorageUnitSummarySchema,
  contract: z
    .object({
      id: z.string(),
      contractCode: z.string(),
      status: z.string(),
      startDate: z.string().optional().nullable(),
      endDate: z.string().optional().nullable(),
      customer: inventoryCustomerSummarySchema.optional().nullable(),
    })
    .optional()
    .nullable(),
  summary: storageUnitInventoryTreeSummarySchema,
  racks: z.array(treeRackSchema),
  unrackedItems: z.array(treeTierItemSchema),
});

export const skuLocationItemSchema = z.object({
  inventoryId: z.string(),
  quantity: z.number(),
  lastMovementAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.string(),
  ]),
  notes: z.string().optional().nullable(),
  facility: inventoryFacilitySummarySchema.optional().nullable(),
  contract: inventoryContractSummarySchema.optional().nullable(),
  storageUnit: inventoryStorageUnitSummarySchema.optional().nullable(),
  storageRack: inventoryStorageRackSummarySchema.optional().nullable(),
  rackTier: inventoryRackTierSummarySchema.optional().nullable(),
});

export const skuLocationsResponseSchema = z.object({
  sku: z.object({
    id: z.string(),
    skuCode: z.string(),
    name: z.string(),
    category: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    uom: z.string(),
    imageUrl: z.string().optional().nullable(),
    totalQuantity: z.number(),
  }),
  locations: z.array(skuLocationItemSchema),
});

export const categoryBreakdownSchema = z.object({
  category: z.string(),
  skuCount: z.number(),
  totalQuantity: z.number(),
});

export const customerInventorySummaryResponseSchema = z.object({
  totalSkus: z.number(),
  totalQuantity: z.number(),
  totalActiveContracts: z.number(),
  totalStorageUnits: z.number(),
  categoryBreakdown: z.array(categoryBreakdownSchema),
  recentMovements: z.array(inventoryMovementResponseSchema),
});

export type TreeTierItem = z.infer<typeof treeTierItemSchema>;
export type TreeTier = z.infer<typeof treeTierSchema>;
export type TreeRack = z.infer<typeof treeRackSchema>;
export type StorageUnitInventoryTreeResponse = z.infer<
  typeof storageUnitInventoryTreeResponseSchema
>;
export type SkuLocationItem = z.infer<typeof skuLocationItemSchema>;
export type SkuLocationsResponse = z.infer<typeof skuLocationsResponseSchema>;
export type CategoryBreakdown = z.infer<typeof categoryBreakdownSchema>;
export type CustomerInventorySummaryResponse = z.infer<
  typeof customerInventorySummaryResponseSchema
>;
