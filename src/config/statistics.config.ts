export interface StatisticsKpiWeights {
  occupancy: number;
  collection: number;
  conversionAndRetention: number;
  operationalQuality: number;
}

export interface StatisticsKpiTargets {
  targetOccupancyRate: number;
  maxAcceptableMaintenanceDragRate: number;
  facilityFaultPenaltyPerIncident: number;
  lowOccupancyAlertThreshold: number;
  highOverdueRateAlertThreshold: number;
}

export interface StatisticsKpiTierThresholds {
  excellentMin: number;
  goodMin: number;
  averageMin: number;
}

export interface StatisticsConfig {
  defaultRangeDays: number;
  maxRangeDays: number;
  topPeakLowCount: number;
  kpiWeights: StatisticsKpiWeights;
  kpiTargets: StatisticsKpiTargets;
  kpiTiers: StatisticsKpiTierThresholds;
}

const DEFAULT_RANGE_DAYS = 30;
const DEFAULT_MAX_RANGE_DAYS = 366;
const DEFAULT_TOP_PEAK_LOW_COUNT = 3;

export function getStatisticsConfig(): StatisticsConfig {
  const rawDefaultDays = Number(process.env.STATISTICS_DEFAULT_RANGE_DAYS);
  const defaultRangeDays =
    Number.isInteger(rawDefaultDays) && rawDefaultDays > 0
      ? rawDefaultDays
      : DEFAULT_RANGE_DAYS;

  const rawMaxDays = Number(process.env.STATISTICS_MAX_RANGE_DAYS);
  const maxRangeDays =
    Number.isInteger(rawMaxDays) && rawMaxDays >= defaultRangeDays
      ? rawMaxDays
      : DEFAULT_MAX_RANGE_DAYS;

  const rawTopPeakLow = Number(process.env.STATISTICS_TOP_PEAK_LOW_COUNT);
  const topPeakLowCount =
    Number.isInteger(rawTopPeakLow) && rawTopPeakLow > 0
      ? rawTopPeakLow
      : DEFAULT_TOP_PEAK_LOW_COUNT;

  return {
    defaultRangeDays,
    maxRangeDays,
    topPeakLowCount,
    kpiWeights: {
      occupancy: 0.3,
      collection: 0.25,
      conversionAndRetention: 0.2,
      operationalQuality: 0.25,
    },
    kpiTargets: {
      targetOccupancyRate: 80,
      maxAcceptableMaintenanceDragRate: 15,
      facilityFaultPenaltyPerIncident: 15,
      lowOccupancyAlertThreshold: 40,
      highOverdueRateAlertThreshold: 15,
    },
    kpiTiers: {
      excellentMin: 85,
      goodMin: 70,
      averageMin: 50,
    },
  };
}

export const statisticsConfig: StatisticsConfig = getStatisticsConfig();
