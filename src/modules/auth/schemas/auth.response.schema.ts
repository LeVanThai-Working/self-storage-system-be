import z from 'zod';
import {
  AuthProviderEnum,
  RoleEnum,
  UserStatusEnum,
} from '../../../common/enums/user.enum.ts';

export const authUserResponseSchema = z.object({
  id: z.string().optional(),
  _id: z.unknown().optional(),
  name: z.string(),
  email: z.email(),
  phoneNumber: z.string().optional(),
  role: z.enum(RoleEnum),
  authProvider: z.enum(AuthProviderEnum).optional(),
  status: z.enum(UserStatusEnum).optional(),
  createdAt: z.union([z.date().transform((d) => d.toISOString()), z.string()]),
  updatedAt: z.union([z.date().transform((d) => d.toISOString()), z.string()]),
});

export type AuthUserResponse = z.infer<typeof authUserResponseSchema>;
