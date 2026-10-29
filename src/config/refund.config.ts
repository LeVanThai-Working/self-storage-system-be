export interface RefundConfig {
  opsApprovalThreshold: number; // Ngưỡng số tiền refund (VND) bắt buộc BUSINESS_OPS_MANAGER duyệt
  estimatedSlaDays: number; // Số ngày làm việc SLA hiển thị cho khách
}

const DEFAULT_OPS_APPROVAL_THRESHOLD = 10_000_000; // 10,000,000 VND
const DEFAULT_ESTIMATED_SLA_DAYS = 3;

export function getRefundConfig(): RefundConfig {
  const rawThreshold = Number(process.env.REFUND_OPS_APPROVAL_THRESHOLD);
  const opsApprovalThreshold =
    Number.isInteger(rawThreshold) && rawThreshold > 0
      ? rawThreshold
      : DEFAULT_OPS_APPROVAL_THRESHOLD;

  const rawSla = Number(process.env.REFUND_ESTIMATED_SLA_DAYS);
  const estimatedSlaDays =
    Number.isInteger(rawSla) && rawSla > 0
      ? rawSla
      : DEFAULT_ESTIMATED_SLA_DAYS;

  return {
    opsApprovalThreshold,
    estimatedSlaDays,
  };
}
