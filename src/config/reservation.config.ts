export const DEFAULT_RESERVATION_POLICY_VERSION = '2026-10-v1';

export type CancellationPolicyMode = 'slot_start' | 'calendar_day';

export interface ReservationPolicySnapshot {
  freeCancelHours: number;
  forfeitPercent: number;
  noShowGraceHours: number;
  cancellationMode?: CancellationPolicyMode;
}

export interface ReservationConfig {
  holdMinutes: number;
  maxAdvanceDays: number;
  overdueGraceHours: number;
  maxPendingPerCustomer: number;
  freeCancelHours: number;
  maxActivePerCustomer: number;
  forfeitPercent: number;
  policyVersion: string;
  cancellationMode: CancellationPolicyMode;
  checkInSigningBufferMinutes: number;
  sameDayLeadMinutes: number;
  maxStartDateOffsetDays: number;
  overdueBatchSize: number;
}

function parseCancellationMode(
  rawValue: string | undefined
): CancellationPolicyMode {
  const normalized = rawValue?.trim().toLowerCase();
  if (normalized === 'calendar_day') {
    return 'calendar_day';
  }
  return 'slot_start';
}

function parseForfeitPercent(rawValue: string | undefined): number {
  if (rawValue === undefined || rawValue.trim() === '') {
    return 100;
  }
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    console.warn(
      `[ReservationConfig] Invalid RESERVATION_FORFEIT_PERCENT="${rawValue}". Falling back to 100.`
    );
    return 100;
  }
  return parsed;
}

export function getReservationConfig(): ReservationConfig {
  const holdMinutes = Number(process.env.RESERVATION_HOLD_MINUTES) || 15;
  const maxAdvanceDays = Number(process.env.RESERVATION_MAX_ADVANCE_DAYS) || 30;
  const overdueGraceHours =
    Number(process.env.RESERVATION_OVERDUE_GRACE_HOURS) || 24;
  const maxPendingPerCustomer =
    Number(process.env.RESERVATION_MAX_PENDING_PER_CUSTOMER) || 3;
  const freeCancelHours =
    Number(process.env.RESERVATION_FREE_CANCEL_HOURS) || 24;
  const maxActivePerCustomer =
    Number(process.env.RESERVATION_MAX_ACTIVE_PER_CUSTOMER) || 5;
  const forfeitPercent = parseForfeitPercent(
    process.env.RESERVATION_FORFEIT_PERCENT
  );
  const policyVersion =
    process.env.RESERVATION_POLICY_VERSION?.trim() ||
    DEFAULT_RESERVATION_POLICY_VERSION;
  const cancellationMode = parseCancellationMode(
    process.env.RESERVATION_CANCELLATION_MODE
  );
  const checkInSigningBufferMinutes =
    Number(process.env.RESERVATION_CHECKIN_SIGNING_BUFFER_MINUTES) || 30;
  const sameDayLeadMinutes =
    Number(process.env.RESERVATION_SAME_DAY_LEAD_MINUTES) || 120;
  const maxStartDateOffsetDays =
    Number(process.env.RESERVATION_MAX_START_DATE_OFFSET_DAYS) || 3;
  const overdueBatchSize =
    Number(process.env.RESERVATION_OVERDUE_BATCH_SIZE) || 50;

  return {
    holdMinutes,
    maxAdvanceDays,
    overdueGraceHours,
    maxPendingPerCustomer,
    freeCancelHours,
    maxActivePerCustomer,
    forfeitPercent,
    policyVersion,
    cancellationMode,
    checkInSigningBufferMinutes,
    sameDayLeadMinutes,
    maxStartDateOffsetDays,
    overdueBatchSize,
  };
}

export function buildReservationPolicySnapshot(
  config: ReservationConfig = getReservationConfig()
): ReservationPolicySnapshot {
  return {
    freeCancelHours: config.freeCancelHours,
    forfeitPercent: config.forfeitPercent,
    noShowGraceHours: config.overdueGraceHours,
    cancellationMode: config.cancellationMode,
  };
}

/**
 * Returns true if demo/simulated refund is enabled.
 * Strictly hard-disabled when NODE_ENV is 'production'.
 */
export function isDemoRefundSimulationEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.ENABLE_DEMO_REFUND_SIMULATION === 'true';
}
