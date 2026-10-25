export interface ContractConfig {
  overduePenaltyMultiplier: number;
  standardDaysPerMonth: number;
}

const DEFAULT_OVERDUE_PENALTY_MULTIPLIER = 1.5;
const DEFAULT_STANDARD_DAYS_PER_MONTH = 30;

export function getContractConfig(): ContractConfig {
  const rawMultiplier = Number(process.env.CONTRACT_OVERDUE_PENALTY_MULTIPLIER);
  const overduePenaltyMultiplier =
    !Number.isNaN(rawMultiplier) && rawMultiplier > 0
      ? rawMultiplier
      : DEFAULT_OVERDUE_PENALTY_MULTIPLIER;

  const rawStandardDays = Number(process.env.CONTRACT_STANDARD_DAYS_PER_MONTH);
  const standardDaysPerMonth =
    Number.isInteger(rawStandardDays) && rawStandardDays > 0
      ? rawStandardDays
      : DEFAULT_STANDARD_DAYS_PER_MONTH;

  return {
    overduePenaltyMultiplier,
    standardDaysPerMonth,
  };
}
