# MODULE: accessSchedule ? OTP and staff assignment

Update packages/shared contracts first. Baseline: working tree changes against HEAD in this backend session (2026-11-13).

## Scope

Customer mobile; facility staff and manager web (platform mapping needs confirmation). Exact routes/components, query invalidation, translations and navigation: [User to specify]. No frontend repository was edited.

## Changes

Remove qrPayload and all QR check-in handling. code remains named code but accepts exactly six digits. rawOtpCode is now available to the owning customer on detail reads while pending and unexpired; null for personnel/terminal schedules. Assignment fields are added to detail/list: assignedStaffId, assignedStaffName, assignedAt (nullable), assignmentVersion (integer).

## Endpoints

All responses use { success, statusCode, messageCode, message, data }. Lists put { items, pagination } inside data.

| Method | Path                              | Role and behavior                                                                              |
| ------ | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| POST   | /access-schedules                 | Customer own contract; Ops/Admin retain create-on-behalf behavior                              |
| GET    | /access-schedules                 | Scoped list, add assignmentScope unassigned/mine/all                                           |
| GET    | /access-schedules/{id}            | Owner, same-facility personnel, Ops/Admin read access                                          |
| GET    | /access-schedules/available-slots | Existing availability contract                                                                 |
| POST   | /access-schedules/{id}/claim      | Staff claims unassigned pending schedule in own facility; no body                              |
| POST   | /access-schedules/{id}/assign     | Manager, staffId + assignmentVersion; same facility, active staff, unassigned pending schedule |
| POST   | /access-schedules/{id}/unassign   | Manager, nonempty reason + assignmentVersion; pending only                                     |
| POST   | /access-schedules/check-in        | Staff only; code + optional staffNotes                                                         |
| POST   | /access-schedules/{id}/check-out  | Same staff who checked in; optional staffNotes                                                 |
| POST   | /access-schedules/{id}/cancel     | Existing cancellation contract                                                                 |
| POST   | /access-schedules/process-no-show | Existing Ops/Admin operation                                                                   |

No manager/admin override for check-in or check-out. Unassign before assigning a replacement. Stale assignmentVersion is rejected. Adjacent time slots are allowed; overlapping active responsibilities are rejected. A staff member with a checked-in visitor cannot check in another visitor. Cancellation/no-show/completion releases workload.

## Request schemas

Zod v4. Exact backend schemas follow; adapt import locations to existing shared architecture.

```ts
import { z } from 'zod';
import { AccessScheduleStatusEnum } from '../../../common/enums/customerInventory.enum.ts';
import { paginationQuerySchema } from '../../../common/schemas/pagination.schema.ts';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createAccessScheduleSchema = z.object({
  contractId: z
    .string()
    .regex(objectIdRegex, 'Invalid contract ID format')
    .trim(),
  timeSlotId: z
    .string()
    .regex(objectIdRegex, 'Invalid time slot ID format')
    .trim(),
  scheduledDate: z
    .string()
    .regex(dateStringRegex, 'Scheduled date must be in YYYY-MM-DD format')
    .trim(),
  numberOfPeople: z
    .number()
    .int('Number of people must be an integer')
    .min(1, 'At least 1 person is required')
    .max(10, 'Maximum 10 people allowed per schedule')
    .default(1)
    .optional(),
  vehicleType: z.string().trim().max(100).optional().nullable(),
  vehiclePlate: z.string().trim().max(20).optional().nullable(),
  purpose: z.string().trim().max(500).optional().nullable(),
});

/**
 * Check-in accepts only a six-digit OTP.
 */
export const checkInAccessScheduleSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter 6-digit OTP'),
  staffNotes: z.string().trim().max(500).optional().nullable(),
});

export const checkOutAccessScheduleSchema = z.object({
  staffNotes: z.string().trim().max(500).optional().nullable(),
});

export const cancelAccessScheduleSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

export const availableAccessSlotsQuerySchema = z.object({
  facilityId: z
    .string()
    .regex(objectIdRegex, 'Invalid facility ID format')
    .trim(),
  date: z
    .string()
    .regex(dateStringRegex, 'Date must be in YYYY-MM-DD format')
    .trim(),
});

export const accessScheduleQuerySchema = paginationQuerySchema.extend({
  facilityId: z.string().regex(objectIdRegex).optional(),
  customerId: z.string().regex(objectIdRegex).optional(),
  contractId: z.string().regex(objectIdRegex).optional(),
  status: z.nativeEnum(AccessScheduleStatusEnum).optional(),
  assignmentScope: z.enum(['unassigned', 'mine', 'all']).optional(),
  startDate: z.string().regex(dateStringRegex).optional(),
  endDate: z.string().regex(dateStringRegex).optional(),
});

export const assignAccessScheduleSchema = z.object({
  staffId: z.string().regex(objectIdRegex),
  assignmentVersion: z.number().int().min(0),
});
export const unassignAccessScheduleSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  assignmentVersion: z.number().int().min(0),
});
export type AssignAccessScheduleRequest = z.infer<
  typeof assignAccessScheduleSchema
>;
export type UnassignAccessScheduleRequest = z.infer<
  typeof unassignAccessScheduleSchema
>;
export const accessScheduleIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid Access Schedule ID format'),
});

export type CreateAccessScheduleRequest = z.infer<
  typeof createAccessScheduleSchema
>;
export type CheckInAccessScheduleRequest = z.infer<
  typeof checkInAccessScheduleSchema
>;
export type CheckOutAccessScheduleRequest = z.infer<
  typeof checkOutAccessScheduleSchema
>;
export type CancelAccessScheduleRequest = z.infer<
  typeof cancelAccessScheduleSchema
>;
export type AvailableAccessSlotsQuery = z.infer<
  typeof availableAccessSlotsQuerySchema
>;
export type AccessScheduleQuery = z.infer<typeof accessScheduleQuerySchema>;
export type AccessScheduleIdParam = z.infer<typeof accessScheduleIdParamSchema>;
```

