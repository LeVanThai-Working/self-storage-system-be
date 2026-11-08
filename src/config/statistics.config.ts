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

export interface StatisticsRagAdvisorConfig {
  geminiApiKey: string;
  embeddingModel: string;
  fastModel: string;
  reasoningModel: string;
  topKChunks: number;
  cacheTtlSeconds: number;
  requestTimeoutMs: number;
}

export interface StatisticsConfig {
  defaultRangeDays: number;
  maxRangeDays: number;
  topPeakLowCount: number;
  kpiWeights: StatisticsKpiWeights;
  kpiTargets: StatisticsKpiTargets;
  kpiTiers: StatisticsKpiTierThresholds;
  ragAdvisor: StatisticsRagAdvisorConfig;
}

const DEFAULT_RANGE_DAYS = 30;
const DEFAULT_MAX_RANGE_DAYS = 366;
const DEFAULT_TOP_PEAK_LOW_COUNT = 3;
const DEFAULT_RAG_EMBEDDING_MODEL = 'gemini-embedding-001';
const DEFAULT_RAG_FAST_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_RAG_REASONING_MODEL = 'gemini-3.8-flash';
const DEFAULT_RAG_TOP_K = 5;
const MAX_RAG_TOP_K = 8;
const DEFAULT_RAG_CACHE_TTL_SECONDS = 1800;
const DEFAULT_RAG_TIMEOUT_MS = 15000;

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

  const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
  const embeddingModel =
    (process.env.STATISTICS_RAG_EMBEDDING_MODEL || '').trim() ||
    DEFAULT_RAG_EMBEDDING_MODEL;
  const fastModel =
    (process.env.STATISTICS_RAG_FAST_MODEL || '').trim() ||
    DEFAULT_RAG_FAST_MODEL;
  const reasoningModel =
    (process.env.STATISTICS_RAG_REASONING_MODEL || '').trim() ||
    DEFAULT_RAG_REASONING_MODEL;

  const rawTopK = Number(process.env.STATISTICS_RAG_TOP_K);
  const topKChunks =
    Number.isInteger(rawTopK) && rawTopK >= 1 && rawTopK <= MAX_RAG_TOP_K
      ? rawTopK
      : DEFAULT_RAG_TOP_K;

  const rawCacheTtl = Number(process.env.STATISTICS_RAG_CACHE_TTL_SECONDS);
  const cacheTtlSeconds =
    Number.isInteger(rawCacheTtl) && rawCacheTtl > 0
      ? rawCacheTtl
      : DEFAULT_RAG_CACHE_TTL_SECONDS;

  const rawTimeoutMs = Number(process.env.STATISTICS_RAG_TIMEOUT_MS);
  const requestTimeoutMs =
    Number.isInteger(rawTimeoutMs) && rawTimeoutMs >= 1000
      ? rawTimeoutMs
      : DEFAULT_RAG_TIMEOUT_MS;

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
    ragAdvisor: {
      geminiApiKey,
      embeddingModel,
      fastModel,
      reasoningModel,
      topKChunks,
      cacheTtlSeconds,
      requestTimeoutMs,
    },
  };
}

export const statisticsConfig: StatisticsConfig = getStatisticsConfig();
