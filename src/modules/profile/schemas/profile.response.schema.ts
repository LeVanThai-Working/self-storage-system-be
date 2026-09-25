import z from 'zod';
import { GenderEnum } from '../../../common/enums/user.enum.ts';

export const profileResponseSchema = z.object({
  id: z.string().optional(),
  userId: z.union([z.string(), z.unknown()]).transform((v) => String(v)),
  avatarUrl: z.string().optional(),
  dateOfBirth: z
    .union([z.date().transform((d) => d.toISOString()), z.string()])
    .optional(),
  address: z.string().optional(),
  gender: z.nativeEnum(GenderEnum).optional(),
  createdAt: z.union([z.date().transform((d) => d.toISOString()), z.string()]),
  updatedAt: z.union([z.date().transform((d) => d.toISOString()), z.string()]),
});

export type ProfileResponse = z.infer<typeof profileResponseSchema>;
