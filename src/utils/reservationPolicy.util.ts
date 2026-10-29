import {
  getReservationConfig,
  type CancellationPolicyMode,
  type ReservationConfig,
  type ReservationPolicySnapshot,
} from '../config/reservation.config.ts';
import {
  RefundStatusEnum,
  ReservationStatusEnum,
} from '../common/enums/reservation.enum.ts';
import { endOfDayVN, getVNDateString, startOfDayVN } from './date.util.ts';

const VN_OFFSET = '+07:00';

export interface ForfeitureCalculationResult {
  forfeitedAmount: number;
  refundAmount: number;
}

export interface CancellationOutcomeResult {
  isFreeCancellation: boolean;
  refundAmount: number;
  forfeitedAmount: number;
  refundStatus: RefundStatusEnum;
  freeCancelDeadline: Date;
  checkInTargetTime: Date;
  hoursRemaining: number;
}

export interface ComputeCancellationOutcomeOptions {
  isCustomer?: boolean;
  fallbackConfig?: ReservationConfig;
}

/**
 * Returns the reference check-in target timestamp in Vietnam Time (UTC+7).
 * - 'slot_start': Start time of checkInTimeSlot (e.g. 09:00 in "09:00 - 11:00") on checkInDate.
 * - 'calendar_day': 00:00:00 VN on checkInDate.
 * Fallbacks safely to startOfDayVN if slot string is missing or invalid.
 */
export function getCheckInTargetTimeVN(
  checkInDate: Date | string,
  checkInTimeSlot?: string | null,
  mode: CancellationPolicyMode = 'slot_start'
): Date {
  if (mode === 'calendar_day') {
    return startOfDayVN(checkInDate);
  }

  const dateStr = getVNDateString(checkInDate);
  const slotStr =
    typeof checkInTimeSlot === 'string' ? checkInTimeSlot.trim() : '';
  if (!slotStr) {
    return startOfDayVN(checkInDate);
  }

  const rawStart = slotStr.includes('-')
    ? slotStr.split('-')[0].trim()
    : slotStr.trim();

  const match = /^([01]\d|2[0-3]):[0-5]\d$/.exec(rawStart);
  if (!match) {
    return startOfDayVN(checkInDate);
  }

  return new Date(`${dateStr}T${rawStart}:00.000${VN_OFFSET}`);
}

/**
 * Pure function to compute forfeited deposit and refundable remainder in integer VND.
 * Guarantees `forfeitedAmount + refundAmount === depositAmount` with single rounding rule (Math.round).
 */
export function computeForfeiture(
  depositAmount: number,
  forfeitPercent: number
): ForfeitureCalculationResult {
  const safeDeposit = Math.max(0, Math.round(Number(depositAmount) || 0));
  if (safeDeposit === 0) {
    return { forfeitedAmount: 0, refundAmount: 0 };
  }

  const clampedPercent = Math.min(
    100,
    Math.max(0, Math.round(Number(forfeitPercent) || 0))
  );
  const forfeitedAmount = Math.round((safeDeposit * clampedPercent) / 100);
  const refundAmount = safeDeposit - forfeitedAmount;

  return {
    forfeitedAmount,
    refundAmount,
  };
}

/**
 * Resolves the effective cancellation and no-show policy for a reservation.
 * Prefers the immutable `policySnapshot` stored on the reservation at creation time,
 * falling back to the current runtime `ReservationConfig` for legacy records.
 */
