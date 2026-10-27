import { z } from 'zod';
import {
  SupportTicketCategoryEnum,
  SupportTicketPriorityEnum,
  SupportTicketStatusEnum,
} from '../../../common/enums/supportTicket.enum.ts';

export const paginationMetadataSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const supportUserRefSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.string().optional(),
});

export const supportFacilityRefSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
});

export const supportContractRefSchema = z.object({
  id: z.string(),
  contractCode: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const supportTicketStaffResponseSchema = z.object({
  responseMessage: z.string(),
  attachments: z.array(z.string()),
  respondedBy: z.union([supportUserRefSchema, z.string()]),
  respondedAt: z.string(),
});

export const supportTicketResponseSchema = z.object({
  id: z.string(),
  ticketCode: z.string(),
  customer: z.union([supportUserRefSchema, z.string()]),
  facility: z
    .union([supportFacilityRefSchema, z.string()])
    .nullable()
    .optional(),
  contract: z
    .union([supportContractRefSchema, z.string()])
    .nullable()
    .optional(),
  category: z.nativeEnum(SupportTicketCategoryEnum),
  priority: z.nativeEnum(SupportTicketPriorityEnum),
  title: z.string(),
  description: z.string(),
  attachments: z.array(z.string()),
  status: z.nativeEnum(SupportTicketStatusEnum),
  assignedStaff: z
    .union([supportUserRefSchema, z.string()])
    .nullable()
    .optional(),
  staffResponse: supportTicketStaffResponseSchema.nullable().optional(),
  completedAt: z.string().nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
  cancellationReason: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paginatedSupportTicketResponseSchema = z.object({
  items: z.array(supportTicketResponseSchema),
  pagination: paginationMetadataSchema,
});

export type SupportTicketStaffResponseDto = z.infer<
  typeof supportTicketStaffResponseSchema
>;
export type SupportTicketResponse = z.infer<typeof supportTicketResponseSchema>;
export type PaginatedSupportTicketResponse = z.infer<
  typeof paginatedSupportTicketResponseSchema
>;
