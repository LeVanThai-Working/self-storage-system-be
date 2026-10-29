import type { ClientSession, FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IReservation } from './reservation.model.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import {
  RefundStatusEnum,
  ReservationStatusEnum,
} from '../../common/enums/reservation.enum.ts';
import { endOfDayVN, startOfDayVN } from '../../utils/date.util.ts';

export interface ReservationQueryFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customerId?: string;
  facilityId?: string;
  facilityUnitTypeOfferingId?: string;
  storageUnitId?: string;
  status?: ReservationStatusEnum;
  refundStatus?: RefundStatusEnum;
  reservationCode?: string;
  startDateFrom?: string | Date;
  startDateTo?: string | Date;
  checkInDateFrom?: string | Date;
  checkInDateTo?: string | Date;
}

export class ReservationRepository {
  constructor(private readonly reservation: SoftDeleteModel<IReservation>) {}

  async create(data: Partial<IReservation>, session?: ClientSession) {
    if (session) {
      const [created] = await this.reservation.create([data], { session });
      return created;
    }
    return this.reservation.create(data);
  }

  async findById(id: string, session?: ClientSession) {
    const query = this.reservation
      .findById(id)
      .populate('customerId', 'name email phoneNumber role status')
      .populate('facilityId', 'name city address phone email status')
      .populate(
        'facilityUnitTypeOfferingId',
        'unitTypeId billingUnit pricePerUnit depositMultiplier minRentalDays status'
      )
      .populate('storageUnitId', 'unitNumber floor zone status')
      .populate('confirmedBy', 'name email role')
      .populate('assignedStaffId', 'name email phoneNumber role')
      .populate('cancelledBy', 'name email role')
      .populate('refundedBy', 'name email role')
      .populate('forceCancelledBy', 'name email role')
      .populate('arrivedBy', 'name email role')
      .populate('graceExtendedBy', 'name email role')
      .populate('unitChangeHistory.fromUnitId', 'unitNumber floor zone status')
      .populate('unitChangeHistory.toUnitId', 'unitNumber floor zone status')
      .populate('unitChangeHistory.changedBy', 'name email role')
      .populate('unitChangeHistory.proposedBy', 'name email role')
      .populate('unitChangeHistory.decisionBy', 'name email role')
      .populate(
        'pendingUnitChange.newStorageUnitId',
        'unitNumber floor zone status'
      )
      .populate(
        'pendingUnitChange.newFacilityUnitTypeOfferingId',
        'unitTypeId billingUnit pricePerUnit depositMultiplier minRentalDays status'
      )
      .populate('pendingUnitChange.proposedBy', 'name email role');

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findByCode(code: string, session?: ClientSession) {
    const query = this.reservation
      .findOne({ reservationCode: code.toUpperCase() })
      .populate('customerId', 'name email phoneNumber role status')
      .populate('facilityId', 'name city address phone email status')
      .populate(
        'facilityUnitTypeOfferingId',
        'unitTypeId billingUnit pricePerUnit depositMultiplier minRentalDays status'
      )
      .populate('storageUnitId', 'unitNumber floor zone status')
      .populate('confirmedBy', 'name email role')
      .populate('assignedStaffId', 'name email phoneNumber role')
      .populate('cancelledBy', 'name email role')
      .populate('refundedBy', 'name email role')
      .populate('forceCancelledBy', 'name email role')
      .populate('arrivedBy', 'name email role')
      .populate('graceExtendedBy', 'name email role');

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async existsByCode(code: string, session?: ClientSession): Promise<boolean> {
    const query = this.reservation.exists({
      reservationCode: code.toUpperCase(),
    });
    if (session) {
      query.session(session);
    }
    const result = await query.exec();
    return Boolean(result);
  }

  async findPaginated(
    query: ReservationQueryFilter = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IReservation>> {
    const filter: FilterQuery<IReservation> = {};

    if (query.customerId) {
      filter.customerId = query.customerId;
    }

    if (query.facilityId) {
      filter.facilityId = query.facilityId;
    }

    if (query.facilityUnitTypeOfferingId) {
      filter.facilityUnitTypeOfferingId = query.facilityUnitTypeOfferingId;
    }

    if (query.storageUnitId) {
      filter.storageUnitId = query.storageUnitId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.refundStatus) {
      filter.refundStatus = query.refundStatus;
    }

    if (query.reservationCode) {
      filter.reservationCode = {
        $regex: query.reservationCode.trim(),
        $options: 'i',
      };
    }

    if (query.startDateFrom || query.startDateTo) {
      filter.startDate = {};
      if (query.startDateFrom) {
        filter.startDate.$gte = startOfDayVN(query.startDateFrom);
      }
      if (query.startDateTo) {
        filter.startDate.$lte = endOfDayVN(query.startDateTo);
      }
    }

    if (query.checkInDateFrom || query.checkInDateTo) {
      filter.checkInDate = {};
      if (query.checkInDateFrom) {
        filter.checkInDate.$gte = startOfDayVN(query.checkInDateFrom);
      }
      if (query.checkInDateTo) {
        filter.checkInDate.$lte = endOfDayVN(query.checkInDateTo);
      }
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<IReservation>(this.reservation, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
      populate: [
        { path: 'customerId', select: 'name email phoneNumber role status' },
        { path: 'facilityId', select: 'name city address status' },
        {
          path: 'facilityUnitTypeOfferingId',
          select: 'unitTypeId billingUnit pricePerUnit status',
        },
        { path: 'storageUnitId', select: 'unitNumber floor zone status' },
        { path: 'confirmedBy', select: 'name email role' },
        { path: 'assignedStaffId', select: 'name email phoneNumber role' },
        { path: 'cancelledBy', select: 'name email role' },
        { path: 'refundedBy', select: 'name email role' },
        { path: 'forceCancelledBy', select: 'name email role' },
        { path: 'arrivedBy', select: 'name email role' },
        { path: 'graceExtendedBy', select: 'name email role' },
      ],
    });
  }

  async update(
    id: string,
    data: Partial<IReservation>,
    session?: ClientSession
  ) {
    const query = this.reservation.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Atomic status update: only updates if current status matches expectedStatus.
   * Prevents race condition during status transitions.
   */
  async atomicUpdateStatus(
    id: string,
    expectedStatus: ReservationStatusEnum | ReservationStatusEnum[],
    updateData: Partial<IReservation>,
    session?: ClientSession
  ) {
    const filter: FilterQuery<IReservation> = {
      _id: id,
      status: Array.isArray(expectedStatus)
        ? { $in: expectedStatus }
        : expectedStatus,
    };

    const query = this.reservation.findOneAndUpdate(filter, updateData, {
      returnDocument: 'after',
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Finds all reservations that have expired while waiting for payment.
   */
  async findExpired(now: Date = new Date(), session?: ClientSession) {
    const query = this.reservation.find({
      status: ReservationStatusEnum.PENDING_PAYMENT,
      expiresAt: { $ne: null, $lt: now },
      deleted: false,
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async softDelete(id: string, deletedBy?: string, session?: ClientSession) {
    const doc = await this.reservation.findById(id).exec();
    if (!doc) return null;

    if (session) {
      await (
        doc as unknown as {
          delete: (
            by?: string,
            opts?: { session: ClientSession }
          ) => Promise<unknown>;
        }
      ).delete(deletedBy, { session });
    } else {
      await (
        doc as unknown as { delete: (by?: string) => Promise<unknown> }
      ).delete(deletedBy);
    }

    return doc;
  }

  /**
   * Count active reservations for a given facility, date, and time slot to verify capacity.
   */
  async countBookedInTimeSlot(
    facilityId: string,
    checkInDate: Date,
    checkInTimeSlot: string,
    session?: ClientSession
  ): Promise<number> {
    const startOfDay = startOfDayVN(checkInDate);
    const endOfDay = endOfDayVN(checkInDate);

    const query = this.reservation.countDocuments({
      facilityId,
      checkInDate: { $gte: startOfDay, $lte: endOfDay },
      checkInTimeSlot: checkInTimeSlot.trim(),
      status: {
        $in: [
          ReservationStatusEnum.PENDING_PAYMENT,
          ReservationStatusEnum.PAYMENT_SUCCESSFUL,
          ReservationStatusEnum.CONFIRMED,
          ReservationStatusEnum.OVERDUE,
        ],
      },
      deleted: false,
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Finds all reservations that were confirmed but the customer never checked in on the scheduled date.
   */
  async findOverdueCheckIn(now: Date = new Date(), session?: ClientSession) {
    const startOfToday = startOfDayVN(now);

    const query = this.reservation.find({
      status: ReservationStatusEnum.CONFIRMED,
      checkInDate: { $lt: startOfToday },
      deleted: false,
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Finds all overdue reservations whose 24-hour grace period has expired (no-show).
   */
  async findNoShow(now: Date = new Date(), session?: ClientSession) {
    const query = this.reservation.find({
      status: ReservationStatusEnum.OVERDUE,
      graceExpiresAt: { $ne: null, $lt: now },
      arrivedAt: null,
      deleted: false,
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Finds paid reservations that have past checkInDate without confirmation.
   */
  async findPaidPastCheckIn(now: Date = new Date(), session?: ClientSession) {
    const startOfToday = startOfDayVN(now);

    const query = this.reservation.find({
      status: ReservationStatusEnum.PAYMENT_SUCCESSFUL,
      checkInDate: { $lt: startOfToday },
      deleted: false,
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Count active pending reservations for a customer.
   */
  async countActivePendingByCustomer(
    customerId: string,
    session?: ClientSession
  ): Promise<number> {
    const query = this.reservation.countDocuments({
      customerId,
      status: ReservationStatusEnum.PENDING_PAYMENT,
      deleted: false,
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Count all active reservations for a customer (pending, paid, confirmed, overdue).
   */
  async countActiveByCustomer(
    customerId: string,
    session?: ClientSession
  ): Promise<number> {
    const query = this.reservation.countDocuments({
      customerId,
      status: {
        $in: [
          ReservationStatusEnum.PENDING_PAYMENT,
          ReservationStatusEnum.PAYMENT_SUCCESSFUL,
          ReservationStatusEnum.CONFIRMED,
          ReservationStatusEnum.OVERDUE,
        ],
      },
      deleted: false,
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Atomically increment refundAmount and set refundStatus to PENDING (e.g. for late/orphaned payments).
   */
  async addRefundAmountAtomic(
    id: string,
    additionalAmount: number,
    session?: ClientSession
  ): Promise<IReservation | null> {
    const query = this.reservation.findByIdAndUpdate(
      id,
      {
        $inc: { refundAmount: additionalAmount },
        $set: { refundStatus: RefundStatusEnum.PENDING },
      },
      { returnDocument: 'after' }
    );
    if (session) {
      query.session(session);
    }
    return query.exec();
  }
}
