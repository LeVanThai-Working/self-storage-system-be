export enum MovementTypeEnum {
  IN = 'in',
  OUT = 'out',
  MOVE = 'move',
  ADJUST = 'adjust',
}

export enum InventoryRequestTypeEnum {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum InventoryRequestStatusEnum {
  PENDING = 'pending',
  PENDING_CUSTOMER_CONFIRMATION = 'pending_confirmation',
  PROCESSING = 'processing',
  READY_TO_PUTAWAY = 'ready_to_putaway',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum InventoryItemStatusEnum {
  NORMAL = 'normal',
  TEMPORARY_HOLDING = 'temporary_holding',
  DAMAGED = 'damaged',
  DISPUTED = 'disputed',
}

export enum AccessScheduleStatusEnum {
  PENDING = 'pending',
  CHECKED_IN = 'checked_in',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  EXPIRED = 'expired',
}
