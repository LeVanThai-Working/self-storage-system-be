export enum ReservationStatusEnum {
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_SUCCESSFUL = 'payment_successful',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  OVERDUE = 'overdue',
}

export enum RefundStatusEnum {
  NONE = 'none',
  PENDING = 'pending',
  REFUNDED = 'refunded',
}

export enum ReservationCancelSourceEnum {
  CUSTOMER = 'customer',
  FACILITY = 'facility',
  SYSTEM = 'system',
}
