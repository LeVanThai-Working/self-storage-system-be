import { contractConfig } from '../config/contract.config.ts';

export interface CalculateInterruptedDaysParams {
  evacuatedAt: Date | string;
  readyAt?: Date | string | null;
  actualEndAt?: Date | string | null;
  graceHours?: number;
  cutoffHours?: number;
}

export interface CalculateInterruptedRefundAmountParams extends CalculateInterruptedDaysParams {
  monthlyRentalPrice: number;
}

/**
 * Calculates the number of billable interrupted days according to Self-Managed Rack specs:
 * - < 8 hours: 0 days (light maintenance grace exemption)
 * - 8h to 24h: 1 day
 * - Each additional 24h block: +1 day
 * - Cutoff cap: if readyAt is provided, effective end date cannot exceed readyAt + cutoffHours (default 48h)
 *   [CHỐT D-SMR.9]
 */
export function calculateInterruptedDays(
  params: CalculateInterruptedDaysParams
): number {
  const start = new Date(params.evacuatedAt).getTime();
  const rawEnd = params.actualEndAt
    ? new Date(params.actualEndAt).getTime()
    : Date.now();

  const graceHours =
    params.graceHours ?? contractConfig.rackIncidentInterruptionGraceHours ?? 8;
  const cutoffHours =
    params.cutoffHours ?? contractConfig.rackIncidentCutoffGraceHours ?? 48;

  let effectiveEnd = rawEnd;

  if (params.readyAt) {
    const readyMs = new Date(params.readyAt).getTime();
    const cutoffMs = readyMs + cutoffHours * 60 * 60 * 1000;
    effectiveEnd = Math.min(rawEnd, cutoffMs);
  }

  const durationMs = effectiveEnd - start;
  if (durationMs <= 0) {
    return 0;
  }

  const durationHours = durationMs / (1000 * 60 * 60);

  // Less than graceHours (e.g. 8h) is exempt
  if (durationHours < graceHours) {
    return 0;
  }

  // From graceHours to 24h is 1 day
  if (durationHours <= 24) {
    return 1;
  }

  // Each additional 24 hours (or part thereof) adds 1 day
  const additionalHours = durationHours - 24;
  const additionalDays = Math.ceil(additionalHours / 24);

  return 1 + additionalDays;
}

/**
 * Calculates the monetary refund for interrupted storage days.
 * Formula: Math.round((monthlyRentalPrice / 30) * interruptedDays)
 */
export function calculateInterruptedRefundAmount(
  params: CalculateInterruptedRefundAmountParams
): number {
  const days = calculateInterruptedDays(params);
  if (days <= 0 || params.monthlyRentalPrice <= 0) {
    return 0;
  }

  const dailyPrice = params.monthlyRentalPrice / 30;
  return Math.round(dailyPrice * days);
}
