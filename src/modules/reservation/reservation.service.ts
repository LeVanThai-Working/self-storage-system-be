import crypto from 'crypto';
import { Types, type ClientSession } from 'mongoose';
import type { ReservationRepository } from './reservation.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { FacilityUnitTypeOfferingRepository } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import type { FacilityAmenityOfferingRepository } from '../facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import type { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { PaymentRepository } from '../payment/payment.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { FacilityTimeSlotRepository } from '../facilityTimeSlot/facilityTimeSlot.repository.ts';
import type { ReservationQueue } from './reservation.queue.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { NotificationService } from '../notification/notification.service.ts';
import type { IReservation, IReservationAmenity } from './reservation.model.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  reservationResponseSchema,
  type ReservationResponse,
} from './schemas/reservation.response.schema.ts';
import type {
  AssignReservationStaffRequest,
  CancelReservationRequest,
  ConfirmRefundRequest,
  ConfirmReservationRequest,
  CreateReservationRequest,
  ReassignStorageUnitRequest,
  ReservationQuery,
} from './schemas/reservation.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import {
  RefundStatusEnum,
  ReservationCancelSourceEnum,
  ReservationStatusEnum,
} from '../../common/enums/reservation.enum.ts';
import { ContractStatusEnum } from '../../common/enums/contract.enum.ts';
import { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import { RoleEnum, UserStatusEnum } from '../../common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../../common/enums/facilityUnitTypeOffering.enum.ts';
import {
  NotificationChannelEnum,
  NotificationPriorityEnum,
  NotificationTypeEnum,
} from '../../common/enums/notification.enum.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import {
  getReservationConfig,
  isDemoRefundSimulationEnabled,
} from '../../config/reservation.config.ts';
import {
  addDays,
  endOfDayVN,
  isSlotPassedTodayVN,
  startOfDayVN,
} from '../../utils/date.util.ts';
import type { RefundRequestService } from '../refundRequest/refundRequest.service.ts';
import { RefundReasonEnum } from '../../common/enums/refundRequest.enum.ts';

