import { z } from 'zod';

export const signingAuthorizationResponseSchema = z.object({
  id: z.string(),
  legalEntityId: z.any(),
  authorizedUserId: z.any(),
  facilityIds: z.array(z.any()),
  authorizationNumber: z.string(),
  issuedDate: z.string(),
  validFrom: z.string(),
  validTo: z.string(),
  documentUrl: z.string(),
  fileHash: z.string().optional().nullable(),
  status: z.enum(['active', 'revoked', 'expired']),
  notes: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SigningAuthorizationResponse = z.infer<
  typeof signingAuthorizationResponseSchema
>;
