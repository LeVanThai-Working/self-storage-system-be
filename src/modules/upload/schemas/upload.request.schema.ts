import { z } from 'zod';
import { CloudinaryFolderEnum } from '../../../common/enums/upload.enum.ts';

/**
 * Request schema for getting a signed Cloudinary upload signature.
 * The `folder` parameter is optional; defaults to 'self-storage/general'.
 */
export const cloudinarySignatureRequestSchema = z.object({
  folder: z
    .string()
    .trim()
    .min(1, 'Folder cannot be empty')
    .regex(
      /^[\w\-/]+$/,
      'Folder can only contain alphanumeric characters, hyphens, underscores and slashes'
    )
    .default(CloudinaryFolderEnum.GENERAL)
    .optional(),
});

export type CloudinarySignatureRequest = z.infer<
  typeof cloudinarySignatureRequestSchema
>;
