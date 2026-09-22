import z from 'zod';
import { RoleEnum, UserStatusEnum } from '../../../common/enums/user.enum.ts';
import { paginationQuerySchema } from '../../../common/schemas/pagination.schema.ts';

export const createUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.email(),
  password: z.string().min(6).max(100),
  phoneNumber: z.string().min(10).max(11).optional(),
  role: z.enum(RoleEnum).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  phoneNumber: z.string().min(10).max(11).optional(),
  role: z.enum(RoleEnum).optional(),
  status: z.enum(UserStatusEnum).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
});

export const userQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['asc', 'desc', 'a-z', 'z-a']).optional(),
  sortBy: z
    .enum(['name', 'email', 'createdAt', 'updatedAt', 'role', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
