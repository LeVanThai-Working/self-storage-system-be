import { Types } from 'mongoose';
import { Facility, type IFacility } from '../facility/facility.model.ts';
import { StorageUnit } from '../storageUnit/storageUnit.model.ts';
import { StorageRack } from '../storageRack/storageRack.model.ts';
import { UnitType } from '../unitType/unitType.model.ts';
import { FacilityAmenityOffering } from '../facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityTimeSlot } from '../facilityTimeSlot/facilityTimeSlot.model.ts';
import { Reservation } from '../reservation/reservation.model.ts';
import { Contract } from '../contract/contract.model.ts';
import { Invoice } from '../invoice/invoice.model.ts';
import { Payment, PaymentTransaction } from '../payment/payment.model.ts';
import { RefundRequest } from '../refundRequest/refundRequest.model.ts';
import { Incident } from '../incident/incident.model.ts';
import { SupportTicket } from '../support/supportTicket.model.ts';
import { AccessSchedule } from '../customerInventory/accessSchedule.model.ts';
import { InventoryMovement } from '../customerInventory/inventoryMovement.model.ts';
import { ApprovalRequest } from '../approvalRequest/approvalRequest.model.ts';

import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';
import {
  RackStatusEnum,
  RackZoneEnum,
} from '../../common/enums/storageRack.enum.ts';
import {
  ReservationStatusEnum,
  ReservationCancelSourceEnum,
} from '../../common/enums/reservation.enum.ts';
import {
  ContractStatusEnum,
  ContractSourceEnum,
  ContractDepositStatusEnum,
} from '../../common/enums/contract.enum.ts';
import {
  BillingUnitEnum,
  InvoiceStatusEnum,
  InvoiceItemTypeEnum,
} from '../../common/enums/billing.enum.ts';
import {
  PaymentStatusEnum,
  PaymentMethodEnum,
  PaymentTransactionResultEnum,
} from '../../common/enums/payment.enum.ts';
import {
  RefundRequestStatusEnum,
  RefundRequestReasonEnum,
} from '../../common/enums/refundRequest.enum.ts';
import {
  IncidentStatusEnum,
  IncidentSeverityEnum,
  IncidentLiablePartyEnum,
} from '../../common/enums/incident.enum.ts';
import { SupportTicketStatusEnum } from '../../common/enums/supportTicket.enum.ts';
import {
  AccessScheduleStatusEnum,
  MovementTypeEnum,
} from '../../common/enums/customerInventory.enum.ts';
import { ApprovalRequestStatusEnum } from '../../common/enums/approvalRequest.enum.ts';
import { StatisticsGranularityEnum } from '../../common/enums/statistics.enum.ts';
import { UnitTypeCategoryEnum } from '../../common/enums/unitType.enum.ts';

const VN_TZ = 'Asia/Ho_Chi_Minh';

export interface FacilityUnitAggRow {
  _id: Types.ObjectId;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  underMaintenance: number;
  pendingClearance: number;
  inactive: number;
  totalAreaM2: number;
  occupiedAreaM2: number;
}

export interface FacilityRackAggRow {
  _id: Types.ObjectId;
  total: number;
  available: number;
  rented: number;
  reserved: number;
  maintenance: number;
  inactive: number;
}

export interface FacilityPaymentAggRow {
  _id: Types.ObjectId;
  collectedAmount: number;
  paymentCount: number;
}

export interface FacilityRefundAggRow {
  _id: Types.ObjectId;
  refundedAmount: number;
  refundCount: number;
}

export interface FacilityContractSnapshotAggRow {
  _id: Types.ObjectId;
  activeCount: number;
  overdueCount: number;
  heldDeposits: number;
  forfeitedAmount: number;
}

export interface FacilityContractPeriodAggRow {
  _id: Types.ObjectId;
  totalCreated: number;
  walkInCount: number;
  reservationSourceCount: number;
  renewedCount: number;
  forfeitedAmount: number;
}

export interface FacilityInvoiceAggRow {
  _id: Types.ObjectId;
  totalIssuedCount: number;
  paidCount: number;
  overdueCount: number;
  invoicedAmount: number;
  paidAmount: number;
  overdueAmount: number;
}

export interface FacilityReservationKpiAggRow {
  _id: Types.ObjectId;
  totalCreated: number;
  paidOrBeyondCount: number;
  completedCount: number;
  cancelledCount: number;
  facilityFaultCount: number;
  forfeitedAmount: number;
  avgConfirmMinutes: number | null;
}

export interface FacilityIncidentSupportAggRow {
  facilityId: string;
  totalIncidents: number;
  openIncidents: number;
  resolvedOrClosedIncidents: number;
  facilityLiableIncidents: number;
  totalRepairCost: number;
  avgIncidentResolveHours: number | null;
  totalSupportTickets: number;
  completedSupportTickets: number;
}

export interface StatisticsModels {
  facility: typeof Facility;
  storageUnit: typeof StorageUnit;
  storageRack: typeof StorageRack;
  unitType: typeof UnitType;
  facilityAmenityOffering: typeof FacilityAmenityOffering;
  facilityTimeSlot: typeof FacilityTimeSlot;
  reservation: typeof Reservation;
  contract: typeof Contract;
  invoice: typeof Invoice;
  payment: typeof Payment;
  paymentTransaction: typeof PaymentTransaction;
  refundRequest: typeof RefundRequest;
  incident: typeof Incident;
  supportTicket: typeof SupportTicket;
  accessSchedule: typeof AccessSchedule;
  inventoryMovement: typeof InventoryMovement;
  approvalRequest: typeof ApprovalRequest;
}

