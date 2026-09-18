import { z } from 'zod';
import { RoleEnum } from '../../common/enums/user.enum.ts';

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  email: z.email('Invalid email'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100),
  role: z.enum(RoleEnum).default(RoleEnum.CUSTOMER),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
