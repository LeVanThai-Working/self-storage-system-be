import { z } from 'zod';
import {
  IncidentCategoryEnum,
  IncidentSeverityEnum,
  IncidentStatusEnum,
  IncidentLiablePartyEnum,
} from '../../../common/enums/incident.enum.ts';
import { RoleEnum } from '../../../common/enums/user.enum.ts';

export const paginationMetadataSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const userRefSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.string().optional(),
});

export const facilityRefSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
});

export const storageUnitRefSchema = z.object({
  id: z.string(),
  unitNumber: z.string().optional(),
  floor: z.number().optional(),
  zone: z.string().optional(),
  status: z.string().optional(),
});

export const storageRackRefSchema = z.object({
  id: z.string(),
  rackCode: z.string().optional(),
  aisle: z.string().optional(),
  bay: z.number().optional(),
  zone: z.string().optional(),
  status: z.string().optional(),
});

export const rackTierRefSchema = z.object({
  id: z.string(),
  tierNumber: z.number().optional(),
  status: z.string().optional(),
});

export const contractRefSchema = z.object({
  id: z.string(),
  contractCode: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const incidentResolutionResponseSchema = z.object({
  investigationNotes: z.string().optional(),
  staffEvidenceImages: z.array(z.string()),
  resolutionNotes: z.string(),
  repairCost: z.number(),
  liableParty: z.nativeEnum(IncidentLiablePartyEnum),
  damageFee: z.number(),
  resolvedBy: z.union([userRefSchema, z.string()]),
  resolvedAt: z.string(),
});

export const incidentResponseSchema = z.object({
  id: z.string(),
  incidentCode: z.string(),
  facility: z.union([facilityRefSchema, z.string()]),
  storageUnit: storageUnitRefSchema.nullable().optional(),
  storageRack: storageRackRefSchema.nullable().optional(),
  rackTier: rackTierRefSchema.nullable().optional(),
  contract: contractRefSchema.nullable().optional(),
  reporter: z.union([userRefSchema, z.string()]),
  reporterRole: z.nativeEnum(RoleEnum),
  category: z.nativeEnum(IncidentCategoryEnum),
  severity: z.nativeEnum(IncidentSeverityEnum),
  title: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  status: z.nativeEnum(IncidentStatusEnum),
  assignedStaff: userRefSchema.nullable().optional(),
  putUnitUnderMaintenance: z.boolean(),
  requiresRelocation: z.boolean(),
  investigationNotes: z.string().nullable().optional(),
  resolution: incidentResolutionResponseSchema.nullable().optional(),
  closedAt: z.string().nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
  cancellationReason: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paginatedIncidentResponseSchema = z.object({
  items: z.array(incidentResponseSchema),
  pagination: paginationMetadataSchema,
});

export type IncidentResolutionResponse = z.infer<
  typeof incidentResolutionResponseSchema
>;
export type IncidentResponse = z.infer<typeof incidentResponseSchema>;
export type PaginatedIncidentResponse = z.infer<
  typeof paginatedIncidentResponseSchema
>;
