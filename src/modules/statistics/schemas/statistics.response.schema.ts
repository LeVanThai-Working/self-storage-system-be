import { z } from 'zod';
import {
  StatisticsGranularityEnum,
  FacilityKpiTierEnum,
  RagQueryComplexityEnum,
  RagGroundingStatusEnum,
  AiInsightCategoryEnum,
  AiInsightPriorityEnum,
  AiInsightFocusAreaEnum,
  AiAdvisorProviderEnum,
  RagChunkTypeEnum,
} from '../../../common/enums/statistics.enum.ts';
import {
  BillingUnitEnum,
  InvoiceItemTypeEnum,
} from '../../../common/enums/billing.enum.ts';
import {
  PaymentMethodEnum,
  PaymentTransactionResultEnum,
} from '../../../common/enums/payment.enum.ts';
import { RefundRequestReasonEnum } from '../../../common/enums/refundRequest.enum.ts';
import { UnitTypeCategoryEnum } from '../../../common/enums/unitType.enum.ts';
import { RackZoneEnum } from '../../../common/enums/storageRack.enum.ts';

// ==========================================
// 1. OVERVIEW STATISTICS RESPONSE
// ==========================================
export const overviewStatisticsResponseSchema = z.object({
  period: z.object({
    fromDate: z.string(),
    toDate: z.string(),
    scopedFacilityId: z.string().nullable(),
  }),
  facilities: z.object({
    totalActive: z.number(),
  }),
  occupancy: z.object({
    storageUnits: z.object({
      total: z.number(),
      available: z.number(),
      occupied: z.number(),
      reserved: z.number(),
      underMaintenance: z.number(),
      pendingClearance: z.number(),
      inactive: z.number(),
      occupancyRate: z.number(),
      areaOccupancyRate: z.number(),
      totalAreaM2: z.number(),
      occupiedAreaM2: z.number(),
    }),
    storageRacks: z.object({
      total: z.number(),
      available: z.number(),
      rented: z.number(),
      reserved: z.number(),
      maintenance: z.number(),
      inactive: z.number(),
      occupancyRate: z.number(),
    }),
  }),
  financials: z.object({
    collectedRevenue: z.number(),
    previousPeriodCollectedRevenue: z.number(),
    revenueGrowthPercent: z.number(),
    refundedAmount: z.number(),
    netRevenue: z.number(),
    heldDeposits: z.number(),
    overdueReceivables: z.number(),
    forfeitedAmount: z.number(),
  }),
  contractsAndBookings: z.object({
    activeContracts: z.number(),
    overdueContracts: z.number(),
    newReservationsInPeriod: z.number(),
    completedReservationsInPeriod: z.number(),
  }),
  actionRequired: z.object({
    pendingApprovals: z.number(),
    pendingOpsRefunds: z.number(),
    unmatchedSepayTransactions: z.number(),
    openHighCriticalIncidents: z.number(),
  }),
});

export interface OverviewStatisticsResponse {
  period: {
    fromDate: string;
    toDate: string;
    scopedFacilityId: string | null;
  };
  facilities: {
    totalActive: number;
  };
  occupancy: {
    storageUnits: {
      total: number;
      available: number;
      occupied: number;
      reserved: number;
      underMaintenance: number;
      pendingClearance: number;
      inactive: number;
      occupancyRate: number;
      areaOccupancyRate: number;
      totalAreaM2: number;
      occupiedAreaM2: number;
    };
    storageRacks: {
      total: number;
      available: number;
      rented: number;
      reserved: number;
      maintenance: number;
      inactive: number;
      occupancyRate: number;
    };
  };
  financials: {
    collectedRevenue: number;
    previousPeriodCollectedRevenue: number;
    revenueGrowthPercent: number;
    refundedAmount: number;
    netRevenue: number;
    heldDeposits: number;
    overdueReceivables: number;
    forfeitedAmount: number;
  };
  contractsAndBookings: {
    activeContracts: number;
    overdueContracts: number;
    newReservationsInPeriod: number;
    completedReservationsInPeriod: number;
  };
  actionRequired: {
    pendingApprovals: number;
    pendingOpsRefunds: number;
    unmatchedSepayTransactions: number;
    openHighCriticalIncidents: number;
  };
}

