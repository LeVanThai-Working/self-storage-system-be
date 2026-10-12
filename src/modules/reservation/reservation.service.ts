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
  AssignStorageUnitRequest,
  CancelReservationRequest,
  ConfirmReservationRequest,
  CreateReservationRequest,
  RejectReservationRequest,
  ReservationQuery,
  UpdateReservationRequest,
} from './schemas/reservation.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { ReservationStatusEnum } from '../../common/enums/reservation.enum.ts';
import { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import { RoleEnum, UserStatusEnum } from '../../common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../../common/enums/facilityUnitTypeOffering.enum.ts';
import { FacilityAmenityOfferingStatusEnum } from '../../common/enums/facilityAmenityOffering.enum.ts';
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
    private readonly auditLogService?: AuditLogService,
    private readonly notificationService?: NotificationService
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

  // 1. Customer creates initial reservation (PENDING)
  async createReservation(
    customerId: string,
    data: CreateReservationRequest
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

    const offering = await this.offeringRepository.findById(
      data.facilityUnitTypeOfferingId
    );
    if (!offering) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Offering']);
    }
    if (
      String(offering.facilityId._id || offering.facilityId) !== data.facilityId
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'Offering does not belong to the specified facility',
      ]);
    }
    if (offering.status !== FacilityUnitTypeOfferingStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Offering']);
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startDate = new Date(data.startDate);
    if (startDate < now) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'Start date cannot be in the past',
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

    // Process amenities
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
          ) !== data.facilityId
        ) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
            'Amenity offering does not belong to the specified facility',
          ]);
        }
        if (
          amenityOffering.status !== FacilityAmenityOfferingStatusEnum.ACTIVE
        ) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, [
            'Amenity Offering',
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
    }

    const basePrice = offering.pricePerUnit;
    const depositMultiplier = offering.depositMultiplier || 1;
    const depositAmount = basePrice * depositMultiplier;
    const amenitiesTotal = parsedAmenities.reduce(
      (sum, a) => sum + a.totalPrice,
      0
    );
    const totalAmount = depositAmount + amenitiesTotal;

    const reservationCode = this.generateReservationCode();

    const created = await this.reservationRepository.create({
      reservationCode,
      customerId: new Types.ObjectId(customerId),
      facilityId: new Types.ObjectId(data.facilityId),
      facilityUnitTypeOfferingId: new Types.ObjectId(
        data.facilityUnitTypeOfferingId
      ),
      startDate,
      rentalDuration: data.rentalDuration,
      billingUnit: offering.billingUnit,
      basePrice,
      depositAmount,
      amenities: parsedAmenities,
      totalAmount,
      status: ReservationStatusEnum.PENDING,
      notes: data.notes || null,
    });

    const populated = await this.reservationRepository.findById(
      created._id.toString()
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
      `Yêu cầu đặt chỗ mới [${reservationCode}] đã được tiếp nhận`,
      `Yêu cầu đặt giữ chỗ [${reservationCode}] tại cơ sở "${facility.name}" đã được ghi nhận. Quản lý cơ sở sẽ xem xét và phản hồi trong thời gian sớm nhất.`,
      {
        reservationId: created._id.toString(),
        reservationCode,
        facilityId: data.facilityId,
      }
    );

    // Notify FM (In-App)
    this.notifyFacilityManager(
      data.facilityId,
      `Yêu cầu đặt giữ chỗ mới [${reservationCode}]`,
      `Khách hàng "${customer.name}" vừa gửi yêu cầu đặt chỗ mới [${reservationCode}] tại cơ sở "${facility.name}". Vui lòng tiếp nhận và xử lý.`,
      {
        reservationId: created._id.toString(),
        reservationCode,
        customerId,
        customerName: customer.name,
      }
    );

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

  // 3. Manager receives reservation (PENDING -> RECEIVED)
  async receiveReservation(
    id: string,
    managerId: string
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (reservation.status !== ReservationStatusEnum.PENDING) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    const updated = await this.reservationRepository.update(id, {
      status: ReservationStatusEnum.RECEIVED,
      receivedBy: new Types.ObjectId(managerId),
      receivedAt: new Date(),
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
      `Đơn đặt chỗ [${reservation.reservationCode}] đã được tiếp nhận xử lý`,
      `Đơn đặt chỗ [${reservation.reservationCode}] đã được cơ sở tiếp nhận và đang tiến hành kiểm tra xếp phòng kho cho bạn.`,
      { reservationId: id, reservationCode: reservation.reservationCode }
    );

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 4. Manager reviews & assigns physical storage unit (RECEIVED / PENDING -> PENDING_PAYMENT)
  @Transactional()
  async assignStorageUnit(
    id: string,
    managerId: string,
    data: AssignStorageUnitRequest,
    session?: ClientSession
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id, session);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (
      reservation.status !== ReservationStatusEnum.PENDING &&
      reservation.status !== ReservationStatusEnum.RECEIVED
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    const unit = await this.storageUnitRepository.findById(
      data.storageUnitId,
      session
    );
    if (!unit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }

    const facilityIdStr = String(
      reservation.facilityId._id || reservation.facilityId
    );
    if (String(unit.facilityId._id || unit.facilityId) !== facilityIdStr) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_306);
    }

    // Verify unitTypeId matches offering
    const offering = await this.offeringRepository.findById(
      String(
        reservation.facilityUnitTypeOfferingId._id ||
          reservation.facilityUnitTypeOfferingId
      )
    );
    if (
      !offering ||
      String(unit.unitTypeId._id || unit.unitTypeId) !==
        String(offering.unitTypeId._id || offering.unitTypeId)
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_306);
    }

    if (unit.status !== StorageUnitStatusEnum.AVAILABLE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_305);
    }

    // Atomic update storage unit to RESERVED
    await this.storageUnitRepository.updateById(
      data.storageUnitId,
      { status: StorageUnitStatusEnum.RESERVED },
      session
    );

    // Reserve amenity inventory
    for (const a of reservation.amenities) {
      const amenityOffering = await this.amenityOfferingRepository.findById(
        a.facilityAmenityOfferingId.toString(),
        session
      );
      if (amenityOffering) {
        await this.amenityOfferingRepository.updateById(
          amenityOffering._id.toString(),
          { inUseQuantity: amenityOffering.inUseQuantity + a.quantity },
          session
        );
      }
    }

    const holdingHours = data.holdingHours || 24;
    const expiresAt = new Date(Date.now() + holdingHours * 60 * 60 * 1000);

    const updatePayload: Partial<IReservation> = {
      storageUnitId: new Types.ObjectId(data.storageUnitId),
      assignedBy: new Types.ObjectId(managerId),
      assignedAt: new Date(),
      expiresAt,
      status: ReservationStatusEnum.PENDING_PAYMENT,
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
    });

    const customerIdStr = String(
      (reservation.customerId as { _id?: Types.ObjectId })._id ||
        reservation.customerId
    );

    this.notifyCustomer(
      customerIdStr,
      facilityIdStr,
      `Phòng kho đã được gán - Vui lòng thanh toán tiền cọc [${reservation.reservationCode}]`,
      `Đơn đặt chỗ [${reservation.reservationCode}] đã được xếp phòng "${unit.unitNumber}". Vui lòng thanh toán tiền cọc ${reservation.depositAmount.toLocaleString('vi-VN')} VNĐ trước ${expiresAt.toLocaleString('vi-VN')} để hoàn tất giữ chỗ.`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        storageUnitId: data.storageUnitId,
        unitNumber: unit.unitNumber,
        expiresAt: expiresAt.toISOString(),
      },
      NotificationPriorityEnum.URGENT
    );

    return validateResponse(reservationResponseSchema, formatted);
  }

  // 5. Manager rejects reservation (REJECTED)
  async rejectReservation(
    id: string,
    managerId: string,
    data: RejectReservationRequest
  ): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
    }

    if (
      reservation.status !== ReservationStatusEnum.PENDING &&
      reservation.status !== ReservationStatusEnum.RECEIVED
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_301);
    }

    const updated = await this.reservationRepository.update(id, {
      status: ReservationStatusEnum.REJECTED,
      rejectionReason: data.rejectionReason,
      assignedBy: new Types.ObjectId(managerId),
      assignedAt: new Date(),
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
      `Đơn đặt chỗ [${reservation.reservationCode}] đã bị từ chối`,
      `Rất tiếc, yêu cầu đặt chỗ [${reservation.reservationCode}] tại cơ sở đã bị từ chối. Lý do: ${data.rejectionReason}`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        rejectionReason: data.rejectionReason,
      },
      NotificationPriorityEnum.HIGH
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

    const updatePayload: Partial<IReservation> = {
      status: ReservationStatusEnum.CONFIRMED,
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
    });

    const customerIdStr = String(
      (reservation.customerId as { _id?: Types.ObjectId })._id ||
        reservation.customerId
    );
    const facilityIdStr = String(
      (reservation.facilityId as { _id?: Types.ObjectId })._id ||
        reservation.facilityId
    );
    const unitNumber = populated?.storageUnitId
      ? (populated.storageUnitId as { unitNumber?: string }).unitNumber || 'N/A'
      : 'N/A';

    this.notifyCustomer(
      customerIdStr,
      facilityIdStr,
      `Đơn đặt chỗ [${reservation.reservationCode}] đã được xác nhận chính thức`,
      `Đơn đặt chỗ [${reservation.reservationCode}] đã được cơ sở xác nhận thành công. Phòng kho "${unitNumber}" đã được khóa giữ chỗ sẵn sàng đón bạn.`,
      {
        reservationId: id,
        reservationCode: reservation.reservationCode,
        unitNumber,
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
}
