import { z } from 'zod';
import {
  InventoryRequestTypeEnum,
  InventoryRequestStatusEnum,
} from '../../../common/enums/customerInventory.enum.ts';

export const paginationMetadataSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const inventoryRequestItemResponseSchema = z.object({
  skuId: z.string(),
  skuCode: z.string().optional(),
  name: z.string().optional(),
  barcode: z.string().optional(),
  uom: z.string().optional(),
  quantity: z.number(),
  actualQuantity: z.number().optional(),
  discrepancyQuantity: z.number().optional(),
  storageRackId: z.string().optional(),
  rackCode: z.string().optional(),
  aisle: z.string().optional(),
  bay: z.number().optional(),
  zone: z.string().optional(),
  rackTierId: z.string().optional(),
  tierNumber: z.number().optional(),
});

export const inventoryRequestResponseSchema = z.object({
  id: z.string(),
  requestCode: z.string(),
  type: z.nativeEnum(InventoryRequestTypeEnum),
  status: z.nativeEnum(InventoryRequestStatusEnum),
  customerId: z.string(),
  contractId: z.string(),
  facilityId: z.string(),
  facilityCode: z.string().optional(),
  facilityName: z.string().optional(),
  storageUnitId: z.string(),
  unitNumber: z.string().optional(),
  items: z.array(inventoryRequestItemResponseSchema),

  // Security Credentials (returned only on creation or to customer)
  pickupQrToken: z.string().nullable().optional(),
  pickupQrPayload: z.string().nullable().optional(),
  rawOtpCode: z.string().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
  isVerified: z.boolean(),

  transporterInfo: z
    .object({
      name: z.string(),
      phoneNumber: z.string(),
      vehiclePlate: z.string().optional(),
      deliveryCompany: z.string().optional(),
    })
    .optional(),

  evidenceImages: z.array(z.string()).optional(),
  signatureUrl: z.string().nullable().optional(),
  staffNotes: z.string().nullable().optional(),
  discrepancyReason: z.string().nullable().optional(),
  discrepancyImages: z.array(z.string()).optional(),
  customerFeedbackNotes: z.string().nullable().optional(),

  verifiedAt: z.date().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  completedBy: z.string().nullable().optional(),
  cancelledAt: z.date().nullable().optional(),
  isAutoConfirmed: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const verifiedHandoverDetailsResponseSchema = z.object({
  id: z.string(),
  requestCode: z.string(),
  type: z.nativeEnum(InventoryRequestTypeEnum),
  status: z.nativeEnum(InventoryRequestStatusEnum),
  customerId: z.string(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  contractId: z.string(),
  facilityId: z.string(),
  storageUnitId: z.string(),
  unitNumber: z.string().optional(),
  transporterInfo: z
    .object({
      name: z.string(),
      phoneNumber: z.string(),
      vehiclePlate: z.string().optional(),
      deliveryCompany: z.string().optional(),
    })
    .optional(),
  items: z.array(inventoryRequestItemResponseSchema),
  verifiedAt: z.date(),
  verifiedBy: z.string(),
});

export const paginatedInventoryRequestResponseSchema = z.object({
  items: z.array(inventoryRequestResponseSchema),
  pagination: paginationMetadataSchema,
});

export const regenerateOtpResponseSchema = z.object({
  requestId: z.string(),
  requestCode: z.string(),
  rawOtpCode: z.string(),
  expiresAt: z.date(),
});

export type InventoryRequestItemResponse = z.infer<
  typeof inventoryRequestItemResponseSchema
>;
export type InventoryRequestResponse = z.infer<
  typeof inventoryRequestResponseSchema
>;
export type VerifiedHandoverDetailsResponse = z.infer<
  typeof verifiedHandoverDetailsResponseSchema
>;
export type PaginatedInventoryRequestResponse = z.infer<
  typeof paginatedInventoryRequestResponseSchema
>;
export type RegenerateOtpResponse = z.infer<typeof regenerateOtpResponseSchema>;
