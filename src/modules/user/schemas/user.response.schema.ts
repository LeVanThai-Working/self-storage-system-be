import z from 'zod';
import {
  AuthProviderEnum,
  RoleEnum,
  UserStatusEnum,
} from '../../../common/enums/user.enum.ts';

export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(50),
  email: z.email(),
  phoneNumber: z.string().min(10).max(11).optional(),
  googleId: z.string().optional(),

  role: z.enum(RoleEnum),

  authProvider: z.enum(AuthProviderEnum),

  status: z.enum(UserStatusEnum),

  isEmailVerified: z.boolean().default(false),
  createdAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.iso.datetime(),
  ]),
  updatedAt: z.union([
    z.date().transform((d) => d.toISOString()),
    z.iso.datetime(),
  ]),
});

export const userListResponseSchema = z.array(userResponseSchema);

export type UserResponse = z.infer<typeof userResponseSchema>;
export type UserListResponse = z.infer<typeof userListResponseSchema>;
