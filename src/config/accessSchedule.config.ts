/**
 * Cấu hình nghiệp vụ cho lịch ra vào kho (Access Schedule)
 * Áp dụng cho loại kho tự quản Self-Managed Warehouse Rack
 */
export const ACCESS_SCHEDULE_CONFIG = {
  /** Thời gian cho phép quét check-in sớm trước giờ bắt đầu ca: 30 phút */
  EARLY_CHECKIN_MINUTES: 30,

  /** Thời gian ân hạn trễ sau giờ bắt đầu ca: 45 phút */
  GRACE_CHECKIN_MINUTES: 45,

  /** Thời hạn tối thiểu để khách hàng tự hủy lịch hẹn trước giờ bắt đầu: 1 giờ */
  MIN_CANCEL_LEAD_HOURS: 1,

  /** Số người vào kho tối thiểu */
  MIN_PEOPLE: 1,

  /** Số người vào kho tối đa cho một lượt đăng ký đoàn/xe tải */
  MAX_PEOPLE: 10,

  /** Tần suất lặp lại quét tự động chuyển lịch hẹn quá hạn sang NO_SHOW: mỗi 15 phút */
  NO_SHOW_SCAN_CRON_PATTERN: '*/15 * * * *',
} as const;