Pagination defaults: page 1, limit 10 (max 100), sortBy createdAt (string, no enum), sortOrder desc, optional search.

## Response shapes

```ts
import { z } from 'zod';
import { AccessScheduleStatusEnum } from '../../../common/enums/customerInventory.enum.ts';

export const paginationMetadataSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const timeSlotSnapshotResponseSchema = z.object({
  slotName: z.string(),
  startTime: z.string(),
  endTime: z.string(),
});

export const availableAccessSlotResponseSchema = z.object({
  timeSlotId: z.string(),
  slotName: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  maxCapacity: z.number(),
  bookedCount: z.number(),
  availableCapacity: z.number(),
  isAvailable: z.boolean(),
});

export const rentedRackItemResponseSchema = z.object({
  rackId: z.string(),
  rackCode: z.string(),
  aisle: z.string().nullable().optional(),
  bay: z.union([z.string(), z.number()]).nullable().optional(),
  zone: z.string().nullable().optional(),
});

export const accessScheduleDetailResponseSchema = z.object({
  id: z.string(),
  scheduleCode: z.string(),
  assignedStaffId: z.string().nullable(),
  assignedStaffName: z.string().nullable(),
  assignedAt: z.string().nullable(),
  assignmentVersion: z.number(),
  status: z.nativeEnum(AccessScheduleStatusEnum),
  customerId: z.string(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  contractId: z.string(),
  contractCode: z.string().nullable().optional(),
  facilityId: z.string(),
  facilityName: z.string().nullable().optional(),
  facilityCode: z.string().nullable().optional(),
  timeSlotId: z.string(),
  timeSlotSnapshot: timeSlotSnapshotResponseSchema,
  scheduledDate: z.string(),
  numberOfPeople: z.number(),
  vehicleType: z.string().nullable().optional(),
  vehiclePlate: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  rawOtpCode: z.string().nullable().optional(),
  expiresAt: z.string(),
  checkedInAt: z.string().nullable().optional(),
  checkedInByName: z.string().nullable().optional(),
  checkedOutAt: z.string().nullable().optional(),
  checkedOutByName: z.string().nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
  cancelledReason: z.string().nullable().optional(),
  staffNotes: z.string().nullable().optional(),
  rentedRacks: z.array(rentedRackItemResponseSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const accessScheduleListItemResponseSchema = z.object({
  id: z.string(),
  scheduleCode: z.string(),
  assignedStaffId: z.string().nullable(),
  assignedStaffName: z.string().nullable(),
  assignedAt: z.string().nullable(),
  assignmentVersion: z.number(),
  status: z.nativeEnum(AccessScheduleStatusEnum),
  customerId: z.string(),
  customerName: z.string().nullable().optional(),
  contractId: z.string(),
  contractCode: z.string().nullable().optional(),
  facilityId: z.string(),
  facilityName: z.string().nullable().optional(),
  slotName: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  scheduledDate: z.string(),
  numberOfPeople: z.number(),
  vehiclePlate: z.string().nullable().optional(),
  expiresAt: z.string(),
  checkedInAt: z.string().nullable().optional(),
  checkedOutAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const accessScheduleCheckInResponseSchema = z.object({
  schedule: accessScheduleDetailResponseSchema,
  rentedRacks: z.array(rentedRackItemResponseSchema),
  message: z.string(),
});

export const paginatedAccessScheduleResponseSchema = z.object({
  items: z.array(accessScheduleListItemResponseSchema),
  pagination: paginationMetadataSchema,
});

export type TimeSlotSnapshotResponse = z.infer<
  typeof timeSlotSnapshotResponseSchema
>;
export type AvailableAccessSlotResponse = z.infer<
  typeof availableAccessSlotResponseSchema
>;
export type RentedRackItemResponse = z.infer<
  typeof rentedRackItemResponseSchema
>;
export type AccessScheduleDetailResponse = z.infer<
  typeof accessScheduleDetailResponseSchema
>;
export type AccessScheduleListItemResponse = z.infer<
  typeof accessScheduleListItemResponseSchema
>;
export type AccessScheduleCheckInResponse = z.infer<
  typeof accessScheduleCheckInResponseSchema
>;
```

