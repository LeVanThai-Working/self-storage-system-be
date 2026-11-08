import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import {
  seedTestUsers,
  TEST_USERS,
  TEST_FACILITY_A_ID,
  TEST_FACILITY_B_ID,
} from './helpers/auth.helper.ts';
import { RegisterRoutes } from '../src/routes/routes.ts';
import { errorMiddleware } from '../src/middlewares/error.middleware.ts';
import { User } from '../src/modules/user/user.model.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import {
  Contract,
  type IContract,
} from '../src/modules/contract/contract.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import {
  StorageRack,
  type IStorageRack,
} from '../src/modules/storageRack/storageRack.model.ts';
import {
  FacilityTimeSlot,
  type IFacilityTimeSlot,
} from '../src/modules/facilityTimeSlot/facilityTimeSlot.model.ts';
import { AccessSchedule } from '../src/modules/customerInventory/accessSchedule.model.ts';
import { accessScheduleService } from '../src/modules/customerInventory/customerInventory.container.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import {
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  RackStatusEnum,
  RackZoneEnum,
} from '../src/common/enums/storageRack.enum.ts';
import { AccessScheduleStatusEnum } from '../src/common/enums/customerInventory.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { getVNDateString, addDays } from '../src/utils/date.util.ts';

describe('T-SMR.2: Access Schedule & Gate Check-in/Check-out Flow', () => {
  const facilityAId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const facilityBId = new Types.ObjectId(TEST_FACILITY_B_ID);

  const customer1Caller = {
    userId: TEST_USERS.customer1.id,
    role: RoleEnum.CUSTOMER,
  };
  const customer2Caller = {
    userId: TEST_USERS.customer2.id,
    role: RoleEnum.CUSTOMER,
  };
  const staffACaller = {
    userId: TEST_USERS.staffFacilityA.id,
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };
  const staffBCaller = {
    userId: TEST_USERS.staffFacilityB.id,
    role: RoleEnum.FACILITY_STAFF,
    assignedFacilityId: TEST_FACILITY_B_ID,
  };
  const managerACaller = {
    userId: TEST_USERS.managerFacilityA.id,
    role: RoleEnum.FACILITY_MANAGER,
    assignedFacilityId: TEST_FACILITY_A_ID,
  };
  const adminCaller = {
    userId: TEST_USERS.systemAdmin.id,
    role: RoleEnum.SYSTEM_ADMIN,
  };

  let activeContractA: IContract;
  let draftContractA: IContract;
  let timeSlot1A: IFacilityTimeSlot;
  let timeSlot2A: IFacilityTimeSlot;
  let rack1A: IStorageRack;
  let futureDateStr: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    futureDateStr = getVNDateString(addDays(new Date(), 2));

    await Facility.create([
      {
        _id: facilityAId,
        name: 'Chi nhánh Kho A',
        code: 'KHOA',
        city: 'TP.HCM',
        address: '123 Đường A',
        status: FacilityStatusEnum.ACTIVE,
      },
      {
        _id: facilityBId,
        name: 'Chi nhánh Kho B',
        code: 'KHOB',
        city: 'TP.HCM',
        address: '456 Đường B',
        status: FacilityStatusEnum.ACTIVE,
      },
    ]);

    // Create StorageUnit & StorageRack
    const unitA = await StorageUnit.create({
      facilityId: facilityAId,
      unitTypeId: new Types.ObjectId(),
      unitNumber: 'WR-01',
      floor: 1,
      zone: 'A',
      status: StorageUnitStatusEnum.OCCUPIED,
    });

    rack1A = await StorageRack.create({
      facilityId: facilityAId,
      storageUnitId: unitA._id,
      rackCode: 'R01',
      aisle: 'A1',
      bay: 1,
      zone: RackZoneEnum.STANDARD,
      status: RackStatusEnum.RENTED,
      tierCount: 4,
    });

    // Create TimeSlots for Facility A
    timeSlot1A = await FacilityTimeSlot.create({
      facilityId: facilityAId,
      slotName: 'Ca Sáng 08:00 - 10:00',
      startTime: '08:00',
      endTime: '10:00',
      maxCapacity: 2,
      isActive: true,
    });

    timeSlot2A = await FacilityTimeSlot.create({
      facilityId: facilityAId,
      slotName: 'Ca Trưa 10:00 - 12:00',
      startTime: '10:00',
      endTime: '12:00',
      maxCapacity: 1, // capacity = 1 to test slot full
      isActive: true,
    });

    // Create Contracts for Customer 1
    activeContractA = await Contract.create({
      contractCode: 'HD-ACTIVE-01',
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: facilityAId,
      storageUnitId: unitA._id,
      rentedRackIds: [rack1A._id],
      status: ContractStatusEnum.ACTIVE,
      source: ContractSourceEnum.RESERVATION,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-12-31'),
      rentalPrice: 2000000,
      totalPeriodicPrice: 2000000,
      depositAmount: 2000000,
      billingUnit: 'month',
      facilityUnitTypeOfferingId: new Types.ObjectId(),
    });

    draftContractA = await Contract.create({
      contractCode: 'HD-DRAFT-01',
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: facilityAId,
      storageUnitId: unitA._id,
      status: ContractStatusEnum.DRAFT,
      source: ContractSourceEnum.RESERVATION,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-12-31'),
      rentalPrice: 2000000,
      totalPeriodicPrice: 2000000,
      depositAmount: 2000000,
      billingUnit: 'month',
      facilityUnitTypeOfferingId: new Types.ObjectId(),
    });
  });

  describe('1. Đăng ký lịch vào kho (createAccessSchedule)', () => {
    it('cho phép khách hàng đặt lịch thành công với hợp đồng ACTIVE', async () => {
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
          numberOfPeople: 3,
          vehicleType: 'Xe tải 1.5T',
          vehiclePlate: '51C-123.45',
          purpose: 'Nhập hàng đợt 1',
        },
        customer1Caller
      );

      expect(schedule.id).toBeDefined();
      expect(schedule.scheduleCode).toMatch(/^ACC-\d{6}-[A-Z0-9]{4}$/);
      expect(schedule.status).toBe(AccessScheduleStatusEnum.PENDING);
      expect(schedule.qrPayload).toMatch(/^ACCESS:ACC-/);
      expect(schedule.rawOtpCode).toMatch(/^\d{6}$/);
      expect(schedule.numberOfPeople).toBe(3);
      expect(schedule.vehiclePlate).toBe('51C-123.45');
      expect(schedule.timeSlotSnapshot.slotName).toBe(timeSlot1A.slotName);
      expect(schedule.scheduledDate).toBe(futureDateStr);
    });

    it('chặn khách hàng đặt lịch với hợp đồng DRAFT (400 MESSAGE_CODE_622)', async () => {
      await expect(
        accessScheduleService.createAccessSchedule(
          {
            contractId: String(draftContractA._id),
            timeSlotId: String(timeSlot1A._id),
            scheduledDate: futureDateStr,
          },
          customer1Caller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_622,
        })
      );
    });

    it('chặn khách hàng đặt lịch cho hợp đồng của người khác (403 MESSAGE_CODE_103)', async () => {
      await expect(
        accessScheduleService.createAccessSchedule(
          {
            contractId: String(activeContractA._id),
            timeSlotId: String(timeSlot1A._id),
            scheduledDate: futureDateStr,
          },
          customer2Caller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );
    });

    it('chặn đặt lịch khi ca đã hết chỗ (400 MESSAGE_CODE_652)', async () => {
      // timeSlot2A có maxCapacity = 1
      await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot2A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      // Khách thứ hai cố đặt cùng ca trên cùng ngày
      const contract2 = await Contract.create({
        contractCode: 'HD-ACTIVE-02',
        customerId: new Types.ObjectId(TEST_USERS.customer2.id),
        facilityId: facilityAId,
        storageUnitId: activeContractA.storageUnitId,
        status: ContractStatusEnum.ACTIVE,
        source: ContractSourceEnum.RESERVATION,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-12-31'),
        rentalPrice: 2000000,
        totalPeriodicPrice: 2000000,
        depositAmount: 2000000,
        billingUnit: 'month',
        facilityUnitTypeOfferingId: new Types.ObjectId(),
      });

      await expect(
        accessScheduleService.createAccessSchedule(
          {
            contractId: String(contract2._id),
            timeSlotId: String(timeSlot2A._id),
            scheduledDate: futureDateStr,
          },
          customer2Caller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_652,
        })
      );
    });

    it('chặn một khách hàng đặt 2 lịch hẹn trùng ca trong cùng 1 ngày (400 MESSAGE_CODE_657)', async () => {
      await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      await expect(
        accessScheduleService.createAccessSchedule(
          {
            contractId: String(activeContractA._id),
            timeSlotId: String(timeSlot1A._id),
            scheduledDate: futureDateStr,
          },
          customer1Caller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_657,
        })
      );
    });

    it('chặn đặt ngày trong quá khứ (400 MESSAGE_CODE_101)', async () => {
      await expect(
        accessScheduleService.createAccessSchedule(
          {
            contractId: String(activeContractA._id),
            timeSlotId: String(timeSlot1A._id),
            scheduledDate: '2020-01-01',
          },
          customer1Caller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_101,
        })
      );
    });
  });

  describe('2. Tra cứu ca trực khả dụng (getAvailableSlots)', () => {
    it('trả về danh sách ca kèm số lượng đã đặt và sức chứa còn lại', async () => {
      // Đặt 1 lịch vào timeSlot1A (maxCapacity = 2)
      await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      const slots = await accessScheduleService.getAvailableSlots({
        facilityId: TEST_FACILITY_A_ID,
        date: futureDateStr,
      });

      expect(slots.length).toBe(2);

      const slot1 = slots.find((s) => s.timeSlotId === String(timeSlot1A._id));
      expect(slot1).toBeDefined();
      expect(slot1?.bookedCount).toBe(1);
      expect(slot1?.availableCapacity).toBe(1);
      expect(slot1?.isAvailable).toBe(true);

      const slot2 = slots.find((s) => s.timeSlotId === String(timeSlot2A._id));
      expect(slot2).toBeDefined();
      expect(slot2?.bookedCount).toBe(0);
      expect(slot2?.availableCapacity).toBe(1);
      expect(slot2?.isAvailable).toBe(true);
    });
  });

  describe('3. Check-in tại cổng (D-SMR.13: HOẶC QR HOẶC OTP 6 số)', () => {
    it('cho phép bảo vệ quét QR xác thực Check-in thành công trong cửa sổ [-30m, +45m]', async () => {
      // Tạo lịch hẹn với timeSlot từ 08:00
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
          numberOfPeople: 2,
          vehiclePlate: '51C-999.99',
        },
        customer1Caller
      );

      // Mock thời gian hiện tại lúc 08:10 ngày đó (hợp lệ trong cửa sổ [07:30, 08:45])
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${futureDateStr}T08:10:00.000+07:00`));

      const checkInResult = await accessScheduleService.checkIn(
        {
          code: schedule.qrPayload!,
          staffNotes: 'Khách đến đúng hẹn, cho xe vào bến A',
        },
        staffACaller
      );

      expect(checkInResult.schedule.status).toBe(
        AccessScheduleStatusEnum.CHECKED_IN
      );
      expect(checkInResult.schedule.checkedInAt).toBeDefined();
      expect(checkInResult.rentedRacks.length).toBe(1);
      expect(checkInResult.rentedRacks[0].rackCode).toBe('R01');
      expect(checkInResult.rentedRacks[0].aisle).toBe('A1');

      // Kiểm tra DB: qrToken và otpHash đã bị vô hiệu hóa
      const inDb = await AccessSchedule.findById(schedule.id);
      expect(inDb?.qrToken).toBeNull();
      expect(inDb?.otpHash).toBeNull();

      vi.useRealTimers();
    });

    it('cho phép quản lý cơ sở nhập OTP 6 số xác thực Check-in thành công (không cần mã lịch)', async () => {
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${futureDateStr}T08:15:00.000+07:00`));

      // Chỉ truyền code là 6 số OTP
      const checkInResult = await accessScheduleService.checkIn(
        {
          code: schedule.rawOtpCode!,
        },
        managerACaller
      );

      expect(checkInResult.schedule.status).toBe(
        AccessScheduleStatusEnum.CHECKED_IN
      );

      vi.useRealTimers();
    });

    it('chặn nhân viên chi nhánh khác quét Check-in (403 MESSAGE_CODE_103)', async () => {
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${futureDateStr}T08:10:00.000+07:00`));

      // Staff B thuộc Chi nhánh B
      await expect(
        accessScheduleService.checkIn(
          {
            code: schedule.qrPayload!,
          },
          staffBCaller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
        })
      );

      vi.useRealTimers();
    });

    it('chặn Check-in quá sớm trước 30 phút (400 MESSAGE_CODE_654)', async () => {
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      // Ca bắt đầu 08:00, sớm tối đa 07:30. Khách đến lúc 07:15 -> Bị chặn
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${futureDateStr}T07:15:00.000+07:00`));

      await expect(
        accessScheduleService.checkIn(
          {
            code: schedule.qrPayload!,
          },
          staffACaller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_654,
        })
      );

      vi.useRealTimers();
    });

    it('chặn Check-in quá trễ sau 45 phút và tự động chuyển NO_SHOW (400 MESSAGE_CODE_655)', async () => {
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      // Ca bắt đầu 08:00, ân hạn trễ đến 08:45. Khách đến lúc 08:50 -> Bị chặn & sang NO_SHOW
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${futureDateStr}T08:50:00.000+07:00`));

      await expect(
        accessScheduleService.checkIn(
          {
            code: schedule.qrPayload!,
          },
          staffACaller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_655,
        })
      );

      const inDb = await AccessSchedule.findById(schedule.id);
      expect(inDb?.status).toBe(AccessScheduleStatusEnum.NO_SHOW);

      vi.useRealTimers();
    });
  });

  describe('4. Check-out khi rời kho (checkOut)', () => {
    it('cho phép nhân viên quét Check-out thành công cho lịch hẹn đang CHECKED_IN', async () => {
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${futureDateStr}T08:10:00.000+07:00`));

      await accessScheduleService.checkIn(
        { code: schedule.qrPayload! },
        staffACaller
      );

      // Khách ra về lúc 09:30
      vi.setSystemTime(new Date(`${futureDateStr}T09:30:00.000+07:00`));

      const checkedOut = await accessScheduleService.checkOut(
        schedule.id,
        { staffNotes: 'Đã hoàn tất dỡ hàng' },
        staffACaller
      );

      expect(checkedOut.status).toBe(AccessScheduleStatusEnum.COMPLETED);
      expect(checkedOut.checkedOutAt).toBeDefined();

      vi.useRealTimers();
    });

    it('chặn Check-out khi lịch hẹn chưa CHECKED_IN (400 MESSAGE_CODE_653)', async () => {
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      await expect(
        accessScheduleService.checkOut(schedule.id, {}, staffACaller)
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_653,
        })
      );
    });
  });

  describe('5. Khách hàng tự hủy lịch hẹn (cancelSchedule)', () => {
    it('cho phép khách tự hủy khi còn trước giờ bắt đầu >= 1 tiếng và giải phóng slot', async () => {
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      // Thời điểm hiện tại lúc 06:00 (trước 08:00 2 tiếng -> hợp lệ)
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${futureDateStr}T06:00:00.000+07:00`));

      const cancelled = await accessScheduleService.cancelSchedule(
        schedule.id,
        { reason: 'Bận đột xuất' },
        customer1Caller
      );

      expect(cancelled.status).toBe(AccessScheduleStatusEnum.CANCELLED);
      expect(cancelled.cancelledReason).toBe('Bận đột xuất');

      // Slot được giải phóng
      const slots = await accessScheduleService.getAvailableSlots({
        facilityId: TEST_FACILITY_A_ID,
        date: futureDateStr,
      });
      const slot1 = slots.find((s) => s.timeSlotId === String(timeSlot1A._id));
      expect(slot1?.bookedCount).toBe(0);
      expect(slot1?.availableCapacity).toBe(2);

      vi.useRealTimers();
    });

    it('chặn hủy khi sát giờ bắt đầu < 1 tiếng (400 MESSAGE_CODE_656)', async () => {
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      // Thời điểm hiện tại lúc 07:15 (cách ca 08:00 chỉ 45 phút -> vi phạm lead time 1h)
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${futureDateStr}T07:15:00.000+07:00`));

      await expect(
        accessScheduleService.cancelSchedule(
          schedule.id,
          { reason: 'Muộn quá' },
          customer1Caller
        )
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          messageCode: MESSAGE_CODE.MESSAGE_CODE_656,
        })
      );

      vi.useRealTimers();
    });
  });

  describe('6. Job quét NO_SHOW tự động (processNoShowScan)', () => {
    it('tự động chuyển trạng thái NO_SHOW cho các lịch hẹn quá hạn 45 phút', async () => {
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      // Giả lập thời gian sau hạn ân hạn (ví dụ lúc 10:00 sáng)
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${futureDateStr}T10:00:00.000+07:00`));

      const processedCount = await accessScheduleService.processNoShowScan();
      expect(processedCount).toBeGreaterThanOrEqual(1);

      const inDb = await AccessSchedule.findById(schedule.id);
      expect(inDb?.status).toBe(AccessScheduleStatusEnum.NO_SHOW);

      vi.useRealTimers();
    });
  });

  describe('7. Tra cứu danh sách & phân quyền 2 lớp (getSchedules)', () => {
    it('Customer chỉ thấy lịch của mình; Staff chỉ thấy lịch tại cơ sở mình', async () => {
      await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      // Customer 1 thấy 1 lịch
      const cust1Res = await accessScheduleService.getSchedules(
        { page: 1, limit: 10 },
        customer1Caller
      );
      expect(cust1Res.items.length).toBe(1);

      // Customer 2 không thấy lịch nào
      const cust2Res = await accessScheduleService.getSchedules(
        { page: 1, limit: 10 },
        customer2Caller
      );
      expect(cust2Res.items.length).toBe(0);

      // Staff A thấy lịch tại cơ sở A
      const staffARes = await accessScheduleService.getSchedules(
        { page: 1, limit: 10 },
        staffACaller
      );
      expect(staffARes.items.length).toBe(1);

      // Staff B không thấy lịch nào tại cơ sở B
      const staffBRes = await accessScheduleService.getSchedules(
        { page: 1, limit: 10 },
        staffBCaller
      );
      expect(staffBRes.items.length).toBe(0);

      // Admin thấy toàn chuỗi
      const adminRes = await accessScheduleService.getSchedules(
        { page: 1, limit: 10 },
        adminCaller
      );
      expect(adminRes.items.length).toBe(1);
    });
  });
  describe('8. HTTP: nullable optional fields & gate staff names', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      RegisterRoutes(app);
      app.use(errorMiddleware);
    });

    it('accepts null vehicle/purpose fields and returns phone and gate staff names in detail', async () => {
      await User.findByIdAndUpdate(TEST_USERS.customer1.id, {
        phoneNumber: '0901234567',
      });

      const createRes = await request(app)
        .post('/access-schedules')
        .set('x-user-id', customer1Caller.userId)
        .set('x-user-role', customer1Caller.role)
        .send({
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
          vehicleType: null,
          vehiclePlate: null,
          purpose: null,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.vehicleType).toBeNull();
      const scheduleId: string = createRes.body.data.id;

      // Only fake Date so supertest/mongoose timers keep running
      vi.useFakeTimers({ toFake: ['Date'] });
      try {
        vi.setSystemTime(new Date(`${futureDateStr}T08:10:00.000+07:00`));
        const checkInRes = await request(app)
          .post('/access-schedules/check-in')
          .set('x-user-id', staffACaller.userId)
          .set('x-user-role', staffACaller.role)
          .set('x-facility-id', staffACaller.assignedFacilityId)
          .send({ code: createRes.body.data.qrPayload, staffNotes: null });
        expect(checkInRes.status).toBe(200);

        vi.setSystemTime(new Date(`${futureDateStr}T09:30:00.000+07:00`));
        const checkOutRes = await request(app)
          .post(`/access-schedules/${scheduleId}/check-out`)
          .set('x-user-id', managerACaller.userId)
          .set('x-user-role', managerACaller.role)
          .set('x-facility-id', managerACaller.assignedFacilityId)
          .send({ staffNotes: null });
        expect(checkOutRes.status).toBe(200);
      } finally {
        vi.useRealTimers();
      }

      const detailRes = await request(app)
        .get(`/access-schedules/${scheduleId}`)
        .set('x-user-id', customer1Caller.userId)
        .set('x-user-role', customer1Caller.role);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data).toMatchObject({
        status: AccessScheduleStatusEnum.COMPLETED,
        customerName: TEST_USERS.customer1.name,
        customerPhone: '0901234567',
        checkedInByName: TEST_USERS.staffFacilityA.name,
        checkedOutByName: TEST_USERS.managerFacilityA.name,
      });
    });

    it('accepts a null cancel reason', async () => {
      const schedule = await accessScheduleService.createAccessSchedule(
        {
          contractId: String(activeContractA._id),
          timeSlotId: String(timeSlot1A._id),
          scheduledDate: futureDateStr,
        },
        customer1Caller
      );

      const res = await request(app)
        .post(`/access-schedules/${schedule.id}/cancel`)
        .set('x-user-id', customer1Caller.userId)
        .set('x-user-role', customer1Caller.role)
        .send({ reason: null });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(AccessScheduleStatusEnum.CANCELLED);
    });
  });
});
