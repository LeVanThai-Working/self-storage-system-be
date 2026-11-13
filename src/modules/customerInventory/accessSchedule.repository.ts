import type { ClientSession, Types } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { AccessScheduleStaffLock } from './accessSchedule.model.ts';
import type { IAccessSchedule } from './accessSchedule.model.ts';
import { AccessScheduleStatusEnum } from '../../common/enums/customerInventory.enum.ts';
import { paginate } from '../../utils/pagination.util.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import { getVNDateString } from '../../utils/date.util.ts';
import crypto from 'node:crypto';

export class AccessScheduleRepository {
  constructor(
    private readonly accessScheduleModel: SoftDeleteModel<IAccessSchedule>,
    private readonly staffLockModel: typeof AccessScheduleStaffLock
  ) {}

  /**
   * Sinh mã lịch hẹn theo định dạng ACC-YYMMDD-XXXX
   */
  async lockStaff(staffId: string, session: ClientSession): Promise<void> {
    await this.staffLockModel.findOneAndUpdate(
      { _id: staffId },
      { $inc: { revision: 1 } },
      { upsert: true, session }
    );
  }
  async findStaffWorkload(
    staffId: string,
    excludedId: string,
    session: ClientSession
  ): Promise<IAccessSchedule[]> {
    return this.accessScheduleModel
      .find({
        _id: { $ne: excludedId },
        assignedStaffId: staffId,
        $or: [
          { status: AccessScheduleStatusEnum.CHECKED_IN },
          {
            status: AccessScheduleStatusEnum.PENDING,
            expiresAt: { $gte: new Date() },
          },
        ],
      })
      .session(session);
  }
  async atomicAssign(
    id: string,
    version: number,
    staffId: Types.ObjectId | null,
    name: string | null,
    actorId: Types.ObjectId,
    session: ClientSession
  ): Promise<IAccessSchedule | null> {
    return this.accessScheduleModel.findOneAndUpdate(
      {
        _id: id,
        status: AccessScheduleStatusEnum.PENDING,
        assignmentVersion: version,
        ...(staffId
          ? { assignedStaffId: null, expiresAt: { $gte: new Date() } }
          : { assignedStaffId: { $ne: null } }),
      },
      {
        $set: {
          assignedStaffId: staffId,
          assignedStaffNameSnapshot: name,
          assignedAt: staffId ? new Date() : null,
          assignedBy: actorId,
        },
        $inc: { assignmentVersion: 1 },
      },
      { returnDocument: 'after', session }
    );
  }
  async generateScheduleCode(session?: ClientSession): Promise<string> {
    const vnDate = getVNDateString(new Date()).replace(/-/g, '').slice(2); // YYMMDD
    const prefix = `ACC-${vnDate}-`;

    for (let attempts = 0; attempts < 5; attempts++) {
      const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const code = `${prefix}${randomSuffix}`;

      const existing = await this.accessScheduleModel
        .findOne({ scheduleCode: code })
        .session(session ?? null)
        .lean();

      if (!existing) {
        return code;
      }
    }

    return `${prefix}${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  }

  async create(
    data: Partial<IAccessSchedule>,
    session?: ClientSession
  ): Promise<IAccessSchedule> {
    const [created] = await this.accessScheduleModel.create([data], {
      session: session ?? null,
    });
    return created;
  }

  async findById(
    id: string,
    session?: ClientSession
  ): Promise<IAccessSchedule | null> {
    return this.accessScheduleModel
      .findById(id)
      .session(session ?? null)
      .populate('customerId', 'name email phone avatar')
      .populate(
        'contractId',
        'contractCode status startDate endDate rentedRackIds'
      )
      .populate('facilityId', 'name code city address')
      .populate('timeSlotId', 'slotName startTime endTime maxCapacity');
  }

  async findByScheduleCode(
    code: string,
    session?: ClientSession
  ): Promise<IAccessSchedule | null> {
    return this.accessScheduleModel
      .findOne({ scheduleCode: code.toUpperCase() })
      .session(session ?? null)
      .populate('customerId', 'name email phone')
      .populate(
        'contractId',
        'contractCode status startDate endDate rentedRackIds'
      )
      .populate('facilityId', 'name code city address');
  }

  async findByFacilityAndOtpHash(
    facilityId: string,
    otpHash: string,
    session?: ClientSession
  ): Promise<IAccessSchedule | null> {
    return this.accessScheduleModel
      .findOne({
        facilityId,
        otpHash,
        status: AccessScheduleStatusEnum.PENDING,
      })
      .session(session ?? null)
      .populate('customerId', 'name email phone')
      .populate(
        'contractId',
        'contractCode status startDate endDate rentedRackIds'
      )
      .populate('facilityId', 'name code city address')
      .populate('timeSlotId', 'slotName startTime endTime maxCapacity');
  }

  /**
   * Đếm số lịch hẹn đang chiếm capacity trong một ca cụ thể (PENDING hoặc CHECKED_IN)
   */
  async countActiveInTimeSlot(
    facilityId: string,
    scheduledDate: Date,
    timeSlotId: string,
    session?: ClientSession
  ): Promise<number> {
    return this.accessScheduleModel
      .countDocuments({
        facilityId,
        scheduledDate,
        timeSlotId,
        status: {
          $in: [
            AccessScheduleStatusEnum.PENDING,
            AccessScheduleStatusEnum.CHECKED_IN,
          ],
        },
      })
      .session(session ?? null);
  }

  /**
   * Kiểm tra khách hàng đã có lịch hẹn ACTIVE trong ca đó chưa (chống đặt trùng)
   */
  async findExistingActiveInTimeSlot(
    customerId: string,
    scheduledDate: Date,
    timeSlotId: string,
    session?: ClientSession
  ): Promise<IAccessSchedule | null> {
    return this.accessScheduleModel
      .findOne({
        customerId,
        scheduledDate,
        timeSlotId,
        status: {
          $in: [
            AccessScheduleStatusEnum.PENDING,
            AccessScheduleStatusEnum.CHECKED_IN,
          ],
        },
      })
      .session(session ?? null);
  }

  /**
   * Atomic check-in consumes the encrypted OTP and its lookup hash.
   */
  async atomicCheckIn(
    id: string,
    updateData: {
      checkedInAt: Date;
      checkedInBy: Types.ObjectId;
      assignmentVersion: number;
      assignedStaffNameSnapshot: string;
      assignedAt: Date;
      assignedBy: Types.ObjectId;
      staffNotes?: string | null;
    },
    session?: ClientSession
  ): Promise<IAccessSchedule | null> {
    return this.accessScheduleModel
      .findOneAndUpdate(
        {
          _id: id,
          status: AccessScheduleStatusEnum.PENDING,
          assignmentVersion: updateData.assignmentVersion,
          $or: [
            { assignedStaffId: null },
            { assignedStaffId: updateData.checkedInBy },
          ],
        },
        {
          $inc: { assignmentVersion: 1 },
          $set: {
            assignedStaffId: updateData.checkedInBy,
            assignedStaffNameSnapshot: updateData.assignedStaffNameSnapshot,
            assignedAt: updateData.assignedAt,
            assignedBy: updateData.assignedBy,
            status: AccessScheduleStatusEnum.CHECKED_IN,
            checkedInAt: updateData.checkedInAt,
            checkedInBy: updateData.checkedInBy,
            staffNotes: updateData.staffNotes ?? null,
            otpEncrypted: null,
            otpHash: null,
          },
        },
        { returnDocument: 'after', session: session ?? null }
      )
      .populate('customerId', 'name email phone')
      .populate(
        'contractId',
        'contractCode status startDate endDate rentedRackIds'
      )
      .populate('facilityId', 'name code city address');
  }

  /**
   * Cập nhật nguyên tử: Check-out khi khách rời kho
   */
  async atomicCheckOut(
    id: string,
    updateData: {
      checkedOutAt: Date;
      checkedOutBy: Types.ObjectId;
      staffNotes?: string | null;
    },
    session?: ClientSession
  ): Promise<IAccessSchedule | null> {
    const updateSet: Record<string, unknown> = {
      status: AccessScheduleStatusEnum.COMPLETED,
      checkedOutAt: updateData.checkedOutAt,
      checkedOutBy: updateData.checkedOutBy,
    };
    if (updateData.staffNotes) {
      updateSet.staffNotes = updateData.staffNotes;
    }

    return this.accessScheduleModel
      .findOneAndUpdate(
        {
          _id: id,
          status: AccessScheduleStatusEnum.CHECKED_IN,
          assignedStaffId: updateData.checkedOutBy,
          checkedInBy: updateData.checkedOutBy,
        },
        {
          $set: updateSet,
        },
        { returnDocument: 'after', session: session ?? null }
      )
      .populate('customerId', 'name email phone')
      .populate(
        'contractId',
        'contractCode status startDate endDate rentedRackIds'
      )
      .populate('facilityId', 'name code city address');
  }

  /**
   * Cập nhật nguyên tử: Khách hàng tự hủy lịch hẹn trước hạn
   */
  async atomicCancel(
    id: string,
    updateData: {
      cancelledAt: Date;
      cancelledReason?: string | null;
    },
    session?: ClientSession
  ): Promise<IAccessSchedule | null> {
    return this.accessScheduleModel
      .findOneAndUpdate(
        {
          _id: id,
          status: AccessScheduleStatusEnum.PENDING,
        },
        {
          $set: {
            status: AccessScheduleStatusEnum.CANCELLED,
            cancelledAt: updateData.cancelledAt,
            cancelledReason: updateData.cancelledReason ?? null,
            otpEncrypted: null,
            otpHash: null,
          },
        },
        { returnDocument: 'after', session: session ?? null }
      )
      .populate('customerId', 'name email phone')
      .populate(
        'contractId',
        'contractCode status startDate endDate rentedRackIds'
      )
      .populate('facilityId', 'name code city address');
  }

  /**
   * Tìm các lịch hẹn PENDING mà thời điểm hiện tại đã vượt quá expiresAt
   */
  async findExpiredPending(
    now: Date = new Date(),
    limit: number = 50
  ): Promise<IAccessSchedule[]> {
    return this.accessScheduleModel
      .find({
        status: AccessScheduleStatusEnum.PENDING,
        expiresAt: { $lt: now },
      })
      .limit(limit)
      .lean();
  }

  /**
   * Chuyển trạng thái NO_SHOW cho lịch hẹn quá hạn
   */
  async atomicMarkNoShow(
    id: string,
    session?: ClientSession
  ): Promise<IAccessSchedule | null> {
    return this.accessScheduleModel.findOneAndUpdate(
      {
        _id: id,
        status: AccessScheduleStatusEnum.PENDING,
      },
      {
        $set: {
          status: AccessScheduleStatusEnum.NO_SHOW,
          otpEncrypted: null,
          otpHash: null,
        },
      },
      { returnDocument: 'after', session: session ?? null }
    );
  }

  /**
   * Phân trang danh sách lịch hẹn
   */
  async findPaginated(
    filter: Record<string, unknown>,
    pagination: {
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<PaginatedData<IAccessSchedule>> {
    return paginate<IAccessSchedule>(this.accessScheduleModel, {
      page: pagination.page,
      limit: pagination.limit,
      sortBy: pagination.sortBy || 'createdAt',
      sortOrder: pagination.sortOrder || 'desc',
      filter,
      populate: [
        { path: 'customerId', select: 'name email phone' },
        {
          path: 'contractId',
          select: 'contractCode status startDate endDate rentedRackIds',
        },
        { path: 'facilityId', select: 'name code city address' },
        {
          path: 'timeSlotId',
          select: 'slotName startTime endTime maxCapacity',
        },
        { path: 'checkedInBy', select: 'name email' },
        { path: 'checkedOutBy', select: 'name email' },
      ],
    });
  }
}
