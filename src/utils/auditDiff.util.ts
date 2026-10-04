import type { AuditChanges } from '../common/types/auditLog.type.ts';

const MASK = '***';
const MAX_DEPTH = 6;

/** Keys (case-insensitive) whose values must never be stored in audit logs. */
const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'otp',
  'token',
  'accesstoken',
  'refreshtoken',
  'googleid',
]);

/** Technical keys that carry no audit value in a diff. */
const IGNORED_DIFF_KEYS = new Set([
  '_id',
  'id',
  '__v',
  'createdAt',
  'updatedAt',
]);

type PlainRecord = Record<string, unknown>;

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Converts Mongoose documents / ObjectIds / Dates into JSON-safe plain values.
 * Does NOT mask — masking happens after diffing so that changes to sensitive
 * fields are still detected.
 */
function normalize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return value;

  const candidate = value as {
    toHexString?: () => string;
    toObject?: (options?: unknown) => unknown;
  };

  // ObjectId (bson)
  if (typeof candidate.toHexString === 'function') {
    return candidate.toHexString();
  }

  if (depth >= MAX_DEPTH) return '[Truncated]';

  // Mongoose document / subdocument / array
  if (typeof candidate.toObject === 'function') {
    return normalize(candidate.toObject({ depopulate: true }), depth + 1);
  }

  if (Buffer.isBuffer(value)) return '[Binary]';

  if (value instanceof Map) {
    return normalize(Object.fromEntries(value), depth + 1);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalize(item, depth + 1));
  }

  const result: PlainRecord = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || typeof item === 'function') continue;
    result[key] = normalize(item, depth + 1);
  }
  return result;
}

/**
 * Recursively replaces values of sensitive keys with `***`.
 */
export function maskSensitive(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) return value;
  if (Array.isArray(value)) {
    return value.map((item) => maskSensitive(item, depth + 1));
  }
  if (!isPlainRecord(value)) return value;

  const result: PlainRecord = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEYS.has(key.toLowerCase())
      ? MASK
      : maskSensitive(item, depth + 1);
  }
  return result;
}

function isDeepEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (
    typeof left !== 'object' ||
    typeof right !== 'object' ||
    left === null ||
    right === null
  ) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((item, index) => isDeepEqual(item, right[index]));
  }

  const leftRecord = left as PlainRecord;
  const rightRecord = right as PlainRecord;
  const leftKeys = Object.keys(leftRecord);
  if (leftKeys.length !== Object.keys(rightRecord).length) return false;
  return leftKeys.every((key) =>
    isDeepEqual(leftRecord[key], rightRecord[key])
  );
}

function toSnapshot(value: unknown): PlainRecord | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = normalize(value);
  if (isPlainRecord(normalized)) return normalized;
  return { value: normalized };
}

function omitIgnoredKeys(record: PlainRecord): PlainRecord {
  const result: PlainRecord = {};
  for (const [key, item] of Object.entries(record)) {
    if (!IGNORED_DIFF_KEYS.has(key)) result[key] = item;
  }
  return result;
}

/**
 * Builds the `changes` payload for an audit event.
 * - both before & after → only keys whose values differ
 * - only after (CREATE)  → full snapshot
 * - only before (DELETE) → full snapshot
 * Sensitive fields are always masked. Returns `null` when nothing changed.
 */
export function buildAuditChanges(
  before?: unknown,
  after?: unknown
): AuditChanges | null {
  const beforeSnapshot = toSnapshot(before);
  const afterSnapshot = toSnapshot(after);

  if (beforeSnapshot && afterSnapshot) {
    const changedBefore: PlainRecord = {};
    const changedAfter: PlainRecord = {};
    const keys = new Set([
      ...Object.keys(beforeSnapshot),
      ...Object.keys(afterSnapshot),
    ]);

    for (const key of keys) {
      if (IGNORED_DIFF_KEYS.has(key)) continue;
      if (isDeepEqual(beforeSnapshot[key], afterSnapshot[key])) continue;
      changedBefore[key] = beforeSnapshot[key] ?? null;
      changedAfter[key] = afterSnapshot[key] ?? null;
    }

    if (Object.keys(changedAfter).length === 0) return null;

    return {
      before: maskSensitive(changedBefore) as PlainRecord,
      after: maskSensitive(changedAfter) as PlainRecord,
    };
  }

  if (afterSnapshot) {
    return {
      after: maskSensitive(omitIgnoredKeys(afterSnapshot)) as PlainRecord,
    };
  }

  if (beforeSnapshot) {
    return {
      before: maskSensitive(omitIgnoredKeys(beforeSnapshot)) as PlainRecord,
    };
  }

  return null;
}

/**
 * Normalizes + masks arbitrary metadata so it is JSON-safe and secret-free.
 */
export function sanitizeAuditMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> | null {
  if (!metadata) return null;
  const snapshot = toSnapshot(metadata);
  if (!snapshot || Object.keys(snapshot).length === 0) return null;
  return maskSensitive(snapshot) as PlainRecord;
}
