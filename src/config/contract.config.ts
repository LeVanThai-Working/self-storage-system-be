import { ContractStatusEnum } from '../common/enums/contract.enum.ts';
import { MovementTypeEnum } from '../common/enums/customerInventory.enum.ts';

export interface ContractConfig {
  overduePenaltyMultiplier: number;
  standardDaysPerMonth: number;
}

/**
 * Single source of truth for which inventory operations are allowed under each contract status.
 * - ACTIVE: all operations (IN, OUT, MOVE, ADJUST)
 * - OVERDUE: customer can retrieve (OUT) or reorganize (MOVE) goods, but cannot add (IN) or adjust (ADJUST)
 * - All other statuses: no inventory mutations permitted
 */
export const INVENTORY_OPS_BY_CONTRACT_STATUS: Readonly<
  Record<ContractStatusEnum, readonly MovementTypeEnum[]>
> = {
  [ContractStatusEnum.DRAFT]: [],
  [ContractStatusEnum.ACTIVE]: [
    MovementTypeEnum.IN,
    MovementTypeEnum.OUT,
    MovementTypeEnum.MOVE,
    MovementTypeEnum.ADJUST,
  ],
  [ContractStatusEnum.OVERDUE]: [MovementTypeEnum.OUT, MovementTypeEnum.MOVE],
  [ContractStatusEnum.COMPLETED]: [],
  [ContractStatusEnum.CANCELLED]: [],
  [ContractStatusEnum.TERMINATED]: [],
};

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