// ==========================================
// 2. RENTAL TRENDS & TEMPORAL ANALYTICS
// ==========================================
export const rentalTrendPointSchema = z.object({
  period: z.string(),
  reservationsCreated: z.number(),
  completedReservations: z.number(),
  cancelledReservations: z.number(),
  contractsCheckedIn: z.number(),
  contractsEnded: z.number(),
  collectedRevenue: z.number(),
  varianceFromAvgPercent: z.number(),
});

export const dayOfWeekItemSchema = z.object({
  dayOfWeek: z.number(), // 1 = Sunday ... 7 = Saturday
  dayName: z.string(),
  reservationsCreated: z.number(),
  contractsCheckedIn: z.number(),
  accessSchedulesCount: z.number(),
  totalActivity: z.number(),
});

export const timeSlotDemandItemSchema = z.object({
  timeSlot: z.string(),
  reservationCount: z.number(),
  completedReservationCount: z.number(),
  accessScheduleCount: z.number(),
  totalDemandCount: z.number(),
  configuredMaxCapacityPerDay: z.number(),
  demandSharePercent: z.number(),
});

export const hourOfDayItemSchema = z.object({
  hour: z.number(),
  label: z.string(),
  reservationCount: z.number(),
});

export const rentalTrendsResponseSchema = z.object({
  period: z.object({
    fromDate: z.string(),
    toDate: z.string(),
    granularity: z.nativeEnum(StatisticsGranularityEnum),
    scopedFacilityId: z.string().nullable(),
  }),
  timeSeries: z.array(rentalTrendPointSchema),
  peakAndLowAnalysis: z.object({
    averageReservationsPerPeriod: z.number(),
    peakPeriods: z.array(rentalTrendPointSchema),
    lowPeriods: z.array(rentalTrendPointSchema),
  }),
  dayOfWeekDistribution: z.object({
    busiestDay: dayOfWeekItemSchema.nullable(),
    quietestDay: dayOfWeekItemSchema.nullable(),
    items: z.array(dayOfWeekItemSchema),
  }),
  timeSlotDemand: z.array(timeSlotDemandItemSchema),
  hourOfDayDistribution: z.array(hourOfDayItemSchema),
  durationBreakdown: z.object({
    byBillingUnit: z.array(
      z.object({
        billingUnit: z.nativeEnum(BillingUnitEnum),
        reservationCount: z.number(),
        sharePercent: z.number(),
        totalDepositAmount: z.number(),
      })
    ),
    byDurationBucket: z.array(
      z.object({
        bucket: z.string(),
        label: z.string(),
        reservationCount: z.number(),
        sharePercent: z.number(),
      })
    ),
  }),
});

export interface RentalTrendPoint {
  period: string;
  reservationsCreated: number;
  completedReservations: number;
  cancelledReservations: number;
  contractsCheckedIn: number;
  contractsEnded: number;
  collectedRevenue: number;
  varianceFromAvgPercent: number;
}

export interface DayOfWeekItem {
  dayOfWeek: number;
  dayName: string;
  reservationsCreated: number;
  contractsCheckedIn: number;
  accessSchedulesCount: number;
  totalActivity: number;
}

export interface TimeSlotDemandItem {
  timeSlot: string;
  reservationCount: number;
  completedReservationCount: number;
  accessScheduleCount: number;
  totalDemandCount: number;
  configuredMaxCapacityPerDay: number;
  demandSharePercent: number;
}

export interface HourOfDayItem {
  hour: number;
  label: string;
  reservationCount: number;
}

