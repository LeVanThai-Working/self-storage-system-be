import { AppError } from '../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../common/consts/messageCode.const.ts';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

const REQUIRED_ENV_KEYS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

/**
 * Reads Cloudinary configuration lazily (after dotenv has been loaded).
 * Throws a 500 AppError that lists missing variables so misconfigured deployments fail loudly.
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  const missing = REQUIRED_ENV_KEYS.filter(
    (key) => !process.env[key] || process.env[key]!.trim() === ''
  );
  if (missing.length > 0) {
    throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106, [
      `Missing Cloudinary configuration: ${missing.join(', ')}`,
    ]);
  }

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!.trim(),
    apiKey: process.env.CLOUDINARY_API_KEY!.trim(),
    apiSecret: process.env.CLOUDINARY_API_SECRET!.trim(),
  };
}
