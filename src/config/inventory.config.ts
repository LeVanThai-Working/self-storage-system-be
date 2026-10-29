/**
 * Cấu hình thời hạn hiệu lực cho phiếu yêu cầu nhập/xuất kho (Inventory Request)
 */
export const INVENTORY_REQUEST_EXPIRY_CONFIG = {
  /** Thời hạn hiệu lực tối đa mà khách hàng có thể chọn: 7 ngày (ms) */
  MAX_EXPIRY_DAYS: 7,
  /** Thời hạn hiệu lực tối thiểu: 1 giờ (ms) */
  MIN_EXPIRY_HOURS: 1,

  /** Thời hạn mặc định cho phiếu xuất kho nếu khách không điền: 24 giờ (ms) */
  DEFAULT_OUTBOUND_EXPIRY_HOURS: 24,

  /** Thời hạn mặc định cho phiếu nhập kho báo trước (pre-advised) nếu khách không điền: 7 ngày (ms) */
  DEFAULT_INBOUND_EXPIRY_DAYS: 7,

  /** Tần suất lặp lại quét tự động hủy phiếu hết hạn: mỗi 15 phút (cron pattern) */
  EXPIRE_SCAN_CRON_PATTERN: '*/15 * * * *',
} as const;