export interface RentalTrendsResponse {
  period: {
    fromDate: string;
    toDate: string;
    granularity: StatisticsGranularityEnum;
    scopedFacilityId: string | null;
  };
  timeSeries: RentalTrendPoint[];
  peakAndLowAnalysis: {
    averageReservationsPerPeriod: number;
    peakPeriods: RentalTrendPoint[];
    lowPeriods: RentalTrendPoint[];
  };
  dayOfWeekDistribution: {
    busiestDay: DayOfWeekItem | null;
    quietestDay: DayOfWeekItem | null;
    items: DayOfWeekItem[];
  };
  timeSlotDemand: TimeSlotDemandItem[];
  hourOfDayDistribution: HourOfDayItem[];
  durationBreakdown: {
    byBillingUnit: Array<{
      billingUnit: BillingUnitEnum;
      reservationCount: number;
      sharePercent: number;
      totalDepositAmount: number;
    }>;
    byDurationBucket: Array<{
      bucket: string;
      label: string;
      reservationCount: number;
      sharePercent: number;
    }>;
  };
}

// ==========================================
// 3. FACILITY KPI SCORECARD & LEADERBOARD
// ==========================================
export const facilityKpiItemSchema = z.object({
  rank: z.number(),
  facility: z.object({
    id: z.string(),
    code: z.string().nullable(),
    name: z.string(),
    city: z.string(),
    status: z.string(),
  }),
  kpiScore: z.number(),
  kpiTier: z.nativeEnum(FacilityKpiTierEnum),
  componentScores: z.object({
    occupancyScore: z.number(),
    collectionScore: z.number(),
    conversionAndRetentionScore: z.number(),
    operationalQualityScore: z.number(),
  }),
  occupancy: z.object({
    totalActiveUnits: z.number(),
    occupiedOrReservedUnits: z.number(),
    maintenanceOrClearanceUnits: z.number(),
    unitOccupancyRate: z.number(),
    maintenanceDragRate: z.number(),
    totalActiveRacks: z.number(),
    rentedOrReservedRacks: z.number(),
    rackOccupancyRate: z.number(),
    areaOccupancyRate: z.number(),
  }),
  financial: z.object({
    collectedRevenue: z.number(),
    refundedAmount: z.number(),
    netRevenue: z.number(),
    revPAU: z.number(),
    revPAM: z.number(),
    invoicedAmount: z.number(),
    overdueAmount: z.number(),
    invoiceCollectionRate: z.number(),
  }),
  conversionAndRetention: z.object({
    reservationsCreated: z.number(),
    reservationsPaid: z.number(),
    reservationsCompleted: z.number(),
    reservationConversionRate: z.number(),
    contractsCreated: z.number(),
    walkInContracts: z.number(),
    walkInRatioPercent: z.number(),
    renewedContracts: z.number(),
    renewalRate: z.number(),
  }),
  operations: z.object({
    facilityFaultCount: z.number(),
    totalIncidents: z.number(),
    openIncidents: z.number(),
    facilityLiableIncidents: z.number(),
    totalRepairCost: z.number(),
    avgReservationConfirmMinutes: z.number().nullable(),
    avgIncidentResolveHours: z.number().nullable(),
    supportCompletionRate: z.number(),
  }),
  alerts: z.array(z.string()),
});

export const facilitiesKpiResponseSchema = z.object({
  period: z.object({
    fromDate: z.string(),
    toDate: z.string(),
    scopedFacilityId: z.string().nullable(),
  }),
  summary: z.object({
    totalFacilitiesEvaluated: z.number(),
    averageKpiScore: z.number(),
    excellentCount: z.number(),
    goodCount: z.number(),
    averageCount: z.number(),
    needsImprovementCount: z.number(),
  }),
  highlights: z.object({
    topPerformers: z.array(facilityKpiItemSchema),
    underperformers: z.array(facilityKpiItemSchema),
  }),
  items: z.array(facilityKpiItemSchema),
});

