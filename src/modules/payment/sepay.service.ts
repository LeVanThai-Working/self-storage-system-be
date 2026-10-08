import crypto from 'node:crypto';
import type { SepayConfig } from '../../config/sepay.config.ts';

export class SepayService {
  constructor(private readonly config: SepayConfig) {}

  /**
   * Generates a unique, URL-safe and banking-friendly uppercase payment code.
   * Format: <PREFIX><ALPHANUMERIC_SUFFIX> (e.g. SSM7A8B9C2).
   * Alphanumeric without ambiguous characters or dashes so Vietnamese banking apps
   * and SePay OCR/parsers do not drop or split the code.
   */
  public generatePaymentCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32-ish, no O/0/1/I to prevent visual confusion
    const length = this.config.paymentCodeLength;
    const randomBytes = crypto.randomBytes(length);
    let suffix = '';
    for (let i = 0; i < length; i++) {
      suffix += chars[randomBytes[i] % chars.length];
    }
    return `${this.config.paymentCodePrefix}${suffix}`;
  }

  /**
   * Extracts payment code from transaction description or SePay code field.
   * Matches prefix followed by 3 to 8 alphanumeric characters.
   */
  public extractPaymentCode(rawText: string | null | undefined): string | null {
    if (!rawText) return null;
    const prefix = this.config.paymentCodePrefix;
    const regex = new RegExp(`\\b(${prefix}[A-Za-z0-9]{3,8})\\b`, 'i');
    const match = rawText.match(regex);
    return match ? match[1].toUpperCase() : null;
  }

  /**
   * Builds the official SePay VietQR dynamic image URL.
   */
  public buildQrUrl(params: { amount: number; paymentCode: string }): string {
    const acc = encodeURIComponent(this.config.accountNumber);
    const bank = encodeURIComponent(this.config.bankCode);
    const des = encodeURIComponent(params.paymentCode);
    const amount = Math.max(0, Math.round(params.amount));

    return `https://qr.sepay.vn/img?acc=${acc}&bank=${bank}&amount=${amount}&des=${des}`;
  }

  /**
   * Validates the incoming SePay webhook Authorization header against the configured API key.
   * SePay sends: "Authorization: Apikey <KEY>".
   * Uses crypto.timingSafeEqual to prevent timing attacks.
   */
  public verifyWebhookApiKey(authHeader: string | undefined | null): boolean {
    if (!authHeader || !this.config.webhookApiKey) {
      return false;
    }

    let token = authHeader.trim();
    if (token.toLowerCase().startsWith('apikey ')) {
      token = token.slice(7).trim();
    } else if (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }

    const providedBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(this.config.webhookApiKey);

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
