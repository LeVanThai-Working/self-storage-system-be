import { Types } from 'mongoose';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { RoleEnum, UserStatusEnum } from '../../common/enums/user.enum.ts';
import {
  StatisticsGranularityEnum,
  FacilityKpiTierEnum,
  FacilityKpiSortByEnum,
  AiInsightFocusAreaEnum,
  RagGroundingStatusEnum,
  AiAdvisorProviderEnum,
} from '../../common/enums/statistics.enum.ts';
import { InvoiceItemTypeEnum } from '../../common/enums/billing.enum.ts';
import { PaymentMethodEnum } from '../../common/enums/payment.enum.ts';
import { RackZoneEnum } from '../../common/enums/storageRack.enum.ts';
import { MovementTypeEnum } from '../../common/enums/customerInventory.enum.ts';
import {
  startOfDayVN,
  endOfDayVN,
  addDays,
  getVNDateString,
} from '../../utils/date.util.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import { getStatisticsConfig } from '../../config/statistics.config.ts';
import { getRefundConfig } from '../../config/refund.config.ts';
import type { StatisticsRepository } from './statistics.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type {
  StatisticsBaseQuery,
  RentalTrendsQuery,
  FacilitiesKpiQuery,
  FinancialAnalyticsQuery,
  RagAdvisorRequest,
} from './schemas/statistics.request.schema.ts';
import {
  overviewStatisticsResponseSchema,
  rentalTrendsResponseSchema,
  facilitiesKpiResponseSchema,
  financialAnalyticsResponseSchema,
  productAndOperationsResponseSchema,
  ragAdvisorResponseSchema,
  ragEvalResponseSchema,
  type OverviewStatisticsResponse,
  type RentalTrendsResponse,
  type RentalTrendPoint,
  type DayOfWeekItem,
  type FacilitiesKpiResponse,
  type FacilityKpiItem,
  type FinancialAnalyticsResponse,
  type ProductAndOperationsResponse,
  type RagAdvisorResponse,
  type RagEvalResponse,
} from './schemas/statistics.response.schema.ts';
import {
  normalizeQuestionForCache,
  buildRagCacheKey,
  inspectQuerySafetyAndScope,
  assertQuestionFacilityScope,
  routeQueryComplexity,
  computeProfitOpportunityMetrics,
  buildKnowledgeChunks,
  retrieveTopKChunks,
  generateGroundedRagResponse,
  runRagEvaluationSuite,
} from './services/statisticsRagEngine.util.ts';

export interface RagRedisCacheClient {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
}

const DAY_NAMES_VN: Record<number, string> = {
  1: 'Chủ Nhật',
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy',
};

const DURATION_BUCKET_LABELS: Record<string, string> = {
  short_term_lte_14d: 'Ngắn hạn (<= 14 ngày)',
  '1_month': '1 tháng',
  '2_to_3_months': '2 - 3 tháng',
  '4_to_6_months': '4 - 6 tháng',
  long_term_gt_6m: 'Dài hạn (> 6 tháng)',
};

export function roundRate(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Number(val.toFixed(2));
}

export function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0 || numerator <= 0) return 0;
  return roundRate((numerator / denominator) * 100);
}

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return roundRate(Math.max(0, Math.min(100, score)));
}

export class StatisticsService {
  constructor(
    private readonly statisticsRepository: StatisticsRepository,
    private readonly userRepository: UserRepository,
    private readonly facilityRepository: FacilityRepository,
    private readonly redisClient?: RagRedisCacheClient | null
  ) {}

  private async resolveAndAuthorizeScope(
    callerId: string,
    requestedFacilityId?: string
  ): Promise<{
    scopedFacilityId: string | null;
    facilityObjectIds: Types.ObjectId[] | undefined;
    callerRole: RoleEnum;
  }> {
    const caller = await this.userRepository.findById(callerId);
    if (!caller) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    if (caller.status !== UserStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['User Account']);
    }

    const role = caller.role as RoleEnum;

    if (
      role === RoleEnum.BUSINESS_OPS_MANAGER ||
      role === RoleEnum.SYSTEM_ADMIN
    ) {
      if (requestedFacilityId) {
        const facility =
          await this.facilityRepository.findById(requestedFacilityId);
        if (!facility) {
          throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
        }
        return {
          scopedFacilityId: facility._id.toString(),
          facilityObjectIds: [new Types.ObjectId(facility._id.toString())],
          callerRole: role,
        };
      }
      return {
        scopedFacilityId: null,
        facilityObjectIds: undefined,
        callerRole: role,
      };
    }

    if (role === RoleEnum.FACILITY_MANAGER) {
      let assignedId = caller.assignedFacilityId
        ? caller.assignedFacilityId.toString()
        : null;

      if (!assignedId) {
        const managedFacility =
          await this.facilityRepository.findByManagerId(callerId);
        if (managedFacility) {
          assignedId = managedFacility._id.toString();
        }
      }

      if (!assignedId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }

      if (requestedFacilityId && requestedFacilityId !== assignedId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, [
          'Facility Statistics',
        ]);
      }

