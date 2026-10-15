import { z } from 'zod';

/**
 * Response schema for Cloudinary upload signature payload.
 */
export const cloudinarySignatureResponseSchema = z.object({
  signature: z.string(),
  timestamp: z.number(),
  apiKey: z.string(),
  cloudName: z.string(),
  folder: z.string(),
});

export type CloudinarySignatureResponse = z.infer<
  typeof cloudinarySignatureResponseSchema
>;
