import { BillingUnitEnum } from '../common/enums/billing.enum.ts';
import { startOfDayVN } from './date.util.ts';
import { getContractConfig } from '../config/contract.config.ts';

export interface CalculateOverdueFeeParams {
  endDate: Date | string;
  actualCheckOutDate?: Date | string;
  rentalPrice: number;
  billingUnit: BillingUnitEnum;
  penaltyMultiplier?: number;
  standardDaysPerMonth?: number;
}

export interface OverdueFeeResult {
  isOverdue: boolean;
  overdueDays: number;
  dailyRate: number;
  penaltyDailyRate: number;
  overdueFee: number;
}

/**
 * Calculates calendar days overdue in Vietnam Time (UTC+7).
 *
 * Rules:
 * - endDate is INCLUSIVE: customer is entitled to use the storage unit through the end of endDate (23:59:59.999 VN).
 * - Checking out on or before endDate yields 0 overdue days.
 * - Checking out on endDate + 1 (starting at 00:00:00 VN) yields 1 overdue day.
 */
export function calculateOverdueDaysVN(
  endDate: Date | string,
  actualCheckOutDate: Date | string = new Date()
): number {
  const endDayVN = startOfDayVN(endDate);
  const checkOutDayVN = startOfDayVN(actualCheckOutDate);

  const diffMs = checkOutDayVN.getTime() - endDayVN.getTime();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Computes overdue fee for a contract according to [OPEN D8].
 *
 * Formula:
 * - overdueDays = calculateOverdueDaysVN(endDate, actualCheckOutDate)
 * - dailyRate:
 *   - MONTH: Math.round(rentalPrice / standardDaysPerMonth) (default standardDaysPerMonth = 30)
 *   - DAY: rentalPrice
 *   - other: rentalPrice
 * - penaltyDailyRate = Math.round(dailyRate * penaltyMultiplier) (default penaltyMultiplier = 1.5)
 * - overdueFee = overdueDays * penaltyDailyRate
 *
 * All VND currency values are rounded to integers via Math.round().
 */
export function calculateContractOverdueFee(
  params: CalculateOverdueFeeParams
): OverdueFeeResult {
  const config = getContractConfig();
  const penaltyMultiplier =
    params.penaltyMultiplier ?? config.overduePenaltyMultiplier;
  const standardDaysPerMonth =
    params.standardDaysPerMonth ?? config.standardDaysPerMonth;

  const actualCheckOutDate = params.actualCheckOutDate ?? new Date();
  const overdueDays = calculateOverdueDaysVN(
    params.endDate,
    actualCheckOutDate
  );

  const isOverdue = overdueDays > 0;
  if (!isOverdue || params.rentalPrice <= 0) {
    let dailyRate = 0;
    if (params.rentalPrice > 0) {
      dailyRate =
        params.billingUnit === BillingUnitEnum.MONTH
          ? Math.round(params.rentalPrice / standardDaysPerMonth)
          : Math.round(params.rentalPrice);
    }
    const penaltyDailyRate = Math.round(dailyRate * penaltyMultiplier);

    return {
      isOverdue: false,
      overdueDays: 0,
      dailyRate,
      penaltyDailyRate,
      overdueFee: 0,
    };
  }

  let dailyRate: number;
  if (params.billingUnit === BillingUnitEnum.MONTH) {
    dailyRate = Math.round(params.rentalPrice / standardDaysPerMonth);
  } else {
    dailyRate = Math.round(params.rentalPrice);
  }

  const penaltyDailyRate = Math.round(dailyRate * penaltyMultiplier);
  const overdueFee = overdueDays * penaltyDailyRate;

  return {
    isOverdue: true,
    overdueDays,
    dailyRate,
    penaltyDailyRate,
    overdueFee,
  };
}
