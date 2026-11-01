import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

import {
  RoleEnum,
  UserStatusEnum,
  AuthProviderEnum,
  GenderEnum,
} from '../src/common/enums/user.enum.ts';
import {
  InventoryRequestTypeEnum,
  InventoryRequestStatusEnum,
} from '../src/common/enums/customerInventory.enum.ts';
import {
  IncidentCategoryEnum,
  IncidentSeverityEnum,
  IncidentStatusEnum,
} from '../src/common/enums/incident.enum.ts';
import {
  SupportTicketCategoryEnum,
  SupportTicketPriorityEnum,
  SupportTicketStatusEnum,
} from '../src/common/enums/supportTicket.enum.ts';
import {
  ReservationStatusEnum,
  RefundStatusEnum,
} from '../src/common/enums/reservation.enum.ts';
import { RentalTargetTypeEnum } from '../src/common/enums/rental.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';

import { User } from '../src/modules/user/user.model.ts';
import { Profile } from '../src/modules/profile/profile.model.ts';
import { InventoryRequest } from '../src/modules/customerInventory/inventoryRequest.model.ts';
import { Incident } from '../src/modules/incident/incident.model.ts';
import { SupportTicket } from '../src/modules/support/supportTicket.model.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';

const OID = (hex: string) => new mongoose.Types.ObjectId(hex);

