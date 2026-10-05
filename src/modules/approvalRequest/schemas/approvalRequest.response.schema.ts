import { z } from 'zod';
import {
  ApprovalRequestActionEnum,
  ApprovalRequestStatusEnum,
  ApprovalRequestTargetTypeEnum,
} from '../../../common/enums/approvalRequest.enum.ts';

const userSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string().optional(),
  phoneNumber: z.string().optional(),
});

const facilitySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  address: z.string(),
  status: z.string(),
});

export const approvalRequestResponseSchema = z.object({
  id: z.string(),
  requesterId: z.string(),
  requester: userSummarySchema.optional(),
  facilityId: z.string(),
  facility: facilitySummarySchema.optional(),
  targetType: z.nativeEnum(ApprovalRequestTargetTypeEnum),
  action: z.nativeEnum(ApprovalRequestActionEnum),
  targetId: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
  reason: z.string(),
  status: z.nativeEnum(ApprovalRequestStatusEnum),
  approverId: z.string().nullable().optional(),
  approver: userSummarySchema.nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  reviewNotes: z.string().nullable().optional(),
  targetCurrentData: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const approvalRequestListResponseSchema = z.array(
  approvalRequestResponseSchema
);

export type ApprovalRequestResponse = z.infer<
  typeof approvalRequestResponseSchema
>;
export type ApprovalRequestListResponse = z.infer<
  typeof approvalRequestListResponseSchema
>;
