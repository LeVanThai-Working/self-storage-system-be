import { AppError } from '../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../common/consts/messageCode.const.ts';

export interface SepayConfig {
  webhookApiKey: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  paymentCodePrefix: string;
  paymentCodeLength: number;
}

const REQUIRED_ENV_KEYS = [
  'SEPAY_WEBHOOK_API_KEY',
  'SEPAY_BANK_CODE',
  'SEPAY_ACCOUNT_NUMBER',
  'SEPAY_ACCOUNT_NAME',
  'SEPAY_PAYMENT_CODE_PREFIX',
] as const;

const DEFAULT_PAYMENT_CODE_LENGTH = 8;
const MIN_PAYMENT_CODE_LENGTH = 3;
const MAX_PAYMENT_CODE_LENGTH = 8;

/**
 * Reads SePay configuration lazily (after dotenv has been loaded).
 * Throws a 500 AppError that lists the missing variables so a misconfigured
 * deployment fails loudly instead of silently producing invalid QR codes.
 */
export function getSepayConfig(): SepayConfig {
  const missing = REQUIRED_ENV_KEYS.filter(
    (key) => !process.env[key] || process.env[key]!.trim() === ''
  );
  if (missing.length > 0) {
    throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106, [
      `Missing SePay configuration: ${missing.join(', ')}`,
    ]);
  }

  const rawLength = Number(
    process.env.SEPAY_PAYMENT_CODE_LENGTH || DEFAULT_PAYMENT_CODE_LENGTH
  );
  const paymentCodeLength =
    Number.isInteger(rawLength) &&
    rawLength >= MIN_PAYMENT_CODE_LENGTH &&
    rawLength <= MAX_PAYMENT_CODE_LENGTH
      ? rawLength
      : DEFAULT_PAYMENT_CODE_LENGTH;

  return {
    webhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY!.trim(),
    bankCode: process.env.SEPAY_BANK_CODE!.trim(),
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER!.trim(),
    accountName: process.env.SEPAY_ACCOUNT_NAME!.trim(),
    paymentCodePrefix: process.env
      .SEPAY_PAYMENT_CODE_PREFIX!.trim()
      .toUpperCase(),
    paymentCodeLength,
  };
}
