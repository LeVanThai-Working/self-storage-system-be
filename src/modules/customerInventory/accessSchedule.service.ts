import crypto from 'node:crypto';
import { Types, type ClientSession } from 'mongoose';
import { isCheckInTimeValidationEnabled } from '../systemSettings/systemSettings.service.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import { encryptText, decryptText } from '../../utils/encryption.util.ts';
import { runAfterCommit } from '../../utils/transactionScope.util.ts';
import { NotificationTypeEnum } from '../../common/enums/notification.enum.ts';
import type {
  AssignAccessScheduleRequest,
  UnassignAccessScheduleRequest,
} from './schemas/accessSchedule.request.schema.ts';
import type { AccessScheduleRepository } from './accessSchedule.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { FacilityTimeSlotRepository } from '../facilityTimeSlot/facilityTimeSlot.repository.ts';
import type { StorageRackRepository } from '../storageRack/storageRack.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { NotificationService } from '../notification/notification.service.ts';
import type { IAccessSchedule } from './accessSchedule.model.ts';
import { AccessScheduleStatusEnum } from '../../common/enums/customerInventory.enum.ts';
import { ContractStatusEnum } from '../../common/enums/contract.enum.ts';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';
import { UserStatusEnum, RoleEnum } from '../../common/enums/user.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { ACCESS_SCHEDULE_CONFIG } from '../../config/accessSchedule.config.ts';
import {
  startOfDayVN,
  getVNDateString,
  isSlotPassedTodayVN,
} from '../../utils/date.util.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  accessScheduleDetailResponseSchema,
  accessScheduleCheckInResponseSchema,
  availableAccessSlotResponseSchema,
  paginatedAccessScheduleResponseSchema,
  type AccessScheduleDetailResponse,
  type AccessScheduleListItemResponse,
  type AccessScheduleCheckInResponse,
  type AvailableAccessSlotResponse,
  type RentedRackItemResponse,
} from './schemas/accessSchedule.response.schema.ts';
import type {
  CreateAccessScheduleRequest,
  CheckInAccessScheduleRequest,
  CheckOutAccessScheduleRequest,
  CancelAccessScheduleRequest,
  AvailableAccessSlotsQuery,
  AccessScheduleQuery,
} from './schemas/accessSchedule.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { z } from 'zod';

export interface CallerContext {
  userId: string;
  role: RoleEnum;
  assignedFacilityId?: string | null;
}

export class AccessScheduleService {
  constructor(
    private readonly accessScheduleRepository: AccessScheduleRepository,
    private readonly contractRepository: ContractRepository,
    private readonly facilityRepository: FacilityRepository,
    private readonly facilityTimeSlotRepository: FacilityTimeSlotRepository,
    private readonly storageRackRepository: StorageRackRepository,
    private readonly userRepository: UserRepository,
    private readonly auditLogService?: AuditLogService,
    private readonly notificationService?: NotificationService
  ) {}

