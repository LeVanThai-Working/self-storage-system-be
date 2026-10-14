import { Types, type ClientSession } from 'mongoose';
import type { ReservationRepository } from './reservation.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { FacilityUnitTypeOfferingRepository } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import type { FacilityAmenityOfferingRepository } from '../facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import type { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
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
  ConfirmReservationRequest,
  CreateReservationRequest,
  ReassignStorageUnitRequest,
  ReservationQuery,
  UpdateReservationRequest,
} from './schemas/reservation.request.schema.ts';
import type { FacilityTimeSlotRepository } from '../facilityTimeSlot/facilityTimeSlot.repository.ts';
import type { ReservationQueue } from './reservation.queue.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { ReservationStatusEnum } from '../../common/enums/reservation.enum.ts';
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
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { NotificationService } from '../notification/notification.service.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';

export class ReservationService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly facilityRepository: FacilityRepository,
    private readonly offeringRepository: FacilityUnitTypeOfferingRepository,
    private readonly amenityOfferingRepository: FacilityAmenityOfferingRepository,
    private readonly storageUnitRepository: StorageUnitRepository,
    private readonly userRepository: UserRepository,
    private readonly facilityTimeSlotRepository?: FacilityTimeSlotRepository,
    private readonly auditLogService?: AuditLogService,
    private readonly notificationService?: NotificationService,
    private readonly reservationQueue?: ReservationQueue
  ) {}

  private generateReservationCode(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RES-${dateStr}-${randomHex}`;
  }

  private formatReservation(doc: IReservation): ReservationResponse {
    const raw = (typeof doc.toObject === 'function'
      ? doc.toObject()
      : doc) as unknown as Record<string, unknown>;

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

    const storageUnitRaw = raw.storageUnitId as
      Record<string, unknown> | undefined;
    const storageUnitObj =
      storageUnitRaw &&
      typeof storageUnitRaw === 'object' &&
      'unitNumber' in storageUnitRaw
        ? {
            id: String(storageUnitRaw._id || storageUnitRaw.id),
            unitNumber: String(storageUnitRaw.unitNumber),
            floor: Number(storageUnitRaw.floor),
            zone: (storageUnitRaw.zone as string) ?? null,
            status: String(storageUnitRaw.status),
          }
        : null;

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
            : raw.startDate instanceof Date
              ? raw.startDate.toISOString()
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
      totalAmount: Number(raw.totalAmount),
      status: raw.status as ReservationStatusEnum,
      expiresAt: raw.expiresAt
        ? raw.expiresAt instanceof Date
          ? raw.expiresAt.toISOString()
          : new Date(String(raw.expiresAt)).toISOString()
        : null,
      receivedBy: formatUserSnap(raw.receivedBy),
      receivedAt: raw.receivedAt
        ? raw.receivedAt instanceof Date
          ? raw.receivedAt.toISOString()
          : new Date(String(raw.receivedAt)).toISOString()
        : null,
      assignedBy: formatUserSnap(raw.assignedBy),
      assignedAt: raw.assignedAt
        ? raw.assignedAt instanceof Date
          ? raw.assignedAt.toISOString()
          : new Date(String(raw.assignedAt)).toISOString()
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
      rejectionReason: (raw.rejectionReason as string) ?? null,
      cancellationReason: (raw.cancellationReason as string) ?? null,
      cancelledBy: formatUserSnap(raw.cancelledBy),
      cancelledAt: raw.cancelledAt
        ? raw.cancelledAt instanceof Date
          ? raw.cancelledAt.toISOString()
          : new Date(String(raw.cancelledAt)).toISOString()
        : null,
      refundAmount: Number(raw.refundAmount ?? 0),
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
      lastPaymentError: (raw.lastPaymentError as string) ?? null,
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

  // 1. Customer creates initial reservation (locks storage unit & enters PENDING_PAYMENT immediately)
  @Transactional()
  async createReservation(
    customerId: string,
    data: CreateReservationRequest,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const customer = await this.userRepository.findById(customerId);
    if (!customer) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Customer']);
    }
    if (customer.status !== UserStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, [
        'Customer Account',
      ]);
    }

    const facility = await this.facilityRepository.findById(data.facilityId);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status !== FacilityStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Facility']);
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkInDate = new Date(data.checkInDate);
    if (checkInDate < now) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'Check-in date cannot be in the past',
      ]);
    }

    const startDate = data.startDate ? new Date(data.startDate) : checkInDate;

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

    // Atomic Lock Storage Unit (Optimistic Concurrency Control)
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

    // Resolve FacilityUnitTypeOffering
    const unitTypeIdStr = String(
      (unit.unitTypeId as { _id?: Types.ObjectId })._id || unit.unitTypeId
    );
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

        const reservedAmenity =
          await this.amenityOfferingRepository.reserveAmenityQuantityAtomic(
            item.facilityAmenityOfferingId,
            item.quantity,
            session
          );
        if (!reservedAmenity) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_307, ['Amenity']);
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
    const amenitiesTotal = parsedAmenities.reduce(
      (sum, a) => sum + a.totalPrice,
      0
    );
    const totalAmount = depositAmount + amenitiesTotal;

    // 15-minute hold timer
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const reservationCode = this.generateReservationCode();

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
        expiresAt,
        notes: data.notes || null,
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

    // Notify customer (In-App + Email)
    this.notifyCustomer(
      customerId,
      data.facilityId,
      `Khóa giữ chỗ thành công [${reservationCode}] - Vui lòng thanh toán cọc`,
      `Phòng kho "${unit.unitNumber}" đã được tạm khóa giữ chỗ cho bạn. Vui lòng hoàn tất thanh toán cọc ${depositAmount.toLocaleString('vi-VN')} VNĐ trong vòng 15 phút (trước ${expiresAt.toLocaleTimeString('vi-VN')}).`,
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

    // Notify FM (In-App)
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

    // Dispatch delayed job to auto-release lock after 15 minutes via BullMQ
    this.reservationQueue
      ?.addExpireReservationJob(created._id.toString(), 15 * 60 * 1000)
      .catch((err: Error) => {
        console.error(
          '[ReservationService] Failed to schedule BullMQ expiration job:',
          err.message
        );
      });

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 2. Customer updates reservation (ONLY ALLOWED WHEN IN PENDING STATUS)
  async updateReservation(
    id: string,
    customerId: string,
    data: UpdateReservationRequest
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (
      String(reservation.customerId._id || reservation.customerId) !==
      customerId
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    // Rule: Only editable when in PENDING status
    if (reservation.status !== ReservationStatusEnum.PENDING) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_302);
    }

    const updatePayload: Partial<IReservation> = {};

    if (data.startDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const newStartDate = new Date(data.startDate);
      if (newStartDate < now) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
          'Start date cannot be in the past',
        ]);
      }
      updatePayload.startDate = newStartDate;
    }

    if (data.rentalDuration !== undefined) {
      const offering = await this.offeringRepository.findById(
        String(
          reservation.facilityUnitTypeOfferingId._id ||
            reservation.facilityUnitTypeOfferingId
        )
      );
      if (
        offering?.minRentalDays &&
        data.rentalDuration < offering.minRentalDays
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
          `Rental duration must be at least ${offering.minRentalDays} days`,
        ]);
      }
      updatePayload.rentalDuration = data.rentalDuration;
    }

    if (data.notes !== undefined) {
      updatePayload.notes = data.notes;
    }

    if (data.amenities !== undefined) {
      const facilityIdStr = String(
        reservation.facilityId._id || reservation.facilityId
      );
      const parsedAmenities: IReservationAmenity[] = [];
      const seenAmenityIds = new Set<string>();

      for (const item of data.amenities) {
        if (seenAmenityIds.has(item.facilityAmenityOfferingId)) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
            'Duplicate amenity in request',
          ]);
        }
        seenAmenityIds.add(item.facilityAmenityOfferingId);

        const amenityOffering = await this.amenityOfferingRepository.findById(
          item.facilityAmenityOfferingId
        );
        if (!amenityOffering) {
          throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
            'Amenity Offering',
          ]);
        }
        if (
          String(
            amenityOffering.facilityId._id || amenityOffering.facilityId
          ) !== facilityIdStr
        ) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
            'Amenity offering does not belong to the reservation facility',
          ]);
        }

        const availableQty =
          amenityOffering.totalQuantity - amenityOffering.inUseQuantity;
        if (availableQty < item.quantity) {
          const amenityName =
            amenityOffering.amenityId &&
            typeof amenityOffering.amenityId === 'object' &&
            'name' in amenityOffering.amenityId
              ? String(amenityOffering.amenityId.name)
              : 'Amenity';
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_307, [amenityName]);
        }

        const amenityName =
          amenityOffering.amenityId &&
          typeof amenityOffering.amenityId === 'object' &&
          'name' in amenityOffering.amenityId
            ? String(amenityOffering.amenityId.name)
            : 'Amenity';

        const totalPrice = amenityOffering.pricePerUnit * item.quantity;
        parsedAmenities.push({
          facilityAmenityOfferingId: amenityOffering._id,
          amenityId:
            typeof amenityOffering.amenityId === 'object' &&
            '_id' in amenityOffering.amenityId
              ? (amenityOffering.amenityId as { _id: Types.ObjectId })._id
              : (amenityOffering.amenityId as Types.ObjectId),
          name: amenityName,
          quantity: item.quantity,
          pricePerUnit: amenityOffering.pricePerUnit,
          billingUnit: amenityOffering.billingUnit,
          totalPrice,
        });
      }

      updatePayload.amenities = parsedAmenities;
      const amenitiesTotal = parsedAmenities.reduce(
        (sum, a) => sum + a.totalPrice,
        0
      );
      updatePayload.totalAmount = reservation.depositAmount + amenitiesTotal;
    }

    const updated = await this.reservationRepository.update(id, updatePayload);
    const populated = await this.reservationRepository.findById(id);
    const formatted = this.formatReservation(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.UPDATE,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: id,
      before: this.formatReservation(reservation),
      after: formatted,
    });

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 3. Manager reassigns physical storage unit when current unit encounters unexpected maintenance
  @Transactional()
  async reassignStorageUnit(
    id: string,
    managerId: string,
    data: ReassignStorageUnitRequest,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (
      reservation.status !== ReservationStatusEnum.CONFIRMED &&
      reservation.status !== ReservationStatusEnum.PAYMENT_SUCCESSFUL
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );

    // Atomic reserve new unit
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

    // Release old unit back to available
    if (reservation.storageUnitId) {
      const oldUnitId = String(
        (reservation.storageUnitId as { _id?: Types.ObjectId })._id ||
          reservation.storageUnitId
      );
      await this.storageUnitRepository.updateById(
        oldUnitId,
        { status: StorageUnitStatusEnum.AVAILABLE },
        session
      );
    }

    const updatedNotes = reservation.notes
      ? `${reservation.notes} | Đổi phòng kho: ${data.reason}`
      : `Đổi phòng kho: ${data.reason}`;

    const updated = await this.reservationRepository.update(
      id,
      {
        storageUnitId: newUnit._id,
        notes: updatedNotes,
      },
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
        reason: data.reason,
        previousStorageUnitId: reservation.storageUnitId,
        newStorageUnitId: data.newStorageUnitId,
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

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 6. Mark reservation deposit as paid (from Payment service or SePay Webhook)
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

    if (
      reservation.status !== ReservationStatusEnum.PENDING_PAYMENT &&
      reservation.status !== ReservationStatusEnum.PAYMENT_FAILED
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    if (reservation.expiresAt && new Date() > new Date(reservation.expiresAt)) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_304);
    }

    const updated = await this.reservationRepository.update(
      id,
      {
        status: ReservationStatusEnum.PAYMENT_SUCCESSFUL,
        paidAt: paymentInfo.paidAt,
        paidAmount: paymentInfo.paidAmount,
        paymentId: new Types.ObjectId(paymentInfo.paymentId),
        lastPaymentError: null,
      },
      session
    );

    const populated = await this.reservationRepository.findById(id, session);
    const formatted = this.formatReservation(populated || updated!);

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

    // Remove the delayed expiration job from BullMQ since payment is complete
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

    // Notify customer (In-App + Email)
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

    // Notify FM (In-App)
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

  // 7. Handle payment failure (PENDING_PAYMENT -> PAYMENT_FAILED)
  @Transactional()
  async handlePaymentFailure(
    id: string,
    errorReason?: string,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (reservation.status !== ReservationStatusEnum.PENDING_PAYMENT) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    const updated = await this.reservationRepository.update(
      id,
      {
        status: ReservationStatusEnum.PAYMENT_FAILED,
        lastPaymentError: errorReason || 'Payment failed',
      },
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
      metadata: { errorReason },
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
      `Thanh toán tiền cọc không thành công [${reservation.reservationCode}]`,
      `Giao dịch thanh toán cọc cho đơn [${reservation.reservationCode}] không thành công (${errorReason || 'Lỗi giao dịch'}). Bạn có thể thử lại trước hạn giữ chỗ.`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        errorReason,
      },
      NotificationPriorityEnum.NORMAL,
      [NotificationChannelEnum.IN_APP]
    );

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 8. Customer retries payment (PAYMENT_FAILED -> PENDING_PAYMENT)
  async retryPayment(
    id: string,
    customerId: string
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (
      String(reservation.customerId._id || reservation.customerId) !==
      customerId
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (reservation.status !== ReservationStatusEnum.PAYMENT_FAILED) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    if (reservation.expiresAt && new Date() > new Date(reservation.expiresAt)) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_304);
    }

    const updated = await this.reservationRepository.update(id, {
      status: ReservationStatusEnum.PENDING_PAYMENT,
    });

    const populated = await this.reservationRepository.findById(id);
    const formatted = this.formatReservation(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.UPDATE,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: id,
      before: this.formatReservation(reservation),
      after: formatted,
    });

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 9. Staff officially confirms reservation (PAYMENT_SUCCESSFUL -> CONFIRMED)
  async confirmReservation(
    id: string,
    staffId: string,
    data: ConfirmReservationRequest
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (reservation.status !== ReservationStatusEnum.PAYMENT_SUCCESSFUL) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    const staff = await this.userRepository.findById(data.assignedStaffId);
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

    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );
    if (
      staff.assignedFacilityId &&
      String(staff.assignedFacilityId) !== facilityIdStr
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_122, [
        'Assigned Staff does not belong to this facility',
      ]);
    }

    const updatePayload: Partial<IReservation> = {
      status: ReservationStatusEnum.CONFIRMED,
      assignedStaffId: new Types.ObjectId(data.assignedStaffId),
      assignedStaffAt: new Date(),
      confirmedBy: new Types.ObjectId(staffId),
      confirmedAt: new Date(),
    };
    if (data.notes) {
      updatePayload.notes = data.notes;
    }

    const updated = await this.reservationRepository.update(id, updatePayload);
    const populated = await this.reservationRepository.findById(id);
    const formatted = this.formatReservation(populated || updated!);

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

    // Notify assigned staff
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

    // Notify customer
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

  // 10. Cancel reservation (CANCELLED) & Deposit refund policy
  @Transactional()
  async cancelReservation(
    id: string,
    actorId: string,
    data: CancelReservationRequest,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    const cancellableStatuses = [
      ReservationStatusEnum.PENDING,
      ReservationStatusEnum.RECEIVED,
      ReservationStatusEnum.PENDING_PAYMENT,
      ReservationStatusEnum.PAYMENT_FAILED,
      ReservationStatusEnum.PAYMENT_SUCCESSFUL,
      ReservationStatusEnum.CONFIRMED,
    ];

    if (!cancellableStatuses.includes(reservation.status)) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_303);
    }

    // Cancellation refund policy
    let refundAmount = 0;
    if (reservation.status === ReservationStatusEnum.PAYMENT_SUCCESSFUL) {
      // Before CONFIRMED: 100% deposit refund
      refundAmount = reservation.depositAmount;
    } else if (reservation.status === ReservationStatusEnum.CONFIRMED) {
      // At or after CONFIRMED: 0% deposit refund (loss of deposit penalty)
      refundAmount = 0;
    }

    // Release storage unit if assigned
    if (reservation.storageUnitId) {
      const unitIdStr = String(
        (reservation.storageUnitId as { _id?: Types.ObjectId })._id ||
          reservation.storageUnitId
      );
      await this.storageUnitRepository.updateById(
        unitIdStr,
        { status: StorageUnitStatusEnum.AVAILABLE },
        session
      );
    }

    // Release amenity inventory if was reserved (PENDING_PAYMENT, PAYMENT_FAILED, PAYMENT_SUCCESSFUL, CONFIRMED)
    const hasReservedAmenities = [
      ReservationStatusEnum.PENDING_PAYMENT,
      ReservationStatusEnum.PAYMENT_FAILED,
      ReservationStatusEnum.PAYMENT_SUCCESSFUL,
      ReservationStatusEnum.CONFIRMED,
    ].includes(reservation.status);

    if (hasReservedAmenities && reservation.amenities) {
      for (const a of reservation.amenities) {
        const offering = await this.amenityOfferingRepository.findById(
          a.facilityAmenityOfferingId.toString(),
          session
        );
        if (offering) {
          const newQty = Math.max(0, offering.inUseQuantity - a.quantity);
          await this.amenityOfferingRepository.updateById(
            offering._id.toString(),
            { inUseQuantity: newQty },
            session
          );
        }
      }
    }

    const updated = await this.reservationRepository.update(
      id,
      {
        status: ReservationStatusEnum.CANCELLED,
        cancellationReason: data.cancellationReason,
        cancelledBy: new Types.ObjectId(actorId),
        cancelledAt: new Date(),
        refundAmount,
      },
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
    });

    const customerIdStr = String(
      (reservation.customerId as { _id?: Types.ObjectId })._id ||
        reservation.customerId
    );
    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );
    const isCustomerCancel = String(actorId) === customerIdStr;

    if (isCustomerCancel) {
      // Customer cancelled -> Notify FM (In-App)
      this.notifyFacilityManager(
        facilityIdStr,
        `Khách hàng đã huỷ đơn đặt chỗ [${reservation.reservationCode}]`,
        `Khách hàng đã huỷ đơn đặt chỗ [${reservation.reservationCode}]. Phòng kho và tiện ích liên quan đã được tự động giải phóng.`,
        {
          reservationId: id,
          reservationCode: reservation.reservationCode,
          cancellationReason: data.cancellationReason,
          refundAmount,
        }
      );
      // Notify customer (In-App + Email)
      this.notifyCustomer(
        customerIdStr,
        facilityIdStr,
        `Đơn đặt chỗ [${reservation.reservationCode}] đã huỷ thành công`,
        `Đơn đặt chỗ [${reservation.reservationCode}] đã được huỷ theo yêu cầu của bạn. Số tiền hoàn cọc: ${refundAmount.toLocaleString('vi-VN')} VNĐ.`,
        {
          reservationId: id,
          reservationCode: reservation.reservationCode,
          refundAmount,
        }
      );
    } else {
      // Facility cancelled -> Notify customer (In-App + Email)
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

  // Automatically expire single reservation from BullMQ delayed job
  @Transactional()
  async expireSingleReservation(
    id: string,
    session?: ClientSession
  ): Promise<boolean> {
    const res = await this.reservationRepository.findById(id, session);
    if (!res) {
      return false;
    }

    // Only expire if reservation is still waiting for deposit payment
    if (
      res.status !== ReservationStatusEnum.PENDING_PAYMENT &&
      res.status !== ReservationStatusEnum.PAYMENT_FAILED
    ) {
      return false;
    }

    if (res.storageUnitId) {
      const unitIdStr = String(
        (res.storageUnitId as { _id?: Types.ObjectId })._id || res.storageUnitId
      );
      await this.storageUnitRepository.updateById(
        unitIdStr,
        { status: StorageUnitStatusEnum.AVAILABLE },
        session
      );
    }

    if (res.amenities) {
      for (const a of res.amenities) {
        const offering = await this.amenityOfferingRepository.findById(
          a.facilityAmenityOfferingId.toString(),
          session
        );
        if (offering) {
          const newQty = Math.max(0, offering.inUseQuantity - a.quantity);
          await this.amenityOfferingRepository.updateById(
            offering._id.toString(),
            { inUseQuantity: newQty },
            session
          );
        }
      }
    }

    await this.reservationRepository.update(
      id,
      { status: ReservationStatusEnum.EXPIRED },
      session
    );

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
      `Đơn đặt chỗ [${res.reservationCode}] đã tự động hết hạn do quá thời gian giữ chỗ thanh toán cọc (15 phút). Phòng kho và tiện ích đã được giải phóng.`,
      {
        reservationId: res._id.toString(),
        reservationCode: res.reservationCode,
      },
      NotificationPriorityEnum.HIGH
    );

    return true;
  }

  // 11. Automatically handle expired reservations (EXPIRED)
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
      if (res.storageUnitId) {
        const unitIdStr = String(
          (res.storageUnitId as { _id?: Types.ObjectId })._id ||
            res.storageUnitId
        );
        await this.storageUnitRepository.updateById(
          unitIdStr,
          { status: StorageUnitStatusEnum.AVAILABLE },
          session
        );
      }

      if (res.amenities) {
        for (const a of res.amenities) {
          const offering = await this.amenityOfferingRepository.findById(
            a.facilityAmenityOfferingId.toString(),
            session
          );
          if (offering) {
            const newQty = Math.max(0, offering.inUseQuantity - a.quantity);
            await this.amenityOfferingRepository.updateById(
              offering._id.toString(),
              { inUseQuantity: newQty },
              session
            );
          }
        }
      }

      await this.reservationRepository.update(
        res._id.toString(),
        { status: ReservationStatusEnum.EXPIRED },
        session
      );
      count++;

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
    }

    return { processedCount: count };
  }

  // 12. View reservation details
  async getReservationById(
    id: string,
    callerId: string,
    callerRole: string
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    // Role-based scoping: customer can only view own reservation
    if (callerRole === RoleEnum.CUSTOMER) {
      const customerIdStr = String(
        reservation.customerId._id || reservation.customerId
      );
      if (customerIdStr !== callerId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    return validateResponse(
      reservationResponseSchema,
      this.formatReservation(reservation)
    );
  }

  // 13. View reservations list (pagination + scoped filters)
  async getReservations(
    query: ReservationQuery,
    callerId: string,
    callerRole: string
  ): Promise<PaginatedData<ReservationResponse>> {
    const effectiveQuery = { ...query };

    // Data scoping for customer
    if (callerRole === RoleEnum.CUSTOMER) {
      effectiveQuery.customerId = callerId;
    }

    const result =
      await this.reservationRepository.findPaginated(effectiveQuery);

    return {
      items: result.items.map((d: IReservation) => this.formatReservation(d)),
      pagination: result.pagination,
    };
  }

  // 14. Complete reservation (CONFIRMED -> COMPLETED)
  async completeReservation(
    id: string,
    actorId: string
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (reservation.status !== ReservationStatusEnum.CONFIRMED) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    const updated = await this.reservationRepository.update(id, {
      status: ReservationStatusEnum.COMPLETED,
    });

    const populated = await this.reservationRepository.findById(id);
    const formatted = this.formatReservation(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.UPDATE,
      resourceType: AuditResourceEnum.RESERVATION,
      resourceId: id,
      before: this.formatReservation(reservation),
      after: formatted,
      metadata: {
        completedBy: actorId,
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
      `Đơn đặt chỗ [${reservation.reservationCode}] đã hoàn tất thủ tục`,
      `Đơn đặt chỗ [${reservation.reservationCode}] của bạn đã hoàn tất thủ tục bàn giao. Chúc bạn có trải nghiệm tuyệt vời khi sử dụng dịch vụ kho tự quản!`,
      { reservationId: id, reservationCode: reservation.reservationCode }
    );

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 15. Manager assigns staff for customer check-in (PAYMENT_SUCCESSFUL or CONFIRMED)
  @Transactional()
  async assignStaffToCheckIn(
    id: string,
    managerId: string,
    data: AssignReservationStaffRequest,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    // Guard: Only allowed after deposit is paid (PAYMENT_SUCCESSFUL or CONFIRMED)
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

    // Validate staff exists, is ACTIVE, has role FACILITY_STAFF, and belongs to the same facility
    const staff = await this.userRepository.findById(data.staffId);
    if (!staff) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Staff']);
    }
    if (staff.status !== UserStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Staff']);
    }
    if (staff.role !== RoleEnum.FACILITY_STAFF) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_121, [
        'FACILITY_STAFF',
      ]);
    }
    if (
      !staff.assignedFacilityId ||
      String(staff.assignedFacilityId) !== facilityIdStr
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_122, ['Staff']);
    }

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
        assignedBy: managerId,
      },
    });

    // Notify assigned staff (In-App)
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

  // 15. Automatically handle overdue check-ins (CONFIRMED -> OVERDUE)
  @Transactional()
  async processOverdueReservations(
    session?: ClientSession
  ): Promise<{ processedCount: number }> {
    const overdueList = await this.reservationRepository.findOverdueCheckIn(
      new Date(),
      session
    );
    let count = 0;

    for (const res of overdueList) {
      await this.reservationRepository.update(
        res._id.toString(),
        { status: ReservationStatusEnum.OVERDUE },
        session
      );
      count++;

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
        `Đơn đặt chỗ [${res.reservationCode}] đã quá ngày hẹn check-in. Vui lòng liên hệ cơ sở để được hỗ trợ.`,
        {
          reservationId: res._id.toString(),
          reservationCode: res.reservationCode,
        },
        NotificationPriorityEnum.HIGH
      );
    }

    return { processedCount: count };
  }
}
