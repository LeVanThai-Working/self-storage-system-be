import z from 'zod';
import { RoleEnum } from '../../../common/enums/user.enum.ts';

export const createUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.email(),
  password: z.string().min(6).max(100),
  phoneNumber: z.string().min(10).max(11).optional(),
  role: z.enum(RoleEnum).optional(),
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;