export const defaultStatisticsModels: StatisticsModels = {
  facility: Facility,
  storageUnit: StorageUnit,
  storageRack: StorageRack,
  unitType: UnitType,
  facilityAmenityOffering: FacilityAmenityOffering,
  facilityTimeSlot: FacilityTimeSlot,
  reservation: Reservation,
  contract: Contract,
  invoice: Invoice,
  payment: Payment,
  paymentTransaction: PaymentTransaction,
  refundRequest: RefundRequest,
  incident: Incident,
  supportTicket: SupportTicket,
  accessSchedule: AccessSchedule,
  inventoryMovement: InventoryMovement,
  approvalRequest: ApprovalRequest,
};

export class StatisticsRepository {
  constructor(
    private readonly models: StatisticsModels = defaultStatisticsModels
  ) {}

  private buildFacilityMatch(
    facilityIds?: Types.ObjectId[]
  ): Record<string, unknown> {
    const match: Record<string, unknown> = { deleted: { $ne: true } };
    if (facilityIds && facilityIds.length > 0) {
      match.facilityId =
        facilityIds.length === 1 ? facilityIds[0] : { $in: facilityIds };
    }
    return match;
  }

  private buildPeriodBucketExpression(
    dateField: string,
    granularity: StatisticsGranularityEnum
  ): Record<string, unknown> {
    switch (granularity) {
      case StatisticsGranularityEnum.DAY:
        return {
          $dateToString: {
            format: '%Y-%m-%d',
            date: `$${dateField}`,
            timezone: VN_TZ,
          },
        };
      case StatisticsGranularityEnum.WEEK:
        return {
          $concat: [
            {
              $toString: {
                $isoWeekYear: { date: `$${dateField}`, timezone: VN_TZ },
              },
            },
            '-W',
            {
              $cond: [
                {
                  $lt: [
                    { $isoWeek: { date: `$${dateField}`, timezone: VN_TZ } },
                    10,
                  ],
                },
                {
                  $concat: [
                    '0',
                    {
                      $toString: {
                        $isoWeek: { date: `$${dateField}`, timezone: VN_TZ },
                      },
                    },
                  ],
                },
                {
                  $toString: {
                    $isoWeek: { date: `$${dateField}`, timezone: VN_TZ },
                  },
                },
              ],
            },
          ],
        };
      case StatisticsGranularityEnum.MONTH:
        return {
          $dateToString: {
            format: '%Y-%m',
            date: `$${dateField}`,
            timezone: VN_TZ,
          },
        };
      case StatisticsGranularityEnum.QUARTER:
        return {
          $concat: [
            {
              $dateToString: {
                format: '%Y',
                date: `$${dateField}`,
                timezone: VN_TZ,
              },
            },
            '-Q',
            {
              $toString: {
                $ceil: {
                  $divide: [
                    { $month: { date: `$${dateField}`, timezone: VN_TZ } },
                    3,
                  ],
                },
              },
            },
          ],
        };
    }
  }

  async findFacilitiesForStats(filter: {
    facilityIds?: Types.ObjectId[];
    city?: string;
    onlyActive?: boolean;
  }): Promise<IFacility[]> {
    const query: Record<string, unknown> = { deleted: { $ne: true } };
    if (filter.onlyActive) {
      query.status = FacilityStatusEnum.ACTIVE;
    }
    if (filter.facilityIds && filter.facilityIds.length > 0) {
      query._id =
        filter.facilityIds.length === 1
          ? filter.facilityIds[0]
          : { $in: filter.facilityIds };
    }
    if (filter.city) {
      query.city = { $regex: new RegExp(`^${filter.city.trim()}$`, 'i') };
    }
    return this.models.facility.find(query).sort({ name: 1 });
  }