export interface FacilityKpiItem {
  rank: number;
  facility: {
    id: string;
    code: string | null;
    name: string;
    city: string;
    status: string;
  };
  kpiScore: number;
  kpiTier: FacilityKpiTierEnum;
  componentScores: {
    occupancyScore: number;
    collectionScore: number;
    conversionAndRetentionScore: number;
    operationalQualityScore: number;
  };
  occupancy: {
    totalActiveUnits: number;
    occupiedOrReservedUnits: number;
    maintenanceOrClearanceUnits: number;
    unitOccupancyRate: number;
    maintenanceDragRate: number;
    totalActiveRacks: number;
    rentedOrReservedRacks: number;
    rackOccupancyRate: number;
    areaOccupancyRate: number;
  };
  financial: {
    collectedRevenue: number;
    refundedAmount: number;
    netRevenue: number;
    revPAU: number;
    revPAM: number;
    invoicedAmount: number;
    overdueAmount: number;
    invoiceCollectionRate: number;
  };
  conversionAndRetention: {
    reservationsCreated: number;
    reservationsPaid: number;
    reservationsCompleted: number;
    reservationConversionRate: number;
    contractsCreated: number;
    walkInContracts: number;
    walkInRatioPercent: number;
    renewedContracts: number;
    renewalRate: number;
  };
  operations: {
    facilityFaultCount: number;
    totalIncidents: number;
    openIncidents: number;
    facilityLiableIncidents: number;
    totalRepairCost: number;
    avgReservationConfirmMinutes: number | null;
    avgIncidentResolveHours: number | null;
    supportCompletionRate: number;
  };
  alerts: string[];
}

export interface FacilitiesKpiResponse {
  period: {
    fromDate: string;
    toDate: string;
    scopedFacilityId: string | null;
  };
  summary: {
    totalFacilitiesEvaluated: number;
    averageKpiScore: number;
    excellentCount: number;
    goodCount: number;
    averageCount: number;
    needsImprovementCount: number;
  };
  highlights: {
    topPerformers: FacilityKpiItem[];
    underperformers: FacilityKpiItem[];
  };
  items: FacilityKpiItem[];
}

// ==========================================
// 4. FINANCIAL ANALYTICS RESPONSE
// ==========================================
export const financialAnalyticsResponseSchema = z.object({
  period: z.object({
    fromDate: z.string(),
    toDate: z.string(),
    granularity: z.nativeEnum(StatisticsGranularityEnum),
    scopedFacilityId: z.string().nullable(),
  }),
  revenueTimeSeries: z.array(
    z.object({
      period: z.string(),
      invoicedAmount: z.number(),
      collectedAmount: z.number(),
      refundedAmount: z.number(),
      netCollectedAmount: z.number(),
    })
  ),
  revenueByItemType: z.array(
    z.object({
      itemType: z.nativeEnum(InvoiceItemTypeEnum),
      invoicedAmount: z.number(),
      paidAmount: z.number(),
      itemCount: z.number(),
      sharePercent: z.number(),
    })
  ),
  paymentMethodBreakdown: z.array(
    z.object({
      method: z.nativeEnum(PaymentMethodEnum),
      count: z.number(),
      totalPaidAmount: z.number(),
      sharePercent: z.number(),
    })
  ),
  sepayReconciliation: z.array(
    z.object({
      result: z.nativeEnum(PaymentTransactionResultEnum),
      count: z.number(),
      totalTransferAmount: z.number(),
    })
  ),
  overdueAging: z.object({
    totalOverdueInvoices: z.number(),
    totalOverdueAmount: z.number(),
    buckets: z.array(
      z.object({
        bucket: z.string(),
        label: z.string(),
        invoiceCount: z.number(),
        overdueAmount: z.number(),
      })
    ),
  }),
  refundAnalytics: z.object({
    totalRequests: z.number(),
    totalRequestedAmount: z.number(),
    totalPaidAmount: z.number(),
    byReason: z.array(
      z.object({
        reason: z.nativeEnum(RefundRequestReasonEnum),
        count: z.number(),
        totalAmount: z.number(),
        paidAmount: z.number(),
      })
    ),
  }),
});