      return {
        scopedFacilityId: assignedId,
        facilityObjectIds: [new Types.ObjectId(assignedId)],
        callerRole: role,
      };
    }

    throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
  }

  private resolveDateRange(
    fromDateStr?: string,
    toDateStr?: string
  ): {
    fromDate: Date;
    toDate: Date;
    prevFromDate: Date;
    prevToDate: Date;
    fromDateVN: string;
    toDateVN: string;
  } {
    const config = getStatisticsConfig();
    const now = new Date();

    const toDate = toDateStr ? endOfDayVN(toDateStr) : endOfDayVN(now);
    const fromDate = fromDateStr
      ? startOfDayVN(fromDateStr)
      : startOfDayVN(addDays(toDate, -(config.defaultRangeDays - 1)));

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime()) ||
      fromDate.getTime() > toDate.getTime()
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_820);
    }

    const spanMs = toDate.getTime() - fromDate.getTime();
    const spanDays = Math.ceil(spanMs / (24 * 60 * 60 * 1000));
    if (spanDays > config.maxRangeDays) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_820);
    }

    const prevToDate = new Date(fromDate.getTime() - 1);
    const prevFromDate = new Date(prevToDate.getTime() - spanMs);

    return {
      fromDate,
      toDate,
      prevFromDate,
      prevToDate,
      fromDateVN: getVNDateString(fromDate),
      toDateVN: getVNDateString(toDate),
    };
  }

  async getOverview(
    callerId: string,
    query: StatisticsBaseQuery
  ): Promise<OverviewStatisticsResponse> {
    const { scopedFacilityId, facilityObjectIds } =
      await this.resolveAndAuthorizeScope(callerId, query.facilityId);
    const { fromDate, toDate, prevFromDate, prevToDate, fromDateVN, toDateVN } =
      this.resolveDateRange(query.fromDate, query.toDate);

    const refundConfig = getRefundConfig();

    const [
      activeFacilities,
      unitRows,
      rackRows,
      currentPaymentRows,
      prevPaymentRows,
      refundRows,
      contractSnapshotRows,
      overdueInvoiceRows,
      reservationRows,
      actionRequired,
    ] = await Promise.all([
      this.statisticsRepository.findFacilitiesForStats({
        facilityIds: facilityObjectIds,
        onlyActive: true,
      }),
      this.statisticsRepository.getStorageUnitStatsByFacility(
        facilityObjectIds
      ),
      this.statisticsRepository.getStorageRackStatsByFacility(
        facilityObjectIds
      ),
      this.statisticsRepository.getPaymentStatsInPeriodByFacility(
        fromDate,
        toDate,
        facilityObjectIds
      ),
      this.statisticsRepository.getPaymentStatsInPeriodByFacility(
        prevFromDate,
        prevToDate,
        facilityObjectIds
      ),
      this.statisticsRepository.getRefundStatsInPeriodByFacility(
        fromDate,
        toDate,
        facilityObjectIds
      ),
      this.statisticsRepository.getContractSnapshotByFacility(
        facilityObjectIds
      ),
      this.statisticsRepository.getAllUnpaidOverdueReceivablesByFacility(
        facilityObjectIds
      ),
      this.statisticsRepository.getReservationKpiStatsByFacility(
        fromDate,
        toDate,
        facilityObjectIds
      ),
      this.statisticsRepository.getActionRequiredCounts(
        refundConfig.opsApprovalThreshold,
        facilityObjectIds
      ),
    ]);

    const unitTotals = unitRows.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.available += r.available;
        acc.occupied += r.occupied;
        acc.reserved += r.reserved;
        acc.underMaintenance += r.underMaintenance;
        acc.pendingClearance += r.pendingClearance;
        acc.inactive += r.inactive;
        acc.totalAreaM2 += r.totalAreaM2;
        acc.occupiedAreaM2 += r.occupiedAreaM2;
        return acc;
      },
      {
        total: 0,
        available: 0,
        occupied: 0,
        reserved: 0,
        underMaintenance: 0,
        pendingClearance: 0,
        inactive: 0,
        totalAreaM2: 0,
        occupiedAreaM2: 0,
      }
    );

    const activeUnitCount = unitTotals.total - unitTotals.inactive;
    const unitOccupancyRate = safeRate(
      unitTotals.occupied + unitTotals.reserved,
      activeUnitCount
    );
    const areaOccupancyRate = safeRate(
      unitTotals.occupiedAreaM2,
      unitTotals.totalAreaM2
    );

    const rackTotals = rackRows.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.available += r.available;
        acc.rented += r.rented;
        acc.reserved += r.reserved;
        acc.maintenance += r.maintenance;
        acc.inactive += r.inactive;
        return acc;
      },
      {
        total: 0,
        available: 0,
        rented: 0,
        reserved: 0,
        maintenance: 0,
        inactive: 0,
      }
    );

    const activeRackCount = rackTotals.total - rackTotals.inactive;
    const rackOccupancyRate = safeRate(
      rackTotals.rented + rackTotals.reserved,
      activeRackCount
    );

    const collectedRevenue = Math.round(
      currentPaymentRows.reduce((sum, r) => sum + r.collectedAmount, 0)
    );
    const previousPeriodCollectedRevenue = Math.round(
      prevPaymentRows.reduce((sum, r) => sum + r.collectedAmount, 0)
    );
    const revenueGrowthPercent =
      previousPeriodCollectedRevenue > 0
        ? roundRate(
            ((collectedRevenue - previousPeriodCollectedRevenue) /
              previousPeriodCollectedRevenue) *
              100
          )
        : collectedRevenue > 0
          ? 100
          : 0;

    const refundedAmount = Math.round(
      refundRows.reduce((sum, r) => sum + r.refundedAmount, 0)
    );
    const netRevenue = Math.round(collectedRevenue - refundedAmount);

    const activeContracts = contractSnapshotRows.reduce(
      (sum, r) => sum + r.activeCount,
      0
    );
    const overdueContracts = contractSnapshotRows.reduce(
      (sum, r) => sum + r.overdueCount,
      0
    );
    const heldDeposits = Math.round(
      contractSnapshotRows.reduce((sum, r) => sum + r.heldDeposits, 0)
    );
    const overdueReceivables = Math.round(
      overdueInvoiceRows.reduce((sum, r) => sum + r.overdueReceivables, 0)
    );

    const newReservationsInPeriod = reservationRows.reduce(
      (sum, r) => sum + r.totalCreated,
      0
    );
    const completedReservationsInPeriod = reservationRows.reduce(
      (sum, r) => sum + r.completedCount,
      0
    );
    const forfeitedAmount = Math.round(
      contractSnapshotRows.reduce((sum, r) => sum + r.forfeitedAmount, 0) +
        reservationRows.reduce((sum, r) => sum + r.forfeitedAmount, 0)
    );

    const responseData: OverviewStatisticsResponse = {
      period: {
        fromDate: fromDateVN,
        toDate: toDateVN,
        scopedFacilityId,
      },
      facilities: {
        totalActive: activeFacilities.length,
      },
      occupancy: {
        storageUnits: {
          total: unitTotals.total,
          available: unitTotals.available,
          occupied: unitTotals.occupied,
          reserved: unitTotals.reserved,
          underMaintenance: unitTotals.underMaintenance,
          pendingClearance: unitTotals.pendingClearance,
          inactive: unitTotals.inactive,
          occupancyRate: unitOccupancyRate,
          areaOccupancyRate,
          totalAreaM2: roundRate(unitTotals.totalAreaM2),
          occupiedAreaM2: roundRate(unitTotals.occupiedAreaM2),
        },
        storageRacks: {
          total: rackTotals.total,
          available: rackTotals.available,
          rented: rackTotals.rented,
          reserved: rackTotals.reserved,
          maintenance: rackTotals.maintenance,
          inactive: rackTotals.inactive,
          occupancyRate: rackOccupancyRate,
        },
      },
      financials: {
        collectedRevenue,
        previousPeriodCollectedRevenue,
        revenueGrowthPercent,
        refundedAmount,
        netRevenue,
        heldDeposits,
        overdueReceivables,
        forfeitedAmount,
      },
      contractsAndBookings: {
        activeContracts,
        overdueContracts,
        newReservationsInPeriod,
        completedReservationsInPeriod,
      },
      actionRequired,
    };

    return validateResponse(overviewStatisticsResponseSchema, responseData);
  }

  async getRentalTrends(
    callerId: string,
    query: RentalTrendsQuery
  ): Promise<RentalTrendsResponse> {
    const { scopedFacilityId, facilityObjectIds } =
      await this.resolveAndAuthorizeScope(callerId, query.facilityId);
    const { fromDate, toDate, fromDateVN, toDateVN } = this.resolveDateRange(
      query.fromDate,
      query.toDate
    );
    const granularity = query.granularity ?? StatisticsGranularityEnum.DAY;
    const config = getStatisticsConfig();

    const raw = await this.statisticsRepository.getRentalTrendsAggregations(
      fromDate,
      toDate,
      granularity,
      facilityObjectIds
    );

    // 1. Merge Time Series buckets
    const periodKeys = new Set<string>();
    for (const r of raw.reservationsByPeriod) periodKeys.add(r._id);
    for (const r of raw.checkInsByPeriod) periodKeys.add(r._id);
    for (const r of raw.checkOutsByPeriod) periodKeys.add(r._id);
    for (const r of raw.paymentsByPeriod) periodKeys.add(r._id);

    const resMap = new Map(raw.reservationsByPeriod.map((r) => [r._id, r]));
    const checkInMap = new Map(
      raw.checkInsByPeriod.map((r) => [r._id, r.contractsCheckedIn])
    );
    const checkOutMap = new Map(
      raw.checkOutsByPeriod.map((r) => [r._id, r.contractsEnded])
    );
    const payMap = new Map(
      raw.paymentsByPeriod.map((r) => [r._id, r.collectedRevenue])
    );

    const sortedPeriods = Array.from(periodKeys).sort();
    const totalResInSeries = raw.reservationsByPeriod.reduce(
      (sum, r) => sum + r.reservationsCreated,
      0
    );
    const avgResPerPeriod =
      sortedPeriods.length > 0
        ? roundRate(totalResInSeries / sortedPeriods.length)
        : 0;

    const timeSeries: RentalTrendPoint[] = sortedPeriods.map((period) => {
      const resRow = resMap.get(period);
      const reservationsCreated = resRow?.reservationsCreated ?? 0;
      const varianceFromAvgPercent =
        avgResPerPeriod > 0
          ? roundRate(
              ((reservationsCreated - avgResPerPeriod) / avgResPerPeriod) * 100
            )
          : 0;

      return {
        period,
        reservationsCreated,
        completedReservations: resRow?.completedReservations ?? 0,
        cancelledReservations: resRow?.cancelledReservations ?? 0,
        contractsCheckedIn: checkInMap.get(period) ?? 0,
        contractsEnded: checkOutMap.get(period) ?? 0,
        collectedRevenue: Math.round(payMap.get(period) ?? 0),
        varianceFromAvgPercent,
      };
    });

    // 2. Peak & Low Periods analysis
    const sortedByDemandDesc = [...timeSeries].sort(
      (a, b) =>
        b.reservationsCreated - a.reservationsCreated ||
        b.contractsCheckedIn - a.contractsCheckedIn
    );
    const sortedByDemandAsc = [...timeSeries].sort(
      (a, b) =>
        a.reservationsCreated - b.reservationsCreated ||
        a.contractsCheckedIn - b.contractsCheckedIn
    );

    const peakPeriods = sortedByDemandDesc.slice(0, config.topPeakLowCount);
    const lowPeriods = sortedByDemandAsc.slice(0, config.topPeakLowCount);

    // 3. Day of Week Distribution (1 = Sunday ... 7 = Saturday)
    const dowResMap = new Map(
      raw.reservationsByDayOfWeek.map((r) => [r._id, r.count])
    );
    const dowCheckInMap = new Map(
      raw.checkInsByDayOfWeek.map((r) => [r._id, r.count])
    );
    const dowAccessMap = new Map(
      raw.accessByDayOfWeek.map((r) => [r._id, r.count])
    );

    const dayOfWeekItems: DayOfWeekItem[] = [2, 3, 4, 5, 6, 7, 1].map((dow) => {
      const reservationsCreated = dowResMap.get(dow) ?? 0;
      const contractsCheckedIn = dowCheckInMap.get(dow) ?? 0;
      const accessSchedulesCount = dowAccessMap.get(dow) ?? 0;
      return {
        dayOfWeek: dow,
        dayName: DAY_NAMES_VN[dow] ?? `Day ${dow}`,
        reservationsCreated,
        contractsCheckedIn,
        accessSchedulesCount,
        totalActivity:
          reservationsCreated + contractsCheckedIn + accessSchedulesCount,
      };
    });

    const activeDowItems = dayOfWeekItems.filter((d) => d.totalActivity > 0);
    const busiestDay =
      activeDowItems.length > 0
        ? [...dayOfWeekItems].sort(
            (a, b) => b.totalActivity - a.totalActivity
          )[0]
        : null;
    const quietestDay =
      dayOfWeekItems.length > 0
        ? [...dayOfWeekItems].sort(
            (a, b) => a.totalActivity - b.totalActivity
          )[0]
        : null;

    // 4. Time-Slot Demand
    const slotKeys = new Set<string>();
    for (const r of raw.reservationsByTimeSlot) {
      if (r._id) slotKeys.add(r._id);
    }
    for (const a of raw.accessByTimeSlot) {
      if (a._id) slotKeys.add(a._id);
    }
    const slotCapMap = new Map<string, number>();
    for (const ts of raw.activeTimeSlots) {
      const key = `${ts.startTime} - ${ts.endTime}`;
      slotKeys.add(key);
      slotCapMap.set(key, (slotCapMap.get(key) ?? 0) + ts.maxCapacity);
    }

    const resSlotMap = new Map(
      raw.reservationsByTimeSlot.map((r) => [r._id, r])
    );
    const accSlotMap = new Map(
      raw.accessByTimeSlot.map((a) => [a._id, a.scheduleCount])
    );

    const rawTimeSlotItems = Array.from(slotKeys).map((slotKey) => {
      const resInfo = resSlotMap.get(slotKey);
      const reservationCount = resInfo?.reservationCount ?? 0;
      const completedReservationCount = resInfo?.completedCount ?? 0;
      const accessScheduleCount = accSlotMap.get(slotKey) ?? 0;
      const totalDemandCount = reservationCount + accessScheduleCount;
      const configuredMaxCapacityPerDay = slotCapMap.get(slotKey) ?? 0;
      return {
        timeSlot: slotKey,
        reservationCount,
        completedReservationCount,
        accessScheduleCount,
        totalDemandCount,
        configuredMaxCapacityPerDay,
        demandSharePercent: 0,
      };
    });

    const totalSlotDemand = rawTimeSlotItems.reduce(
      (sum, i) => sum + i.totalDemandCount,
      0
    );
    const timeSlotDemand = rawTimeSlotItems
      .map((item) => ({
        ...item,
        demandSharePercent: safeRate(item.totalDemandCount, totalSlotDemand),
      }))
      .sort((a, b) => b.totalDemandCount - a.totalDemandCount);

    // 5. Hour of Day Distribution (0..23)
    const hourMap = new Map(
      raw.reservationsByHour.map((r) => [r._id, r.reservationCount])
    );
    const hourOfDayDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      reservationCount: hourMap.get(hour) ?? 0,
    }));

    // 6. Duration & Billing Unit Breakdown
    const totalResByUnit = raw.reservationsByBillingUnit.reduce(
      (sum, r) => sum + r.reservationCount,
      0
    );
    const byBillingUnit = raw.reservationsByBillingUnit.map((r) => ({
      billingUnit: r._id,
      reservationCount: r.reservationCount,
      sharePercent: safeRate(r.reservationCount, totalResByUnit),
      totalDepositAmount: Math.round(r.totalDepositAmount),
    }));

    const durationOrder = [
      'short_term_lte_14d',
      '1_month',
      '2_to_3_months',
      '4_to_6_months',
      'long_term_gt_6m',
    ];
    const durationMap = new Map(
      raw.reservationsByDurationBucket.map((r) => [r._id, r.reservationCount])
    );
    const byDurationBucket = durationOrder.map((bucket) => {
      const reservationCount = durationMap.get(bucket) ?? 0;
      return {
        bucket,
        label: DURATION_BUCKET_LABELS[bucket] ?? bucket,
        reservationCount,
        sharePercent: safeRate(reservationCount, totalResByUnit),
      };
    });

    const responseData: RentalTrendsResponse = {
      period: {
        fromDate: fromDateVN,
        toDate: toDateVN,
        granularity,
        scopedFacilityId,
      },
      timeSeries,
      peakAndLowAnalysis: {
        averageReservationsPerPeriod: avgResPerPeriod,
        peakPeriods,
        lowPeriods,
      },
      dayOfWeekDistribution: {
        busiestDay,
        quietestDay,
        items: dayOfWeekItems,
      },
      timeSlotDemand,
      hourOfDayDistribution,
      durationBreakdown: {
        byBillingUnit,
        byDurationBucket,
      },
    };

    return validateResponse(rentalTrendsResponseSchema, responseData);
  }

  async getFacilitiesKpi(
    callerId: string,
    query: FacilitiesKpiQuery
  ): Promise<FacilitiesKpiResponse> {
    const { scopedFacilityId, facilityObjectIds } =
      await this.resolveAndAuthorizeScope(callerId, query.facilityId);
    const { fromDate, toDate, fromDateVN, toDateVN } = this.resolveDateRange(
      query.fromDate,
      query.toDate
    );
    const config = getStatisticsConfig();

    const facilities = await this.statisticsRepository.findFacilitiesForStats({
      facilityIds: facilityObjectIds,
      city: query.city,
    });

    const targetFacilityIds = facilities.map(
      (f) => new Types.ObjectId(f._id.toString())
    );

    const [
      unitRows,
      rackRows,
      paymentRows,
      refundRows,
      contractSnapshotRows,
      contractPeriodRows,
      invoiceRows,
      reservationRows,
      incidentSupportMap,
    ] = await Promise.all([
      this.statisticsRepository.getStorageUnitStatsByFacility(
        targetFacilityIds
      ),
      this.statisticsRepository.getStorageRackStatsByFacility(
        targetFacilityIds
      ),
      this.statisticsRepository.getPaymentStatsInPeriodByFacility(
        fromDate,
        toDate,
        targetFacilityIds
      ),
      this.statisticsRepository.getRefundStatsInPeriodByFacility(
        fromDate,
        toDate,
        targetFacilityIds
      ),
      this.statisticsRepository.getContractSnapshotByFacility(
        targetFacilityIds
      ),
      this.statisticsRepository.getContractPeriodStatsByFacility(
        fromDate,
        toDate,
        targetFacilityIds
      ),
      this.statisticsRepository.getInvoiceStatsByFacility(
        fromDate,
        toDate,
        targetFacilityIds
      ),
      this.statisticsRepository.getReservationKpiStatsByFacility(
        fromDate,
        toDate,
        targetFacilityIds
      ),
      this.statisticsRepository.getIncidentAndSupportKpiStatsByFacility(
        fromDate,
        toDate,
        targetFacilityIds
      ),
    ]);

    const unitMap = new Map(unitRows.map((r) => [r._id.toString(), r]));
    const rackMap = new Map(rackRows.map((r) => [r._id.toString(), r]));
    const payMap = new Map(paymentRows.map((r) => [r._id.toString(), r]));
    const refMap = new Map(refundRows.map((r) => [r._id.toString(), r]));
    const ctrSnapMap = new Map(
      contractSnapshotRows.map((r) => [r._id.toString(), r])
    );
    const ctrPeriodMap = new Map(
      contractPeriodRows.map((r) => [r._id.toString(), r])
    );
    const invMap = new Map(invoiceRows.map((r) => [r._id.toString(), r]));
    const resMap = new Map(reservationRows.map((r) => [r._id.toString(), r]));

    const rawKpiItems: FacilityKpiItem[] = facilities.map((facility) => {
      const fid = facility._id.toString();
      const u = unitMap.get(fid);
      const rk = rackMap.get(fid);
      const pay = payMap.get(fid);
      const ref = refMap.get(fid);
      const ctrSnap = ctrSnapMap.get(fid);
      const ctrPer = ctrPeriodMap.get(fid);
      const inv = invMap.get(fid);
      const res = resMap.get(fid);
      const incSup = incidentSupportMap.get(fid);

      // 1. Occupancy Metrics
      const totalActiveUnits = (u?.total ?? 0) - (u?.inactive ?? 0);
      const occupiedOrReservedUnits = (u?.occupied ?? 0) + (u?.reserved ?? 0);
      const maintenanceOrClearanceUnits =
        (u?.underMaintenance ?? 0) + (u?.pendingClearance ?? 0);
      const unitOccupancyRate = safeRate(
        occupiedOrReservedUnits,
        totalActiveUnits
      );
      const maintenanceDragRate = safeRate(
        maintenanceOrClearanceUnits,
        totalActiveUnits
      );

      const totalActiveRacks = (rk?.total ?? 0) - (rk?.inactive ?? 0);
      const rentedOrReservedRacks = (rk?.rented ?? 0) + (rk?.reserved ?? 0);
      const rackOccupancyRate = safeRate(
        rentedOrReservedRacks,
        totalActiveRacks
      );
      const areaOccupancyRate = safeRate(
        u?.occupiedAreaM2 ?? 0,
        u?.totalAreaM2 ?? 0
      );

      const effectiveOccupancyRate =
        totalActiveRacks > 0
          ? roundRate(unitOccupancyRate * 0.7 + rackOccupancyRate * 0.3)
          : unitOccupancyRate;

      const maintenancePenalty =
        maintenanceDragRate > config.kpiTargets.maxAcceptableMaintenanceDragRate
          ? (maintenanceDragRate -
              config.kpiTargets.maxAcceptableMaintenanceDragRate) *
            0.5
          : 0;
      const occupancyScore = clampScore(
        (effectiveOccupancyRate / config.kpiTargets.targetOccupancyRate) * 100 -
          maintenancePenalty
      );

      // 2. Financial & Collection Metrics
      const collectedRevenue = Math.round(pay?.collectedAmount ?? 0);
      const refundedAmount = Math.round(ref?.refundedAmount ?? 0);
      const netRevenue = Math.round(collectedRevenue - refundedAmount);
      const revPAU =
        totalActiveUnits > 0 ? Math.round(netRevenue / totalActiveUnits) : 0;
      const revPAM =
        (u?.totalAreaM2 ?? 0) > 0
          ? Math.round(netRevenue / (u?.totalAreaM2 ?? 1))
          : 0;

      const invoicedAmount = Math.round(inv?.invoicedAmount ?? 0);
      const overdueAmount = Math.round(inv?.overdueAmount ?? 0);
      const invoiceCollectionRate =
        invoicedAmount > 0 ? safeRate(inv?.paidAmount ?? 0, invoicedAmount) : 0;

      const runningContracts =
        (ctrSnap?.activeCount ?? 0) + (ctrSnap?.overdueCount ?? 0);
      const overdueContractRate = safeRate(
        ctrSnap?.overdueCount ?? 0,
        runningContracts
      );

      const baseCollectionScore =
        invoicedAmount > 0
          ? invoiceCollectionRate
          : runningContracts > 0 && (ctrSnap?.overdueCount ?? 0) === 0
            ? 100
            : 50;
      const collectionScore = clampScore(
        baseCollectionScore - overdueContractRate * 0.5
      );

      // 3. Conversion & Retention Metrics
      const reservationsCreated = res?.totalCreated ?? 0;
      const reservationsPaid = res?.paidOrBeyondCount ?? 0;
      const reservationsCompleted = res?.completedCount ?? 0;
      const reservationConversionRate =
        reservationsPaid > 0
          ? safeRate(reservationsCompleted, reservationsPaid)
          : safeRate(reservationsCompleted, reservationsCreated);

      const contractsCreated = ctrPer?.totalCreated ?? 0;
      const walkInContracts = ctrPer?.walkInCount ?? 0;
      const walkInRatioPercent = safeRate(walkInContracts, contractsCreated);
      const renewedContracts = ctrPer?.renewedCount ?? 0;
      const renewalRate = safeRate(renewedContracts, contractsCreated);

      const conversionAndRetentionScore = clampScore(
        reservationConversionRate * 0.75 + Math.min(100, renewalRate * 2) * 0.25
      );

      // 4. Operational Quality & SLA Metrics
      const facilityFaultCount = res?.facilityFaultCount ?? 0;
      const totalIncidents = incSup?.totalIncidents ?? 0;
      const openIncidents = incSup?.openIncidents ?? 0;
      const facilityLiableIncidents = incSup?.facilityLiableIncidents ?? 0;
      const totalRepairCost = Math.round(incSup?.totalRepairCost ?? 0);
      const avgReservationConfirmMinutes =
        res?.avgConfirmMinutes != null
          ? roundRate(res.avgConfirmMinutes)
          : null;
      const avgIncidentResolveHours =
        incSup?.avgIncidentResolveHours != null
          ? roundRate(incSup.avgIncidentResolveHours)
          : null;
      const supportCompletionRate =
        (incSup?.totalSupportTickets ?? 0) > 0
          ? safeRate(
              incSup?.completedSupportTickets ?? 0,
              incSup?.totalSupportTickets ?? 0
            )
          : 100;

      const operationalQualityScore = clampScore(
        100 -
          facilityFaultCount *
            config.kpiTargets.facilityFaultPenaltyPerIncident -
          openIncidents * 10 -
          (100 - supportCompletionRate) * 0.2
      );

      // 5. Composite KPI Score & Tier
      const kpiScore = clampScore(
        occupancyScore * config.kpiWeights.occupancy +
          collectionScore * config.kpiWeights.collection +
          conversionAndRetentionScore *
            config.kpiWeights.conversionAndRetention +
          operationalQualityScore * config.kpiWeights.operationalQuality
      );

      let kpiTier = FacilityKpiTierEnum.NEEDS_IMPROVEMENT;
      if (kpiScore >= config.kpiTiers.excellentMin) {
        kpiTier = FacilityKpiTierEnum.EXCELLENT;
      } else if (kpiScore >= config.kpiTiers.goodMin) {
        kpiTier = FacilityKpiTierEnum.GOOD;
      } else if (kpiScore >= config.kpiTiers.averageMin) {
        kpiTier = FacilityKpiTierEnum.AVERAGE;
      }

      // 6. Actionable Alerts
      const alerts: string[] = [];
      if (unitOccupancyRate < config.kpiTargets.lowOccupancyAlertThreshold) {
        alerts.push(
          `Tỷ lệ lấp đầy phòng kho thấp (${unitOccupancyRate}% < ${config.kpiTargets.lowOccupancyAlertThreshold}%)`
        );
      }
      if (
        maintenanceDragRate > config.kpiTargets.maxAcceptableMaintenanceDragRate
      ) {
        alerts.push(
          `Tỷ lệ kho kẹt bảo trì/chờ thanh lý cao (${maintenanceDragRate}%)`
        );
      }
      if (facilityFaultCount > 0) {
        alerts.push(
          `Có ${facilityFaultCount} đơn đặt chỗ bị hủy do lỗi cơ sở (FACILITY_FAULT)`
        );
      }
      if (overdueAmount > 0 || (ctrSnap?.overdueCount ?? 0) > 0) {
        alerts.push(
          `Đang có nợ quá hạn cần thu hồi (${overdueAmount.toLocaleString('vi-VN')} VND)`
        );
      }
      if (openIncidents > 0) {
        alerts.push(`Đang có ${openIncidents} sự cố kho bãi chưa đóng`);
      }

      return {
        rank: 0,
        facility: {
          id: fid,
          code: facility.code ?? null,
          name: facility.name,
          city: facility.city,
          status: facility.status,
        },
        kpiScore,
        kpiTier,
        componentScores: {
          occupancyScore,
          collectionScore,
          conversionAndRetentionScore,
          operationalQualityScore,
        },
        occupancy: {
          totalActiveUnits,
          occupiedOrReservedUnits,
          maintenanceOrClearanceUnits,
          unitOccupancyRate,
          maintenanceDragRate,
          totalActiveRacks,
          rentedOrReservedRacks,
          rackOccupancyRate,
          areaOccupancyRate,
        },
        financial: {
          collectedRevenue,
          refundedAmount,
          netRevenue,
          revPAU,
          revPAM,
          invoicedAmount,
          overdueAmount,
          invoiceCollectionRate,
        },
        conversionAndRetention: {
          reservationsCreated,
          reservationsPaid,
          reservationsCompleted,
          reservationConversionRate,
          contractsCreated,
          walkInContracts,
          walkInRatioPercent,
          renewedContracts,
          renewalRate,
        },
        operations: {
          facilityFaultCount,
          totalIncidents,
          openIncidents,
          facilityLiableIncidents,
          totalRepairCost,
          avgReservationConfirmMinutes,
          avgIncidentResolveHours,
          supportCompletionRate,
        },
        alerts,
      };
    });

    // Always assign base rank by kpiScore descending first
    const rankedByScore = [...rawKpiItems].sort(
      (a, b) =>
        b.kpiScore - a.kpiScore ||
        b.financial.collectedRevenue - a.financial.collectedRevenue
    );
    rankedByScore.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    // Apply optional tier filter & custom sort
    const filteredItems = query.tier
      ? rankedByScore.filter((i) => i.kpiTier === query.tier)
      : rankedByScore;

    const sortBy = query.sortBy ?? FacilityKpiSortByEnum.KPI_SCORE;
    const sortDir = query.sortOrder === 'asc' ? 1 : -1;

    const sortedItems = [...filteredItems].sort((a, b) => {
      let valA: number;
      let valB: number;
      switch (sortBy) {
        case FacilityKpiSortByEnum.OCCUPANCY_RATE:
          valA = a.occupancy.unitOccupancyRate;
          valB = b.occupancy.unitOccupancyRate;
          break;
        case FacilityKpiSortByEnum.COLLECTED_REVENUE:
          valA = a.financial.collectedRevenue;
          valB = b.financial.collectedRevenue;
          break;
        case FacilityKpiSortByEnum.CONVERSION_RATE:
          valA = a.conversionAndRetention.reservationConversionRate;
          valB = b.conversionAndRetention.reservationConversionRate;
          break;
        case FacilityKpiSortByEnum.COLLECTION_RATE:
          valA = a.financial.invoiceCollectionRate;
          valB = b.financial.invoiceCollectionRate;
          break;
        default:
          valA = a.kpiScore;
          valB = b.kpiScore;
          break;
      }
      return (valA - valB) * sortDir;
    });

    const totalEvaluated = rankedByScore.length;
    const averageKpiScore =
      totalEvaluated > 0
        ? roundRate(
            rankedByScore.reduce((sum, i) => sum + i.kpiScore, 0) /
              totalEvaluated
          )
        : 0;

    const topPerformers = rankedByScore.slice(0, 3);
    const underperformers = [...rankedByScore]
      .filter(
        (i) =>
          i.kpiTier === FacilityKpiTierEnum.NEEDS_IMPROVEMENT ||
          i.kpiTier === FacilityKpiTierEnum.AVERAGE
      )
      .sort((a, b) => a.kpiScore - b.kpiScore)
      .slice(0, 3);

    const responseData: FacilitiesKpiResponse = {
      period: {
        fromDate: fromDateVN,
        toDate: toDateVN,
        scopedFacilityId,
      },
      summary: {
        totalFacilitiesEvaluated: totalEvaluated,
        averageKpiScore,
        excellentCount: rankedByScore.filter(
          (i) => i.kpiTier === FacilityKpiTierEnum.EXCELLENT
        ).length,
        goodCount: rankedByScore.filter(
          (i) => i.kpiTier === FacilityKpiTierEnum.GOOD
        ).length,
        averageCount: rankedByScore.filter(
          (i) => i.kpiTier === FacilityKpiTierEnum.AVERAGE
        ).length,
        needsImprovementCount: rankedByScore.filter(
          (i) => i.kpiTier === FacilityKpiTierEnum.NEEDS_IMPROVEMENT
        ).length,
      },
      highlights: {
        topPerformers,
        underperformers,
      },
      items: sortedItems,
    };

    return validateResponse(facilitiesKpiResponseSchema, responseData);
  }

  async getFinancialAnalytics(
    callerId: string,
    query: FinancialAnalyticsQuery
  ): Promise<FinancialAnalyticsResponse> {
    const { scopedFacilityId, facilityObjectIds } =
      await this.resolveAndAuthorizeScope(callerId, query.facilityId);
    const { fromDate, toDate, fromDateVN, toDateVN } = this.resolveDateRange(
      query.fromDate,
      query.toDate
    );
    const granularity = query.granularity ?? StatisticsGranularityEnum.DAY;

    const raw =
      await this.statisticsRepository.getFinancialAnalyticsAggregations(
        fromDate,
        toDate,
        granularity,
        facilityObjectIds
      );

    // 1. Revenue Time Series
    const periodKeys = new Set<string>();
    for (const r of raw.invoicedByPeriod) periodKeys.add(r._id);
    for (const r of raw.collectedByPeriod) periodKeys.add(r._id);
    for (const r of raw.refundedByPeriod) periodKeys.add(r._id);

    const invMap = new Map(
      raw.invoicedByPeriod.map((r) => [r._id, r.invoicedAmount])
    );
    const colMap = new Map(
      raw.collectedByPeriod.map((r) => [r._id, r.collectedAmount])
    );
    const refMap = new Map(
      raw.refundedByPeriod.map((r) => [r._id, r.refundedAmount])
    );

    const revenueTimeSeries = Array.from(periodKeys)
      .sort()
      .map((period) => {
        const invoicedAmount = Math.round(invMap.get(period) ?? 0);
        const collectedAmount = Math.round(colMap.get(period) ?? 0);
        const refundedAmount = Math.round(refMap.get(period) ?? 0);
        return {
          period,
          invoicedAmount,
          collectedAmount,
          refundedAmount,
          netCollectedAmount: Math.round(collectedAmount - refundedAmount),
        };
      });

    // 2. Revenue By Invoice Item Type
    const totalItemPaid = raw.revenueByItemType.reduce(
      (sum, r) => sum + r.paidAmount,
      0
    );
    const itemMap = new Map(raw.revenueByItemType.map((r) => [r._id, r]));
    const revenueByItemType = Object.values(InvoiceItemTypeEnum).map(
      (itemType) => {
        const row = itemMap.get(itemType);
        const invoicedAmount = Math.round(row?.invoicedAmount ?? 0);
        const paidAmount = Math.round(row?.paidAmount ?? 0);
        const itemCount = row?.itemCount ?? 0;
        return {
          itemType,
          invoicedAmount,
          paidAmount,
          itemCount,
          sharePercent: safeRate(paidAmount, totalItemPaid),
        };
      }
    );

    // 3. Payment Method Breakdown
    const totalMethodPaid = raw.paymentMethodRows.reduce(
      (sum, r) => sum + r.totalPaidAmount,
      0
    );
    const methodMap = new Map(raw.paymentMethodRows.map((r) => [r._id, r]));
    const paymentMethodBreakdown = Object.values(PaymentMethodEnum).map(
      (method) => {
        const row = methodMap.get(method);
        const totalPaidAmount = Math.round(row?.totalPaidAmount ?? 0);
        return {
          method,
          count: row?.count ?? 0,
          totalPaidAmount,
          sharePercent: safeRate(totalPaidAmount, totalMethodPaid),
        };
      }
    );

    // 4. SePay Reconciliation
    const sepayReconciliation = raw.sepayTxRows.map((r) => ({
      result: r._id,
      count: r.count,
      totalTransferAmount: Math.round(r.totalTransferAmount),
    }));

    // 5. Overdue Aging Buckets
    const agingBuckets: Record<
      string,
      { label: string; invoiceCount: number; overdueAmount: number }
    > = {
      '1_to_3_days': {
        label: 'Quá hạn 1 - 3 ngày',
        invoiceCount: 0,
        overdueAmount: 0,
      },
      '4_to_7_days': {
        label: 'Quá hạn 4 - 7 ngày',
        invoiceCount: 0,
        overdueAmount: 0,
      },
      '8_to_15_days': {
        label: 'Quá hạn 8 - 15 ngày',
        invoiceCount: 0,
        overdueAmount: 0,
      },
      over_15_days: {
        label: 'Nợ xấu (> 15 ngày)',
        invoiceCount: 0,
        overdueAmount: 0,
      },
    };

    let totalOverdueAmount = 0;
    for (const inv of raw.overdueInvoices) {
      const unpaid = Math.max(0, Math.round(inv.totalAmount - inv.paidAmount));
      totalOverdueAmount += unpaid;
      const daysOverdue = Math.max(
        1,
        Math.ceil(
          (raw.now.getTime() - new Date(inv.dueDate).getTime()) /
            (24 * 60 * 60 * 1000)
        )
      );
      if (daysOverdue <= 3) {
        agingBuckets['1_to_3_days'].invoiceCount += 1;
        agingBuckets['1_to_3_days'].overdueAmount += unpaid;
      } else if (daysOverdue <= 7) {
        agingBuckets['4_to_7_days'].invoiceCount += 1;
        agingBuckets['4_to_7_days'].overdueAmount += unpaid;
      } else if (daysOverdue <= 15) {
        agingBuckets['8_to_15_days'].invoiceCount += 1;
        agingBuckets['8_to_15_days'].overdueAmount += unpaid;
      } else {
        agingBuckets.over_15_days.invoiceCount += 1;
        agingBuckets.over_15_days.overdueAmount += unpaid;
      }
    }

    // 6. Refund Analytics
    const totalRefundRequests = raw.refundByReasonRows.reduce(
      (sum, r) => sum + r.count,
      0
    );
    const totalRefundRequestedAmount = Math.round(
      raw.refundByReasonRows.reduce((sum, r) => sum + r.totalAmount, 0)
    );
    const totalRefundPaidAmount = Math.round(
      raw.refundByReasonRows.reduce((sum, r) => sum + r.paidAmount, 0)
    );

    const responseData: FinancialAnalyticsResponse = {
      period: {
        fromDate: fromDateVN,
        toDate: toDateVN,
        granularity,
        scopedFacilityId,
      },
      revenueTimeSeries,
      revenueByItemType,
      paymentMethodBreakdown,
      sepayReconciliation,
      overdueAging: {
        totalOverdueInvoices: raw.overdueInvoices.length,
        totalOverdueAmount,
        buckets: Object.entries(agingBuckets).map(([bucket, data]) => ({
          bucket,
          label: data.label,
          invoiceCount: data.invoiceCount,
          overdueAmount: data.overdueAmount,
        })),
      },
      refundAnalytics: {
        totalRequests: totalRefundRequests,
        totalRequestedAmount: totalRefundRequestedAmount,
        totalPaidAmount: totalRefundPaidAmount,
        byReason: raw.refundByReasonRows.map((r) => ({
          reason: r._id,
          count: r.count,
          totalAmount: Math.round(r.totalAmount),
          paidAmount: Math.round(r.paidAmount),
        })),
      },
    };

    return validateResponse(financialAnalyticsResponseSchema, responseData);
  }

  async getProductAndOperations(
    callerId: string,
    query: StatisticsBaseQuery
  ): Promise<ProductAndOperationsResponse> {
    const { scopedFacilityId, facilityObjectIds } =
      await this.resolveAndAuthorizeScope(callerId, query.facilityId);
    const { fromDate, toDate, fromDateVN, toDateVN } = this.resolveDateRange(
      query.fromDate,
      query.toDate
    );

    const raw =
      await this.statisticsRepository.getProductAndOperationsAggregations(
        fromDate,
        toDate,
        facilityObjectIds
      );

    const unitTypeUnitsMap = new Map(
      raw.unitsByUnitType.map((u) => [u._id.toString(), u])
    );
    const unitTypeContractsMap = new Map(
      raw.contractsByUnitType
        .filter((c) => c._id)
        .map((c) => [c._id.toString(), c])
    );

    const unitTypePerformance = raw.unitTypes
      .map((ut) => {
        const uStats = unitTypeUnitsMap.get(ut.id);
        const cStats = unitTypeContractsMap.get(ut.id);
        const totalUnits = uStats?.totalUnits ?? 0;
        const availableUnits = uStats?.availableUnits ?? 0;
        const occupiedOrReservedUnits =
          (uStats?.occupiedUnits ?? 0) + (uStats?.reservedUnits ?? 0);
        const maintenanceUnits = uStats?.maintenanceUnits ?? 0;

        return {
          unitTypeId: ut.id,
          name: ut.name,
          category: ut.category,
          area: ut.area,
          totalUnits,
          availableUnits,
          occupiedOrReservedUnits,
          maintenanceUnits,
          occupancyRate: safeRate(occupiedOrReservedUnits, totalUnits),
          activeContractCount: cStats?.activeContractCount ?? 0,
          periodicRevenue: Math.round(cStats?.periodicRevenue ?? 0),
        };
      })
      .sort((a, b) => b.occupancyRate - a.occupancyRate);

    const rackZoneMap = new Map(raw.racksByZone.map((r) => [r._id, r]));
    const rackZonePerformance = Object.values(RackZoneEnum).map((zone) => {
      const z = rackZoneMap.get(zone);
      const totalRacks = z?.totalRacks ?? 0;
      const rentedRacks = z?.rentedRacks ?? 0;
      const reservedRacks = z?.reservedRacks ?? 0;
      return {
        zone,
        totalRacks,
        availableRacks: z?.availableRacks ?? 0,
        rentedRacks,
        reservedRacks,
        maintenanceRacks: z?.maintenanceRacks ?? 0,
        occupancyRate: safeRate(rentedRacks + reservedRacks, totalRacks),
      };
    });

    const amenityUtilizationRate = safeRate(
      raw.amenityOfferings.inUseQuantity,
      raw.amenityOfferings.totalQuantity
    );
    const contractAttachRate = safeRate(
      raw.contractAmenityStats.contractsWithAmenities,
      raw.contractAmenityStats.totalContracts
    );

    const movMap = new Map(raw.inventoryMovementRows.map((m) => [m._id, m]));

    const responseData: ProductAndOperationsResponse = {
      period: {
        fromDate: fromDateVN,
        toDate: toDateVN,
        scopedFacilityId,
      },
      unitTypePerformance,
      rackZonePerformance,
      amenityPerformance: {
        totalOfferings: raw.amenityOfferings.totalOfferings,
        totalQuantity: raw.amenityOfferings.totalQuantity,
        inUseQuantity: raw.amenityOfferings.inUseQuantity,
        utilizationRate: amenityUtilizationRate,
        contractAttachRate,
        topAmenities: raw.topAmenities.map((a) => ({
          amenityId: String(a._id),
          name: a.name,
          totalQuantity: a.totalQuantity,
          totalRevenue: Math.round(a.totalRevenue),
        })),
      },
      bookingFunnel: {
        totalCreated: raw.bookingFunnel.totalCreated,
        paidCount: raw.bookingFunnel.paidCount,
        confirmedCount: raw.bookingFunnel.confirmedCount,
        arrivedCount: raw.bookingFunnel.arrivedCount,
        completedCount: raw.bookingFunnel.completedCount,
        expiredCount: raw.bookingFunnel.expiredCount,
        cancelledCount: raw.bookingFunnel.cancelledCount,
        facilityFaultCancelCount: raw.bookingFunnel.facilityFaultCancelCount,
        overdueCount: raw.bookingFunnel.overdueCount,
        overallConversionRate: safeRate(
          raw.bookingFunnel.completedCount,
          raw.bookingFunnel.totalCreated
        ),
      },
      warehouseTraffic: {
        accessSchedules: {
          totalScheduled: raw.accessSchedules.totalScheduled,
          completedCount: raw.accessSchedules.completedCount,
          noShowCount: raw.accessSchedules.noShowCount,
          cancelledCount: raw.accessSchedules.cancelledCount,
          totalVisitors: raw.accessSchedules.totalVisitors,
          completionRate: safeRate(
            raw.accessSchedules.completedCount,
            raw.accessSchedules.totalScheduled
          ),
        },
        inventoryMovements: {
          inboundCount: movMap.get(MovementTypeEnum.IN)?.movementCount ?? 0,
          inboundQuantity: movMap.get(MovementTypeEnum.IN)?.totalQuantity ?? 0,
          outboundCount: movMap.get(MovementTypeEnum.OUT)?.movementCount ?? 0,
          outboundQuantity:
            movMap.get(MovementTypeEnum.OUT)?.totalQuantity ?? 0,
          moveCount: movMap.get(MovementTypeEnum.MOVE)?.movementCount ?? 0,
          adjustCount: movMap.get(MovementTypeEnum.ADJUST)?.movementCount ?? 0,
        },
      },
    };

    return validateResponse(productAndOperationsResponseSchema, responseData);
  }

  /**
   * 6. Trợ lý RAG Tư vấn Tối ưu hóa Lợi nhuận cho Ops & Quản lý Cơ sở (Pillar #1 -> #7)
   */
  async askRagAdvisor(
    callerId: string,
    body: RagAdvisorRequest
  ): Promise<RagAdvisorResponse> {
    const config = getStatisticsConfig();
    const focusArea = body.focusArea ?? AiInsightFocusAreaEnum.ALL;
    const topK = body.topK ?? config.ragAdvisor.topKChunks;
    const refresh = body.refresh === true;

    const { scopedFacilityId, callerRole } =
      await this.resolveAndAuthorizeScope(callerId, body.facilityId);

    // Chặn FACILITY_MANAGER hỏi số liệu mã chi nhánh khác trong văn bản câu hỏi (Rule 14)
    if (callerRole === RoleEnum.FACILITY_MANAGER && scopedFacilityId) {
      const allFacilitiesResult = await this.facilityRepository.findAll({
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const scopedFacility = allFacilitiesResult.items.find(
        (f) => f._id.toString() === scopedFacilityId
      );
      const allFacilityCodes = allFacilitiesResult.items
        .map((f) => f.code)
        .filter((c): c is string => Boolean(c));

      assertQuestionFacilityScope(
        body.question,
        scopedFacility?.code ?? null,
        allFacilityCodes
      );
    }

    const { fromDateVN, toDateVN } = this.resolveDateRange(
      body.fromDate,
      body.toDate
    );

    const normalizedQuestion = normalizeQuestionForCache(body.question);
    const safety = inspectQuerySafetyAndScope(body.question);
    const routerDecision = routeQueryComplexity(
      body.question,
      config.ragAdvisor
    );

    // Nếu câu hỏi ngoài phạm vi hoặc hỏi dữ liệu hệ thống không lưu trữ -> trả lời từ chối trung thực ngay lập tức
    if (safety.groundingStatus !== RagGroundingStatusEnum.GROUNDED) {
      const rejectedResponse: RagAdvisorResponse = {
        period: {
          fromDate: fromDateVN,
          toDate: toDateVN,
          scopedFacilityId,
          focusArea,
        },
        queryInfo: {
          question: body.question.trim(),
          normalizedQuestion,
          groundingStatus: safety.groundingStatus,
          router: {
            complexity: routerDecision.complexity,
            selectedModel: routerDecision.selectedModel,
            provider: AiAdvisorProviderEnum.GROUNDED_DETERMINISTIC_FALLBACK,
            reason: routerDecision.reason,
          },
          cached: false,
          generatedAt: new Date().toISOString(),
        },
        answer:
          safety.rejectionReason ??
          'Câu hỏi nằm ngoài phạm vi dữ liệu báo cáo thống kê của hệ thống.',
        opportunityMetrics: {
          recoverableOverdueVnd: 0,
          maintenanceRevenueLossVnd: 0,
          idleCapacityOpportunityVnd: 0,
          totalOpportunityVnd: 0,
        },
        recommendations: [],
        citations: [],
        retrievedChunkIds: [],
      };
      return validateResponse(ragAdvisorResponseSchema, rejectedResponse);
    }

    const cacheKey = buildRagCacheKey({
      scopedFacilityId,
      fromDate: fromDateVN,
      toDate: toDateVN,
      focusArea,
      normalizedQuestion,
    });

    if (!refresh && this.redisClient) {
      try {
        const cachedRaw = await this.redisClient.get(cacheKey);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as RagAdvisorResponse;
          parsed.queryInfo.cached = true;
          parsed.queryInfo.question = body.question.trim();
          return validateResponse(ragAdvisorResponseSchema, parsed);
        }
      } catch {
        // Bỏ qua lỗi đọc Redis để không gián đoạn luồng tư vấn
      }
    }

    const baseSubQuery: StatisticsBaseQuery = {
      fromDate: body.fromDate,
      toDate: body.toDate,
      facilityId: scopedFacilityId ?? undefined,
    };

    const [
      overview,
      rentalTrends,
      facilitiesKpi,
      financialAnalytics,
      productAndOperations,
    ] = await Promise.all([
      this.getOverview(callerId, baseSubQuery),
      this.getRentalTrends(callerId, {
        ...baseSubQuery,
        granularity: StatisticsGranularityEnum.MONTH,
      }),
      this.getFacilitiesKpi(callerId, {
        ...baseSubQuery,
        sortBy: FacilityKpiSortByEnum.KPI_SCORE,
        sortOrder: 'desc',
      }),
      this.getFinancialAnalytics(callerId, {
        ...baseSubQuery,
        granularity: StatisticsGranularityEnum.MONTH,
      }),
      this.getProductAndOperations(callerId, baseSubQuery),
    ]);

    const reports = {
      overview,
      rentalTrends,
      facilitiesKpi,
      financialAnalytics,
      productAndOperations,
    };

    const opportunityMetrics = computeProfitOpportunityMetrics(reports);
    const allChunks = buildKnowledgeChunks(reports, opportunityMetrics);
    const retrievedChunks = await retrieveTopKChunks(
      body.question,
      allChunks,
      topK,
      config.ragAdvisor
    );

    const generated = await generateGroundedRagResponse({
      question: body.question,
      retrievedChunks,
      opportunityMetrics,
      complexity: routerDecision.complexity,
      config: config.ragAdvisor,
    });

    const responseData: RagAdvisorResponse = {
      period: {
        fromDate: fromDateVN,
        toDate: toDateVN,
        scopedFacilityId,
        focusArea,
      },
      queryInfo: {
        question: body.question.trim(),
        normalizedQuestion,
        groundingStatus: RagGroundingStatusEnum.GROUNDED,
        router: {
          complexity: routerDecision.complexity,
          selectedModel: generated.selectedModel,
          provider: generated.provider,
          reason: routerDecision.reason,
        },
        cached: false,
        generatedAt: new Date().toISOString(),
      },
      answer: generated.answer,
      opportunityMetrics,
      recommendations: generated.recommendations,
      citations: generated.citations,
      retrievedChunkIds: retrievedChunks.map((c) => c.chunkId),
    };

    if (this.redisClient) {
      try {
        await this.redisClient.setex(
          cacheKey,
          config.ragAdvisor.cacheTtlSeconds,
          JSON.stringify(responseData)
        );
      } catch {
        // Bỏ qua lỗi ghi Redis để không làm gián đoạn nghiệp vụ
      }
    }

    return validateResponse(ragAdvisorResponseSchema, responseData);
  }

  /**
   * 7. Kiểm định Tự động Chất lượng Hệ thống RAG (Automated RAG Evaluation Suite — Pillar #8)
   *    Chỉ dành cho BUSINESS_OPS_MANAGER và SYSTEM_ADMIN
   */
  async evaluateRagAdvisor(
    callerId: string,
    query: StatisticsBaseQuery
  ): Promise<RagEvalResponse> {
    const { scopedFacilityId, callerRole } =
      await this.resolveAndAuthorizeScope(callerId, query.facilityId);

    if (
      callerRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      callerRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const baseSubQuery: StatisticsBaseQuery = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      facilityId: scopedFacilityId ?? undefined,
    };

    const [
      overview,
      rentalTrends,
      facilitiesKpi,
      financialAnalytics,
      productAndOperations,
    ] = await Promise.all([
      this.getOverview(callerId, baseSubQuery),
      this.getRentalTrends(callerId, {
        ...baseSubQuery,
        granularity: StatisticsGranularityEnum.MONTH,
      }),
      this.getFacilitiesKpi(callerId, {
        ...baseSubQuery,
        sortBy: FacilityKpiSortByEnum.KPI_SCORE,
        sortOrder: 'desc',
      }),
      this.getFinancialAnalytics(callerId, {
        ...baseSubQuery,
        granularity: StatisticsGranularityEnum.MONTH,
      }),
      this.getProductAndOperations(callerId, baseSubQuery),
    ]);

    const config = getStatisticsConfig();
    const evalResult = await runRagEvaluationSuite(
      {
        overview,
        rentalTrends,
        facilitiesKpi,
        financialAnalytics,
        productAndOperations,
      },
      config.ragAdvisor
    );

    return validateResponse(ragEvalResponseSchema, evalResult);
  }
}