export function resolveReservationPolicy(
  source?:
    | { policySnapshot?: Partial<ReservationPolicySnapshot> | null }
    | Partial<ReservationPolicySnapshot>
    | null,
  fallbackConfig: ReservationConfig = getReservationConfig()
): ReservationPolicySnapshot {
  const snap =
    source && typeof source === 'object' && 'policySnapshot' in source
      ? source.policySnapshot
      : (source as Partial<ReservationPolicySnapshot> | null | undefined);

  return {
    freeCancelHours:
      typeof snap?.freeCancelHours === 'number' &&
      !Number.isNaN(snap.freeCancelHours)
        ? snap.freeCancelHours
        : fallbackConfig.freeCancelHours,
    forfeitPercent:
      typeof snap?.forfeitPercent === 'number' &&
      !Number.isNaN(snap.forfeitPercent)
        ? snap.forfeitPercent
        : fallbackConfig.forfeitPercent,
    noShowGraceHours:
      typeof snap?.noShowGraceHours === 'number' &&
      !Number.isNaN(snap.noShowGraceHours)
        ? snap.noShowGraceHours
        : fallbackConfig.overdueGraceHours,
    cancellationMode: snap?.cancellationMode || fallbackConfig.cancellationMode,
  };
}

/**
 * Pure function to compute the cancellation outcome (refund amount, forfeited amount, refundStatus)
 * based on policy snapshot, check-in target time in Vietnam Time, and cancellation moment.
 */
export function computeCancellationOutcome(
  reservation: {
    status?: string | null;
    depositAmount?: number | null;
    checkInDate: Date | string;
    checkInTimeSlot?: string | null;
    policySnapshot?: Partial<ReservationPolicySnapshot> | null;
  },
  now: Date = new Date(),
  options: ComputeCancellationOutcomeOptions = {}
): CancellationOutcomeResult {
  const isCustomer = options.isCustomer !== false;
  const deposit = Math.max(
    0,
    Math.round(Number(reservation.depositAmount) || 0)
  );
  const policy = resolveReservationPolicy(reservation, options.fallbackConfig);
  const mode = policy.cancellationMode || 'slot_start';

  const checkInTargetTime = getCheckInTargetTimeVN(
    reservation.checkInDate,
    reservation.checkInTimeSlot,
    mode
  );

  const freeCancelDeadline = new Date(
    checkInTargetTime.getTime() - policy.freeCancelHours * 3600 * 1000
  );

  const hoursRemaining =
    (checkInTargetTime.getTime() - now.getTime()) / (3600 * 1000);

  // 1. PENDING_PAYMENT: Never charges or forfeits deposit
  if (reservation.status === ReservationStatusEnum.PENDING_PAYMENT) {
    return {
      isFreeCancellation: true,
      refundAmount: 0,
      forfeitedAmount: 0,
      refundStatus: RefundStatusEnum.NONE,
      freeCancelDeadline,
      checkInTargetTime,
      hoursRemaining,
    };
  }

  // 2. Facility cancellation on PAYMENT_SUCCESSFUL: Full 100% refund (facility operational issue)
  if (!isCustomer) {
    return {
      isFreeCancellation: true,
      refundAmount: deposit,
      forfeitedAmount: 0,
      refundStatus:
        deposit > 0 ? RefundStatusEnum.PENDING : RefundStatusEnum.NONE,
      freeCancelDeadline,
      checkInTargetTime,
      hoursRemaining,
    };
  }

  // 3. OVERDUE: Customer cancellation after scheduled check-in is strictly subject to forfeiture
  if (reservation.status === ReservationStatusEnum.OVERDUE) {
    const outcome = computeForfeiture(deposit, policy.forfeitPercent);
    return {
      isFreeCancellation: false,
      refundAmount: outcome.refundAmount,
      forfeitedAmount: outcome.forfeitedAmount,
      refundStatus:
        outcome.refundAmount > 0
          ? RefundStatusEnum.PENDING
          : RefundStatusEnum.NONE,
      freeCancelDeadline,
      checkInTargetTime,
      hoursRemaining,
    };
  }

  // 4. Customer cancellation on PAYMENT_SUCCESSFUL or CONFIRMED
  // If cancelled on or before the free cancellation deadline
  if (now.getTime() <= freeCancelDeadline.getTime()) {
    return {
      isFreeCancellation: true,
      refundAmount: deposit,
      forfeitedAmount: 0,
      refundStatus:
        deposit > 0 ? RefundStatusEnum.PENDING : RefundStatusEnum.NONE,
      freeCancelDeadline,
      checkInTargetTime,
      hoursRemaining,
    };
  }

  // Late cancellation (past free cancel deadline)
  const outcome = computeForfeiture(deposit, policy.forfeitPercent);
  return {
    isFreeCancellation: false,
    refundAmount: outcome.refundAmount,
    forfeitedAmount: outcome.forfeitedAmount,
    refundStatus:
      outcome.refundAmount > 0
        ? RefundStatusEnum.PENDING
        : RefundStatusEnum.NONE,
    freeCancelDeadline,
    checkInTargetTime,
    hoursRemaining,
  };
}

