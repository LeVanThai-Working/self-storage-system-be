export interface BillingConfig {
  invoiceLeadDays: number;
  dueDaysFromPeriodStart: number;
  invoiceGraceDays: number;
  dailyRentalThresholdDays: number;
  dailyCycleDays: number;
}

const DEFAULT_INVOICE_LEAD_DAYS = 7;
const DEFAULT_DUE_DAYS_FROM_PERIOD_START = 0;
const DEFAULT_INVOICE_GRACE_DAYS = 3;
const DEFAULT_DAILY_RENTAL_THRESHOLD_DAYS = 14;
const DEFAULT_DAILY_CYCLE_DAYS = 7;

export function getBillingConfig(): BillingConfig {
  const rawLead = Number(process.env.BILLING_INVOICE_LEAD_DAYS);
  const invoiceLeadDays =
    Number.isInteger(rawLead) && rawLead >= 0
      ? rawLead
      : DEFAULT_INVOICE_LEAD_DAYS;

  const rawDueDays = Number(process.env.BILLING_DUE_DAYS_FROM_PERIOD_START);
  const dueDaysFromPeriodStart =
    Number.isInteger(rawDueDays) && rawDueDays >= 0
      ? rawDueDays
      : DEFAULT_DUE_DAYS_FROM_PERIOD_START;

  const rawGrace = Number(process.env.BILLING_INVOICE_GRACE_DAYS);
  const invoiceGraceDays =
    Number.isInteger(rawGrace) && rawGrace >= 0
      ? rawGrace
      : DEFAULT_INVOICE_GRACE_DAYS;

  const rawDailyThreshold = Number(
    process.env.BILLING_DAILY_RENTAL_THRESHOLD_DAYS
  );
  const dailyRentalThresholdDays =
    Number.isInteger(rawDailyThreshold) && rawDailyThreshold > 0
      ? rawDailyThreshold
      : DEFAULT_DAILY_RENTAL_THRESHOLD_DAYS;

  const rawDailyCycle = Number(process.env.BILLING_DAILY_CYCLE_DAYS);
  const dailyCycleDays =
    Number.isInteger(rawDailyCycle) && rawDailyCycle > 0
      ? rawDailyCycle
      : DEFAULT_DAILY_CYCLE_DAYS;

  return {
    invoiceLeadDays,
    dueDaysFromPeriodStart,
    invoiceGraceDays,
    dailyRentalThresholdDays,
    dailyCycleDays,
  };
}

export const billingConfig: BillingConfig = getBillingConfig();
