export enum StatisticsGranularityEnum {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
}

export enum FacilityKpiTierEnum {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  AVERAGE = 'average',
  NEEDS_IMPROVEMENT = 'needs_improvement',
}

export enum FacilityKpiSortByEnum {
  KPI_SCORE = 'kpiScore',
  OCCUPANCY_RATE = 'occupancyRate',
  COLLECTED_REVENUE = 'collectedRevenue',
  CONVERSION_RATE = 'conversionRate',
  COLLECTION_RATE = 'collectionRate',
}

export enum RagQueryComplexityEnum {
  SIMPLE = 'simple',
  COMPLEX = 'complex',
}

export enum RagGroundingStatusEnum {
  GROUNDED = 'grounded',
  INSUFFICIENT_DATA = 'insufficient_data',
  OUT_OF_SCOPE_REJECTED = 'out_of_scope_rejected',
}

export enum AiInsightCategoryEnum {
  PRICING_AND_PROMOTION = 'pricing_and_promotion',
  OCCUPANCY_AND_CAPACITY = 'occupancy_and_capacity',
  UPSELL_AND_PRODUCT_MIX = 'upsell_and_product_mix',
  CASHFLOW_AND_DEBT = 'cashflow_and_debt',
  OPERATIONS_AND_SLA = 'operations_and_sla',
}

export enum AiInsightPriorityEnum {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum AiInsightFocusAreaEnum {
  ALL = 'all',
  REVENUE_GROWTH = 'revenue_growth',
  OCCUPANCY = 'occupancy',
  DEBT_COLLECTION = 'debt_collection',
  OPERATIONAL_EFFICIENCY = 'operational_efficiency',
}

export enum AiAdvisorProviderEnum {
  GEMINI = 'gemini',
  GROUNDED_DETERMINISTIC_FALLBACK = 'grounded_deterministic_fallback',
}
