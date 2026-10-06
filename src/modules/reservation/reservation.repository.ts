import type { ClientSession, FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IReservation } from './reservation.model.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import { ReservationStatusEnum } from '../../common/enums/reservation.enum.ts';

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
  reservationCode?: string;
  startDateFrom?: string | Date;
  startDateTo?: string | Date;
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
      .populate('receivedBy', 'name email role')
      .populate('assignedBy', 'name email role')
      .populate('confirmedBy', 'name email role')
      .populate('cancelledBy', 'name email role');

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
      .populate('storageUnitId', 'unitNumber floor zone status');

    if (session) {
      query.session(session);
    }
    return query.exec();
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

    if (query.reservationCode) {
      filter.reservationCode = {
        $regex: query.reservationCode.trim(),
        $options: 'i',
      };
    }

    if (query.startDateFrom || query.startDateTo) {
      filter.startDate = {};
      if (query.startDateFrom) {
        filter.startDate.$gte = new Date(query.startDateFrom);
      }
      if (query.startDateTo) {
        filter.startDate.$lte = new Date(query.startDateTo);
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
        { path: 'receivedBy', select: 'name email role' },
        { path: 'assignedBy', select: 'name email role' },
        { path: 'confirmedBy', select: 'name email role' },
      ],
    });
  }

  async update(
    id: string,
    data: Partial<IReservation>,
    session?: ClientSession
  ) {
    const query = this.reservation.findByIdAndUpdate(id, data, { new: true });
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
      new: true,
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
      status: {
        $in: [
          ReservationStatusEnum.PENDING_PAYMENT,
          ReservationStatusEnum.PAYMENT_FAILED,
        ],
      },
      expiresAt: { $ne: null, $lt: now },
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
}