export class ReservationService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly facilityRepository: FacilityRepository,
    private readonly offeringRepository: FacilityUnitTypeOfferingRepository,
    private readonly amenityOfferingRepository: FacilityAmenityOfferingRepository,
    private readonly storageUnitRepository: StorageUnitRepository,
    private readonly userRepository: UserRepository,
    private readonly paymentRepository?: PaymentRepository,
    private readonly facilityTimeSlotRepository?: FacilityTimeSlotRepository,
    private readonly auditLogService?: AuditLogService,
    private readonly notificationService?: NotificationService,
    private readonly reservationQueue?: ReservationQueue,
    private readonly contractRepository?: ContractRepository,
    private readonly refundRequestService?: RefundRequestService
  ) {}

  private async generateUniqueReservationCode(
    session?: ClientSession
  ): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
      const code = `RES-${dateStr}-${randomHex}`;
      const exists = await this.reservationRepository.existsByCode(
        code,
        session
      );
      if (!exists) return code;
    }
    const fallbackHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `RES-${dateStr}-${fallbackHex}`;
  }

  private async releaseHold(
    reservation: IReservation,
    targetUnitStatus: StorageUnitStatusEnum = StorageUnitStatusEnum.AVAILABLE,
    session?: ClientSession
  ): Promise<void> {
    if (reservation.storageUnitId) {
      const unitIdStr = String(
        (reservation.storageUnitId as { _id?: Types.ObjectId })._id ||
          reservation.storageUnitId
      );
      await this.storageUnitRepository.releaseReservedUnitAtomic(
        unitIdStr,
        targetUnitStatus,
        session
      );
    }

    if (reservation.amenities && reservation.amenities.length > 0) {
      for (const a of reservation.amenities) {
        const offering = await this.amenityOfferingRepository.findById(
          a.facilityAmenityOfferingId.toString(),
          session
        );
        if (offering) {
          const isService =
            offering.amenityId &&
            typeof offering.amenityId === 'object' &&
            'type' in offering.amenityId &&
            (offering.amenityId as { type?: string }).type === 'service';

          if (!isService) {
            await this.amenityOfferingRepository.releaseAmenityQuantityAtomic(
              offering._id.toString(),
              a.quantity,
              session
            );
          }
        }
      }
    }

    if (this.paymentRepository) {
      await this.paymentRepository.cancelActiveByReservation(
        reservation._id.toString(),
        'Reservation hold released',
        session
      );
    }

    this.reservationQueue
      ?.removeExpireReservationJob(reservation._id.toString())
      .catch((err: Error) => {
        console.warn(
          '[ReservationService] Could not remove BullMQ job:',
          err.message
        );
      });
  }

  private async validateCheckInStaff(
    staffId: string,
    facilityId: string
  ): Promise<{ id: string; name: string; email: string }> {
    const staff = await this.userRepository.findById(staffId);
    if (!staff || staff.status !== UserStatusEnum.ACTIVE) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Assigned Staff',
      ]);
    }
    if (
      staff.role !== RoleEnum.FACILITY_STAFF &&
      staff.role !== RoleEnum.FACILITY_MANAGER
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_121, [
        'facility_staff or facility_manager',
      ]);
    }
    if (
      !staff.assignedFacilityId ||
      String(staff.assignedFacilityId) !== facilityId
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_122, [
        'Assigned Staff does not belong to this facility',
      ]);
    }
    return {
      id: String(staff._id),
      name: staff.name,
      email: staff.email,
    };
  }

  private async assertFacilityAccess(
    userId: string,
    userRole: string,
    facilityId: string
  ): Promise<void> {
    if (
      userRole === RoleEnum.SYSTEM_ADMIN ||
      userRole === RoleEnum.BUSINESS_OPS_MANAGER
    ) {
      return;
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
    }

    if (
      !user.assignedFacilityId ||
      String(user.assignedFacilityId) !== facilityId
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
    }
  }

  private formatReservation(doc: IReservation): ReservationResponse {
    const raw = (typeof doc.toObject === 'function'
      ? doc.toObject()
      : doc) as unknown as Record<string, unknown>;

    const formatUserSnap = (u: unknown) => {
      if (!u || typeof u !== 'object' || !('name' in u)) return null;
      const ur = u as Record<string, unknown>;
      return {
        id: String(ur._id || ur.id),
        name: String(ur.name),
        email: String(ur.email),
        phoneNumber: (ur.phoneNumber as string) ?? null,
        role: (ur.role as string) ?? null,
      };
    };

    const formatStorageUnitSnap = (s: unknown) => {
      if (!s || typeof s !== 'object' || !('unitNumber' in s)) return null;
      const sr = s as Record<string, unknown>;
      return {
        id: String(sr._id || sr.id),
        unitNumber: String(sr.unitNumber),
        floor: Number(sr.floor),
        zone: (sr.zone as string) ?? null,
        status: String(sr.status),
      };
    };

    const customerRaw = raw.customerId as Record<string, unknown> | undefined;
    const customerObj =
      customerRaw && typeof customerRaw === 'object' && 'name' in customerRaw
        ? {
            id: String(customerRaw._id || customerRaw.id),
            name: String(customerRaw.name),
            email: String(customerRaw.email),
            phoneNumber: (customerRaw.phoneNumber as string) ?? null,
            role: (customerRaw.role as string) ?? null,
          }
        : null;

    const facilityRaw = raw.facilityId as Record<string, unknown> | undefined;
    const facilityObj =
      facilityRaw && typeof facilityRaw === 'object' && 'name' in facilityRaw
        ? {
            id: String(facilityRaw._id || facilityRaw.id),
            name: String(facilityRaw.name),
            city: String(facilityRaw.city),
            address: String(facilityRaw.address),
            phone: (facilityRaw.phone as string) ?? null,
            email: (facilityRaw.email as string) ?? null,
            status: (facilityRaw.status as string) ?? null,
          }
        : null;

    const offeringRaw = raw.facilityUnitTypeOfferingId as
      Record<string, unknown> | undefined;
    const offeringObj =
      offeringRaw &&
      typeof offeringRaw === 'object' &&
      'pricePerUnit' in offeringRaw
        ? {
            id: String(offeringRaw._id || offeringRaw.id),
            unitTypeId: offeringRaw.unitTypeId
              ? String(offeringRaw.unitTypeId)
              : null,
            billingUnit: String(offeringRaw.billingUnit),
            pricePerUnit: Number(offeringRaw.pricePerUnit),
            depositMultiplier:
              offeringRaw.depositMultiplier !== undefined
                ? Number(offeringRaw.depositMultiplier)
                : null,
            minRentalDays:
              offeringRaw.minRentalDays !== undefined
                ? Number(offeringRaw.minRentalDays)
                : null,
            status: (offeringRaw.status as string) ?? null,
          }
        : null;

    const storageUnitObj = formatStorageUnitSnap(raw.storageUnitId);

    const customerIdStr =
      customerRaw && typeof customerRaw === 'object' && '_id' in customerRaw
        ? String(customerRaw._id)
        : String(raw.customerId);

    const facilityIdStr =
      facilityRaw && typeof facilityRaw === 'object' && '_id' in facilityRaw
        ? String(facilityRaw._id)
        : String(raw.facilityId);

    const offeringIdStr =
      offeringRaw && typeof offeringRaw === 'object' && '_id' in offeringRaw
        ? String(offeringRaw._id)
        : String(raw.facilityUnitTypeOfferingId);

    const storageUnitIdStr = raw.storageUnitId
      ? typeof raw.storageUnitId === 'object' &&
        '_id' in (raw.storageUnitId as Record<string, unknown>)
        ? String((raw.storageUnitId as Record<string, unknown>)._id)
        : String(raw.storageUnitId)
      : null;

    const rawAmenities =
      (raw.amenities as Array<Record<string, unknown>>) || [];

    const assignedStaffIdStr = raw.assignedStaffId
      ? typeof raw.assignedStaffId === 'object' &&
        '_id' in (raw.assignedStaffId as Record<string, unknown>)
        ? String((raw.assignedStaffId as Record<string, unknown>)._id)
        : String(raw.assignedStaffId)
      : null;

    const rawUnitHistory =
      (raw.unitChangeHistory as Array<Record<string, unknown>>) || [];
    const formattedUnitHistory = rawUnitHistory.map((item) => {
      const fromUnitIdStr =
        item.fromUnitId &&
        typeof item.fromUnitId === 'object' &&
        '_id' in item.fromUnitId
          ? String((item.fromUnitId as { _id: Types.ObjectId })._id)
          : String(item.fromUnitId);
      const toUnitIdStr =
        item.toUnitId &&
        typeof item.toUnitId === 'object' &&
        '_id' in item.toUnitId
          ? String((item.toUnitId as { _id: Types.ObjectId })._id)
          : String(item.toUnitId);
      return {
        fromUnitId: fromUnitIdStr,
        toUnitId: toUnitIdStr,
        fromUnit: formatStorageUnitSnap(item.fromUnitId),
        toUnit: formatStorageUnitSnap(item.toUnitId),
        reason: String(item.reason),
        changedBy: formatUserSnap(item.changedBy),
        changedAt:
          item.changedAt instanceof Date
            ? item.changedAt.toISOString()
            : new Date(String(item.changedAt)).toISOString(),
      };
    });

    return {
      id: String(raw._id),
      reservationCode: String(raw.reservationCode),
      customerId: customerIdStr,
      facilityId: facilityIdStr,
      facilityUnitTypeOfferingId: offeringIdStr,
      storageUnitId: storageUnitIdStr,
      startDate:
        raw.startDate instanceof Date
          ? raw.startDate.toISOString()
          : new Date(String(raw.startDate)).toISOString(),
      checkInDate:
        raw.checkInDate instanceof Date
          ? raw.checkInDate.toISOString()
          : raw.checkInDate
            ? new Date(String(raw.checkInDate)).toISOString()
            : new Date(String(raw.startDate)).toISOString(),
      checkInTimeSlot: String(raw.checkInTimeSlot || ''),
      rentalDuration: Number(raw.rentalDuration),
      billingUnit: raw.billingUnit as BillingUnitEnum,
      basePrice: Number(raw.basePrice),
      depositAmount: Number(raw.depositAmount),
      amenities: rawAmenities.map((a) => ({
        facilityAmenityOfferingId: String(a.facilityAmenityOfferingId),
        amenityId: String(a.amenityId),
        name: String(a.name),
        quantity: Number(a.quantity),
        pricePerUnit: Number(a.pricePerUnit),
        billingUnit: a.billingUnit as BillingUnitEnum,
        totalPrice: Number(a.totalPrice),
      })),
      totalAmount: Number(
        raw.totalAmount ?? raw.totalPeriodicPrice ?? raw.basePrice ?? 0
      ),
      status: raw.status as ReservationStatusEnum,
      expiresAt: raw.expiresAt
        ? raw.expiresAt instanceof Date
          ? raw.expiresAt.toISOString()
          : new Date(String(raw.expiresAt)).toISOString()
        : null,
      graceExpiresAt: raw.graceExpiresAt
        ? raw.graceExpiresAt instanceof Date
          ? raw.graceExpiresAt.toISOString()
          : new Date(String(raw.graceExpiresAt)).toISOString()
        : null,
      confirmedBy: formatUserSnap(raw.confirmedBy),
      confirmedAt: raw.confirmedAt
        ? raw.confirmedAt instanceof Date
          ? raw.confirmedAt.toISOString()
          : new Date(String(raw.confirmedAt)).toISOString()
        : null,
      assignedStaffId: assignedStaffIdStr,
      assignedStaff: formatUserSnap(raw.assignedStaffId),
      assignedStaffAt: raw.assignedStaffAt
        ? raw.assignedStaffAt instanceof Date
          ? raw.assignedStaffAt.toISOString()
          : new Date(String(raw.assignedStaffAt)).toISOString()
        : null,
      cancellationReason: (raw.cancellationReason as string) ?? null,
      cancelledBy: formatUserSnap(raw.cancelledBy),
      cancelledAt: raw.cancelledAt
        ? raw.cancelledAt instanceof Date
          ? raw.cancelledAt.toISOString()
          : new Date(String(raw.cancelledAt)).toISOString()
        : null,
      cancellationSource:
        (raw.cancellationSource as ReservationCancelSourceEnum) ?? null,
      refundAmount: Number(raw.refundAmount ?? 0),
      forfeitedAmount: Number(raw.forfeitedAmount ?? 0),
      refundStatus:
        (raw.refundStatus as RefundStatusEnum) || RefundStatusEnum.NONE,
      refundedAt: raw.refundedAt
        ? raw.refundedAt instanceof Date
          ? raw.refundedAt.toISOString()
          : new Date(String(raw.refundedAt)).toISOString()
        : null,
      refundedBy: formatUserSnap(raw.refundedBy),
      refundReference: (raw.refundReference as string) ?? null,
      refundNote: (raw.refundNote as string) ?? null,
      paidAt: raw.paidAt
        ? raw.paidAt instanceof Date
          ? raw.paidAt.toISOString()
          : new Date(String(raw.paidAt)).toISOString()
        : null,
      paidAmount:
        raw.paidAmount !== undefined && raw.paidAmount !== null
          ? Number(raw.paidAmount)
          : null,
      paymentId: raw.paymentId ? String(raw.paymentId) : null,
      unitChangeHistory: formattedUnitHistory,
      notes: (raw.notes as string) ?? null,
      customer: customerObj,
      facility: facilityObj,
      offering: offeringObj,
      storageUnit: storageUnitObj,
      createdAt:
        raw.createdAt instanceof Date
          ? raw.createdAt.toISOString()
          : new Date(String(raw.createdAt)).toISOString(),
      updatedAt:
        raw.updatedAt instanceof Date
          ? raw.updatedAt.toISOString()
          : new Date(String(raw.updatedAt)).toISOString(),
    };
  }

  private notifyFacilityManager(
    facilityId: string,
    title: string,
    content: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.notificationService) return;
    try {
      this.facilityRepository
        .findById(facilityId)
        .then(async (facility) => {
          if (!facility) return;
          let managerId = facility.managerId
            ? String(
                (facility.managerId as { _id?: Types.ObjectId })._id ||
                  facility.managerId
              )
            : null;

          if (!managerId) {
            const managers = await this.userRepository.findUsersByRoles([
              RoleEnum.FACILITY_MANAGER,
            ]);
            const matched = managers.find(
              (m) => String(m.assignedFacilityId) === facilityId
            );
            if (matched) {
              managerId = String(matched._id);
            }
          }

          if (managerId) {
            await this.notificationService?.sendNotification({
              recipientId: managerId,
              facilityId,
              title,
              content,
              type: NotificationTypeEnum.RESERVATION,
              priority: NotificationPriorityEnum.HIGH,
              channels: [NotificationChannelEnum.IN_APP],
              metadata: {
                ...metadata,
                facilityId,
                facilityName: facility.name,
              },
            });
          }
        })
        .catch((err) => {
          console.warn(
            'Failed to notify facility manager:',
            err?.message || err
          );
        });
    } catch (err) {
      console.warn('Error initiating notification to facility manager:', err);
    }
  }

  private notifyAssignedStaff(
    staffId: string,
    facilityId: string,
    title: string,
    content: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.notificationService) return;
    try {
      this.notificationService
        .sendNotification({
          recipientId: staffId,
          facilityId,
          title,
          content,
          type: NotificationTypeEnum.RESERVATION,
          priority: NotificationPriorityEnum.HIGH,
          channels: [NotificationChannelEnum.IN_APP],
          metadata: {
            ...metadata,
            facilityId,
            staffId,
          },
        })
        .catch((err) => {
          console.warn('Failed to notify assigned staff:', err?.message || err);
        });
    } catch (err) {
      console.warn('Error initiating notification to assigned staff:', err);
    }
  }

  private notifyCustomer(
    customerId: string,
    facilityId: string,
    title: string,
    content: string,
    metadata?: Record<string, unknown>,
    priority: NotificationPriorityEnum = NotificationPriorityEnum.NORMAL,
    customChannels?: NotificationChannelEnum[]
  ): void {
    if (!this.notificationService) return;
    try {
      this.userRepository
        .findById(customerId)
        .then(async (customer) => {
          if (!customer) return;
          const channels = customChannels
            ? [...customChannels]
            : [NotificationChannelEnum.IN_APP];
          if (!customChannels && customer.email) {
            channels.push(NotificationChannelEnum.EMAIL);
          }
          await this.notificationService?.sendNotification({
            recipientId: customerId,
            facilityId,
            title,
            content,
            type: NotificationTypeEnum.RESERVATION,
            priority,
            channels,
            metadata: {
              ...metadata,
              facilityId,
              customerId,
              customerEmail: customer.email,
              email: customer.email,
            },
          });
        })
        .catch((err) => {
          console.warn('Failed to notify customer:', err?.message || err);
        });
    } catch (err) {
      console.warn('Error initiating notification to customer:', err);
    }
  }

  // 1. Customer creates reservation (locks unit & enters PENDING_PAYMENT)
  @Transactional()
  async createReservation(
    customerId: string,
    data: CreateReservationRequest,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const config = getReservationConfig();

    const customer = await this.userRepository.findById(customerId);
    if (!customer) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Customer']);
    }
    if (customer.status !== UserStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, [
        'Customer Account',
      ]);
    }

    // Limit active pending reservations per customer
    const activePendingCount =
      await this.reservationRepository.countActivePendingByCustomer(
        customerId,
        session
      );
    if (activePendingCount >= config.maxPendingPerCustomer) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_314);
    }

    // Limit total active reservations per customer
    const totalActiveCount =
      await this.reservationRepository.countActiveByCustomer(
        customerId,
        session
      );
    if (totalActiveCount >= config.maxActivePerCustomer) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_314);
    }

    const facility = await this.facilityRepository.findById(data.facilityId);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status !== FacilityStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Facility']);
    }

    const checkInDate = new Date(data.checkInDate);
    const todayVN = startOfDayVN();
    if (checkInDate < todayVN) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'Check-in date cannot be in the past',
      ]);
    }

    const maxAdvanceDate = addDays(todayVN, config.maxAdvanceDays);
    if (checkInDate > maxAdvanceDate) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_313);
    }

    const startDate = data.startDate ? new Date(data.startDate) : checkInDate;
    if (startDate < checkInDate) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'Start date cannot be earlier than check-in date',
      ]);
    }

    // Check if checkInTimeSlot has already passed today
    if (isSlotPassedTodayVN(checkInDate, data.checkInTimeSlot)) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_315);
    }

    // Validate Check-in Time Slot Capacity
    if (this.facilityTimeSlotRepository) {
      const slot =
        await this.facilityTimeSlotRepository.findByFacilityAndSlotName(
          data.facilityId,
          data.checkInTimeSlot
        );
      if (!slot || !slot.isActive) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_311, [
          data.checkInTimeSlot,
        ]);
      }

      const bookedCount =
        await this.reservationRepository.countBookedInTimeSlot(
          data.facilityId,
          checkInDate,
          data.checkInTimeSlot,
          session
        );
      if (bookedCount >= slot.maxCapacity) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_310, [
          data.checkInTimeSlot,
        ]);
      }
    }

    // Atomic Lock Storage Unit
    const unit = await this.storageUnitRepository.findAndReserveUnitAtomic(
      data.storageUnitId,
      data.facilityId,
      session
    );
    if (!unit) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_309, [
        'Storage unit has just been booked by another customer',
      ]);
    }

    const unitTypeIdStr = String(
      (unit.unitTypeId as { _id?: Types.ObjectId })._id || unit.unitTypeId
    );

    // Resolve FacilityUnitTypeOffering
    const offering = data.facilityUnitTypeOfferingId
      ? await this.offeringRepository.findById(
          data.facilityUnitTypeOfferingId,
          session
        )
      : await this.offeringRepository.findByFacilityAndUnitType(
          data.facilityId,
          unitTypeIdStr,
          session
        );

    if (!offering) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Offering']);
    }
    if (offering.status !== FacilityUnitTypeOfferingStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Offering']);
    }
    if (
      String(offering.facilityId._id || offering.facilityId) !== data.facilityId
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'Offering does not belong to the specified facility',
      ]);
    }

    // Critical validation: Storage Unit must match Offering Unit Type
    const offeringUnitTypeIdStr = String(
      (offering.unitTypeId as { _id?: Types.ObjectId })._id ||
        offering.unitTypeId
    );
    if (unitTypeIdStr !== offeringUnitTypeIdStr) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_306);
    }

    if (
      offering.minRentalDays &&
      data.rentalDuration < offering.minRentalDays
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        `Rental duration must be at least ${offering.minRentalDays} days`,
      ]);
    }

    // Process amenities atomically
    const parsedAmenities: IReservationAmenity[] = [];
    const seenAmenityIds = new Set<string>();

    if (data.amenities && data.amenities.length > 0) {
      for (const item of data.amenities) {
        if (seenAmenityIds.has(item.facilityAmenityOfferingId)) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
            'Duplicate amenity in request',
          ]);
        }
        seenAmenityIds.add(item.facilityAmenityOfferingId);

        const amenityOffering = await this.amenityOfferingRepository.findById(
          item.facilityAmenityOfferingId,
          session
        );
        if (!amenityOffering) {
          throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
            'Amenity Offering',
          ]);
        }

        const isService =
          amenityOffering.amenityId &&
          typeof amenityOffering.amenityId === 'object' &&
          'type' in amenityOffering.amenityId &&
          (amenityOffering.amenityId as { type?: string }).type === 'service';

        let reservedAmenity = amenityOffering;
        if (!isService) {
          const atomicReserved =
            await this.amenityOfferingRepository.reserveAmenityQuantityAtomic(
              item.facilityAmenityOfferingId,
              item.quantity,
              session
            );
          if (!atomicReserved) {
            const amenityName =
              amenityOffering.amenityId &&
              typeof amenityOffering.amenityId === 'object' &&
              'name' in amenityOffering.amenityId
                ? String(amenityOffering.amenityId.name)
                : 'Amenity';
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_307, [
              amenityName,
            ]);
          }
          reservedAmenity = atomicReserved;
        }

        const amenityName =
          reservedAmenity.amenityId &&
          typeof reservedAmenity.amenityId === 'object' &&
          'name' in reservedAmenity.amenityId
            ? String(reservedAmenity.amenityId.name)
            : 'Amenity';

        const totalPrice = reservedAmenity.pricePerUnit * item.quantity;
        parsedAmenities.push({
          facilityAmenityOfferingId: reservedAmenity._id,
          amenityId:
            typeof reservedAmenity.amenityId === 'object' &&
            '_id' in reservedAmenity.amenityId
              ? (reservedAmenity.amenityId as { _id: Types.ObjectId })._id
              : (reservedAmenity.amenityId as Types.ObjectId),
          name: amenityName,
          quantity: item.quantity,
          pricePerUnit: reservedAmenity.pricePerUnit,
          billingUnit: reservedAmenity.billingUnit,
          totalPrice,
        });
      }
    }

    const basePrice = offering.pricePerUnit;
    const depositMultiplier = offering.depositMultiplier || 1;
    const depositAmount = basePrice * depositMultiplier;
    // Total upfront amount to settle is the depositAmount (amenities are billed periodically in contract)
    const totalAmount = depositAmount;

    const expiresAt = new Date(Date.now() + config.holdMinutes * 60 * 1000);
    const reservationCode = await this.generateUniqueReservationCode(session);

    const created = await this.reservationRepository.create(
      {
        reservationCode,
        customerId: new Types.ObjectId(customerId),
        facilityId: new Types.ObjectId(data.facilityId),
        facilityUnitTypeOfferingId: offering._id,
        storageUnitId: unit._id,
        startDate,
        checkInDate,
        checkInTimeSlot: data.checkInTimeSlot.trim(),
        rentalDuration: data.rentalDuration,
        billingUnit: offering.billingUnit,
        basePrice,
        depositAmount,
        amenities: parsedAmenities,
        totalAmount,
        status: ReservationStatusEnum.PENDING_PAYMENT,
        refundStatus: RefundStatusEnum.NONE,
        forfeitedAmount: 0,
        expiresAt,
        notes: data.notes || null,
        unitChangeHistory: [],
      },
      session
    );

    const populated = await this.reservationRepository.findById(
      created._id.toString(),
      session
    );
    const formatted = this.formatReservation(populated || created);

    this.auditLogService?.record({
      action: AuditActionEnum.CREATE,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: created._id.toString(),
      after: formatted,
    });

    // Notify customer
    this.notifyCustomer(
      customerId,
      data.facilityId,
      `Khóa giữ chỗ thành công [${reservationCode}] - Vui lòng thanh toán cọc`,
      `Phòng kho "${unit.unitNumber}" đã được tạm khóa giữ chỗ cho bạn. Vui lòng hoàn tất thanh toán cọc ${depositAmount.toLocaleString('vi-VN')} VNĐ trong vòng ${config.holdMinutes} phút (trước ${expiresAt.toLocaleTimeString('vi-VN')}).`,
      {
        reservationId: created._id.toString(),
        reservationCode,
        facilityId: data.facilityId,
        storageUnitId: data.storageUnitId,
        unitNumber: unit.unitNumber,
        expiresAt: expiresAt.toISOString(),
      },
      NotificationPriorityEnum.URGENT
    );

    // Notify Facility Manager
    this.notifyFacilityManager(
      data.facilityId,
      `Đơn đặt chỗ mới đang chờ thanh toán [${reservationCode}]`,
      `Khách hàng "${customer.name}" vừa khóa giữ phòng "${unit.unitNumber}" cho khung giờ ${data.checkInTimeSlot} ngày ${checkInDate.toLocaleDateString('vi-VN')}.`,
      {
        reservationId: created._id.toString(),
        reservationCode,
        customerId,
        customerName: customer.name,
        storageUnitId: data.storageUnitId,
        unitNumber: unit.unitNumber,
      }
    );

    // Schedule BullMQ expiration job
    this.reservationQueue
      ?.addExpireReservationJob(
        created._id.toString(),
        config.holdMinutes * 60 * 1000
      )
      .catch((err: Error) => {
        console.error(
          '[ReservationService] Failed to schedule BullMQ expiration job:',
          err.message
        );
      });

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 2. Manager reassigns physical storage unit (PAYMENT_SUCCESSFUL or CONFIRMED)
  @Transactional()
  async reassignStorageUnit(
    id: string,
    actorId: string,
    actorRole: string,
    data: ReassignStorageUnitRequest,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (
      reservation.status !== ReservationStatusEnum.CONFIRMED &&
      reservation.status !== ReservationStatusEnum.PAYMENT_SUCCESSFUL &&
      reservation.status !== ReservationStatusEnum.OVERDUE
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );

    await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);

    // Reserve new unit
    const newUnit = await this.storageUnitRepository.findAndReserveUnitAtomic(
      data.newStorageUnitId,
      facilityIdStr,
      session
    );
    if (!newUnit) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_309, [
        'New storage unit is not available',
      ]);
    }

    const newUnitTypeId = String(
      (newUnit.unitTypeId as { _id?: Types.ObjectId })._id || newUnit.unitTypeId
    );

    // Check pricing offering for the new unit in this facility
    const newOffering = await this.offeringRepository.findByFacilityAndUnitType(
      facilityIdStr,
      newUnitTypeId,
      session
    );

    if (
      !newOffering ||
      newOffering.status !== FacilityUnitTypeOfferingStatusEnum.ACTIVE
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_306, [
        'New unit offering is not active in this facility',
      ]);
    }

    // Must be same tier or higher (free upgrade, cannot downgrade)
    if (newOffering.pricePerUnit < reservation.basePrice) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_316);
    }

    // Release old unit
    const oldUnitId = String(
      (reservation.storageUnitId as { _id?: Types.ObjectId })._id ||
        reservation.storageUnitId
    );
    const targetStatus =
      data.oldUnitStatus === 'available'
        ? StorageUnitStatusEnum.AVAILABLE
        : StorageUnitStatusEnum.UNDER_MAINTENANCE;

    await this.storageUnitRepository.releaseReservedUnitAtomic(
      oldUnitId,
      targetStatus,
      session
    );

    const changeHistoryEntry = {
      fromUnitId: new Types.ObjectId(oldUnitId),
      toUnitId: newUnit._id,
      reason: data.reason,
      changedBy: new Types.ObjectId(actorId),
      changedAt: new Date(),
    };

    const updated = await this.reservationRepository.update(
      id,
      {
        storageUnitId: newUnit._id,
        facilityUnitTypeOfferingId: newOffering._id,
        $push: { unitChangeHistory: changeHistoryEntry },
      } as unknown as Partial<IReservation>,
      session
    );

    const populated = await this.reservationRepository.findById(id, session);
    const formatted = this.formatReservation(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.REASSIGN_UNIT,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: id,
      before: this.formatReservation(reservation),
      after: formatted,
      metadata: {
        reason: data.reason,
        previousStorageUnitId: oldUnitId,
        newStorageUnitId: data.newStorageUnitId,
        previousOfferingId: String(
          (reservation.facilityUnitTypeOfferingId as { _id?: Types.ObjectId })
            ?._id || reservation.facilityUnitTypeOfferingId
        ),
        newOfferingId: String(newOffering._id),
        targetOldUnitStatus: targetStatus,
      },
    });

    const customerIdStr = String(
      (reservation.customerId as { _id?: Types.ObjectId })._id ||
        reservation.customerId
    );

    this.notifyCustomer(
      customerIdStr,
      facilityIdStr,
      `Thông báo điều chỉnh phòng kho [${reservation.reservationCode}]`,
      `Cơ sở đã hỗ trợ đổi sang phòng kho mới "${newUnit.unitNumber}" cho đơn [${reservation.reservationCode}] do: ${data.reason}. Lịch hẹn check-in của bạn không thay đổi.`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        newStorageUnitId: data.newStorageUnitId,
        unitNumber: newUnit.unitNumber,
      }
    );

    if (reservation.assignedStaffId) {
      const staffIdStr = String(
        (reservation.assignedStaffId as { _id?: Types.ObjectId })._id ||
          reservation.assignedStaffId
      );
      this.notifyAssignedStaff(
        staffIdStr,
        facilityIdStr,
        `Phòng kho đã được đổi: Đơn [${reservation.reservationCode}]`,
        `Đơn đặt chỗ [${reservation.reservationCode}] đã được đổi sang phòng kho "${newUnit.unitNumber}". Lý do: ${data.reason}.`,
        {
          reservationId: id,
          reservationCode: reservation.reservationCode,
          newStorageUnitId: data.newStorageUnitId,
          unitNumber: newUnit.unitNumber,
        }
      );
    }

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 3. Mark reservation deposit as paid (Called internally from Payment Service or Webhook)
  @Transactional()
  async markDepositPaid(
    id: string,
    paymentInfo: {
      paymentId: string;
      paidAmount: number;
      paidAt: Date;
      referenceCode?: string | null;
    },
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (reservation.status !== ReservationStatusEnum.PENDING_PAYMENT) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    if (reservation.expiresAt && new Date() > new Date(reservation.expiresAt)) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_304);
    }

    const updated = await this.reservationRepository.atomicUpdateStatus(
      id,
      ReservationStatusEnum.PENDING_PAYMENT,
      {
        status: ReservationStatusEnum.PAYMENT_SUCCESSFUL,
        paidAt: paymentInfo.paidAt,
        paidAmount: paymentInfo.paidAmount,
        paymentId: new Types.ObjectId(paymentInfo.paymentId),
        refundStatus: RefundStatusEnum.NONE,
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    const populated = await this.reservationRepository.findById(id, session);
    const formatted = this.formatReservation(populated || updated);

    this.auditLogService?.record({
      action: AuditActionEnum.RECEIVE_PAYMENT,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: id,
      before: this.formatReservation(reservation),
      after: formatted,
      metadata: {
        paymentId: paymentInfo.paymentId,
        paidAmount: paymentInfo.paidAmount,
        referenceCode: paymentInfo.referenceCode ?? null,
      },
    });

    this.reservationQueue
      ?.removeExpireReservationJob(id)
      .catch((err: Error) => {
        console.error(
          '[ReservationService] Failed to remove BullMQ expiration job:',
          err.message
        );
      });

    const customerIdStr = String(
      (reservation.customerId as { _id?: Types.ObjectId })._id ||
        reservation.customerId
    );
    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );

    this.notifyCustomer(
      customerIdStr,
      facilityIdStr,
      `Thanh toán tiền cọc thành công [${reservation.reservationCode}]`,
      `Bạn đã thanh toán thành công số tiền cọc ${(paymentInfo.paidAmount || reservation.depositAmount).toLocaleString('vi-VN')} VNĐ cho đơn [${reservation.reservationCode}]. Quản lý cơ sở sẽ sớm xác nhận đơn đặt chỗ.`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        paidAmount: paymentInfo.paidAmount,
      }
    );

    this.notifyFacilityManager(
      facilityIdStr,
      `Khách hàng đã thanh toán cọc [${reservation.reservationCode}]`,
      `Khách hàng đã hoàn tất thanh toán cọc cho đơn [${reservation.reservationCode}]. Vui lòng xác nhận đơn và phân công nhân viên hỗ trợ check-in khi khách đến.`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        customerId: customerIdStr,
        paidAmount: paymentInfo.paidAmount,
      }
    );

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 4. Staff officially confirms reservation (PAYMENT_SUCCESSFUL -> CONFIRMED)
  @Transactional()
  async confirmReservation(
    id: string,
    actorId: string,
    actorRole: string,
    data: ConfirmReservationRequest,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (reservation.status !== ReservationStatusEnum.PAYMENT_SUCCESSFUL) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    const todayVN = startOfDayVN();
    if (new Date(reservation.checkInDate) < todayVN) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_319);
    }

    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );

    await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);

    const staff = await this.validateCheckInStaff(
      data.assignedStaffId,
      facilityIdStr
    );

    const now = new Date();
    const updatePayload: Partial<IReservation> = {
      status: ReservationStatusEnum.CONFIRMED,
      assignedStaffId: new Types.ObjectId(data.assignedStaffId),
      assignedStaffAt: now,
      confirmedBy: new Types.ObjectId(actorId),
      confirmedAt: now,
    };
    if (data.notes) {
      updatePayload.notes = data.notes;
    }

    const updated = await this.reservationRepository.atomicUpdateStatus(
      id,
      ReservationStatusEnum.PAYMENT_SUCCESSFUL,
      updatePayload,
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    const populated = await this.reservationRepository.findById(id, session);
    const formatted = this.formatReservation(populated || updated);

    this.auditLogService?.record({
      action: AuditActionEnum.UPDATE,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: id,
      before: this.formatReservation(reservation),
      after: formatted,
      metadata: {
        assignedStaffId: data.assignedStaffId,
      },
    });

    const customerIdStr = String(
      (reservation.customerId as { _id?: Types.ObjectId })._id ||
        reservation.customerId
    );
    const unitNumber = populated?.storageUnitId
      ? (populated.storageUnitId as { unitNumber?: string }).unitNumber || 'N/A'
      : 'N/A';
    const checkInDateStr = reservation.checkInDate
      ? new Date(reservation.checkInDate).toLocaleDateString('vi-VN')
      : '';

    this.notifyAssignedStaff(
      data.assignedStaffId,
      facilityIdStr,
      `Phân công tiếp đón khách check-in [${reservation.reservationCode}]`,
      `Bạn được phân công tiếp đón khách hàng đến check-in nhận phòng kho "${unitNumber}" vào khung giờ ${reservation.checkInTimeSlot || ''} ngày ${checkInDateStr}.`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        unitNumber,
        checkInTimeSlot: reservation.checkInTimeSlot,
        checkInDate: checkInDateStr,
      }
    );

    this.notifyCustomer(
      customerIdStr,
      facilityIdStr,
      `Đơn đặt chỗ [${reservation.reservationCode}] đã được xác nhận chính thức`,
      `Đơn đặt chỗ [${reservation.reservationCode}] đã được cơ sở xác nhận thành công. Phòng kho "${unitNumber}" đã sẵn sàng đón bạn vào khung giờ ${reservation.checkInTimeSlot || ''} ngày ${checkInDateStr}. Nhân viên hỗ trợ: ${staff.name}.`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        unitNumber,
        staffName: staff.name,
      },
      NotificationPriorityEnum.HIGH
    );

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 5. Manager assigns staff for customer check-in
  @Transactional()
  async assignStaffToCheckIn(
    id: string,
    actorId: string,
    actorRole: string,
    data: AssignReservationStaffRequest,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (
      reservation.status !== ReservationStatusEnum.PAYMENT_SUCCESSFUL &&
      reservation.status !== ReservationStatusEnum.CONFIRMED
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301, [
        'Check-in staff can only be assigned after deposit payment is completed',
      ]);
    }

    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );

    await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);

    await this.validateCheckInStaff(data.staffId, facilityIdStr);

    const now = new Date();
    const updatePayload: Partial<IReservation> = {
      assignedStaffId: new Types.ObjectId(data.staffId),
      assignedStaffAt: now,
    };
    if (data.notes) {
      updatePayload.notes = data.notes;
    }

    const updated = await this.reservationRepository.update(
      id,
      updatePayload,
      session
    );
    const populated = await this.reservationRepository.findById(id, session);
    const formatted = this.formatReservation(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.UPDATE,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: id,
      before: this.formatReservation(reservation),
      after: formatted,
      metadata: {
        assignedStaffId: data.staffId,
        assignedBy: actorId,
      },
    });

    const unitNumber = populated?.storageUnitId
      ? (populated.storageUnitId as { unitNumber?: string }).unitNumber || 'N/A'
      : 'N/A';
    const customerName = populated?.customerId
      ? (populated.customerId as { name?: string }).name || 'Khách hàng'
      : 'Khách hàng';

    this.notifyAssignedStaff(
      data.staffId,
      facilityIdStr,
      `Nhiệm vụ check-in mới: Đơn đặt chỗ [${reservation.reservationCode}]`,
      `Quản lý cơ sở đã phân công bạn phụ trách check-in đón khách cho đơn đặt chỗ [${reservation.reservationCode}] (${customerName} - Phòng ${unitNumber}). Vui lòng chuẩn bị hỗ trợ khi khách đến.`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        unitNumber,
        customerName,
        notes: data.notes,
      }
    );

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 6. Cancel reservation with explicit refund policy & ownership
  @Transactional()
  async cancelReservation(
    id: string,
    actorId: string,
    actorRole: string,
    data: CancelReservationRequest,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    const customerIdStr = String(
      (reservation.customerId as { _id?: Types.ObjectId })._id ||
        reservation.customerId
    );
    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );

    const isCustomer = actorRole === RoleEnum.CUSTOMER;
    if (isCustomer && customerIdStr !== actorId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (!isCustomer) {
      await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);
    }

    // Check linked active contract
    if (this.contractRepository) {
      const linkedContract = await this.contractRepository.findByReservationId(
        id,
        session
      );
      if (
        linkedContract &&
        linkedContract.status !== ContractStatusEnum.CANCELLED
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_318);
      }
    }

    let refundAmount: number;
    let forfeitedAmount: number;
    let refundStatus: RefundStatusEnum;

    if (isCustomer) {
      if (reservation.status === ReservationStatusEnum.PENDING_PAYMENT) {
        refundAmount = 0;
        forfeitedAmount = 0;
        refundStatus = RefundStatusEnum.NONE;
      } else if (
        reservation.status === ReservationStatusEnum.PAYMENT_SUCCESSFUL ||
        reservation.status === ReservationStatusEnum.CONFIRMED
      ) {
        const config = getReservationConfig();
        const checkInTime = new Date(reservation.checkInDate).getTime();
        const nowTime = Date.now();
        const hoursRemaining = (checkInTime - nowTime) / (1000 * 60 * 60);

        if (hoursRemaining >= config.freeCancelHours) {
          refundAmount = reservation.depositAmount;
          forfeitedAmount = 0;
          refundStatus = RefundStatusEnum.PENDING;
        } else {
          refundAmount = 0;
          forfeitedAmount = reservation.depositAmount;
          refundStatus = RefundStatusEnum.NONE;
        }
      } else if (reservation.status === ReservationStatusEnum.OVERDUE) {
        refundAmount = 0;
        forfeitedAmount = reservation.depositAmount;
        refundStatus = RefundStatusEnum.NONE;
      } else {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_303);
      }
    } else {
      // Facility cancellation
      if (
        reservation.status === ReservationStatusEnum.CONFIRMED ||
        reservation.status === ReservationStatusEnum.OVERDUE
      ) {
        // RULE #1: Facility CANNOT cancel after CONFIRMED (must use reassign)
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_312);
      } else if (
        reservation.status === ReservationStatusEnum.PAYMENT_SUCCESSFUL
      ) {
        refundAmount = reservation.depositAmount;
        forfeitedAmount = 0;
        refundStatus = RefundStatusEnum.PENDING;
      } else if (reservation.status === ReservationStatusEnum.PENDING_PAYMENT) {
        refundAmount = 0;
        forfeitedAmount = 0;
        refundStatus = RefundStatusEnum.NONE;
      } else {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_303);
      }
    }

    const cancellationSource = isCustomer
      ? ReservationCancelSourceEnum.CUSTOMER
      : ReservationCancelSourceEnum.FACILITY;

    await this.releaseHold(
      reservation,
      StorageUnitStatusEnum.AVAILABLE,
      session
    );

    const updated = await this.reservationRepository.atomicUpdateStatus(
      id,
      reservation.status,
      {
        status: ReservationStatusEnum.CANCELLED,
        cancellationReason: data.cancellationReason,
        cancelledBy: new Types.ObjectId(actorId),
        cancelledAt: new Date(),
        cancellationSource,
        refundAmount,
        forfeitedAmount,
        refundStatus,
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_303);
    }

    if (refundAmount > 0 && this.refundRequestService) {
      await this.refundRequestService.createRefundRequestInternal(
        actorId,
        {
          reservationId: id,
          paymentId: reservation.paymentId
            ? String(reservation.paymentId)
            : undefined,
          facilityId: facilityIdStr,
          customerId: customerIdStr,
          amount: refundAmount,
          reason: isCustomer
            ? RefundReasonEnum.CUSTOMER_CANCEL
            : RefundReasonEnum.FACILITY_CANCEL,
          note: data.cancellationReason,
          refundBankName: data.refundBankName,
          refundAccountNumber: data.refundAccountNumber,
          refundAccountHolder: data.refundAccountHolder,
        },
        session
      );
    }

    const populated = await this.reservationRepository.findById(id, session);
    const formatted = this.formatReservation(populated || updated);

    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: id,
      before: this.formatReservation(reservation),
      after: formatted,
      metadata: {
        cancelledByRole: actorRole,
        cancellationSource,
        refundAmount,
        forfeitedAmount,
        refundStatus,
      },
    });

    if (isCustomer) {
      const refundSummary =
        refundAmount > 0
          ? `Số tiền hoàn cọc: ${refundAmount.toLocaleString('vi-VN')} VNĐ (đang ở trạng thái chờ hoàn cọc).`
          : forfeitedAmount > 0
            ? `Tiền cọc ${forfeitedAmount.toLocaleString('vi-VN')} VNĐ bị khấu trừ do hủy trong vòng ${getReservationConfig().freeCancelHours}h trước ngày nhận kho.`
            : '';

      this.notifyFacilityManager(
        facilityIdStr,
        `Khách hàng đã huỷ đơn đặt chỗ [${reservation.reservationCode}]`,
        `Khách hàng đã huỷ đơn đặt chỗ [${reservation.reservationCode}]. Phòng kho và tiện ích liên quan đã được tự động giải phóng.${refundAmount > 0 ? ` Số tiền chờ hoàn cọc: ${refundAmount.toLocaleString('vi-VN')} VNĐ.` : ''}`,
        {
          reservationId: id,
          reservationCode: reservation.reservationCode,
          cancellationReason: data.cancellationReason,
          refundAmount,
          forfeitedAmount,
        }
      );
      this.notifyCustomer(
        customerIdStr,
        facilityIdStr,
        `Đơn đặt chỗ [${reservation.reservationCode}] đã huỷ thành công`,
        `Đơn đặt chỗ [${reservation.reservationCode}] đã được huỷ theo yêu cầu của bạn. ${refundSummary}`,
        {
          reservationId: id,
          reservationCode: reservation.reservationCode,
          refundAmount,
          forfeitedAmount,
        }
      );
    } else {
      this.notifyCustomer(
        customerIdStr,
        facilityIdStr,
        `Đơn đặt chỗ [${reservation.reservationCode}] đã bị huỷ bởi cơ sở`,
        `Đơn đặt chỗ [${reservation.reservationCode}] đã bị huỷ bởi cơ sở. Lý do: ${data.cancellationReason}. Số tiền hoàn cọc: ${refundAmount.toLocaleString('vi-VN')} VNĐ.`,
        {
          reservationId: id,
          reservationCode: reservation.reservationCode,
          cancellationReason: data.cancellationReason,
          refundAmount,
        },
        NotificationPriorityEnum.HIGH
      );
    }

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 7. Staff/Manager confirms deposit refund has been disbursed (Demo or actual payout)
  @Transactional()
  async confirmRefund(
    id: string,
    actorId: string,
    actorRole: string,
    data: ConfirmRefundRequest,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const allowedRoles: string[] = [
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ];
    if (!allowedRoles.includes(actorRole as RoleEnum)) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
        'FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN',
      ]);
    }

    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );
    await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);

    if (!isDemoRefundSimulationEnabled()) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_321);
    }

    // Maker-Checker: Person confirming refund cannot be the person who confirmed manual payment
    if (reservation.paymentId && this.paymentRepository) {
      const payment = await this.paymentRepository.findById(
        String(reservation.paymentId),
        session
      );
      if (payment?.confirmedBy) {
        const paymentConfirmedByStr = String(
          (payment.confirmedBy as { _id?: Types.ObjectId })._id ||
            payment.confirmedBy
        );
        if (paymentConfirmedByStr === actorId) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_320);
        }
      }
    }

    if (
      (reservation.status !== ReservationStatusEnum.CANCELLED &&
        reservation.status !== ReservationStatusEnum.EXPIRED) ||
      reservation.refundStatus !== RefundStatusEnum.PENDING
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_317);
    }

    const now = new Date();
    const updated = await this.reservationRepository.update(
      id,
      {
        refundStatus: RefundStatusEnum.REFUNDED,
        refundedAt: now,
        refundedBy: new Types.ObjectId(actorId),
        refundReference: data.referenceCode || null,
        refundNote: data.notes || null,
      },
      session
    );

    const populated = await this.reservationRepository.findById(id, session);
    const formatted = this.formatReservation(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.REFUND,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: id,
      before: this.formatReservation(reservation),
      after: formatted,
      metadata: {
        refundReference: data.referenceCode,
        refundAmount: reservation.refundAmount,
      },
    });

    const customerIdStr = String(
      (reservation.customerId as { _id?: Types.ObjectId })._id ||
        reservation.customerId
    );

    this.notifyCustomer(
      customerIdStr,
      facilityIdStr,
      `Tiền hoàn cọc đã được chi trả [${reservation.reservationCode}]`,
      `Số tiền hoàn cọc ${(reservation.refundAmount || 0).toLocaleString('vi-VN')} VNĐ cho đơn [${reservation.reservationCode}] đã được cơ sở hoàn tất chi trả.${data.referenceCode ? ` Mã tham chiếu: ${data.referenceCode}.` : ''}`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        refundAmount: reservation.refundAmount,
        refundReference: data.referenceCode,
      }
    );

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 7b. Flag late or orphaned payment received on expired/cancelled reservation
  @Transactional()
  async flagOrphanedPayment(
    id: string,
    amount: number,
    paymentId?: string,
    referenceCode?: string | null,
    session?: ClientSession
  ): Promise<boolean> {
    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      return false;
    }

    const updated = await this.reservationRepository.addRefundAmountAtomic(
      id,
      amount,
      session
    );
    if (!updated) return false;

    this.auditLogService?.record({
      action: AuditActionEnum.REFUND,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: id,
      before: this.formatReservation(reservation),
      after: this.formatReservation(updated),
      metadata: {
        reason:
          'Orphaned/Late payment received after expiration or cancellation',
        amount,
        paymentId,
        referenceCode,
      },
    });

    const customerIdStr = String(
      (reservation.customerId as { _id?: Types.ObjectId })._id ||
        reservation.customerId
    );
    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );

    this.notifyCustomer(
      customerIdStr,
      facilityIdStr,
      `Ghi nhận giao dịch chuyển muộn [${reservation.reservationCode}]`,
      `Cơ sở đã ghi nhận khoản tiền ${amount.toLocaleString('vi-VN')} VNĐ bạn chuyển cho đơn đặt chỗ [${reservation.reservationCode}] sau khi đơn đã hết hạn. Khoản tiền này đang ở trạng thái chờ hoàn cọc.`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        amount,
        referenceCode,
      },
      NotificationPriorityEnum.HIGH
    );

    this.notifyFacilityManager(
      facilityIdStr,
      `Giao dịch thanh toán muộn cho đơn [${reservation.reservationCode}]`,
      `Khách hàng vừa chuyển ${amount.toLocaleString('vi-VN')} VNĐ cho đơn [${reservation.reservationCode}] đã hết hạn/huỷ. Hệ thống đã tự động đưa vào danh sách chờ hoàn tiền.`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        amount,
        paymentId,
        referenceCode,
      }
    );

    return true;
  }

  // 8. Automatically expire single reservation from BullMQ delayed job
  @Transactional()
  async expireSingleReservation(
    id: string,
    session?: ClientSession
  ): Promise<boolean> {
    const res = await this.reservationRepository.findById(id, session);
    if (!res) {
      return false;
    }

    if (res.status !== ReservationStatusEnum.PENDING_PAYMENT) {
      return false;
    }

    await this.releaseHold(res, StorageUnitStatusEnum.AVAILABLE, session);

    const updated = await this.reservationRepository.atomicUpdateStatus(
      id,
      ReservationStatusEnum.PENDING_PAYMENT,
      { status: ReservationStatusEnum.EXPIRED },
      session
    );

    if (!updated) return false;

    this.auditLogService?.record({
      action: AuditActionEnum.EXPIRE,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: id,
      before: this.formatReservation(res),
      after: this.formatReservation(updated),
    });

    const customerIdStr = String(
      (res.customerId as { _id?: Types.ObjectId })._id || res.customerId
    );
    const facilityIdStr = String(
      (res.facilityId as { _id?: Types.ObjectId })._id || res.facilityId
    );

    this.notifyCustomer(
      customerIdStr,
      facilityIdStr,
      `Đơn đặt chỗ [${res.reservationCode}] đã hết hạn giữ chỗ`,
      `Đơn đặt chỗ [${res.reservationCode}] đã tự động hết hạn do quá thời gian giữ chỗ thanh toán cọc. Phòng kho và tiện ích đã được giải phóng.`,
      {
        reservationId: res._id.toString(),
        reservationCode: res.reservationCode,
      },
      NotificationPriorityEnum.HIGH
    );

    return true;
  }

  // 9. Process expired reservations (batch fallback)
  @Transactional()
  async processExpiredReservations(
    session?: ClientSession
  ): Promise<{ processedCount: number }> {
    const expiredList = await this.reservationRepository.findExpired(
      new Date(),
      session
    );
    let count = 0;

    for (const res of expiredList) {
      const ok = await this.expireSingleReservation(
        res._id.toString(),
        session
      );
      if (ok) count++;
    }

    return { processedCount: count };
  }

  // 10. Process overdue check-ins & no-show auto cancellations
  @Transactional()
  async processOverdueReservations(session?: ClientSession): Promise<{
    overdueCount: number;
    noShowCount: number;
    unconfirmedCount: number;
  }> {
    const now = new Date();
    const config = getReservationConfig();
    let overdueCount = 0;
    let noShowCount = 0;
    let unconfirmedCount = 0;

    // Step 1: CONFIRMED past checkInDate -> OVERDUE with 24-hour grace period
    const overdueList = await this.reservationRepository.findOverdueCheckIn(
      now,
      session
    );
    for (const res of overdueList) {
      const graceExpiresAt = new Date(
        endOfDayVN(res.checkInDate).getTime() +
          config.overdueGraceHours * 3600 * 1000
      );

      const updated = await this.reservationRepository.atomicUpdateStatus(
        res._id.toString(),
        ReservationStatusEnum.CONFIRMED,
        {
          status: ReservationStatusEnum.OVERDUE,
          graceExpiresAt,
        },
        session
      );

      if (updated) {
        overdueCount++;
        this.auditLogService?.record({
          action: AuditActionEnum.MARK_OVERDUE,
          resourceType: AuditResourceEnum.RESERVATION,
          resourceId: res._id.toString(),
          before: this.formatReservation(res),
          after: this.formatReservation(updated),
          metadata: { graceExpiresAt: graceExpiresAt.toISOString() },
        });

        const customerIdStr = String(
          (res.customerId as { _id?: Types.ObjectId })._id || res.customerId
        );
        const facilityIdStr = String(
          (res.facilityId as { _id?: Types.ObjectId })._id || res.facilityId
        );

        this.notifyCustomer(
          customerIdStr,
          facilityIdStr,
          `Đơn đặt chỗ [${res.reservationCode}] đã quá hạn check-in`,
          `Đơn đặt chỗ [${res.reservationCode}] đã quá ngày hẹn check-in. Cơ sở hỗ trợ giữ chỗ thêm ${config.overdueGraceHours} giờ (trước ${graceExpiresAt.toLocaleString('vi-VN')}). Vui lòng liên hệ cơ sở để hoàn tất nhận kho trước khi hết hạn giữ.`,
          {
            reservationId: res._id.toString(),
            reservationCode: res.reservationCode,
            graceExpiresAt: graceExpiresAt.toISOString(),
          },
          NotificationPriorityEnum.HIGH
        );
      }
    }

    // Step 2: OVERDUE past graceExpiresAt -> CANCELLED (No-show, loss of deposit)
    const noShowList = await this.reservationRepository.findNoShow(
      now,
      session
    );
    for (const res of noShowList) {
      await this.releaseHold(res, StorageUnitStatusEnum.AVAILABLE, session);

      const updated = await this.reservationRepository.atomicUpdateStatus(
        res._id.toString(),
        ReservationStatusEnum.OVERDUE,
        {
          status: ReservationStatusEnum.CANCELLED,
          cancellationReason:
            'Quá hạn thời gian giữ kho 24h sau ngày hẹn check-in (No-show)',
          cancelledAt: now,
          cancellationSource: ReservationCancelSourceEnum.SYSTEM,
          refundAmount: 0,
          forfeitedAmount: res.depositAmount,
          refundStatus: RefundStatusEnum.NONE,
        },
        session
      );

      if (updated) {
        noShowCount++;
        this.auditLogService?.record({
          action: AuditActionEnum.CANCEL,
          resourceType: AuditResourceEnum.RESERVATION,
          resourceId: res._id.toString(),
          before: this.formatReservation(res),
          after: this.formatReservation(updated),
          metadata: {
            reason: 'No-show grace expired',
            forfeitedAmount: res.depositAmount,
          },
        });

        const customerIdStr = String(
          (res.customerId as { _id?: Types.ObjectId })._id || res.customerId
        );
        const facilityIdStr = String(
          (res.facilityId as { _id?: Types.ObjectId })._id || res.facilityId
        );

        this.notifyCustomer(
          customerIdStr,
          facilityIdStr,
          `Đơn đặt chỗ [${res.reservationCode}] đã bị huỷ do quá hạn (No-show)`,
          `Đơn đặt chỗ [${res.reservationCode}] đã tự động huỷ do quý khách không đến nhận kho sau thời gian hỗ trợ 24h. Tiền cọc ${(res.depositAmount || 0).toLocaleString('vi-VN')} VNĐ đã được khấu trừ theo quy định.`,
          {
            reservationId: res._id.toString(),
            reservationCode: res.reservationCode,
            forfeitedAmount: res.depositAmount,
          },
          NotificationPriorityEnum.HIGH
        );
      }
    }

    // Step 3: PAYMENT_SUCCESSFUL past checkInDate without confirmation -> System cancel & 100% refund
    const unconfirmedList =
      await this.reservationRepository.findPaidPastCheckIn(now, session);
    for (const res of unconfirmedList) {
      await this.releaseHold(res, StorageUnitStatusEnum.AVAILABLE, session);

      const updated = await this.reservationRepository.atomicUpdateStatus(
        res._id.toString(),
        ReservationStatusEnum.PAYMENT_SUCCESSFUL,
        {
          status: ReservationStatusEnum.CANCELLED,
          cancellationReason:
            'Đơn đã thanh toán nhưng quá ngày check-in chưa được cơ sở xác nhận (Hệ thống tự động hủy & hoàn cọc 100%)',
          cancelledAt: now,
          cancellationSource: ReservationCancelSourceEnum.SYSTEM,
          refundAmount: res.depositAmount,
          forfeitedAmount: 0,
          refundStatus: RefundStatusEnum.PENDING,
        },
        session
      );

      if (updated) {
        unconfirmedCount++;
        this.auditLogService?.record({
          action: AuditActionEnum.CANCEL,
          resourceType: AuditResourceEnum.RESERVATION,
          resourceId: res._id.toString(),
          before: this.formatReservation(res),
          after: this.formatReservation(updated),
          metadata: { reason: 'Unconfirmed past check-in auto-refund' },
        });

        const customerIdStr = String(
          (res.customerId as { _id?: Types.ObjectId })._id || res.customerId
        );
        const facilityIdStr = String(
          (res.facilityId as { _id?: Types.ObjectId })._id || res.facilityId
        );

        this.notifyCustomer(
          customerIdStr,
          facilityIdStr,
          `Đơn đặt chỗ [${res.reservationCode}] đã tự động huỷ & hoàn cọc`,
          `Đơn đặt chỗ [${res.reservationCode}] đã tự động huỷ do quá ngày hẹn check-in mà chưa hoàn tất thủ tục. Tiền cọc ${(res.depositAmount || 0).toLocaleString('vi-VN')} VNĐ đang được hoàn trả cho bạn.`,
          {
            reservationId: res._id.toString(),
            reservationCode: res.reservationCode,
            refundAmount: res.depositAmount,
          },
          NotificationPriorityEnum.HIGH
        );

        this.notifyFacilityManager(
          facilityIdStr,
          `Đơn [${res.reservationCode}] tự động huỷ & yêu cầu hoàn cọc`,
          `Đơn đặt chỗ [${res.reservationCode}] quá hạn check-in khi chưa được xác nhận. Hệ thống đã huỷ và mở trạng thái chờ hoàn cọc 100% cho khách hàng.`,
          {
            reservationId: res._id.toString(),
            reservationCode: res.reservationCode,
            refundAmount: res.depositAmount,
          }
        );
      }
    }

    return { overdueCount, noShowCount, unconfirmedCount };
  }

  // 11. View reservation details
  async getReservationById(
    id: string,
    callerId: string,
    callerRole: string
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    const customerIdStr = String(
      (reservation.customerId as { _id?: Types.ObjectId })._id ||
        reservation.customerId
    );
    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );

    if (callerRole === RoleEnum.CUSTOMER) {
      if (customerIdStr !== callerId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else {
      await this.assertFacilityAccess(callerId, callerRole, facilityIdStr);
    }

    return validateResponse(
      reservationResponseSchema,
      this.formatReservation(reservation)
    );
  }

  // 12. View reservations list
  async getReservations(
    query: ReservationQuery,
    callerId: string,
    callerRole: string
  ): Promise<PaginatedData<ReservationResponse>> {
    const effectiveQuery = { ...query };

    if (callerRole === RoleEnum.CUSTOMER) {
      effectiveQuery.customerId = callerId;
    } else if (
      callerRole === RoleEnum.FACILITY_MANAGER ||
      callerRole === RoleEnum.FACILITY_STAFF
    ) {
      const user = await this.userRepository.findById(callerId);
      if (!user?.assignedFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, [
          'Assigned Facility',
        ]);
      }
      effectiveQuery.facilityId = String(user.assignedFacilityId);
    }

    const result =
      await this.reservationRepository.findPaginated(effectiveQuery);

    return {
      items: result.items.map((d: IReservation) => this.formatReservation(d)),
      pagination: result.pagination,
    };
  }
}
