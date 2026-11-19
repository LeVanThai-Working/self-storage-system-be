import crypto from 'node:crypto';
import { encryptText, decryptText } from './encryption.util.ts';

const OTP_FORMAT_PREFIX = 'otp-v2:';
const LEGACY_OTP_SECRET = 'self-storage-secret-key-2026';

function getOtpKey(purpose: 'hash' | 'encryption'): Buffer {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is required');
  return crypto
    .createHmac('sha256', secret)
    .update(`access-schedule-otp:${purpose}`)
    .digest();
}

export function hashAccessScheduleOtp(otp: string): string {
  return crypto
    .createHmac('sha256', getOtpKey('hash'))
    .update(otp.trim())
    .digest('hex');
}

export function getAccessScheduleOtpHashes(otp: string): string[] {
  const legacyHash = crypto
    .createHmac('sha256', process.env.OTP_SECRET || LEGACY_OTP_SECRET)
    .update(otp.trim())
    .digest('hex');
  return [hashAccessScheduleOtp(otp), legacyHash];
}

export function encryptAccessScheduleOtp(otp: string): string {
  return OTP_FORMAT_PREFIX + encryptText(otp, getOtpKey('encryption'));
}

export function decryptAccessScheduleOtp(payload: string): string {
  if (payload.startsWith(OTP_FORMAT_PREFIX)) {
    return decryptText(
      payload.slice(OTP_FORMAT_PREFIX.length),
      getOtpKey('encryption')
    );
  }

  // Unversioned records used the shared encryption key or its dev fallback.
  const legacyKey = process.env.ENCRYPTION_KEY
    ? undefined
    : crypto
        .createHash('sha256')
        .update('self_storage_dev_secret_key_32bytes')
        .digest();
  return decryptText(payload, legacyKey);
}