export interface FinancialAnalyticsResponse {
  period: {
    fromDate: string;
    toDate: string;
    granularity: StatisticsGranularityEnum;
    scopedFacilityId: string | null;
  };
  revenueTimeSeries: Array<{
    period: string;
    invoicedAmount: number;
    collectedAmount: number;
    refundedAmount: number;
    netCollectedAmount: number;
  }>;
  revenueByItemType: Array<{
    itemType: InvoiceItemTypeEnum;
    invoicedAmount: number;
    paidAmount: number;
    itemCount: number;
    sharePercent: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: PaymentMethodEnum;
    count: number;
    totalPaidAmount: number;
    sharePercent: number;
  }>;
  sepayReconciliation: Array<{
    result: PaymentTransactionResultEnum;
    count: number;
    totalTransferAmount: number;
  }>;
  overdueAging: {
    totalOverdueInvoices: number;
    totalOverdueAmount: number;
    buckets: Array<{
      bucket: string;
      label: string;
      invoiceCount: number;
      overdueAmount: number;
    }>;
  };
  refundAnalytics: {
    totalRequests: number;
    totalRequestedAmount: number;
    totalPaidAmount: number;
    byReason: Array<{
      reason: RefundRequestReasonEnum;
      count: number;
      totalAmount: number;
      paidAmount: number;
    }>;
  };
}

// ==========================================
// 5. PRODUCT MIX & OPERATIONS ANALYTICS
// ==========================================
export const productAndOperationsResponseSchema = z.object({
  period: z.object({
    fromDate: z.string(),
    toDate: z.string(),
    scopedFacilityId: z.string().nullable(),
  }),
  unitTypePerformance: z.array(
    z.object({
      unitTypeId: z.string(),
      name: z.string(),
      category: z.nativeEnum(UnitTypeCategoryEnum),
      area: z.number(),
      totalUnits: z.number(),
      availableUnits: z.number(),
      occupiedOrReservedUnits: z.number(),
      maintenanceUnits: z.number(),
      occupancyRate: z.number(),
      activeContractCount: z.number(),
      periodicRevenue: z.number(),
    })
  ),
  rackZonePerformance: z.array(
    z.object({
      zone: z.nativeEnum(RackZoneEnum),
      totalRacks: z.number(),
      availableRacks: z.number(),
      rentedRacks: z.number(),
      reservedRacks: z.number(),
      maintenanceRacks: z.number(),
      occupancyRate: z.number(),
    })
  ),
  amenityPerformance: z.object({
    totalOfferings: z.number(),
    totalQuantity: z.number(),
    inUseQuantity: z.number(),
    utilizationRate: z.number(),
    contractAttachRate: z.number(),
    topAmenities: z.array(
      z.object({
        amenityId: z.string(),
        name: z.string(),
        totalQuantity: z.number(),
        totalRevenue: z.number(),
      })
    ),
  }),
  bookingFunnel: z.object({
    totalCreated: z.number(),
    paidCount: z.number(),
    confirmedCount: z.number(),
    arrivedCount: z.number(),
    completedCount: z.number(),
    expiredCount: z.number(),
    cancelledCount: z.number(),
    facilityFaultCancelCount: z.number(),
    overdueCount: z.number(),
    overallConversionRate: z.number(),
  }),
  warehouseTraffic: z.object({
    accessSchedules: z.object({
      totalScheduled: z.number(),
      completedCount: z.number(),
      noShowCount: z.number(),
      cancelledCount: z.number(),
      totalVisitors: z.number(),
      completionRate: z.number(),
    }),
    inventoryMovements: z.object({
      inboundCount: z.number(),
      inboundQuantity: z.number(),
      outboundCount: z.number(),
      outboundQuantity: z.number(),
      moveCount: z.number(),
      adjustCount: z.number(),
    }),
  }),
});