  async getStorageUnitStatsByFacility(
    facilityIds?: Types.ObjectId[]
  ): Promise<FacilityUnitAggRow[]> {
    const match = this.buildFacilityMatch(facilityIds);
    return this.models.storageUnit.aggregate<FacilityUnitAggRow>([
      { $match: match },
      {
        $lookup: {
          from: 'unittypes',
          localField: 'unitTypeId',
          foreignField: '_id',
          as: 'unitTypeDoc',
        },
      },
      {
        $addFields: {
          unitArea: {
            $ifNull: [{ $arrayElemAt: ['$unitTypeDoc.area', 0] }, 0],
          },
        },
      },
      {
        $group: {
          _id: '$facilityId',
          total: { $sum: 1 },
          available: {
            $sum: {
              $cond: [
                { $eq: ['$status', StorageUnitStatusEnum.AVAILABLE] },
                1,
                0,
              ],
            },
          },
          occupied: {
            $sum: {
              $cond: [
                { $eq: ['$status', StorageUnitStatusEnum.OCCUPIED] },
                1,
                0,
              ],
            },
          },
          reserved: {
            $sum: {
              $cond: [
                { $eq: ['$status', StorageUnitStatusEnum.RESERVED] },
                1,
                0,
              ],
            },
          },
          underMaintenance: {
            $sum: {
              $cond: [
                { $eq: ['$status', StorageUnitStatusEnum.UNDER_MAINTENANCE] },
                1,
                0,
              ],
            },
          },
          pendingClearance: {
            $sum: {
              $cond: [
                { $eq: ['$status', StorageUnitStatusEnum.PENDING_CLEARANCE] },
                1,
                0,
              ],
            },
          },
          inactive: {
            $sum: {
              $cond: [
                { $eq: ['$status', StorageUnitStatusEnum.INACTIVE] },
                1,
                0,
              ],
            },
          },
          totalAreaM2: {
            $sum: {
              $cond: [
                { $ne: ['$status', StorageUnitStatusEnum.INACTIVE] },
                '$unitArea',
                0,
              ],
            },
          },
          occupiedAreaM2: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    [
                      StorageUnitStatusEnum.OCCUPIED,
                      StorageUnitStatusEnum.RESERVED,
                    ],
                  ],
                },
                '$unitArea',
                0,
              ],
            },
          },
        },
      },
    ]);
  }

  async getStorageRackStatsByFacility(
    facilityIds?: Types.ObjectId[]
  ): Promise<FacilityRackAggRow[]> {
    const match = this.buildFacilityMatch(facilityIds);
    return this.models.storageRack.aggregate<FacilityRackAggRow>([
      { $match: match },
      {
        $group: {
          _id: '$facilityId',
          total: { $sum: 1 },
          available: {
            $sum: {
              $cond: [{ $eq: ['$status', RackStatusEnum.AVAILABLE] }, 1, 0],
            },
          },
          rented: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    [RackStatusEnum.RENTED, RackStatusEnum.ACTIVE],
                  ],
                },
                1,
                0,
              ],
            },
          },
          reserved: {
            $sum: {
              $cond: [{ $eq: ['$status', RackStatusEnum.RESERVED] }, 1, 0],
            },
          },
          maintenance: {
            $sum: {
              $cond: [{ $eq: ['$status', RackStatusEnum.MAINTENANCE] }, 1, 0],
            },
          },
          inactive: {
            $sum: {
              $cond: [{ $eq: ['$status', RackStatusEnum.INACTIVE] }, 1, 0],
            },
          },
        },
      },
    ]);
  }

  async getPaymentStatsInPeriodByFacility(
    fromDate: Date,
    toDate: Date,
    facilityIds?: Types.ObjectId[]
  ): Promise<FacilityPaymentAggRow[]> {
    const match: Record<string, unknown> = {
      ...this.buildFacilityMatch(facilityIds),
      status: PaymentStatusEnum.PAID,
      paidAt: { $gte: fromDate, $lte: toDate },
    };
    return this.models.payment.aggregate<FacilityPaymentAggRow>([
      { $match: match },
      {
        $group: {
          _id: '$facilityId',
          collectedAmount: { $sum: '$paidAmount' },
          paymentCount: { $sum: 1 },
        },
      },
    ]);
  }

  async getRefundStatsInPeriodByFacility(
    fromDate: Date,
    toDate: Date,
    facilityIds?: Types.ObjectId[]
  ): Promise<FacilityRefundAggRow[]> {
    const match: Record<string, unknown> = {
      ...this.buildFacilityMatch(facilityIds),
      status: RefundRequestStatusEnum.PAID,
      paidAt: { $gte: fromDate, $lte: toDate },
    };
    return this.models.refundRequest.aggregate<FacilityRefundAggRow>([
      { $match: match },
      {
        $group: {
          _id: '$facilityId',
          refundedAmount: { $sum: '$amount' },
          refundCount: { $sum: 1 },
        },
      },
    ]);
  }

  async getContractSnapshotByFacility(
    facilityIds?: Types.ObjectId[]
  ): Promise<FacilityContractSnapshotAggRow[]> {
    const match = this.buildFacilityMatch(facilityIds);
    return this.models.contract.aggregate<FacilityContractSnapshotAggRow>([
      { $match: match },
      {
        $group: {
          _id: '$facilityId',
          activeCount: {
            $sum: {
              $cond: [{ $eq: ['$status', ContractStatusEnum.ACTIVE] }, 1, 0],
            },
          },
          overdueCount: {
            $sum: {
              $cond: [{ $eq: ['$status', ContractStatusEnum.OVERDUE] }, 1, 0],
            },
          },
          heldDeposits: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $in: [
                        '$status',
                        [ContractStatusEnum.ACTIVE, ContractStatusEnum.OVERDUE],
                      ],
                    },
                    {
                      $eq: ['$depositStatus', ContractDepositStatusEnum.HELD],
                    },
                  ],
                },
                '$depositAmount',
                0,
              ],
            },
          },
          forfeitedAmount: { $sum: { $ifNull: ['$forfeitedAmount', 0] } },
        },
      },
    ]);
  }

  async getContractPeriodStatsByFacility(
    fromDate: Date,
    toDate: Date,
    facilityIds?: Types.ObjectId[]
  ): Promise<FacilityContractPeriodAggRow[]> {
    const match: Record<string, unknown> = {
      ...this.buildFacilityMatch(facilityIds),
      createdAt: { $gte: fromDate, $lte: toDate },
    };
    return this.models.contract.aggregate<FacilityContractPeriodAggRow>([
      { $match: match },
      {
        $group: {
          _id: '$facilityId',
          totalCreated: { $sum: 1 },
          walkInCount: {
            $sum: {
              $cond: [{ $eq: ['$source', ContractSourceEnum.WALK_IN] }, 1, 0],
            },
          },
          reservationSourceCount: {
            $sum: {
              $cond: [
                { $eq: ['$source', ContractSourceEnum.RESERVATION] },
                1,
                0,
              ],
            },
          },
          renewedCount: {
            $sum: {
              $cond: [{ $gt: [{ $ifNull: ['$renewalCount', 0] }, 0] }, 1, 0],
            },
          },
          forfeitedAmount: { $sum: { $ifNull: ['$forfeitedAmount', 0] } },
        },
      },
    ]);
  }

  async getInvoiceStatsByFacility(
    fromDate: Date,
    toDate: Date,
    facilityIds?: Types.ObjectId[]
  ): Promise<FacilityInvoiceAggRow[]> {
    const match: Record<string, unknown> = {
      ...this.buildFacilityMatch(facilityIds),
      createdAt: { $gte: fromDate, $lte: toDate },
      status: {
        $in: [
          InvoiceStatusEnum.ISSUED,
          InvoiceStatusEnum.PAID,
          InvoiceStatusEnum.OVERDUE,
        ],
      },
    };
    return this.models.invoice.aggregate<FacilityInvoiceAggRow>([
      { $match: match },
      {
        $group: {
          _id: '$facilityId',
          totalIssuedCount: { $sum: 1 },
          paidCount: {
            $sum: {
              $cond: [{ $eq: ['$status', InvoiceStatusEnum.PAID] }, 1, 0],
            },
          },
          overdueCount: {
            $sum: {
              $cond: [{ $eq: ['$status', InvoiceStatusEnum.OVERDUE] }, 1, 0],
            },
          },
          invoicedAmount: { $sum: '$totalAmount' },
          paidAmount: {
            $sum: {
              $cond: [
                { $eq: ['$status', InvoiceStatusEnum.PAID] },
                '$paidAmount',
                0,
              ],
            },
          },
          overdueAmount: {
            $sum: {
              $cond: [
                { $eq: ['$status', InvoiceStatusEnum.OVERDUE] },
                { $subtract: ['$totalAmount', '$paidAmount'] },
                0,
              ],
            },
          },
        },
      },
    ]);
  }

  async getAllUnpaidOverdueReceivablesByFacility(
    facilityIds?: Types.ObjectId[]
  ): Promise<Array<{ _id: Types.ObjectId; overdueReceivables: number }>> {
    const match: Record<string, unknown> = {
      ...this.buildFacilityMatch(facilityIds),
      status: InvoiceStatusEnum.OVERDUE,
    };
    return this.models.invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$facilityId',
          overdueReceivables: {
            $sum: { $subtract: ['$totalAmount', '$paidAmount'] },
          },
        },
      },
    ]);
  }

  async getReservationKpiStatsByFacility(
    fromDate: Date,
    toDate: Date,
    facilityIds?: Types.ObjectId[]
  ): Promise<FacilityReservationKpiAggRow[]> {
    const match: Record<string, unknown> = {
      ...this.buildFacilityMatch(facilityIds),
      createdAt: { $gte: fromDate, $lte: toDate },
    };
    return this.models.reservation.aggregate<FacilityReservationKpiAggRow>([
      { $match: match },
      {
        $addFields: {
          confirmMinutes: {
            $cond: [
              {
                $and: [
                  { $ne: ['$paidAt', null] },
                  { $ne: ['$confirmedAt', null] },
                  { $gte: ['$confirmedAt', '$paidAt'] },
                ],
              },
              {
                $divide: [{ $subtract: ['$confirmedAt', '$paidAt'] }, 60000],
              },
              null,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$facilityId',
          totalCreated: { $sum: 1 },
          paidOrBeyondCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $ne: ['$paidAt', null] },
                    {
                      $in: [
                        '$status',
                        [
                          ReservationStatusEnum.PAYMENT_SUCCESSFUL,
                          ReservationStatusEnum.CONFIRMED,
                          ReservationStatusEnum.COMPLETED,
                          ReservationStatusEnum.OVERDUE,
                        ],
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          completedCount: {
            $sum: {
              $cond: [
                { $eq: ['$status', ReservationStatusEnum.COMPLETED] },
                1,
                0,
              ],
            },
          },
          cancelledCount: {
            $sum: {
              $cond: [
                { $eq: ['$status', ReservationStatusEnum.CANCELLED] },
                1,
                0,
              ],
            },
          },
          facilityFaultCount: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    '$cancellationSource',
                    ReservationCancelSourceEnum.FACILITY_FAULT,
                  ],
                },
                1,
                0,
              ],
            },
          },
          forfeitedAmount: { $sum: { $ifNull: ['$forfeitedAmount', 0] } },
          avgConfirmMinutes: { $avg: '$confirmMinutes' },
        },
      },
    ]);
  }

  async getIncidentAndSupportKpiStatsByFacility(
    fromDate: Date,
    toDate: Date,
    facilityIds?: Types.ObjectId[]
  ): Promise<Map<string, FacilityIncidentSupportAggRow>> {
    const match: Record<string, unknown> = {
      ...this.buildFacilityMatch(facilityIds),
      createdAt: { $gte: fromDate, $lte: toDate },
    };

    const [incidentRows, supportRows] = await Promise.all([
      this.models.incident.aggregate<{
        _id: Types.ObjectId;
        totalIncidents: number;
        openIncidents: number;
        resolvedOrClosedIncidents: number;
        facilityLiableIncidents: number;
        totalRepairCost: number;
        avgIncidentResolveHours: number | null;
      }>([
        { $match: match },
        {
          $addFields: {
            resolveHours: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$resolution.resolvedAt', null] },
                    { $gte: ['$resolution.resolvedAt', '$createdAt'] },
                  ],
                },
                {
                  $divide: [
                    { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
                    3600000,
                  ],
                },
                null,
              ],
            },
          },
        },
        {
          $group: {
            _id: '$facilityId',
            totalIncidents: { $sum: 1 },
            openIncidents: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        IncidentStatusEnum.REPORTED,
                        IncidentStatusEnum.ASSIGNED,
                        IncidentStatusEnum.INVESTIGATING,
                        IncidentStatusEnum.IN_PROGRESS,
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            resolvedOrClosedIncidents: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [IncidentStatusEnum.RESOLVED, IncidentStatusEnum.CLOSED],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            facilityLiableIncidents: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      '$resolution.liableParty',
                      IncidentLiablePartyEnum.FACILITY,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalRepairCost: {
              $sum: { $ifNull: ['$resolution.repairCost', 0] },
            },
            avgIncidentResolveHours: { $avg: '$resolveHours' },
          },
        },
      ]),
      this.models.supportTicket.aggregate<{
        _id: Types.ObjectId | null;
        totalSupportTickets: number;
        completedSupportTickets: number;
      }>([
        { $match: match },
        {
          $group: {
            _id: '$facilityId',
            totalSupportTickets: { $sum: 1 },
            completedSupportTickets: {
              $sum: {
                $cond: [
                  { $eq: ['$status', SupportTicketStatusEnum.COMPLETED] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const resultMap = new Map<string, FacilityIncidentSupportAggRow>();

    for (const row of incidentRows) {
      if (!row._id) continue;
      const fid = row._id.toString();
      resultMap.set(fid, {
        facilityId: fid,
        totalIncidents: row.totalIncidents,
        openIncidents: row.openIncidents,
        resolvedOrClosedIncidents: row.resolvedOrClosedIncidents,
        facilityLiableIncidents: row.facilityLiableIncidents,
        totalRepairCost: row.totalRepairCost,
        avgIncidentResolveHours: row.avgIncidentResolveHours,
        totalSupportTickets: 0,
        completedSupportTickets: 0,
      });
    }

    for (const row of supportRows) {
      if (!row._id) continue;
      const fid = row._id.toString();
      const existing = resultMap.get(fid);
      if (existing) {
        existing.totalSupportTickets = row.totalSupportTickets;
        existing.completedSupportTickets = row.completedSupportTickets;
      } else {
        resultMap.set(fid, {
          facilityId: fid,
          totalIncidents: 0,
          openIncidents: 0,
          resolvedOrClosedIncidents: 0,
          facilityLiableIncidents: 0,
          totalRepairCost: 0,
          avgIncidentResolveHours: null,
          totalSupportTickets: row.totalSupportTickets,
          completedSupportTickets: row.completedSupportTickets,
        });
      }
    }

    return resultMap;
  }

  async getActionRequiredCounts(
    opsRefundThreshold: number,
    facilityIds?: Types.ObjectId[]
  ): Promise<{
    pendingApprovals: number;
    pendingOpsRefunds: number;
    unmatchedSepayTransactions: number;
    openHighCriticalIncidents: number;
  }> {
    const facilityMatch = this.buildFacilityMatch(facilityIds);

    const [
      pendingApprovals,
      pendingOpsRefunds,
      unmatchedSepayTransactions,
      openHighCriticalIncidents,
    ] = await Promise.all([
      this.models.approvalRequest.countDocuments({
        ...facilityMatch,
        status: ApprovalRequestStatusEnum.PENDING,
      }),
      this.models.refundRequest.countDocuments({
        ...facilityMatch,
        status: RefundRequestStatusEnum.PENDING_APPROVAL,
        amount: { $gte: opsRefundThreshold },
      }),
      this.models.paymentTransaction.countDocuments({
        result: {
          $in: [
            PaymentTransactionResultEnum.UNMATCHED,
            PaymentTransactionResultEnum.AMOUNT_MISMATCH,
            PaymentTransactionResultEnum.LATE,
          ],
        },
      }),
      this.models.incident.countDocuments({
        ...facilityMatch,
        status: {
          $in: [
            IncidentStatusEnum.REPORTED,
            IncidentStatusEnum.ASSIGNED,
            IncidentStatusEnum.INVESTIGATING,
            IncidentStatusEnum.IN_PROGRESS,
          ],
        },
        severity: {
          $in: [IncidentSeverityEnum.HIGH, IncidentSeverityEnum.CRITICAL],
        },
      }),
    ]);

    return {
      pendingApprovals,
      pendingOpsRefunds,
      unmatchedSepayTransactions,
      openHighCriticalIncidents,
    };
  }

  async getRentalTrendsAggregations(
    fromDate: Date,
    toDate: Date,
    granularity: StatisticsGranularityEnum,
    facilityIds?: Types.ObjectId[]
  ) {
    const baseMatch = this.buildFacilityMatch(facilityIds);

    const resBucketExpr = this.buildPeriodBucketExpression(
      'createdAt',
      granularity
    );
    const checkInBucketExpr = this.buildPeriodBucketExpression(
      'actualCheckInDate',
      granularity
    );
    const checkOutBucketExpr = this.buildPeriodBucketExpression(
      'actualCheckOutDate',
      granularity
    );
    const paymentBucketExpr = this.buildPeriodBucketExpression(
      'paidAt',
      granularity
    );

    const [
      reservationsByPeriod,
      checkInsByPeriod,
      checkOutsByPeriod,
      paymentsByPeriod,
      reservationsByDayOfWeek,
      checkInsByDayOfWeek,
      accessByDayOfWeek,
      reservationsByTimeSlot,
      accessByTimeSlot,
      activeTimeSlots,
      reservationsByHour,
      reservationsByBillingUnit,
      reservationsByDurationBucket,
    ] = await Promise.all([
      this.models.reservation.aggregate<{
        _id: string;
        reservationsCreated: number;
        completedReservations: number;
        cancelledReservations: number;
      }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: resBucketExpr,
            reservationsCreated: { $sum: 1 },
            completedReservations: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ReservationStatusEnum.COMPLETED] },
                  1,
                  0,
                ],
              },
            },
            cancelledReservations: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        ReservationStatusEnum.CANCELLED,
                        ReservationStatusEnum.EXPIRED,
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.models.contract.aggregate<{
        _id: string;
        contractsCheckedIn: number;
      }>([
        {
          $match: {
            ...baseMatch,
            actualCheckInDate: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: checkInBucketExpr,
            contractsCheckedIn: { $sum: 1 },
          },
        },
      ]),
      this.models.contract.aggregate<{ _id: string; contractsEnded: number }>([
        {
          $match: {
            ...baseMatch,
            actualCheckOutDate: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: checkOutBucketExpr,
            contractsEnded: { $sum: 1 },
          },
        },
      ]),
      this.models.payment.aggregate<{ _id: string; collectedRevenue: number }>([
        {
          $match: {
            ...baseMatch,
            status: PaymentStatusEnum.PAID,
            paidAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: paymentBucketExpr,
            collectedRevenue: { $sum: '$paidAmount' },
          },
        },
      ]),
      // Day of Week (MongoDB $dayOfWeek: 1 = Sunday ... 7 = Saturday in VN Time)
      this.models.reservation.aggregate<{ _id: number; count: number }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: { date: '$createdAt', timezone: VN_TZ } },
            count: { $sum: 1 },
          },
        },
      ]),
      this.models.contract.aggregate<{ _id: number; count: number }>([
        {
          $match: {
            ...baseMatch,
            actualCheckInDate: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: {
              $dayOfWeek: { date: '$actualCheckInDate', timezone: VN_TZ },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      this.models.accessSchedule.aggregate<{ _id: number; count: number }>([
        {
          $match: {
            ...baseMatch,
            scheduledDate: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: { date: '$scheduledDate', timezone: VN_TZ } },
            count: { $sum: 1 },
          },
        },
      ]),
      // Time slots
      this.models.reservation.aggregate<{
        _id: string;
        reservationCount: number;
        completedCount: number;
      }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: '$checkInTimeSlot',
            reservationCount: { $sum: 1 },
            completedCount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ReservationStatusEnum.COMPLETED] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { reservationCount: -1 } },
      ]),
      this.models.accessSchedule.aggregate<{
        _id: string;
        scheduleCount: number;
      }>([
        {
          $match: {
            ...baseMatch,
            scheduledDate: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: {
              $concat: [
                '$timeSlotSnapshot.startTime',
                ' - ',
                '$timeSlotSnapshot.endTime',
              ],
            },
            scheduleCount: { $sum: 1 },
          },
        },
      ]),
      this.models.facilityTimeSlot
        .find({
          ...baseMatch,
          isActive: true,
        })
        .select('slotName startTime endTime maxCapacity'),
      // Hour of day (0 - 23 in VN Time)
      this.models.reservation.aggregate<{
        _id: number;
        reservationCount: number;
      }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: { $hour: { date: '$createdAt', timezone: VN_TZ } },
            reservationCount: { $sum: 1 },
          },
        },
      ]),
      // Billing unit breakdown
      this.models.reservation.aggregate<{
        _id: BillingUnitEnum;
        reservationCount: number;
        totalDepositAmount: number;
      }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: '$billingUnit',
            reservationCount: { $sum: 1 },
            totalDepositAmount: { $sum: '$depositAmount' },
          },
        },
      ]),
      // Duration bucket breakdown
      this.models.reservation.aggregate<{
        _id: string;
        reservationCount: number;
      }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $addFields: {
            approxDays: {
              $cond: [
                { $eq: ['$billingUnit', BillingUnitEnum.MONTH] },
                { $multiply: ['$rentalDuration', 30] },
                '$rentalDuration',
              ],
            },
          },
        },
        {
          $addFields: {
            durationBucket: {
              $switch: {
                branches: [
                  {
                    case: { $lte: ['$approxDays', 14] },
                    then: 'short_term_lte_14d',
                  },
                  {
                    case: { $lte: ['$approxDays', 35] },
                    then: '1_month',
                  },
                  {
                    case: { $lte: ['$approxDays', 95] },
                    then: '2_to_3_months',
                  },
                  {
                    case: { $lte: ['$approxDays', 185] },
                    then: '4_to_6_months',
                  },
                ],
                default: 'long_term_gt_6m',
              },
            },
          },
        },
        {
          $group: {
            _id: '$durationBucket',
            reservationCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      reservationsByPeriod,
      checkInsByPeriod,
      checkOutsByPeriod,
      paymentsByPeriod,
      reservationsByDayOfWeek,
      checkInsByDayOfWeek,
      accessByDayOfWeek,
      reservationsByTimeSlot,
      accessByTimeSlot,
      activeTimeSlots,
      reservationsByHour,
      reservationsByBillingUnit,
      reservationsByDurationBucket,
    };
  }

  async getFinancialAnalyticsAggregations(
    fromDate: Date,
    toDate: Date,
    granularity: StatisticsGranularityEnum,
    facilityIds?: Types.ObjectId[]
  ) {
    const baseMatch = this.buildFacilityMatch(facilityIds);
    const invoiceBucketExpr = this.buildPeriodBucketExpression(
      'createdAt',
      granularity
    );
    const paymentBucketExpr = this.buildPeriodBucketExpression(
      'paidAt',
      granularity
    );
    const refundBucketExpr = this.buildPeriodBucketExpression(
      'paidAt',
      granularity
    );

    const now = new Date();

    const [
      invoicedByPeriod,
      collectedByPeriod,
      refundedByPeriod,
      revenueByItemType,
      paymentMethodRows,
      sepayTxRows,
      overdueInvoices,
      refundByReasonRows,
    ] = await Promise.all([
      this.models.invoice.aggregate<{ _id: string; invoicedAmount: number }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
            status: {
              $in: [
                InvoiceStatusEnum.ISSUED,
                InvoiceStatusEnum.PAID,
                InvoiceStatusEnum.OVERDUE,
              ],
            },
          },
        },
        {
          $group: {
            _id: invoiceBucketExpr,
            invoicedAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
      this.models.payment.aggregate<{ _id: string; collectedAmount: number }>([
        {
          $match: {
            ...baseMatch,
            status: PaymentStatusEnum.PAID,
            paidAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: paymentBucketExpr,
            collectedAmount: { $sum: '$paidAmount' },
          },
        },
      ]),
      this.models.refundRequest.aggregate<{
        _id: string;
        refundedAmount: number;
      }>([
        {
          $match: {
            ...baseMatch,
            status: RefundRequestStatusEnum.PAID,
            paidAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: refundBucketExpr,
            refundedAmount: { $sum: '$amount' },
          },
        },
      ]),
      this.models.invoice.aggregate<{
        _id: InvoiceItemTypeEnum;
        invoicedAmount: number;
        paidAmount: number;
        itemCount: number;
      }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
            status: {
              $in: [
                InvoiceStatusEnum.ISSUED,
                InvoiceStatusEnum.PAID,
                InvoiceStatusEnum.OVERDUE,
              ],
            },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.itemType',
            invoicedAmount: { $sum: '$items.amount' },
            paidAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', InvoiceStatusEnum.PAID] },
                  '$items.amount',
                  0,
                ],
              },
            },
            itemCount: { $sum: '$items.quantity' },
          },
        },
      ]),
      this.models.payment.aggregate<{
        _id: PaymentMethodEnum;
        count: number;
        totalPaidAmount: number;
      }>([
        {
          $match: {
            ...baseMatch,
            status: PaymentStatusEnum.PAID,
            paidAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: '$method',
            count: { $sum: 1 },
            totalPaidAmount: { $sum: '$paidAmount' },
          },
        },
      ]),
      this.models.paymentTransaction.aggregate<{
        _id: PaymentTransactionResultEnum;
        count: number;
        totalTransferAmount: number;
      }>([
        {
          $match: {
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: '$result',
            count: { $sum: 1 },
            totalTransferAmount: {
              $sum: { $ifNull: ['$transferAmount', 0] },
            },
          },
        },
      ]),
      this.models.invoice
        .find({
          ...baseMatch,
          status: InvoiceStatusEnum.OVERDUE,
        })
        .select('dueDate totalAmount paidAmount'),
      this.models.refundRequest.aggregate<{
        _id: RefundRequestReasonEnum;
        count: number;
        totalAmount: number;
        paidAmount: number;
      }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: '$reason',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            paidAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', RefundRequestStatusEnum.PAID] },
                  '$amount',
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    return {
      invoicedByPeriod,
      collectedByPeriod,
      refundedByPeriod,
      revenueByItemType,
      paymentMethodRows,
      sepayTxRows,
      overdueInvoices,
      refundByReasonRows,
      now,
    };
  }

  async getProductAndOperationsAggregations(
    fromDate: Date,
    toDate: Date,
    facilityIds?: Types.ObjectId[]
  ) {
    const baseMatch = this.buildFacilityMatch(facilityIds);

    const [
      unitTypes,
      unitsByUnitType,
      contractsByUnitType,
      racksByZone,
      amenityOfferings,
      contractAmenityStats,
      topAmenities,
      bookingFunnelRows,
      accessScheduleRows,
      inventoryMovementRows,
    ] = await Promise.all([
      this.models.unitType
        .find({ deleted: { $ne: true } })
        .select('name category area volume status'),
      this.models.storageUnit.aggregate<{
        _id: Types.ObjectId;
        totalUnits: number;
        availableUnits: number;
        occupiedUnits: number;
        reservedUnits: number;
        maintenanceUnits: number;
      }>([
        { $match: baseMatch },
        {
          $group: {
            _id: '$unitTypeId',
            totalUnits: {
              $sum: {
                $cond: [
                  { $ne: ['$status', StorageUnitStatusEnum.INACTIVE] },
                  1,
                  0,
                ],
              },
            },
            availableUnits: {
              $sum: {
                $cond: [
                  { $eq: ['$status', StorageUnitStatusEnum.AVAILABLE] },
                  1,
                  0,
                ],
              },
            },
            occupiedUnits: {
              $sum: {
                $cond: [
                  { $eq: ['$status', StorageUnitStatusEnum.OCCUPIED] },
                  1,
                  0,
                ],
              },
            },
            reservedUnits: {
              $sum: {
                $cond: [
                  { $eq: ['$status', StorageUnitStatusEnum.RESERVED] },
                  1,
                  0,
                ],
              },
            },
            maintenanceUnits: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        StorageUnitStatusEnum.UNDER_MAINTENANCE,
                        StorageUnitStatusEnum.PENDING_CLEARANCE,
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      this.models.contract.aggregate<{
        _id: Types.ObjectId;
        activeContractCount: number;
        periodicRevenue: number;
      }>([
        {
          $match: {
            ...baseMatch,
            status: {
              $in: [ContractStatusEnum.ACTIVE, ContractStatusEnum.OVERDUE],
            },
          },
        },
        {
          $lookup: {
            from: 'storageunits',
            localField: 'storageUnitId',
            foreignField: '_id',
            as: 'unitDoc',
          },
        },
        {
          $addFields: {
            unitTypeId: { $arrayElemAt: ['$unitDoc.unitTypeId', 0] },
          },
        },
        {
          $group: {
            _id: '$unitTypeId',
            activeContractCount: { $sum: 1 },
            periodicRevenue: { $sum: '$totalPeriodicPrice' },
          },
        },
      ]),
      this.models.storageRack.aggregate<{
        _id: RackZoneEnum;
        totalRacks: number;
        availableRacks: number;
        rentedRacks: number;
        reservedRacks: number;
        maintenanceRacks: number;
      }>([
        { $match: baseMatch },
        {
          $group: {
            _id: '$zone',
            totalRacks: {
              $sum: {
                $cond: [{ $ne: ['$status', RackStatusEnum.INACTIVE] }, 1, 0],
              },
            },
            availableRacks: {
              $sum: {
                $cond: [{ $eq: ['$status', RackStatusEnum.AVAILABLE] }, 1, 0],
              },
            },
            rentedRacks: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [RackStatusEnum.RENTED, RackStatusEnum.ACTIVE],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            reservedRacks: {
              $sum: {
                $cond: [{ $eq: ['$status', RackStatusEnum.RESERVED] }, 1, 0],
              },
            },
            maintenanceRacks: {
              $sum: {
                $cond: [{ $eq: ['$status', RackStatusEnum.MAINTENANCE] }, 1, 0],
              },
            },
          },
        },
      ]),
      this.models.facilityAmenityOffering.aggregate<{
        totalOfferings: number;
        totalQuantity: number;
        inUseQuantity: number;
      }>([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            totalOfferings: { $sum: 1 },
            totalQuantity: { $sum: { $ifNull: ['$totalQuantity', 0] } },
            inUseQuantity: { $sum: '$inUseQuantity' },
          },
        },
      ]),
      this.models.contract.aggregate<{
        totalContracts: number;
        contractsWithAmenities: number;
      }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: null,
            totalContracts: { $sum: 1 },
            contractsWithAmenities: {
              $sum: {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ['$amenities', []] } }, 0] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      this.models.contract.aggregate<{
        _id: Types.ObjectId;
        name: string;
        totalQuantity: number;
        totalRevenue: number;
      }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        { $unwind: '$amenities' },
        {
          $group: {
            _id: '$amenities.amenityId',
            name: { $first: '$amenities.name' },
            totalQuantity: { $sum: '$amenities.quantity' },
            totalRevenue: { $sum: '$amenities.totalPrice' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]),
      this.models.reservation.aggregate<{
        totalCreated: number;
        paidCount: number;
        confirmedCount: number;
        arrivedCount: number;
        completedCount: number;
        expiredCount: number;
        cancelledCount: number;
        facilityFaultCancelCount: number;
        overdueCount: number;
      }>([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: null,
            totalCreated: { $sum: 1 },
            paidCount: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $ne: ['$paidAt', null] },
                      {
                        $in: [
                          '$status',
                          [
                            ReservationStatusEnum.PAYMENT_SUCCESSFUL,
                            ReservationStatusEnum.CONFIRMED,
                            ReservationStatusEnum.COMPLETED,
                            ReservationStatusEnum.OVERDUE,
                          ],
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            confirmedCount: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $ne: ['$confirmedAt', null] },
                      {
                        $in: [
                          '$status',
                          [
                            ReservationStatusEnum.CONFIRMED,
                            ReservationStatusEnum.COMPLETED,
                          ],
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            arrivedCount: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $ne: ['$arrivedAt', null] },
                      { $eq: ['$status', ReservationStatusEnum.COMPLETED] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            completedCount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ReservationStatusEnum.COMPLETED] },
                  1,
                  0,
                ],
              },
            },
            expiredCount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ReservationStatusEnum.EXPIRED] },
                  1,
                  0,
                ],
              },
            },
            cancelledCount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ReservationStatusEnum.CANCELLED] },
                  1,
                  0,
                ],
              },
            },
            facilityFaultCancelCount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      '$cancellationSource',
                      ReservationCancelSourceEnum.FACILITY_FAULT,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            overdueCount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ReservationStatusEnum.OVERDUE] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      this.models.accessSchedule.aggregate<{
        totalScheduled: number;
        completedCount: number;
        noShowCount: number;
        cancelledCount: number;
        totalVisitors: number;
      }>([
        {
          $match: {
            ...baseMatch,
            scheduledDate: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: null,
            totalScheduled: { $sum: 1 },
            completedCount: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        AccessScheduleStatusEnum.COMPLETED,
                        AccessScheduleStatusEnum.CHECKED_IN,
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            noShowCount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', AccessScheduleStatusEnum.NO_SHOW] },
                  1,
                  0,
                ],
              },
            },
            cancelledCount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', AccessScheduleStatusEnum.CANCELLED] },
                  1,
                  0,
                ],
              },
            },
            totalVisitors: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        AccessScheduleStatusEnum.COMPLETED,
                        AccessScheduleStatusEnum.CHECKED_IN,
                      ],
                    ],
                  },
                  '$numberOfPeople',
                  0,
                ],
              },
            },
          },
        },
      ]),
      this.models.inventoryMovement.aggregate<{
        _id: MovementTypeEnum;
        movementCount: number;
        totalQuantity: number;
      }>([
        {
          $match: {
            facilityId: baseMatch.facilityId
              ? baseMatch.facilityId
              : { $exists: true },
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: '$type',
            movementCount: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
          },
        },
      ]),
    ]);

    return {
      unitTypes: unitTypes.map((ut) => ({
        id: ut._id.toString(),
        name: ut.name,
        category: ut.category ?? UnitTypeCategoryEnum.SMALL,
        area: ut.area,
        volume: ut.volume,
      })),
      unitsByUnitType,
      contractsByUnitType,
      racksByZone,
      amenityOfferings: amenityOfferings[0] ?? {
        totalOfferings: 0,
        totalQuantity: 0,
        inUseQuantity: 0,
      },
      contractAmenityStats: contractAmenityStats[0] ?? {
        totalContracts: 0,
        contractsWithAmenities: 0,
      },
      topAmenities,
      bookingFunnel: bookingFunnelRows[0] ?? {
        totalCreated: 0,
        paidCount: 0,
        confirmedCount: 0,
        arrivedCount: 0,
        completedCount: 0,
        expiredCount: 0,
        cancelledCount: 0,
        facilityFaultCancelCount: 0,
        overdueCount: 0,
      },
      accessSchedules: accessScheduleRows[0] ?? {
        totalScheduled: 0,
        completedCount: 0,
        noShowCount: 0,
        cancelledCount: 0,
        totalVisitors: 0,
      },
      inventoryMovementRows,
    };
  }
}
