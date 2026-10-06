import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/schemas/pagination.schema.ts';
import { UserStatusEnum } from '../../../common/enums/user.enum.ts';

export const facilityStaffQuerySchema = paginationQuerySchema.extend({
  status: z.enum(UserStatusEnum).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
});

export type FacilityStaffQuery = z.infer<typeof facilityStaffQuerySchema>;