## State and notification contract

Statuses: pending, checked_in, completed, cancelled, no_show, expired. Assignment changes do not change pending status. Main transitions: pending -> checked_in -> completed; pending -> cancelled/no_show. No new expired transition is introduced.

Notification type access_schedule. Existing notification:new and notification:unread_count events. metadata.accessScheduleId identifies the visit, metadata.scheduleCode identifies its code. Notifications are persisted in-app; offline push is not provided.

## Message codes (English / Vietnamese)

| Code | English                                                   | Vietnamese                                |
| ---- | --------------------------------------------------------- | ----------------------------------------- |
| 651  | Access Schedule Not Found                                 | Khong tim thay lich                       |
| 652  | Time Slot Is Fully Booked                                 | Ca da het cho                             |
| 653  | Invalid Access Schedule Status Transition                 | Trang thai lich khong hop le              |
| 654  | Check-in Time Has Not Started Yet                         | Chua den gio check-in                     |
| 655  | Check-in Grace Period Has Expired                         | Da het han check-in                       |
| 656  | Cannot Cancel Access Schedule Too Close To Start Time     | Qua sat gio, khong the huy                |
| 657  | Customer Already Has An Active Schedule In This Time Slot | Khach da co lich trong ca                 |
| 658  | Access Schedule Does Not Belong To Facility               | Lich khong thuoc co so                    |
| 659  | Invalid Or Expired Access OTP                             | OTP khong hop le hoac het han             |
| 660  | Access Schedule Assignment Changed Or Unavailable         | Phan cong da thay doi hoac khong kha dung |
| 661  | Staff Has Conflicting Access Schedule                     | Nhan vien co lich xung dot                |
| 662  | Only The Responsible Staff Can Perform This Action        | Chi nhan vien phu trach duoc thao tac     |

Codes use MESSAGE_CODE_ prefix. Existing shared 101/103/104 and contract 622 remain possible; preserve their existing translations. Early check-in 30 minutes, late grace 45 minutes, cancellation lead 1 hour, party size 1?10. Object IDs are 24 hexadecimal characters; OTP is a string to preserve formatting.

## User-provided UI behavior

Customer opens the booked visit to view OTP and assigned staff name. Notify the customer when staff is assigned or unassigned. Staff can claim a visit or check in an unassigned visit using OTP. Manager can assign/unassign before check-in, with a reason for removal. After check-in, no reassignment and only the same staff can check out.

Exact UI placement, toast/navigation/invalidation and localized copy: [User to specify].
