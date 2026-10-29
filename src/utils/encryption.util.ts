import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: ENCRYPTION_KEY must be configured in production environment.'
      );
    }
    // Deterministic 32-byte fallback key for dev and test environments
    return crypto
      .createHash('sha256')
      .update('self_storage_dev_secret_key_32bytes')
      .digest();
  }

  // If provided as 64-character hex string
  if (envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }

  // Otherwise hash to 32 bytes
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts a plain-text string using AES-256-GCM.
 * Output format: <IV_HEX>:<AUTH_TAG_HEX>:<CIPHER_HEX>
 */
export function encryptText(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string (<IV_HEX>:<AUTH_TAG_HEX>:<CIPHER_HEX>).
 */
export function decryptText(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted payload format (expected iv:authTag:ciphertext)'
    );
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const cipherBuffer = Buffer.from(cipherHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(cipherBuffer),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * Masks a sensitive account number or bank card, keeping only the last 4 digits visible.
 * E.g.: "0123456789" -> "******6789", "123" -> "****"
 */
export function maskAccountNumber(
  accountNumber: string | null | undefined
): string {
  if (!accountNumber) return '';
  const clean = accountNumber.trim();
  if (clean.length <= 4) {
    return '****';
  }
  const visible = clean.slice(-4);
  const maskedCount = Math.max(4, clean.length - 4);
  return `${'*'.repeat(maskedCount)}${visible}`;
}