/**
 * Calculates the hard check-in deadline in Vietnam Time.
 * Based directly on endOfDayVN(checkInDate) + snapshot noShowGraceHours,
 * while taking into account any manager extension stored on the reservation.
 */
export function calculateCheckInDeadlineVN(
  reservation: {
    checkInDate: Date | string;
    graceExpiresAt?: Date | string | null;
    policySnapshot?: Partial<ReservationPolicySnapshot> | null;
  },
  fallbackConfig: ReservationConfig = getReservationConfig()
): Date {
  const policy = resolveReservationPolicy(reservation, fallbackConfig);
  const baseDeadlineMs =
    endOfDayVN(reservation.checkInDate).getTime() +
    policy.noShowGraceHours * 3600 * 1000;

  if (reservation.graceExpiresAt) {
    const extendedMs = new Date(reservation.graceExpiresAt).getTime();
    if (!Number.isNaN(extendedMs) && extendedMs > baseDeadlineMs) {
      return new Date(extendedMs);
    }
  }

  return new Date(baseDeadlineMs);
}

export interface CheckInGateResult {
  isAllowed: boolean;
  code?: string;
  isEarlyArrival?: boolean;
  effectiveDeadline: Date;
}

/**
 * Evaluates whether creating a contract / checking in for a reservation is permitted.
 * Rules:
 * 1. If customer has arrived (arrivedAt != null), permitted immediately (even if early or past deadline).
 * 2. If customer has not arrived:
 *    - Not allowed before startOfDayVN(checkInDate) (too early, MESSAGE_CODE_423).
 *    - Not allowed after deadline + signingBufferMinutes (deadline expired, MESSAGE_CODE_424).
 */
export function isReservationCheckInAllowed(
  reservation: {
    checkInDate: Date | string;
    arrivedAt?: Date | string | null;
    graceExpiresAt?: Date | string | null;
    policySnapshot?: Partial<ReservationPolicySnapshot> | null;
  },
  now: Date = new Date(),
  fallbackConfig: ReservationConfig = getReservationConfig()
): CheckInGateResult {
  const deadline = calculateCheckInDeadlineVN(reservation, fallbackConfig);
  const bufferMs = fallbackConfig.checkInSigningBufferMinutes * 60 * 1000;
  const effectiveDeadline = new Date(deadline.getTime() + bufferMs);

  const hasArrived = Boolean(reservation.arrivedAt);
  if (hasArrived) {
    return {
      isAllowed: true,
      isEarlyArrival:
        now.getTime() < startOfDayVN(reservation.checkInDate).getTime(),
      effectiveDeadline,
    };
  }

  // Not arrived: check too early
  if (now.getTime() < startOfDayVN(reservation.checkInDate).getTime()) {
    return {
      isAllowed: false,
      code: 'MESSAGE_CODE_423',
      effectiveDeadline,
    };
  }

  // Not arrived: check past deadline + buffer
  if (now.getTime() > effectiveDeadline.getTime()) {
    return {
      isAllowed: false,
      code: 'MESSAGE_CODE_424',
      effectiveDeadline,
    };
  }

  return {
    isAllowed: true,
    effectiveDeadline,
  };
}