export interface ProductAndOperationsResponse {
  period: {
    fromDate: string;
    toDate: string;
    scopedFacilityId: string | null;
  };
  unitTypePerformance: Array<{
    unitTypeId: string;
    name: string;
    category: UnitTypeCategoryEnum;
    area: number;
    totalUnits: number;
    availableUnits: number;
    occupiedOrReservedUnits: number;
    maintenanceUnits: number;
    occupancyRate: number;
    activeContractCount: number;
    periodicRevenue: number;
  }>;
  rackZonePerformance: Array<{
    zone: RackZoneEnum;
    totalRacks: number;
    availableRacks: number;
    rentedRacks: number;
    reservedRacks: number;
    maintenanceRacks: number;
    occupancyRate: number;
  }>;
  amenityPerformance: {
    totalOfferings: number;
    totalQuantity: number;
    inUseQuantity: number;
    utilizationRate: number;
    contractAttachRate: number;
    topAmenities: Array<{
      amenityId: string;
      name: string;
      totalQuantity: number;
      totalRevenue: number;
    }>;
  };
  bookingFunnel: {
    totalCreated: number;
    paidCount: number;
    confirmedCount: number;
    arrivedCount: number;
    completedCount: number;
    expiredCount: number;
    cancelledCount: number;
    facilityFaultCancelCount: number;
    overdueCount: number;
    overallConversionRate: number;
  };
  warehouseTraffic: {
    accessSchedules: {
      totalScheduled: number;
      completedCount: number;
      noShowCount: number;
      cancelledCount: number;
      totalVisitors: number;
      completionRate: number;
    };
    inventoryMovements: {
      inboundCount: number;
      inboundQuantity: number;
      outboundCount: number;
      outboundQuantity: number;
      moveCount: number;
      adjustCount: number;
    };
  };
}

// ==========================================
// 6. AI RAG PROFIT ADVISOR & EVALUATION
// ==========================================
export const ragChunkCitationSchema = z.object({
  chunkId: z.string(),
  category: z.nativeEnum(RagChunkTypeEnum),
  title: z.string(),
  excerpt: z.string(),
  relevanceScore: z.number(),
});

export const aiRecommendationItemSchema = z.object({
  id: z.string(),
  category: z.nativeEnum(AiInsightCategoryEnum),
  priority: z.nativeEnum(AiInsightPriorityEnum),
  title: z.string(),
  dataEvidence: z.string(),
  actionSteps: z.array(z.string()),
  expectedProfitImpact: z.string(),
  estimatedImpactVnd: z.number().int().nonnegative(),
  targetFacilityCodes: z.array(z.string()),
});

export const ragOpportunityMetricsSchema = z.object({
  recoverableOverdueVnd: z.number().int().nonnegative(),
  maintenanceRevenueLossVnd: z.number().int().nonnegative(),
  idleCapacityOpportunityVnd: z.number().int().nonnegative(),
  totalOpportunityVnd: z.number().int().nonnegative(),
});

export const ragAdvisorResponseSchema = z.object({
  period: z.object({
    fromDate: z.string(),
    toDate: z.string(),
    scopedFacilityId: z.string().nullable(),
    focusArea: z.nativeEnum(AiInsightFocusAreaEnum),
  }),
  queryInfo: z.object({
    question: z.string(),
    normalizedQuestion: z.string(),
    groundingStatus: z.nativeEnum(RagGroundingStatusEnum),
    router: z.object({
      complexity: z.nativeEnum(RagQueryComplexityEnum),
      selectedModel: z.string(),
      provider: z.nativeEnum(AiAdvisorProviderEnum),
      reason: z.string(),
    }),
    cached: z.boolean(),
    generatedAt: z.string(),
  }),
  answer: z.string(),
  opportunityMetrics: ragOpportunityMetricsSchema,
  recommendations: z.array(aiRecommendationItemSchema),
  citations: z.array(ragChunkCitationSchema),
  retrievedChunkIds: z.array(z.string()),
});

