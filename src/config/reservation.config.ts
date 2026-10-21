export interface ReservationConfig {
  holdMinutes: number;
  maxAdvanceDays: number;
  overdueGraceHours: number;
  maxPendingPerCustomer: number;
  freeCancelHours: number;
  maxActivePerCustomer: number;
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

  return {
    holdMinutes,
    maxAdvanceDays,
    overdueGraceHours,
    maxPendingPerCustomer,
    freeCancelHours,
    maxActivePerCustomer,
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