async function seedStaffAndTasks() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const facilityQ7Id = OID('660000000000000000000002');
  const managerQ7Id = OID('661100000000000000000004');
  const customer2Id = OID('661100000000000000000009'); // Công Ty TNHH TM Sài Gòn
  const customer3Id = OID('661100000000000000000010'); // Hoàng Mai Lan
  const contractQ7Id = OID('664400000000000000000001'); // Active contract at Q7
  const unitQ7WRA01 = OID('6ae41db1c1acd09e859b7a32'); // Q7-WR-A01
  const unitQ7ST101 = OID('6ae41db1c1acd09e859b7a30'); // Q7-ST-101
  const offeringQ7ST = OID('6ae41dacc1acd09e859b79e4'); // Offering for Standard Room at Q7

  // SKU IDs of Customer 2
  const skuFanId = OID('6ae41db3c1acd09e859b7a4d'); // Quạt Cây Đứng Mitsubishi LV16
  const skuClothesBoxId = OID('6ae41db3c1acd09e859b7a4e'); // Thùng Quần Áo Mùa Đông

  const defaultHashedPassword = await bcrypt.hash('Password123@', 10);

  // 1. Cập nhật phòng kho Q7-WR-A01 về AVAILABLE
  await StorageUnit.findByIdAndUpdate(unitQ7WRA01, {
    status: StorageUnitStatusEnum.AVAILABLE,
  });
  console.log(
    '   ✅ Đã cập nhật phòng kho Q7-WR-A01 về trạng thái AVAILABLE (Còn trống)'
  );

  // 2. Thêm 2 nhân viên mới cho Cơ sở Q7
  const staff2Id = OID('661100000000000000000021');
  const staff3Id = OID('661100000000000000000022');

  const staffUsers = [
    {
      _id: staff2Id,
      name: 'Trần Văn Vận Hành (Kho Q7)',
      email: 'staff2.q7@selfstorage.vn',
      password: defaultHashedPassword,
      phoneNumber: '0901000021',
      role: RoleEnum.FACILITY_STAFF,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityQ7Id,
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    },
    {
      _id: staff3Id,
      name: 'Lê Thị Kiểm Hàng (Thủ kho Q7)',
      email: 'staff3.q7@selfstorage.vn',
      password: defaultHashedPassword,
      phoneNumber: '0901000022',
      role: RoleEnum.FACILITY_STAFF,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityQ7Id,
      avatarUrl:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    },
  ];

  for (const staff of staffUsers) {
    const { avatarUrl, ...userFields } = staff;
    await User.findByIdAndUpdate(staff._id, userFields, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    await Profile.findOneAndUpdate(
      { userId: staff._id },
      {
        userId: staff._id,
        avatarUrl,
        address: 'Kho Q7 - Phú Mỹ Hưng, Q7, TP.HCM',
        gender: GenderEnum.OTHER,
        dateOfBirth: new Date('1995-08-20'),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(
      `   + [Staff] ${staff.email.padEnd(26)} | Tên: ${staff.name} | Pass: Password123@`
    );
  }

  // 3. Yêu cầu nhập kho có báo trước (Pre-advised Inbound Request) - PENDING, chưa gán staff
  const inboundReqId = OID('6ae41db4c1acd09e859b7a71');
  await InventoryRequest.findByIdAndUpdate(
    inboundReqId,
    {
      _id: inboundReqId,
      requestCode: 'REQ-IN-202611-0002',
      type: InventoryRequestTypeEnum.INBOUND,
      status: InventoryRequestStatusEnum.PENDING,
      customerId: customer2Id,
      contractId: contractQ7Id,
      facilityId: facilityQ7Id,
      storageUnitId: unitQ7WRA01,
      items: [
        { skuId: skuFanId, quantity: 15, actualQuantity: 0 },
        { skuId: skuClothesBoxId, quantity: 20, actualQuantity: 0 },
      ],
      assignedStaffId: null,
      isVerified: false,
      transporterInfo: {
        name: 'Phan Văn Hùng (Tài xế Viettel Post)',
        phoneNumber: '0988112233',
        vehiclePlate: '51C-789.12',
        deliveryCompany: 'Viettel Post',
      },
      staffNotes:
        'Xe chở 15 quạt thông minh & 20 kiện quần áo sẽ đến kho Q7 lúc 14:00. Chờ quản lý phân công nhân viên đón tiếp và đối soát.',
      createdAt: new Date('2026-11-01T08:00:00Z'),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(
    '   ✅ Đã tạo đơn Nhập kho: REQ-IN-202611-0002 (PENDING - Chờ quản lý phân công)'
  );

  // 4. Yêu cầu xuất kho rút hàng (Outbound Request) - PENDING, chưa gán staff
  const outboundReqId = OID('6ae41db4c1acd09e859b7a72');
  await InventoryRequest.findByIdAndUpdate(
    outboundReqId,
    {
      _id: outboundReqId,
      requestCode: 'REQ-OUT-202611-0002',
      type: InventoryRequestTypeEnum.OUTBOUND,
      status: InventoryRequestStatusEnum.PENDING,
      customerId: customer2Id,
      contractId: contractQ7Id,
      facilityId: facilityQ7Id,
      storageUnitId: unitQ7WRA01,
      items: [{ skuId: skuFanId, quantity: 5 }],
      assignedStaffId: null,
      isVerified: false,
      transporterInfo: {
        name: 'Võ Minh Trí (Tài xế Ahamove)',
        phoneNumber: '0977445566',
        vehiclePlate: '59P2-456.78',
        deliveryCompany: 'Ahamove',
      },
      staffNotes:
        'Khách tạo lệnh rút 5 cây quạt bàn giao cho tài xế Ahamove. Chờ quản lý phân công nhân viên soạn hàng.',
      createdAt: new Date('2026-11-01T09:00:00Z'),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(
    '   ✅ Đã tạo đơn Xuất kho: REQ-OUT-202611-0002 (PENDING - Chờ quản lý phân công)'
  );

  // 5. Sự cố kỹ thuật cơ sở (Incident) - REPORTED, chưa gán kỹ thuật
  const incidentId = OID('6ae41db5c1acd09e859b7a73');
  await Incident.findByIdAndUpdate(
    incidentId,
    {
      _id: incidentId,
      incidentCode: 'INC-202611-0003',
      facilityId: facilityQ7Id,
      storageUnitId: unitQ7WRA01,
      reporterId: managerQ7Id,
      reporterRole: RoleEnum.FACILITY_MANAGER,
      category: IncidentCategoryEnum.STRUCTURAL,
      severity: IncidentSeverityEnum.MEDIUM,
      title:
        'Kiểm tra bảo dưỡng thanh ray trượt và bu lông định vị Kệ Pallet R03 - Dãy A',
      description:
        'Khớp khóa thanh ray định vị tầng 2 Kệ R03 có dấu hiệu xô lệch nhẹ. Cần điều phối nhân viên kỹ thuật kho kiểm tra và siết lại bu lông an toàn.',
      images: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
      ],
      status: IncidentStatusEnum.REPORTED,
      assignedStaffId: null,
      putUnitUnderMaintenance: false,
      requiresRelocation: false,
      createdAt: new Date('2026-11-01T07:30:00Z'),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(
    '   ✅ Đã tạo sự cố kỹ thuật: INC-202611-0003 (REPORTED - Chờ quản lý phân công kỹ thuật)'
  );

  // 6. Phiếu hỗ trợ khách hàng (Support Ticket) - PENDING, chưa gán staff
  const ticketId = OID('6ae41db6c1acd09e859b7a74');
  await SupportTicket.findByIdAndUpdate(
    ticketId,
    {
      _id: ticketId,
      ticketCode: 'TCK-202611-0003',
      customerId: customer2Id,
      facilityId: facilityQ7Id,
      contractId: contractQ7Id,
      category: SupportTicketCategoryEnum.FACILITY_ACCESS,
      priority: SupportTicketPriorityEnum.HIGH,
      title:
        'Đăng ký xe tải 3.5 tấn vào bốc dỡ hàng tại cổng bãi xe Q7 chiều nay',
      description:
        'Chiều nay 14:00 công ty chúng tôi có xe tải 3.5 tấn tới giao hàng. Nhờ quản lý điều phối nhân viên trực cổng mở barie và hướng dẫn đỗ xe vào dock dỡ hàng.',
      attachments: [],
      status: SupportTicketStatusEnum.PENDING,
      assignedStaffId: null,
      createdAt: new Date('2026-11-01T08:15:00Z'),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(
    '   ✅ Đã tạo phiếu hỗ trợ: TCK-202611-0003 (PENDING - Chờ quản lý điều phối tiếp nhận)'
  );

  // 7. Đơn đặt chỗ đón khách check-in (Reservation) - CONFIRMED, chưa gán nhân viên đón tiếp
  const reservationId = OID('664400000000000000000005');
  await Reservation.findByIdAndUpdate(
    reservationId,
    {
      _id: reservationId,
      reservationCode: 'RES-202611-0003',
      customerId: customer3Id,
      facilityId: facilityQ7Id,
      storageUnitId: unitQ7ST101,
      facilityUnitTypeOfferingId: offeringQ7ST,
      rentalTargetType: RentalTargetTypeEnum.STORAGE_UNIT,
      startDate: new Date('2026-11-02T00:00:00Z'),
      checkInDate: new Date('2026-11-02T10:00:00Z'),
      checkInTimeSlot: '10:00 - 12:00',
      rentalDuration: 3,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1200000,
      depositAmount: 1200000,
      totalAmount: 1200000,
      paidAmount: 1200000,
      paidAt: new Date('2026-11-01T09:00:00Z'),
      status: ReservationStatusEnum.CONFIRMED,
      refundStatus: RefundStatusEnum.NONE,
      termsAccepted: true,
      acceptedAt: new Date('2026-11-01T08:50:00Z'),
      assignedStaffId: null,
      createdAt: new Date('2026-11-01T09:00:00Z'),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(
    '   ✅ Đã tạo đơn đặt chỗ: RES-202611-0003 (CONFIRMED - Chờ phân công nhân viên đón khách)'
  );

  await mongoose.disconnect();
  console.log('🎉 Hoàn tất nạp dữ liệu phân công task cho quản lý cơ sở Q7!');
}

seedStaffAndTasks().catch((err) => {
  console.error('❌ Lỗi khi nạp dữ liệu:', err);
  process.exit(1);
});