  private notifyAssignment(schedule: IAccessSchedule, removed = false): void {
    runAfterCommit(async () => {
      await this.notificationService?.sendNotification({
        recipientId: String(schedule.customerId?._id || schedule.customerId),
        facilityId: String(schedule.facilityId?._id || schedule.facilityId),
        type: NotificationTypeEnum.ACCESS_SCHEDULE,
        title: removed ? 'Staff assignment updated' : 'Staff assigned',
        content: removed
          ? 'The facility is arranging another staff member for your visit.'
          : 'Your visit will be supervised by ' +
            schedule.assignedStaffNameSnapshot +
            '.',
        metadata: {
          accessScheduleId: String(schedule._id),
          scheduleCode: schedule.scheduleCode,
        },
      });
    });
  }
  private async assertWorkload(
    staffId: string,
    schedule: IAccessSchedule,
    session: ClientSession,
    checkingIn = false
  ): Promise<void> {
    const workload = await this.accessScheduleRepository.findStaffWorkload(
      staffId,
      String(schedule._id),
      session
    );
    if (
      workload.some(
        (other) =>
          (checkingIn &&
            other.status === AccessScheduleStatusEnum.CHECKED_IN) ||
          (getVNDateString(other.scheduledDate) ===
            getVNDateString(schedule.scheduledDate) &&
            other.timeSlotSnapshot.startTime <
              schedule.timeSlotSnapshot.endTime &&
            other.timeSlotSnapshot.endTime >
              schedule.timeSlotSnapshot.startTime)
      )
    )
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_661);
  }
  @Transactional()
  async assignSchedule(
    id: string,
    data: AssignAccessScheduleRequest | null,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<AccessScheduleDetailResponse> {
    const facilityId = await this.resolveCallerAssignedFacilityId(caller);
    if (
      !session ||
      !facilityId ||
      (data
        ? caller.role !== RoleEnum.FACILITY_MANAGER
        : caller.role !== RoleEnum.FACILITY_STAFF)
    )
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    const staffId = data?.staffId ?? caller.userId;
    await this.accessScheduleRepository.lockStaff(staffId, session);
    const schedule = await this.accessScheduleRepository.findById(id, session);
    if (!schedule) throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_651);
    if (String(schedule.facilityId?._id || schedule.facilityId) !== facilityId)
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    const staff = await this.userRepository.findById(staffId);
    if (
      !staff ||
      staff.deleted ||
      staff.status !== UserStatusEnum.ACTIVE ||
      staff.role !== RoleEnum.FACILITY_STAFF ||
      String(staff.assignedFacilityId) !== facilityId
    )
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    await this.assertWorkload(staffId, schedule, session);
    const updated = await this.accessScheduleRepository.atomicAssign(
      id,
      data?.assignmentVersion ?? schedule.assignmentVersion ?? 0,
      new Types.ObjectId(staffId),
      staff.name,
      new Types.ObjectId(caller.userId),
      session
    );
    if (!updated) throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_660);
    this.auditLogService?.record({
      action: AuditActionEnum.ASSIGN_ACCESS_SCHEDULE,
      resourceType: AuditResourceEnum.ACCESS_SCHEDULE,
      resourceId: id,
      before: schedule,
      after: updated,
    });
    this.notifyAssignment(updated);
    return this.formatDetail(updated);
  }
  @Transactional()
  async unassignSchedule(
    id: string,
    data: UnassignAccessScheduleRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<AccessScheduleDetailResponse> {
    const facilityId = await this.resolveCallerAssignedFacilityId(caller);
    if (!session || !facilityId || caller.role !== RoleEnum.FACILITY_MANAGER)
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    const schedule = await this.accessScheduleRepository.findById(id, session);
    if (!schedule) throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_651);
    if (String(schedule.facilityId?._id || schedule.facilityId) !== facilityId)
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    const updated = await this.accessScheduleRepository.atomicAssign(
      id,
      data.assignmentVersion,
      null,
      null,
      new Types.ObjectId(caller.userId),
      session
    );
    if (!updated) throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_660);
    this.auditLogService?.record({
      action: AuditActionEnum.UNASSIGN_ACCESS_SCHEDULE,
      resourceType: AuditResourceEnum.ACCESS_SCHEDULE,
      resourceId: id,
      before: schedule,
      after: updated,
      metadata: { reason: data.reason },
    });
    this.notifyAssignment(updated, true);
    return this.formatDetail(updated);
  }

  private hashOtp(otp: string): string {
    if (process.env.NODE_ENV === 'production' && !process.env.OTP_SECRET)
      throw new Error('OTP_SECRET is required');
    const secret = process.env.OTP_SECRET || 'self-storage-secret-key-2026';
    return crypto.createHmac('sha256', secret).update(otp.trim()).digest('hex');
  }

  /**
   * Tính toán các mốc thời gian: slotStart, expiresAt (ân hạn trễ 45p), earlyAllowed (sớm 30p), cancelDeadline (trước 1h)
   */
  private parseSlotTiming(
    scheduledDate: Date | string,
    startTime: string
  ): {
    slotStart: Date;
    earlyAllowed: Date;
    expiresAt: Date;
    cancelDeadline: Date;
  } {
    const dateStr = getVNDateString(scheduledDate);
    const slotStart = new Date(`${dateStr}T${startTime}:00.000+07:00`);

    const earlyAllowed = new Date(
      slotStart.getTime() -
        ACCESS_SCHEDULE_CONFIG.EARLY_CHECKIN_MINUTES * 60 * 1000
    );
    const expiresAt = new Date(
      slotStart.getTime() +
        ACCESS_SCHEDULE_CONFIG.GRACE_CHECKIN_MINUTES * 60 * 1000
    );
    const cancelDeadline = new Date(
      slotStart.getTime() -
        ACCESS_SCHEDULE_CONFIG.MIN_CANCEL_LEAD_HOURS * 60 * 60 * 1000
    );

    return { slotStart, earlyAllowed, expiresAt, cancelDeadline };
  }

  private async resolveCallerAssignedFacilityId(
    caller: CallerContext
  ): Promise<string | null> {
    if (caller.assignedFacilityId) {
      return String(caller.assignedFacilityId);
    }
    const userDoc = await this.userRepository.findById(caller.userId);
    if (userDoc?.assignedFacilityId) {
      return String(userDoc.assignedFacilityId);
    }
    const managedFacility = await this.facilityRepository.findByManagerId(
      caller.userId
    );
    if (managedFacility) {
      return String(managedFacility._id);
    }
    return null;
  }

  private formatDetail(
    schedule: IAccessSchedule,
    rawOtpCode?: string | null,
    rentedRacks?: RentedRackItemResponse[]
  ): AccessScheduleDetailResponse {
    const raw = (typeof schedule.toObject === 'function'
      ? schedule.toObject()
      : schedule) as unknown as Record<string, unknown>;

    const customerObj = raw.customerId as Record<string, unknown> | undefined;
    const contractObj = raw.contractId as Record<string, unknown> | undefined;
    const facilityObj = raw.facilityId as Record<string, unknown> | undefined;
    const inByObj = raw.checkedInBy as Record<string, unknown> | undefined;
    const outByObj = raw.checkedOutBy as Record<string, unknown> | undefined;

    return validateResponse(accessScheduleDetailResponseSchema, {
      id: String(raw._id || raw.id),
      scheduleCode: String(raw.scheduleCode),
      assignedStaffId: raw.assignedStaffId ? String(raw.assignedStaffId) : null,
      assignedStaffName: raw.assignedStaffNameSnapshot
        ? String(raw.assignedStaffNameSnapshot)
        : null,
      assignedAt: raw.assignedAt
        ? (raw.assignedAt as Date).toISOString()
        : null,
      assignmentVersion: Number(raw.assignmentVersion ?? 0),
      status: raw.status as AccessScheduleStatusEnum,
      customerId: String(customerObj?._id || raw.customerId),
      customerName: customerObj?.name ? String(customerObj.name) : null,
      customerPhone: customerObj?.phoneNumber
        ? String(customerObj.phoneNumber)
        : null,
      contractId: String(contractObj?._id || raw.contractId),
      contractCode: contractObj?.contractCode
        ? String(contractObj.contractCode)
        : null,
      facilityId: String(facilityObj?._id || raw.facilityId),
      facilityName: facilityObj?.name ? String(facilityObj.name) : null,
      facilityCode: facilityObj?.code ? String(facilityObj.code) : null,
      timeSlotId: String(
        (raw.timeSlotId as Record<string, unknown> | undefined)?._id ||
          raw.timeSlotId
      ),
      timeSlotSnapshot: raw.timeSlotSnapshot as {
        slotName: string;
        startTime: string;
        endTime: string;
      },
      scheduledDate: getVNDateString(raw.scheduledDate as Date),
      numberOfPeople: Number(raw.numberOfPeople ?? 1),
      vehicleType: raw.vehicleType ? String(raw.vehicleType) : null,
      vehiclePlate: raw.vehiclePlate ? String(raw.vehiclePlate) : null,
      purpose: raw.purpose ? String(raw.purpose) : null,
      rawOtpCode: rawOtpCode ?? null,
      expiresAt: (raw.expiresAt as Date).toISOString(),
      checkedInAt: raw.checkedInAt
        ? (raw.checkedInAt as Date).toISOString()
        : null,
      checkedInByName: inByObj?.name ? String(inByObj.name) : null,
      checkedOutAt: raw.checkedOutAt
        ? (raw.checkedOutAt as Date).toISOString()
        : null,
      checkedOutByName: outByObj?.name ? String(outByObj.name) : null,
      cancelledAt: raw.cancelledAt
        ? (raw.cancelledAt as Date).toISOString()
        : null,
      cancelledReason: raw.cancelledReason ? String(raw.cancelledReason) : null,
      staffNotes: raw.staffNotes ? String(raw.staffNotes) : null,
      rentedRacks: rentedRacks ?? [],
      createdAt: (raw.createdAt as Date).toISOString(),
      updatedAt: (raw.updatedAt as Date).toISOString(),
    });
  }

  private formatListItem(
    schedule: IAccessSchedule
  ): AccessScheduleListItemResponse {
    const raw = (typeof schedule.toObject === 'function'
      ? schedule.toObject()
      : schedule) as unknown as Record<string, unknown>;

    const customerObj = raw.customerId as Record<string, unknown> | undefined;
    const contractObj = raw.contractId as Record<string, unknown> | undefined;
    const facilityObj = raw.facilityId as Record<string, unknown> | undefined;
    const slotSnapshot = raw.timeSlotSnapshot as {
      slotName: string;
      startTime: string;
      endTime: string;
    };

    return {
      id: String(raw._id || raw.id),
      scheduleCode: String(raw.scheduleCode),
      assignedStaffId: raw.assignedStaffId ? String(raw.assignedStaffId) : null,
      assignedStaffName: raw.assignedStaffNameSnapshot
        ? String(raw.assignedStaffNameSnapshot)
        : null,
      assignedAt: raw.assignedAt
        ? (raw.assignedAt as Date).toISOString()
        : null,
      assignmentVersion: Number(raw.assignmentVersion ?? 0),
      status: raw.status as AccessScheduleStatusEnum,
      customerId: String(customerObj?._id || raw.customerId),
      customerName: customerObj?.name ? String(customerObj.name) : null,
      contractId: String(contractObj?._id || raw.contractId),
      contractCode: contractObj?.contractCode
        ? String(contractObj.contractCode)
        : null,
      facilityId: String(facilityObj?._id || raw.facilityId),
      facilityName: facilityObj?.name ? String(facilityObj.name) : null,
      slotName: slotSnapshot.slotName,
      startTime: slotSnapshot.startTime,
      endTime: slotSnapshot.endTime,
      scheduledDate: getVNDateString(raw.scheduledDate as Date),
      numberOfPeople: Number(raw.numberOfPeople ?? 1),
      vehiclePlate: raw.vehiclePlate ? String(raw.vehiclePlate) : null,
      expiresAt: (raw.expiresAt as Date).toISOString(),
      checkedInAt: raw.checkedInAt
        ? (raw.checkedInAt as Date).toISOString()
        : null,
      checkedOutAt: raw.checkedOutAt
        ? (raw.checkedOutAt as Date).toISOString()
        : null,
      createdAt: (raw.createdAt as Date).toISOString(),
    };
  }

  /**
   * Customer schedules a visit and receives a six-digit OTP.
   */
  async createAccessSchedule(
    data: CreateAccessScheduleRequest,
    caller: CallerContext
  ): Promise<AccessScheduleDetailResponse> {
    if (
      ![
        RoleEnum.CUSTOMER,
        RoleEnum.BUSINESS_OPS_MANAGER,
        RoleEnum.SYSTEM_ADMIN,
      ].includes(caller.role)
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }
    const contract = await this.contractRepository.findById(data.contractId);
    if (!contract || contract.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Contract']);
    }

    if (contract.status !== ContractStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_622);
    }

    const contractCustomerId = String(
      (contract.customerId as unknown as Record<string, unknown>)?._id ||
        contract.customerId
    );

    if (
      caller.role === RoleEnum.CUSTOMER &&
      contractCustomerId !== caller.userId
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const facilityId = String(
      (contract.facilityId as unknown as Record<string, unknown>)?._id ||
        contract.facilityId
    );

    const timeSlot = await this.facilityTimeSlotRepository.findById(
      data.timeSlotId
    );
    if (!timeSlot || timeSlot.deleted || !timeSlot.isActive) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Time Slot']);
    }

    if (String(timeSlot.facilityId) !== facilityId) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_658);
    }

    const targetDate = startOfDayVN(data.scheduledDate);
    const todayDate = startOfDayVN(new Date());

    if (targetDate.getTime() < todayDate.getTime()) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'Scheduled date cannot be in the past',
      ]);
    }

    if (isSlotPassedTodayVN(targetDate, timeSlot.startTime)) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_655);
    }

    const customerId = contractCustomerId;

    // Chống đặt trùng ca trong ngày
    const existingActive =
      await this.accessScheduleRepository.findExistingActiveInTimeSlot(
        customerId,
        targetDate,
        data.timeSlotId
      );
    if (existingActive) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_657);
    }

    // Kiểm tra sức chứa ca
    const currentBookedCount =
      await this.accessScheduleRepository.countActiveInTimeSlot(
        facilityId,
        targetDate,
        data.timeSlotId
      );

    if (currentBookedCount >= timeSlot.maxCapacity) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_652);
    }

    const { expiresAt } = this.parseSlotTiming(targetDate, timeSlot.startTime);

    const scheduleCode =
      await this.accessScheduleRepository.generateScheduleCode();
    let rawOtpCode = String(crypto.randomInt(100000, 1000000));
    const otpHash = this.hashOtp(rawOtpCode);

    const payload = {
      scheduleCode,
      status: AccessScheduleStatusEnum.PENDING,
      customerId: new Types.ObjectId(customerId),
      contractId: new Types.ObjectId(data.contractId),
      facilityId: new Types.ObjectId(facilityId),
      timeSlotId: new Types.ObjectId(data.timeSlotId),
      scheduledDate: targetDate,
      timeSlotSnapshot: {
        slotName: timeSlot.slotName,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
      },
      numberOfPeople: data.numberOfPeople ?? 1,
      vehicleType: data.vehicleType ?? null,
      vehiclePlate: data.vehiclePlate ?? null,
      purpose: data.purpose ?? null,
      otpEncrypted: encryptText(rawOtpCode),
      otpHash,
      expiresAt,
    };
    let created: IAccessSchedule | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        created = await this.accessScheduleRepository.create(payload);
        break;
      } catch (error: unknown) {
        if (
          !(error instanceof Error) ||
          !('code' in error) ||
          error.code !== 11000 ||
          attempt === 9
        )
          throw error;
        rawOtpCode = String(crypto.randomInt(100000, 1000000));
        payload.otpHash = this.hashOtp(rawOtpCode);
        payload.otpEncrypted = encryptText(rawOtpCode);
        payload.scheduleCode =
          await this.accessScheduleRepository.generateScheduleCode();
      }
    }
    if (!created) throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_660);

    this.auditLogService?.record({
      action: AuditActionEnum.CREATE_ACCESS_SCHEDULE,
      resourceType: AuditResourceEnum.ACCESS_SCHEDULE,
      resourceId: String(created._id),
      after: created,
    });

    const populated = await this.accessScheduleRepository.findById(
      String(created._id)
    );

    return this.formatDetail(
      populated!,
      caller.role === RoleEnum.CUSTOMER && caller.userId === customerId
        ? rawOtpCode
        : null
    );
  }

  /**
   * 2. Tra cứu danh sách ca trực và sức chứa khả dụng trong ngày tại cơ sở
   */
  async getAvailableSlots(
    query: AvailableAccessSlotsQuery
  ): Promise<AvailableAccessSlotResponse[]> {
    const facility = await this.facilityRepository.findById(query.facilityId);
    if (!facility || facility.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status !== FacilityStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Facility']);
    }

    const targetDate = startOfDayVN(query.date);
    const todayDate = startOfDayVN(new Date());

    const activeSlots = await this.facilityTimeSlotRepository.findByFacilityId(
      query.facilityId,
      true
    );

    const results: AvailableAccessSlotResponse[] = [];

    for (const slot of activeSlots) {
      const bookedCount =
        await this.accessScheduleRepository.countActiveInTimeSlot(
          query.facilityId,
          targetDate,
          String(slot._id)
        );

      const availableCapacity = Math.max(0, slot.maxCapacity - bookedCount);

      let isAvailable = availableCapacity > 0;
      if (targetDate.getTime() < todayDate.getTime()) {
        isAvailable = false;
      } else if (isSlotPassedTodayVN(targetDate, slot.startTime)) {
        isAvailable = false;
      }

      results.push({
        timeSlotId: String(slot._id),
        slotName: slot.slotName,
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxCapacity: slot.maxCapacity,
        bookedCount,
        availableCapacity: isAvailable ? availableCapacity : 0,
        isAvailable,
      });
    }

    return validateResponse(
      z.array(availableAccessSlotResponseSchema),
      results
    );
  }

  /**
   * Responsible staff verifies the OTP and supervises the visit.
   */
  async checkIn(
    data: CheckInAccessScheduleRequest,
    caller: CallerContext
  ): Promise<AccessScheduleCheckInResponse> {
    if (caller.role !== RoleEnum.FACILITY_STAFF)
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    const facilityId = await this.resolveCallerAssignedFacilityId(caller);
    if (!facilityId) throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    if (!/^\d{6}$/.test(data.code.trim()))
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_659);
    const candidate =
      await this.accessScheduleRepository.findByFacilityAndOtpHash(
        facilityId,
        this.hashOtp(data.code)
      );
    if (!candidate) throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_659);
    // Preserve the caller's original assignment version across transaction retries.
    const result = await this.checkInTransaction(
      data,
      caller,
      candidate.assignmentVersion ?? 0
    );
    if (result instanceof AppError) throw result;
    return result;
  }

  @Transactional()
  private async checkInTransaction(
    data: CheckInAccessScheduleRequest,
    caller: CallerContext,
    expectedAssignmentVersion: number,
    session?: ClientSession
  ): Promise<AccessScheduleCheckInResponse | AppError> {
    if (caller.role === RoleEnum.CUSTOMER) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const staffFacilityId = await this.resolveCallerAssignedFacilityId(caller);

    if (
      caller.role !== RoleEnum.SYSTEM_ADMIN &&
      caller.role !== RoleEnum.BUSINESS_OPS_MANAGER &&
      !staffFacilityId
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (caller.role !== RoleEnum.FACILITY_STAFF || !session)
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    const trimmed = data.code.trim();
    if (!/^\d{6}$/.test(trimmed))
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_659);
    await this.accessScheduleRepository.lockStaff(caller.userId, session);
    const schedule =
      await this.accessScheduleRepository.findByFacilityAndOtpHash(
        staffFacilityId!,
        this.hashOtp(trimmed),
        session
      );

    if (!schedule || schedule.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_659);
    }
    if ((schedule.assignmentVersion ?? 0) !== expectedAssignmentVersion)
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_660);

    // Kiểm tra phạm vi cơ sở
    const scheduleFacilityId = String(
      schedule.facilityId?._id || schedule.facilityId
    );
    if (staffFacilityId && scheduleFacilityId !== staffFacilityId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (schedule.status !== AccessScheduleStatusEnum.PENDING) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_653);
    }

    // Kiểm tra cửa sổ thời gian
    const { earlyAllowed, expiresAt } = this.parseSlotTiming(
      schedule.scheduledDate,
      schedule.timeSlotSnapshot.startTime
    );

    const now = new Date();

    const validateTime = await isCheckInTimeValidationEnabled();
    const scheduledDay = getVNDateString(schedule.scheduledDate);
    const today = getVNDateString(now);
    if (!validateTime && today !== scheduledDay) {
      throw new AppError(
        400,
        today < scheduledDay
          ? MESSAGE_CODE.MESSAGE_CODE_654
          : MESSAGE_CODE.MESSAGE_CODE_655
      );
    }
    if (validateTime && now.getTime() < earlyAllowed.getTime()) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_654);
    }

    if (validateTime && now.getTime() > expiresAt.getTime()) {
      const expired = await this.accessScheduleRepository.atomicMarkNoShow(
        String(schedule._id),
        session
      );
      if (expired)
        this.auditLogService?.record({
          actor: { id: 'SYSTEM', role: 'SYSTEM', email: null },
          action: AuditActionEnum.NO_SHOW_ACCESS_SCHEDULE,
          resourceType: AuditResourceEnum.ACCESS_SCHEDULE,
          resourceId: String(schedule._id),
          before: schedule,
          after: expired,
        });
      // Commit expiration and audit before the HTTP boundary reports the error.
      return new AppError(400, MESSAGE_CODE.MESSAGE_CODE_655);
    }

    if (
      schedule.assignedStaffId &&
      String(schedule.assignedStaffId) !== caller.userId
    )
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_662);
    await this.assertWorkload(caller.userId, schedule, session, true);
    const staff = await this.userRepository.findById(caller.userId);
    if (
      !staff ||
      staff.deleted ||
      staff.status !== UserStatusEnum.ACTIVE ||
      staff.role !== RoleEnum.FACILITY_STAFF ||
      String(staff.assignedFacilityId) !== staffFacilityId
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }
    const updated = await this.accessScheduleRepository.atomicCheckIn(
      String(schedule._id),
      {
        checkedInAt: now,
        checkedInBy: new Types.ObjectId(caller.userId),
        assignmentVersion: schedule.assignmentVersion ?? 0,
        assignedStaffNameSnapshot:
          schedule.assignedStaffNameSnapshot ?? staff.name,
        assignedAt: schedule.assignedAt ?? now,
        assignedBy: schedule.assignedBy ?? new Types.ObjectId(caller.userId),
        staffNotes: data.staffNotes ?? null,
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_653);
    }

    // Tra cứu danh sách kệ thuê của hợp đồng để bảo vệ điều phối
    const contractId = String(schedule.contractId?._id || schedule.contractId);
    const contract = await this.contractRepository.findById(contractId);
    const rentedRacks: RentedRackItemResponse[] = [];

    if (contract?.rentedRackIds?.length) {
      const rackDocs = await this.storageRackRepository.findByIds(
        contract.rentedRackIds.map(String)
      );
      for (const rack of rackDocs) {
        rentedRacks.push({
          rackId: String(rack._id),
          rackCode: rack.rackCode,
          aisle: rack.aisle ?? null,
          bay:
            rack.bay !== undefined && rack.bay !== null
              ? String(rack.bay)
              : null,
          zone: rack.zone ?? null,
        });
      }
    }

    this.auditLogService?.record({
      action: AuditActionEnum.CHECK_IN_ACCESS_SCHEDULE,
      resourceType: AuditResourceEnum.ACCESS_SCHEDULE,
      resourceId: String(updated._id),
      before: schedule,
      after: updated,
    });

    const populated = await this.accessScheduleRepository.findById(
      String(updated._id),
      session
    );

    if (!schedule.assignedStaffId) this.notifyAssignment(updated);
    return validateResponse(accessScheduleCheckInResponseSchema, {
      schedule: this.formatDetail(populated!, null, rentedRacks),
      rentedRacks,
      message: 'Check-in successful. Gate opened.',
    });
  }

  /**
   * 4. Nhân viên trực cổng quét Check-out khi khách rời kho
   */
  async checkOut(
    id: string,
    data: CheckOutAccessScheduleRequest,
    caller: CallerContext
  ): Promise<AccessScheduleDetailResponse> {
    if (caller.role === RoleEnum.CUSTOMER) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const staffFacilityId = await this.resolveCallerAssignedFacilityId(caller);

    const schedule = await this.accessScheduleRepository.findById(id);
    if (!schedule || schedule.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_651);
    }

    const scheduleFacilityId = String(
      schedule.facilityId?._id || schedule.facilityId
    );
    if (
      staffFacilityId &&
      scheduleFacilityId !== staffFacilityId &&
      caller.role !== RoleEnum.SYSTEM_ADMIN &&
      caller.role !== RoleEnum.BUSINESS_OPS_MANAGER
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (schedule.status !== AccessScheduleStatusEnum.CHECKED_IN) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_653);
    }

    if (
      caller.role !== RoleEnum.FACILITY_STAFF ||
      !staffFacilityId ||
      String(schedule.assignedStaffId) !== caller.userId ||
      String(schedule.checkedInBy?._id || schedule.checkedInBy) !==
        caller.userId
    )
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_662);
    const updated = await this.accessScheduleRepository.atomicCheckOut(id, {
      checkedOutAt: new Date(),
      checkedOutBy: new Types.ObjectId(caller.userId),
      staffNotes: data.staffNotes ?? null,
    });

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_653);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.CHECK_OUT_ACCESS_SCHEDULE,
      resourceType: AuditResourceEnum.ACCESS_SCHEDULE,
      resourceId: String(updated._id),
      before: schedule,
      after: updated,
    });

    const populated = await this.accessScheduleRepository.findById(id);
    return this.formatDetail(populated!);
  }

  /**
   * 5. Khách hàng tự hủy lịch hẹn trước giờ bắt đầu >= 1 tiếng
   */
  async cancelSchedule(
    id: string,
    data: CancelAccessScheduleRequest,
    caller: CallerContext
  ): Promise<AccessScheduleDetailResponse> {
    const schedule = await this.accessScheduleRepository.findById(id);
    if (!schedule || schedule.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_651);
    }

    const customerId = String(schedule.customerId?._id || schedule.customerId);

    if (caller.role === RoleEnum.CUSTOMER && customerId !== caller.userId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (schedule.status !== AccessScheduleStatusEnum.PENDING) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_653);
    }

    const { cancelDeadline } = this.parseSlotTiming(
      schedule.scheduledDate,
      schedule.timeSlotSnapshot.startTime
    );

    if (new Date().getTime() > cancelDeadline.getTime()) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_656);
    }

    const updated = await this.accessScheduleRepository.atomicCancel(id, {
      cancelledAt: new Date(),
      cancelledReason: data.reason ?? null,
    });

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_653);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL_ACCESS_SCHEDULE,
      resourceType: AuditResourceEnum.ACCESS_SCHEDULE,
      resourceId: String(updated._id),
      before: schedule,
      after: updated,
    });

    const populated = await this.accessScheduleRepository.findById(id);
    return this.formatDetail(populated!);
  }

  /**
   * 6. Job nền BullMQ quét tự động chuyển NO_SHOW các lịch quá hạn 45 phút chưa check-in
   */
  async processNoShowScan(): Promise<number> {
    if (!(await isCheckInTimeValidationEnabled())) return 0;
    const expiredList = await this.accessScheduleRepository.findExpiredPending(
      new Date(),
      100
    );

    let count = 0;
    for (const item of expiredList) {
      const updated = await this.accessScheduleRepository.atomicMarkNoShow(
        String(item._id)
      );
      if (updated) {
        count++;
        this.auditLogService?.record({
          actor: { id: 'SYSTEM', role: 'SYSTEM', email: null },
          action: AuditActionEnum.NO_SHOW_ACCESS_SCHEDULE,
          resourceType: AuditResourceEnum.ACCESS_SCHEDULE,
          resourceId: String(item._id),
          before: item,
          after: updated,
        });
      }
    }

    return count;
  }

  /**
   * 7. Tra cứu danh sách lịch ra vào kho phân trang (Scoped RBAC)
   */
  async getSchedules(
    query: AccessScheduleQuery,
    caller: CallerContext
  ): Promise<PaginatedData<AccessScheduleListItemResponse>> {
    const filter: Record<string, unknown> = {};

    if (caller.role === RoleEnum.CUSTOMER) {
      filter.customerId = caller.userId;
    } else if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const staffFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!staffFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
      filter.facilityId = staffFacilityId;
    } else {
      if (query.facilityId) filter.facilityId = query.facilityId;
      if (query.customerId) filter.customerId = query.customerId;
    }

    if (query.assignmentScope === 'mine')
      filter.assignedStaffId = caller.userId;
    if (query.assignmentScope === 'unassigned') filter.assignedStaffId = null;
    if (query.contractId) filter.contractId = query.contractId;
    if (query.status) filter.status = query.status;

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = startOfDayVN(query.startDate);
      if (query.endDate) dateFilter.$lte = startOfDayVN(query.endDate);
      filter.scheduledDate = dateFilter;
    }

    const paginated = await this.accessScheduleRepository.findPaginated(
      filter,
      {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }
    );

    const formattedData = paginated.items.map((item) =>
      this.formatListItem(item)
    );

    return validateResponse(paginatedAccessScheduleResponseSchema, {
      items: formattedData,
      pagination: paginated.pagination,
    });
  }

  /**
   * 8. Xem chi tiết một lịch hẹn (Scoped RBAC)
   */
  async getScheduleById(
    id: string,
    caller: CallerContext
  ): Promise<AccessScheduleDetailResponse> {
    const schedule = await this.accessScheduleRepository.findById(id);
    if (!schedule || schedule.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_651);
    }

    const customerId = String(schedule.customerId?._id || schedule.customerId);
    const scheduleFacilityId = String(
      schedule.facilityId?._id || schedule.facilityId
    );

    if (caller.role === RoleEnum.CUSTOMER && customerId !== caller.userId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (
      caller.role === RoleEnum.FACILITY_STAFF ||
      caller.role === RoleEnum.FACILITY_MANAGER
    ) {
      const staffFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!staffFacilityId || scheduleFacilityId !== staffFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    const contractId = String(schedule.contractId?._id || schedule.contractId);
    const contract = await this.contractRepository.findById(contractId);
    const rentedRacks: RentedRackItemResponse[] = [];

    if (contract?.rentedRackIds?.length) {
      const rackDocs = await this.storageRackRepository.findByIds(
        contract.rentedRackIds.map(String)
      );
      for (const rack of rackDocs) {
        rentedRacks.push({
          rackId: String(rack._id),
          rackCode: rack.rackCode,
          aisle: rack.aisle ?? null,
          bay:
            rack.bay !== undefined && rack.bay !== null
              ? String(rack.bay)
              : null,
          zone: rack.zone ?? null,
        });
      }
    }

    const otp =
      caller.role === RoleEnum.CUSTOMER &&
      schedule.status === AccessScheduleStatusEnum.PENDING &&
      new Date() <= schedule.expiresAt &&
      schedule.otpEncrypted
        ? decryptText(schedule.otpEncrypted)
        : null;
    return this.formatDetail(schedule, otp, rentedRacks);
  }
}
