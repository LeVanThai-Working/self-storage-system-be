import { z } from 'zod';

export const legalRepresentativeResponseSchema = z.object({
  name: z.string(),
  title: z.string(),
  idNumber: z.string().optional().nullable(),
});

export const legalEntityBankAccountResponseSchema = z.object({
  bankName: z.string(),
  accountNumber: z.string(),
  accountHolder: z.string(),
});

export const legalEntityResponseSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  taxCode: z.string(),
  registeredAddress: z.string(),
  legalRepresentative: legalRepresentativeResponseSchema,
  bankAccount: legalEntityBankAccountResponseSchema,
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LegalEntityResponse = z.infer<typeof legalEntityResponseSchema>;
