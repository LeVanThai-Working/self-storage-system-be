import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/schemas/pagination.schema.ts';

export const legalRepresentativeSchema = z.object({
  name: z.string().min(2).max(100),
  title: z.string().min(2).max(100),
  idNumber: z.string().min(9).max(20).optional(),
});

export const legalEntityBankAccountSchema = z.object({
  bankName: z.string().min(2).max(100),
  accountNumber: z.string().min(6).max(30),
  accountHolder: z.string().min(2).max(100),
});

export const createLegalEntitySchema = z.object({
  companyName: z.string().min(3).max(255),
  taxCode: z.string().min(10).max(14),
  registeredAddress: z.string().min(5).max(500),
  legalRepresentative: legalRepresentativeSchema,
  bankAccount: legalEntityBankAccountSchema,
  phone: z.string().min(10).max(15).optional().nullable(),
  email: z.string().email().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateLegalEntitySchema = createLegalEntitySchema.partial();

export const legalEntityQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sortBy: z.enum(['companyName', 'taxCode', 'createdAt']).default('createdAt'),
});

export const legalEntityIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Legal Entity ID format'),
});

export type CreateLegalEntityRequest = z.infer<typeof createLegalEntitySchema>;
export type UpdateLegalEntityRequest = z.infer<typeof updateLegalEntitySchema>;
export type LegalEntityQuery = z.infer<typeof legalEntityQuerySchema>;