export interface RagChunkCitation {
  chunkId: string;
  category: RagChunkTypeEnum;
  title: string;
  excerpt: string;
  relevanceScore: number;
}

export interface AiRecommendationItem {
  id: string;
  category: AiInsightCategoryEnum;
  priority: AiInsightPriorityEnum;
  title: string;
  dataEvidence: string;
  actionSteps: string[];
  expectedProfitImpact: string;
  estimatedImpactVnd: number;
  targetFacilityCodes: string[];
}

export interface RagOpportunityMetrics {
  recoverableOverdueVnd: number;
  maintenanceRevenueLossVnd: number;
  idleCapacityOpportunityVnd: number;
  totalOpportunityVnd: number;
}

export interface RagAdvisorResponse {
  period: {
    fromDate: string;
    toDate: string;
    scopedFacilityId: string | null;
    focusArea: AiInsightFocusAreaEnum;
  };
  queryInfo: {
    question: string;
    normalizedQuestion: string;
    groundingStatus: RagGroundingStatusEnum;
    router: {
      complexity: RagQueryComplexityEnum;
      selectedModel: string;
      provider: AiAdvisorProviderEnum;
      reason: string;
    };
    cached: boolean;
    generatedAt: string;
  };
  answer: string;
  opportunityMetrics: RagOpportunityMetrics;
  recommendations: AiRecommendationItem[];
  citations: RagChunkCitation[];
  retrievedChunkIds: string[];
}

export const ragEvalCaseResultSchema = z.object({
  caseId: z.string(),
  category: z.string(),
  question: z.string(),
  expectedComplexity: z.nativeEnum(RagQueryComplexityEnum),
  actualComplexity: z.nativeEnum(RagQueryComplexityEnum),
  expectedGroundingStatus: z.nativeEnum(RagGroundingStatusEnum),
  actualGroundingStatus: z.nativeEnum(RagGroundingStatusEnum),
  expectedChunkIds: z.array(z.string()),
  retrievedChunkIds: z.array(z.string()),
  retrievalHit: z.boolean(),
  citationFaithful: z.boolean(),
  routerMatched: z.boolean(),
  guardrailPassed: z.boolean(),
  passed: z.boolean(),
});

export const ragEvalResponseSchema = z.object({
  summary: z.object({
    totalCases: z.number().int().nonnegative(),
    passedCases: z.number().int().nonnegative(),
    retrievalHitRatePercent: z.number(),
    citationFaithfulnessPercent: z.number(),
    routerAccuracyPercent: z.number(),
    guardrailDefenseRatePercent: z.number(),
    overallPassRatePercent: z.number(),
    evaluatedAt: z.string(),
  }),
  cases: z.array(ragEvalCaseResultSchema),
});

export interface RagEvalCaseResult {
  caseId: string;
  category: string;
  question: string;
  expectedComplexity: RagQueryComplexityEnum;
  actualComplexity: RagQueryComplexityEnum;
  expectedGroundingStatus: RagGroundingStatusEnum;
  actualGroundingStatus: RagGroundingStatusEnum;
  expectedChunkIds: string[];
  retrievedChunkIds: string[];
  retrievalHit: boolean;
  citationFaithful: boolean;
  routerMatched: boolean;
  guardrailPassed: boolean;
  passed: boolean;
}

export interface RagEvalResponse {
  summary: {
    totalCases: number;
    passedCases: number;
    retrievalHitRatePercent: number;
    citationFaithfulnessPercent: number;
    routerAccuracyPercent: number;
    guardrailDefenseRatePercent: number;
    overallPassRatePercent: number;
    evaluatedAt: string;
  };
  cases: RagEvalCaseResult[];
}
