/**
 * MASTER DATABASE SEED SCRIPT (TOÀN DIỆN TẤT CẢ MODULE)
 *
 * Đồng bộ toàn bộ dữ liệu mẫu hệ thống Self Storage cho 100% các module:
 * 1. Dọn sạch các collections liên quan (tránh orphan data)
 * 2. Nạp Pháp nhân (LegalEntity) & Mẫu hợp đồng (ContractTemplate)
 * 3. Nạp Người dùng (Users: Admin, Ops, Managers, Staffs, Customers) & Profiles (kèm avatar)
 * 4. Nạp Cơ sở (Facilities: Q1, Q7, Bình Thạnh, Tân Bình, Cầu Giấy, Hoàn Kiếm) có mã code, ảnh sắc nét, gán Manager
 * 5. Nạp Khung giờ hoạt động (FacilityTimeSlots) 7 ngày trong tuần cho mỗi cơ sở
 * 6. Nạp Loại kho (UnitTypes: Locker, Phòng Compact, Phòng Tiêu chuẩn, Phòng Lớn, Kho Mát, Kho Kệ Pallet) kèm ảnh & thông số
 * 7. Nạp Tiện ích (Amenities: Khóa Master Lock, Kệ sắt, Xe đẩy, Pallet, Bốc xếp...) kèm ảnh
 * 8. Nạp Bảng giá niêm yết (FacilityUnitTypeOfferings & FacilityAmenityOfferings) khớp 100% với từng cơ sở
 * 9. Nạp Kho/Phòng thực tế (StorageUnits) đầy đủ phân tầng, phân khu và ảnh thực tế
 * 10. Nạp Kệ hàng và tầng kệ (StorageRacks & RackTiers) cho các kho Warehouse Rack
 * 11. Nạp Danh mục hàng hóa (CustomerSkus) kèm ảnh sản phẩm thực tế
 * 12. Nạp Đơn đặt chỗ (Reservations) và Hợp đồng thuê kho (Contracts) mẫu ở các trạng thái hợp lệ
 * 13. Nạp Tồn kho khách hàng (CustomerInventories, InventoryMovements & InventoryRequests)
 * 14. Nạp Thanh toán & Giao dịch ngân hàng (Payments & PaymentTransactions)
 * 15. Nạp Yêu cầu hoàn tiền (RefundRequests)
 * 16. Nạp Báo cáo sự cố cơ sở & kho (Incidents)
 * 17. Nạp Phiếu hỗ trợ khách hàng (SupportTickets)
 * 18. Nạp Thông báo hệ thống (Notifications)
 * 19. Nạp Yêu cầu phê duyệt nghiệp vụ (ApprovalRequests)
 * 20. Nạp Giấy ủy quyền ký hợp đồng (SigningAuthorizations)
 *
 * Chạy lệnh:
 *   npm run db:seed:all
 *   (hoặc: npx tsx scripts/seed-master-data.ts)
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

import {
  RoleEnum,
  AuthProviderEnum,
  UserStatusEnum,
  GenderEnum,
} from '../src/common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  RackZoneEnum,
  RackStatusEnum,
  RackTierStatusEnum,
} from '../src/common/enums/storageRack.enum.ts';
import {
  AmenityTypeEnum,
  AmenityStatusEnum,
} from '../src/common/enums/amenity.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../src/common/enums/facilityUnitTypeOffering.enum.ts';
import { FacilityAmenityOfferingStatusEnum } from '../src/common/enums/facilityAmenityOffering.enum.ts';
import { CustomerSkuStatusEnum } from '../src/common/enums/customerSku.enum.ts';
import {
  InventoryItemStatusEnum,
  MovementTypeEnum,
  InventoryRequestTypeEnum,
  InventoryRequestStatusEnum,
} from '../src/common/enums/customerInventory.enum.ts';
import {
  ReservationStatusEnum,
  RefundStatusEnum,
} from '../src/common/enums/reservation.enum.ts';
import {
  ContractStatusEnum,
  ContractSourceEnum,
  ContractDepositStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { RentalTargetTypeEnum } from '../src/common/enums/rental.enum.ts';
import {
  PaymentStatusEnum,
  PaymentPurposeEnum,
  PaymentMethodEnum,
  PaymentTransactionResultEnum,
} from '../src/common/enums/payment.enum.ts';
import {
  RefundRequestReasonEnum,
  RefundRequestStatusEnum,
} from '../src/common/enums/refundRequest.enum.ts';
import {
  IncidentStatusEnum,
  IncidentCategoryEnum,
  IncidentSeverityEnum,
} from '../src/common/enums/incident.enum.ts';
import {
  SupportTicketCategoryEnum,
  SupportTicketPriorityEnum,
  SupportTicketStatusEnum,
} from '../src/common/enums/supportTicket.enum.ts';
import {
  NotificationTypeEnum,
  NotificationPriorityEnum,
  NotificationChannelEnum,
} from '../src/common/enums/notification.enum.ts';
import {
  ApprovalRequestTargetTypeEnum,
  ApprovalRequestActionEnum,
  ApprovalRequestStatusEnum,
} from '../src/common/enums/approvalRequest.enum.ts';

// Import Mongoose Models
import { User } from '../src/modules/user/user.model.ts';
import { Profile } from '../src/modules/profile/profile.model.ts';
import { LegalEntity } from '../src/modules/legalEntity/legalEntity.model.ts';
import { ContractTemplate } from '../src/modules/contractTemplate/contractTemplate.model.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityTimeSlot } from '../src/modules/facilityTimeSlot/facilityTimeSlot.model.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { Amenity } from '../src/modules/amenity/amenity.model.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { RackTier } from '../src/modules/storageRack/rackTier.model.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { InventoryMovement } from '../src/modules/customerInventory/inventoryMovement.model.ts';
import { InventoryRequest } from '../src/modules/customerInventory/inventoryRequest.model.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import {
  Payment,
  PaymentTransaction,
} from '../src/modules/payment/payment.model.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { Incident } from '../src/modules/incident/incident.model.ts';
import { SupportTicket } from '../src/modules/support/supportTicket.model.ts';
import { Notification } from '../src/modules/notification/notification.model.ts';
import { ApprovalRequest } from '../src/modules/approvalRequest/approvalRequest.model.ts';
import { SigningAuthorization } from '../src/modules/signingAuthorization/signingAuthorization.model.ts';

const OID = (hex: string) => new mongoose.Types.ObjectId(hex);

async function cleanDatabase(db: mongoose.mongo.Db) {
  console.log(
    '\n🧹 [1/20] Dọn dẹp dữ liệu cũ trong toàn bộ các collections...'
  );
  const collectionsToClean = [
    'users',
    'profiles',
    'legalentities',
    'contracttemplates',
    'facilities',
    'facilitytimeslots',
    'unittypes',
    'amenities',
    'facilityunittypeofferings',
    'facilityamenityofferings',
    'storageunits',
    'storageracks',
    'racktiers',
    'customerskus',
    'customerinventories',
    'inventorymovements',
    'inventoryrequests',
    'reservations',
    'contracts',
    'payments',
    'paymenttransactions',
    'refundrequests',
    'notifications',
    'supporttickets',
    'incidents',
    'approvalrequests',
    'signingauthorizations',
  ];

  for (const cName of collectionsToClean) {
    try {
      await db.collection(cName).deleteMany({});
    } catch {
      // Bỏ qua nếu collection chưa tồn tại
    }
  }
  console.log(
    '   ✅ Đã dọn sạch 27 collections để đảm bảo tính toàn vẹn 100%.'
  );
}

async function runMasterSeed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Thiếu biến môi trường MONGODB_URI.');
    process.exit(1);
  }

  console.log('🚀 ========================================================');
  console.log('🚀 KHỞI ĐỘNG BỘ SEED DỮ LIỆU ĐỒNG BỘ TOÀN BỘ MODULE HỆ THỐNG');
  console.log('🚀 ========================================================');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Không thể kết nối MongoDB Database');

  await cleanDatabase(db);

  // Mật khẩu chung chuẩn cho toàn bộ tài khoản test: Password123@
  const defaultHashedPassword = await bcrypt.hash('Password123@', 10);

  // =========================================================================
  // 1. LEGAL ENTITY & CONTRACT TEMPLATE
  // =========================================================================
  console.log(
    '\n🏢 [2/20] Khởi tạo Pháp nhân (LegalEntity) & Mẫu hợp đồng (ContractTemplate)...'
  );
  const legalEntityId = OID('660000000000000000000099');
  await LegalEntity.create({
    _id: legalEntityId,
    companyName:
      'CÔNG TY CỔ PHẦN DỊCH VỤ LƯU TRỮ THÔNG MINH VIỆT NAM (SMART STORAGE VN)',
    taxCode: '0316889988',
    registeredAddress: '75 Nguyễn Du, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    phone: '19006868',
    email: 'contact@smartstorage.vn',
    status: 'active',
    legalRepresentative: {
      name: 'Nguyễn Văn Giám Đốc',
      title: 'Tổng Giám Đốc',
      idNumber: '079088123456',
    },
    bankAccount: {
      bankName:
        'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank) - CN TP.HCM',
      accountNumber: '0071001234567',
      accountHolder: 'CTY CP DICH VU LUU TRU THONG MINH VN',
    },
  });

  const templateId = OID('660000000000000000000088');
  await ContractTemplate.create({
    _id: templateId,
    templateCode: 'TPL-STD-2026',
    version: '1.0.0',
    title: 'Hợp đồng Dịch vụ Cho Thuê Kho Tự Quản Thông Minh Chuẩn 2026',
    isActive: true,
    contentHtml: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="text-align: center;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
        <h4 style="text-align: center;">Độc lập - Tự do - Hạnh phúc</h4>
        <hr style="width: 30%; margin-bottom: 20px;"/>
        <h3 style="text-align: center; color: #1e3a8a;">HỢP ĐỒNG THUÊ KHO TỰ QUẢN THÔNG MINH</h3>
        <p><strong>Bên A (Bên Cho Thuê):</strong> CÔNG TY CỔ PHẦN DỊCH VỤ LƯU TRỮ THÔNG MINH VIỆT NAM</p>
        <p><strong>Bên B (Bên Thuê):</strong> Khách hàng đứng tên đăng ký trong đơn đặt chỗ</p>
        <p>Hai bên thống nhất các điều khoản cho thuê kho tự quản, tuân thủ nội quy an toàn PCCC, an ninh 24/7 và thanh toán đúng hạn định kỳ.</p>
      </div>
    `,
  });
  console.log('   ✅ Đã tạo LegalEntity và ContractTemplate chuẩn.');

  // =========================================================================
  // 2. USERS & PROFILES
  // =========================================================================
  console.log(
    '\n👥 [3/20] Khởi tạo Tài khoản mẫu (Users) & Hồ sơ cá nhân (Profiles)...'
  );
  const userIds = {
    admin: OID('661100000000000000000001'),
    ops: OID('661100000000000000000002'),
    managerQ1: OID('661100000000000000000003'),
    managerQ7: OID('661100000000000000000004'),
    managerHN: OID('661100000000000000000005'),
    staffQ1: OID('661100000000000000000006'),
    staffQ7: OID('661100000000000000000007'),
    staff2Q7: OID('661100000000000000000021'),
    staff3Q7: OID('661100000000000000000022'),
    customer1: OID('661100000000000000000008'),
    customer2: OID('661100000000000000000009'),
    customer3: OID('661100000000000000000010'),
  };

  const facilityIds = {
    q1: OID('660000000000000000000001'),
    q7: OID('660000000000000000000002'),
    bt: OID('660000000000000000000003'),
    tb: OID('660000000000000000000004'),
    hn_cg: OID('660000000000000000000005'),
    hn_hk: OID('660000000000000000000006'),
  };

  const usersData = [
    {
      _id: userIds.admin,
      name: 'Hệ Thống Admin',
      email: 'admin@selfstorage.vn',
      password: defaultHashedPassword,
      phoneNumber: '0901000001',
      role: RoleEnum.SYSTEM_ADMIN,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: null,
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    },
    {
      _id: userIds.ops,
      name: 'Trần Văn Vận Hành',
      email: 'ops@selfstorage.vn',
      password: defaultHashedPassword,
      phoneNumber: '0901000002',
      role: RoleEnum.BUSINESS_OPS_MANAGER,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: null,
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    },
    {
      _id: userIds.managerQ1,
      name: 'Lê Hoàng Quản Lý (Kho Q1)',
      email: 'manager.q1@selfstorage.vn',
      password: defaultHashedPassword,
      phoneNumber: '0901000003',
      role: RoleEnum.FACILITY_MANAGER,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityIds.q1,
      avatarUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    },
    {
      _id: userIds.managerQ7,
      name: 'Phạm Minh Quản Lý (Kho Q7)',
      email: 'manager.q7@selfstorage.vn',
      password: defaultHashedPassword,
      phoneNumber: '0901000004',
      role: RoleEnum.FACILITY_MANAGER,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityIds.q7,
      avatarUrl:
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
    },
    {
      _id: userIds.managerHN,
      name: 'Đặng Tuấn Quản Lý (Hà Nội)',
      email: 'manager.hn@selfstorage.vn',
      password: defaultHashedPassword,
      phoneNumber: '0901000005',
      role: RoleEnum.FACILITY_MANAGER,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityIds.hn_cg,
      avatarUrl:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    },
    {
      _id: userIds.staffQ1,
      name: 'Vũ Thị Nhân Viên (Kho Q1)',
      email: 'staff.q1@selfstorage.vn',
      password: defaultHashedPassword,
      phoneNumber: '0901000006',
      role: RoleEnum.FACILITY_STAFF,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityIds.q1,
      avatarUrl:
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
    },
    {
      _id: userIds.staffQ7,
      name: 'Ngô Thanh Nhân Viên (Kho Q7)',
      email: 'staff.q7@selfstorage.vn',
      password: defaultHashedPassword,
      phoneNumber: '0901000007',
      role: RoleEnum.FACILITY_STAFF,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityIds.q7,
      avatarUrl:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
    },
    {
      _id: userIds.staff2Q7,
      name: 'Trần Văn Vận Hành (Kho Q7)',
      email: 'staff2.q7@selfstorage.vn',
      password: defaultHashedPassword,
      phoneNumber: '0901000021',
      role: RoleEnum.FACILITY_STAFF,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityIds.q7,
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    },
    {
      _id: userIds.staff3Q7,
      name: 'Lê Thị Kiểm Hàng (Thủ kho Q7)',
      email: 'staff3.q7@selfstorage.vn',
      password: defaultHashedPassword,
      phoneNumber: '0901000022',
      role: RoleEnum.FACILITY_STAFF,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: facilityIds.q7,
      avatarUrl:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    },
    {
      _id: userIds.customer1,
      name: 'Nguyễn Văn An (Khách Cá Nhân)',
      email: 'customer1@gmail.com',
      password: defaultHashedPassword,
      phoneNumber: '0909111222',
      role: RoleEnum.CUSTOMER,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: null,
      avatarUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    },
    {
      _id: userIds.customer2,
      name: 'Công Ty TNHH TM Sài Gòn (Doanh Nghiệp)',
      email: 'customer2@gmail.com',
      password: defaultHashedPassword,
      phoneNumber: '0909333444',
      role: RoleEnum.CUSTOMER,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: null,
      avatarUrl:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
    },
    {
      _id: userIds.customer3,
      name: 'Hoàng Mai Lan (Khách Đặt Mới)',
      email: 'customer3@gmail.com',
      password: defaultHashedPassword,
      phoneNumber: '0909555666',
      role: RoleEnum.CUSTOMER,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: null,
      avatarUrl:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    },
  ];

  for (const u of usersData) {
    const { avatarUrl, ...userFields } = u;
    await User.create(userFields);
    await Profile.create({
      userId: u._id,
      avatarUrl,
      address: 'TP. Hồ Chí Minh, Việt Nam',
      gender: GenderEnum.OTHER,
      dateOfBirth: new Date('1992-06-15'),
    });
    console.log(
      `   + [User] ${u.email.padEnd(26)} | Role: ${u.role.padEnd(21)} | Mật khẩu: Password123@`
    );
  }

  // =========================================================================
  // 3. FACILITIES (CƠ SỞ KHO)
  // =========================================================================
  console.log(
    '\n🏬 [4/20] Khởi tạo 6 Cơ sở kho (Facilities) kèm hình ảnh chất lượng cao & mã code...'
  );
  const facilitiesData = [
    {
      _id: facilityIds.q1,
      code: 'FAC-HCM-Q1',
      name: 'Kho Quận 1 - Bến Nghé Central',
      address: '75 Nguyễn Du, Phường Bến Nghé',
      city: 'Hồ Chí Minh',
      phone: '02838221001',
      email: 'q1.bennghe@selfstorage.vn',
      description:
        'Cơ sở trung tâm Quận 1, vị trí đắc địa, an ninh bảo mật 24/7, chuyên lưu giữ tài liệu doanh nghiệp, đồ cá nhân và tủ locker thông minh.',
      status: FacilityStatusEnum.ACTIVE,
      managerId: userIds.managerQ1,
      legalEntityId,
      operatingHours: { open: '07:00', close: '22:00' },
      images: [
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200',
        'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=1200',
        'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=1200',
      ],
    },
    {
      _id: facilityIds.q7,
      code: 'FAC-HCM-Q7',
      name: 'Kho Quận 7 - Phú Mỹ Hưng Hub',
      address: '105 Nguyễn Lương Bằng, Phường Tân Phú',
      city: 'Hồ Chí Minh',
      phone: '02854112002',
      email: 'q7.pmh@selfstorage.vn',
      description:
        'Tổng kho logistics & tự quản quy mô lớn, bãi đỗ xe tải bốc dỡ hàng rộng rãi, có phân khu kệ kho pallet chuyên nghiệp cho doanh nghiệp.',
      status: FacilityStatusEnum.ACTIVE,
      managerId: userIds.managerQ7,
      legalEntityId,
      operatingHours: { open: '07:00', close: '22:00' },
      images: [
        'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200',
        'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1200',
        'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=1200',
      ],
    },
    {
      _id: facilityIds.bt,
      code: 'FAC-HCM-BT',
      name: 'Kho Bình Thạnh - Landmark View',
      address: '208 Nguyễn Hữu Cảnh, Phường 22',
      city: 'Hồ Chí Minh',
      phone: '02835123003',
      email: 'binhthanh@selfstorage.vn',
      description:
        'Nằm ngay trục đường lớn cửa ngõ phía Đông, hỗ trợ tối đa cho cư dân các khu căn hộ cao cấp gửi đồ dọn nhà, thiết bị thể thao, xe máy.',
      status: FacilityStatusEnum.ACTIVE,
      managerId: userIds.managerQ1,
      legalEntityId,
      operatingHours: { open: '07:00', close: '22:00' },
      images: [
        'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=1200',
        'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=1200',
      ],
    },
    {
      _id: facilityIds.tb,
      code: 'FAC-HCM-TB',
      name: 'Kho Tân Bình - Sân Bay Gateway',
      address: '45 Trường Sơn, Phường 2',
      city: 'Hồ Chí Minh',
      phone: '02838444004',
      email: 'tanbinh.airport@selfstorage.vn',
      description:
        'Cách sân bay Tân Sơn Nhất chỉ 500m, cực kỳ lý tưởng để gửi vali du lịch, hàng mẫu xuất nhập khẩu và kho trung chuyển thương mại điện tử.',
      status: FacilityStatusEnum.ACTIVE,
      managerId: userIds.managerQ7,
      legalEntityId,
      operatingHours: { open: '07:00', close: '22:00' },
      images: [
        'https://images.unsplash.com/photo-1586528116493-a029325540fa?w=1200',
        'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=1200',
      ],
    },
    {
      _id: facilityIds.hn_cg,
      code: 'FAC-HN-CG',
      name: 'Kho Cầu Giấy - Duy Tân Tech Hub',
      address: '88 Duy Tân, Phường Dịch Vọng Hậu',
      city: 'Hà Nội',
      phone: '02437957007',
      email: 'caugiay@selfstorage.vn',
      description:
        'Khu vực tập trung đông đảo công ty công nghệ và văn phòng, giải pháp tối ưu lưu trữ chứng từ kế toán, máy móc thiết bị văn phòng.',
      status: FacilityStatusEnum.ACTIVE,
      managerId: userIds.managerHN,
      legalEntityId,
      operatingHours: { open: '07:00', close: '22:00' },
      images: [
        'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=1200',
        'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=1200',
      ],
    },
    {
      _id: facilityIds.hn_hk,
      code: 'FAC-HN-HK',
      name: 'Kho Hoàn Kiếm - Phố Cổ Premium',
      address: '18 Tràng Tiền, Phường Tràng Tiền',
      city: 'Hà Nội',
      phone: '02439336006',
      email: 'hoankiem@selfstorage.vn',
      description:
        'Vị trí lõi phố cổ Hà Nội, kho tự quản chuẩn boutique, phòng mát kiểm soát nhiệt ẩm, bảo quản đồ cổ, tác phẩm nghệ thuật, rượu vang.',
      status: FacilityStatusEnum.ACTIVE,
      managerId: userIds.managerHN,
      legalEntityId,
      operatingHours: { open: '07:00', close: '22:00' },
      images: [
        'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=1200',
        'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=1200',
      ],
    },
  ];

  for (const fac of facilitiesData) {
    await Facility.create(fac);
    console.log(`   + [Facility] ${fac.code} - ${fac.name} (${fac.city})`);
  }

  // =========================================================================
  // 4. FACILITY TIME SLOTS (KHUNG GIỜ CHECK-IN)
  // =========================================================================
  console.log(
    '\n⏰ [5/20] Khởi tạo Khung giờ hoạt động (FacilityTimeSlots) đồng bộ cho từng cơ sở...'
  );
  const timeSlotsTemplates = [
    {
      slotName: '07:00 - 09:00',
      startTime: '07:00',
      endTime: '09:00',
      maxCapacity: 4,
      notes: 'Ca sáng sớm',
    },
    {
      slotName: '09:00 - 11:00',
      startTime: '09:00',
      endTime: '11:00',
      maxCapacity: 4,
      notes: 'Ca sáng cao điểm',
    },
    {
      slotName: '11:00 - 13:00',
      startTime: '11:00',
      endTime: '13:00',
      maxCapacity: 3,
      notes: 'Ca trưa',
    },
    {
      slotName: '13:00 - 15:00',
      startTime: '13:00',
      endTime: '15:00',
      maxCapacity: 4,
      notes: 'Ca đầu giờ chiều',
    },
    {
      slotName: '15:00 - 17:00',
      startTime: '15:00',
      endTime: '17:00',
      maxCapacity: 4,
      notes: 'Ca chiều tan tầm',
    },
    {
      slotName: '17:00 - 19:00',
      startTime: '17:00',
      endTime: '19:00',
      maxCapacity: 3,
      notes: 'Ca tối',
    },
    {
      slotName: '19:00 - 21:00',
      startTime: '19:00',
      endTime: '21:00',
      maxCapacity: 2,
      notes: 'Ca đêm',
    },
  ];

  let totalSlotsCount = 0;
  for (const facId of Object.values(facilityIds)) {
    for (const slot of timeSlotsTemplates) {
      await FacilityTimeSlot.create({
        facilityId: facId,
        ...slot,
        isActive: true,
      });
      totalSlotsCount++;
    }
  }
  console.log(
    `   ✅ Đã tạo thành công ${totalSlotsCount} time slots cho 6 cơ sở.`
  );

  // =========================================================================
  // 5. UNIT TYPES (LOẠI KHO)
  // =========================================================================
  console.log(
    '\n📦 [6/20] Khởi tạo 7 Loại kho (UnitTypes) chuẩn danh mục, kích thước & ảnh minh họa...'
  );
  const unitTypeIds = {
    locker_sm: OID('662200000000000000000001'),
    locker_std: OID('662200000000000000000002'),
    room_compact: OID('662200000000000000000003'),
    room_std: OID('662200000000000000000004'),
    room_large: OID('662200000000000000000005'),
    climate_wine: OID('662200000000000000000006'),
    warehouse_rack: OID('662200000000000000000007'),
  };

  const unitTypesData = [
    {
      _id: unitTypeIds.locker_sm,
      name: 'Tủ Locker Cá Nhân 0.25m²',
      description:
        'Tủ khóa thông minh nhỏ gọn, thích hợp cất giữ laptop, balo, hồ sơ quan trọng, hộ chiếu, máy ảnh.',
      dimensions: { length: 0.5, width: 0.5, height: 0.8 },
      area: 0.25,
      volume: 0.2,
      category: UnitTypeCategoryEnum.LOCKER,
      status: UnitTypeStatusEnum.ACTIVE,
      imageUrl:
        'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=800',
      images: [
        'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=800',
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
      ],
      features: [
        'Khóa số điện tử PIN Code',
        'Camera an ninh hành lang',
        'Chống bụi ẩm',
      ],
    },
    {
      _id: unitTypeIds.locker_std,
      name: 'Tủ Locker Tiêu Chuẩn 1m²',
      description:
        'Kích thước vừa vặn cho 2-3 vali du lịch cỡ đại, 4-6 thùng hồ sơ chứng từ kế toán.',
      dimensions: { length: 1.0, width: 1.0, height: 1.0 },
      area: 1.0,
      volume: 1.0,
      category: UnitTypeCategoryEnum.LOCKER,
      status: UnitTypeStatusEnum.ACTIVE,
      imageUrl:
        'https://images.unsplash.com/photo-1586528116493-a029325540fa?w=800',
      images: [
        'https://images.unsplash.com/photo-1586528116493-a029325540fa?w=800',
        'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=800',
      ],
      features: [
        'Khóa số riêng tư',
        'Đèn LED cảm biến mở cửa',
        'Thông gió tự nhiên',
      ],
    },
    {
      _id: unitTypeIds.room_compact,
      name: 'Phòng Kho Compact 2.5m²',
      description:
        'Sức chứa tương đương 15-20 thùng carton, xe đạp, dụng cụ thể thao, đồ decor gia đình.',
      dimensions: { length: 1.5, width: 1.7, height: 2.5 },
      area: 2.55,
      volume: 6.375,
      category: UnitTypeCategoryEnum.SMALL,
      status: UnitTypeStatusEnum.ACTIVE,
      imageUrl:
        'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=800',
      images: [
        'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=800',
        'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800',
      ],
      features: [
        'Cửa cuốn thép dập gân',
        'Chốt khóa Master riêng',
        'PCCC đầu phun tự động Sprinkler',
      ],
    },
    {
      _id: unitTypeIds.room_std,
      name: 'Phòng Kho Tiêu Chuẩn 5.0m²',
      description:
        'Lý tưởng cho việc lưu trữ toàn bộ đồ đạc của phòng trọ hoặc căn hộ chung cư 1 phòng ngủ khi sửa nhà.',
      dimensions: { length: 2.0, width: 2.5, height: 2.7 },
      area: 5.0,
      volume: 13.5,
      category: UnitTypeCategoryEnum.SMALL,
      status: UnitTypeStatusEnum.ACTIVE,
      imageUrl:
        'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800',
      images: [
        'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800',
        'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800',
      ],
      features: [
        'Không gian vuông vức',
        'Cửa rộng dễ đẩy xe hàng',
        'Hút ẩm công nghiệp liên tục',
      ],
    },
    {
      _id: unitTypeIds.room_large,
      name: 'Phòng Kho Gia Đình Lớn 10.0m²',
      description:
        'Chứa được toàn bộ nội thất căn hộ 2-3 phòng ngủ: sofa, bàn ăn, tủ lạnh, máy giặt, giường nệm.',
      dimensions: { length: 3.0, width: 3.35, height: 3.0 },
      area: 10.05,
      volume: 30.15,
      category: UnitTypeCategoryEnum.LARGE,
      status: UnitTypeStatusEnum.ACTIVE,
      imageUrl:
        'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800',
      images: [
        'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800',
        'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800',
      ],
      features: [
        'Trần cao 3m',
        'Ổ cắm điện dự phòng',
        'Bảo hiểm hàng hóa cơ bản',
      ],
    },
    {
      _id: unitTypeIds.climate_wine,
      name: 'Kho Mát Kiểm Soát Nhiệt Ẩm (Climate Control) 6.0m²',
      description:
        'Duy trì nhiệt độ 18°C - 22°C và độ ẩm ổn định 50-60%. Chuyên dụng bảo quản rượu vang, xì gà, đồ da cao cấp, mỹ phẩm.',
      dimensions: { length: 2.0, width: 3.0, height: 2.5 },
      area: 6.0,
      volume: 15.0,
      category: UnitTypeCategoryEnum.SMALL,
      status: UnitTypeStatusEnum.ACTIVE,
      imageUrl:
        'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=800',
      images: [
        'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=800',
        'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=800',
      ],
      features: [
        'Điều hòa trung tâm 24/7',
        'Cảm biến IoT nhiệt ẩm',
        'Tường cách nhiệt chống đọng sương',
      ],
    },
    {
      _id: unitTypeIds.warehouse_rack,
      name: 'Kho Phân Khu Kệ Pallet (Warehouse Rack) 100m²',
      description:
        'Kho sàn công nghiệp trang bị các dãy kệ tải trọng nặng, phục vụ quản lý xuất/nhập/tồn SKU và pallet cho doanh nghiệp.',
      dimensions: { length: 16.0, width: 6.25, height: 5.5 },
      area: 100.0,
      volume: 550.0,
      category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
      status: UnitTypeStatusEnum.ACTIVE,
      imageUrl:
        'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800',
      images: [
        'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800',
        'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800',
      ],
      features: [
        '10 dãy kệ Selective Racking tải trọng nặng',
        '5 tầng chứa hàng mỗi kệ (tổng 50 tầng/khoang pallet)',
        'Lối đi rộng rãi hỗ trợ xe nâng chuyên dụng',
        'Hệ thống PCCC tự động Sprinkler theo tiêu chuẩn kho',
        'Quản lý mã vạch SKU & barcode từng khoang kệ',
      ],
      defaultRackConfig: {
        rackCount: 10,
        tiersPerRack: 5,
        tierDimensions: { length: 2.5, width: 1.2, height: 0.9 },
        tierMaxWeightKg: 800,
      },
    },
  ];

  for (const ut of unitTypesData) {
    await UnitType.create(ut);
    console.log(
      `   + [UnitType] ${ut.name.padEnd(42)} [${ut.category}] - ${ut.area}m²`
    );
  }

  // =========================================================================
  // 6. AMENITIES (TIỆN ÍCH DỊCH VỤ)
  // =========================================================================
  console.log(
    '\n🛠️ [7/20] Khởi tạo Tiện ích dịch vụ (Amenities) có hình ảnh & phân loại...'
  );
  const amenityIds = {
    lock: OID('663300000000000000000001'),
    rack: OID('663300000000000000000002'),
    trolley: OID('663300000000000000000003'),
    pallet: OID('663300000000000000000004'),
    boxes: OID('663300000000000000000005'),
    porter: OID('663300000000000000000006'),
    camera: OID('663300000000000000000007'),
  };

  const amenitiesData = [
    {
      _id: amenityIds.lock,
      name: 'Ổ khóa cơ đúc chống cắt Master Lock',
      description:
        'Ổ khóa hợp kim thép gia cường kèm 3 chìa bảo mật, khách tự giữ chìa.',
      type: AmenityTypeEnum.PHYSICAL,
      status: AmenityStatusEnum.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800',
      ],
      tags: ['security', 'hardware', 'lock'],
    },
    {
      _id: amenityIds.rack,
      name: 'Kệ sắt đa năng V-Lỗ 4 tầng tháo lắp',
      description:
        'Kệ thép sơn tĩnh điện, tải trọng 120kg/tầng, tối ưu phân chia chiều cao kho.',
      type: AmenityTypeEnum.PHYSICAL,
      status: AmenityStatusEnum.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=800',
      ],
      tags: ['shelving', 'storage', 'rack'],
    },
    {
      _id: amenityIds.trolley,
      name: 'Xe đẩy hàng sàn thép gập gọn 300kg',
      description:
        'Bánh xe cao su chịu tải êm ái, khách tự do mượn sử dụng trong khuôn viên kho.',
      type: AmenityTypeEnum.PHYSICAL,
      status: AmenityStatusEnum.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
      ],
      tags: ['equipment', 'trolley', 'moving'],
    },
    {
      _id: amenityIds.pallet,
      name: 'Pallet nhựa cách sàn chống ẩm 1m x 1m',
      description:
        'Tấm lót pallet nhựa tiêu chuẩn, nâng hàng cách sàn 15cm tránh ngưng tụ ẩm.',
      type: AmenityTypeEnum.PHYSICAL,
      status: AmenityStatusEnum.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800',
      ],
      tags: ['protection', 'pallet'],
    },
    {
      _id: amenityIds.boxes,
      name: 'Combo 5 thùng carton đóng gói 5 lớp',
      description:
        'Thùng giấy carton cứng chịu va đập, kích thước 60x40x40cm, kèm cuộn băng dính.',
      type: AmenityTypeEnum.PHYSICAL,
      status: AmenityStatusEnum.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800',
      ],
      tags: ['packaging', 'boxes'],
    },
    {
      _id: amenityIds.porter,
      name: 'Dịch vụ bốc xếp & hỗ trợ sắp xếp tại kho',
      description:
        'Nhân sự kho hỗ trợ bốc dỡ hàng từ xe tải vào kho và xếp đặt gọn gàng.',
      type: AmenityTypeEnum.SERVICE,
      status: AmenityStatusEnum.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800',
      ],
      tags: ['service', 'porter'],
    },
    {
      _id: amenityIds.camera,
      name: 'Gói Camera AI riêng biệt trong phòng kho',
      description:
        'Cung cấp quyền truy cập luồng camera quan sát riêng trong phòng kho qua ứng dụng.',
      type: AmenityTypeEnum.SECURITY,
      status: AmenityStatusEnum.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800',
      ],
      tags: ['security', 'cctv', 'ai'],
    },
  ];

  for (const am of amenitiesData) {
    await Amenity.create(am);
    console.log(`   + [Amenity] ${am.name}`);
  }

  // =========================================================================
  // 7. OFFERINGS (BẢNG GIÁ NIÊM YẾT KHO & TIỆN ÍCH CHO TỪNG CƠ SỞ)
  // =========================================================================
  console.log(
    '\n🏷️ [8/20] Khởi tạo Bảng giá (Offerings) đồng bộ 100% giữa Facilities và UnitTypes/Amenities...'
  );

  // Ma trận giá thuê theo tháng cho từng loại kho (mức giá 5.000đ - 10.000đ để dễ test thanh toán QR ngân hàng)
  const unitTypePricingMap: Record<string, number> = {
    [String(unitTypeIds.locker_sm)]: 5000, // 5,000 VND / tháng
    [String(unitTypeIds.locker_std)]: 6000, // 6,000 VND / tháng
    [String(unitTypeIds.room_compact)]: 7000, // 7,000 VND / tháng
    [String(unitTypeIds.room_std)]: 8000, // 8,000 VND / tháng
    [String(unitTypeIds.room_large)]: 9000, // 9,000 VND / tháng
    [String(unitTypeIds.climate_wine)]: 8500, // 8,500 VND / tháng
    [String(unitTypeIds.warehouse_rack)]: 10000, // 10,000 VND / tháng
  };

  const createdOfferingsMap: Record<string, mongoose.Types.ObjectId> = {};

  let offeringCount = 0;
  for (const [facKey, fId] of Object.entries(facilityIds)) {
    for (const [utKey, utId] of Object.entries(unitTypeIds)) {
      if (utKey === 'warehouse_rack' && facKey !== 'q7' && facKey !== 'hn_cg') {
        continue;
      }
      if (utKey === 'room_large' && facKey === 'hn_hk') {
        continue;
      }

      const basePrice = unitTypePricingMap[String(utId)] || 8000;
      const multiplier = facKey === 'q1' || facKey === 'hn_hk' ? 1.1 : 1.0;
      const finalPrice = Math.round((basePrice * multiplier) / 100) * 100;

      const offDoc = await FacilityUnitTypeOffering.create({
        facilityId: fId,
        unitTypeId: utId,
        billingUnit: BillingUnitEnum.MONTH,
        pricePerUnit: finalPrice,
        depositMultiplier: 1,
        minRentalDays: 30,
        status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
        rackZonePricing:
          utKey === 'warehouse_rack'
            ? {
                PRIME: 10000,
                STANDARD: 8000,
                ECONOMY: 6000,
              }
            : undefined,
      });

      createdOfferingsMap[`${String(fId)}_${String(utId)}`] = offDoc._id;
      offeringCount++;
    }
  }
  console.log(
    `   ✅ Đã tạo ${offeringCount} bản ghi FacilityUnitTypeOffering chuẩn.`
  );

  const amenityPricing = [
    {
      amId: amenityIds.lock,
      price: 5000,
      billingUnit: BillingUnitEnum.ONE_TIME,
      qty: 100,
    },
    {
      amId: amenityIds.rack,
      price: 6000,
      billingUnit: BillingUnitEnum.MONTH,
      qty: 30,
    },
    {
      amId: amenityIds.trolley,
      price: 0,
      billingUnit: BillingUnitEnum.MONTH,
      qty: 10,
    },
    {
      amId: amenityIds.pallet,
      price: 5000,
      billingUnit: BillingUnitEnum.MONTH,
      qty: 50,
    },
    {
      amId: amenityIds.boxes,
      price: 5000,
      billingUnit: BillingUnitEnum.ONE_TIME,
      qty: 200,
    },
    {
      amId: amenityIds.porter,
      price: 10000,
      billingUnit: BillingUnitEnum.ONE_TIME,
      qty: null,
    },
    {
      amId: amenityIds.camera,
      price: 5000,
      billingUnit: BillingUnitEnum.MONTH,
      qty: 20,
    },
  ];

  const createdAmenityOfferingsMap: Record<string, mongoose.Types.ObjectId> =
    {};
  for (const fId of Object.values(facilityIds)) {
    for (const amItem of amenityPricing) {
      const amOff = await FacilityAmenityOffering.create({
        facilityId: fId,
        amenityId: amItem.amId,
        billingUnit: amItem.billingUnit,
        pricePerUnit: amItem.price,
        totalQuantity: amItem.qty,
        inUseQuantity: 2,
        status: FacilityAmenityOfferingStatusEnum.ACTIVE,
      });
      createdAmenityOfferingsMap[`${String(fId)}_${String(amItem.amId)}`] =
        amOff._id;
    }
  }
  console.log('   ✅ Đã tạo FacilityAmenityOffering cho toàn bộ 6 cơ sở.');

  // =========================================================================
  // 8. STORAGE UNITS (KHO/PHÒNG THỰC TẾ)
  // =========================================================================
  console.log(
    '\n🚪 [9/20] Khởi tạo Kho/Phòng thực tế (StorageUnits) đầy đủ ảnh và tầng/khu vực...'
  );

  const createdUnits: Record<string, mongoose.Types.ObjectId> = {};

  const unitsSeedPlan = [
    // --- Kho Quận 1 ---
    {
      id: 'u_q1_lk1',
      facId: facilityIds.q1,
      utId: unitTypeIds.locker_sm,
      num: 'Q1-LK-101',
      floor: 1,
      zone: 'Khu Sảnh Locker',
    },
    {
      id: 'u_q1_lk2',
      facId: facilityIds.q1,
      utId: unitTypeIds.locker_sm,
      num: 'Q1-LK-102',
      floor: 1,
      zone: 'Khu Sảnh Locker',
    },
    {
      id: 'u_q1_lk3',
      facId: facilityIds.q1,
      utId: unitTypeIds.locker_std,
      num: 'Q1-LK-201',
      floor: 1,
      zone: 'Khu Sảnh Locker',
    },
    {
      id: 'u_q1_rm1',
      facId: facilityIds.q1,
      utId: unitTypeIds.room_compact,
      num: 'Q1-CP-301',
      floor: 2,
      zone: 'Dãy Phòng A',
    },
    {
      id: 'u_q1_rm2',
      facId: facilityIds.q1,
      utId: unitTypeIds.room_std,
      num: 'Q1-ST-302',
      floor: 2,
      zone: 'Dãy Phòng A',
    },
    {
      id: 'u_q1_cl1',
      facId: facilityIds.q1,
      utId: unitTypeIds.climate_wine,
      num: 'Q1-CL-401',
      floor: 2,
      zone: 'Khu Kho Mát VIP',
    },

    // --- Kho Quận 7 (Có Warehouse Rack) ---
    {
      id: 'u_q7_rm1',
      facId: facilityIds.q7,
      utId: unitTypeIds.room_std,
      num: 'Q7-ST-101',
      floor: 1,
      zone: 'Khu Phòng Kho',
    },
    {
      id: 'u_q7_rm2',
      facId: facilityIds.q7,
      utId: unitTypeIds.room_large,
      num: 'Q7-LG-102',
      floor: 1,
      zone: 'Khu Phòng Lớn',
    },
    {
      id: 'u_q7_wr1',
      facId: facilityIds.q7,
      utId: unitTypeIds.warehouse_rack,
      num: 'Q7-WR-A01',
      floor: 1,
      zone: 'Khu Logistics Kệ Pallet',
    },
    {
      id: 'u_q7_wr2',
      facId: facilityIds.q7,
      utId: unitTypeIds.warehouse_rack,
      num: 'Q7-WR-A02',
      floor: 1,
      zone: 'Khu Logistics Kệ Pallet',
    },

    // --- Kho Bình Thạnh ---
    {
      id: 'u_bt_lk1',
      facId: facilityIds.bt,
      utId: unitTypeIds.locker_std,
      num: 'BT-LK-101',
      floor: 1,
      zone: 'Tầng Trệt',
    },
    {
      id: 'u_bt_rm1',
      facId: facilityIds.bt,
      utId: unitTypeIds.room_compact,
      num: 'BT-CP-201',
      floor: 2,
      zone: 'Tầng 2',
    },
    {
      id: 'u_bt_rm2',
      facId: facilityIds.bt,
      utId: unitTypeIds.room_std,
      num: 'BT-ST-202',
      floor: 2,
      zone: 'Tầng 2',
    },

    // --- Kho Tân Bình ---
    {
      id: 'u_tb_lk1',
      facId: facilityIds.tb,
      utId: unitTypeIds.locker_std,
      num: 'TB-LK-101',
      floor: 1,
      zone: 'Khu Gửi Vali',
    },
    {
      id: 'u_tb_rm1',
      facId: facilityIds.tb,
      utId: unitTypeIds.room_std,
      num: 'TB-ST-201',
      floor: 1,
      zone: 'Khu Hàng Hóa',
    },

    // --- Kho Cầu Giấy (Hà Nội) ---
    {
      id: 'u_cg_lk1',
      facId: facilityIds.hn_cg,
      utId: unitTypeIds.locker_std,
      num: 'CG-LK-101',
      floor: 1,
      zone: 'Khu Locker Văn Phòng',
    },
    {
      id: 'u_cg_rm1',
      facId: facilityIds.hn_cg,
      utId: unitTypeIds.room_std,
      num: 'CG-ST-201',
      floor: 2,
      zone: 'Khu Phòng Tài Liệu',
    },
    {
      id: 'u_cg_wr1',
      facId: facilityIds.hn_cg,
      utId: unitTypeIds.warehouse_rack,
      num: 'CG-WR-01',
      floor: 1,
      zone: 'Kho Tổng Kệ',
    },

    // --- Kho Hoàn Kiếm (Hà Nội) ---
    {
      id: 'u_hk_lk1',
      facId: facilityIds.hn_hk,
      utId: unitTypeIds.locker_sm,
      num: 'HK-LK-101',
      floor: 1,
      zone: 'Sảnh Tràng Tiền',
    },
    {
      id: 'u_hk_cl1',
      facId: facilityIds.hn_hk,
      utId: unitTypeIds.climate_wine,
      num: 'HK-CL-201',
      floor: 2,
      zone: 'Khu Kho Mát Rượu Vang',
    },
  ];

  for (const up of unitsSeedPlan) {
    const suDoc = await StorageUnit.create({
      facilityId: up.facId,
      unitTypeId: up.utId,
      unitNumber: up.num,
      floor: up.floor,
      zone: up.zone,
      status: StorageUnitStatusEnum.AVAILABLE,
      images: [
        'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=800',
        'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800',
      ],
      notes: `Kho thực tế ${up.num} tại ${up.zone}`,
    });
    createdUnits[up.id] = suDoc._id;
  }
  console.log(
    `   ✅ Đã tạo thành công ${unitsSeedPlan.length} kho phòng thực tế kèm ảnh và phân tầng.`
  );

  // =========================================================================
  // 9. STORAGE RACKS & RACK TIERS (KHO KỆ PALLET LOGISTICS)
  // =========================================================================
  console.log(
    '\n🏗️ [10/20] Khởi tạo Hệ thống Kệ & Tầng kệ (StorageRacks & RackTiers) cho kho Logistics...'
  );

  const createdRacks: Record<string, mongoose.Types.ObjectId> = {};
  const createdTiers: Record<string, mongoose.Types.ObjectId> = {};

  const rackConfigs = [
    {
      key: 'rack_q7_a1',
      facId: facilityIds.q7,
      unitId: createdUnits['u_q7_wr1'],
      code: 'RACK-A01',
      aisle: 'A',
      bay: 1,
      zone: RackZoneEnum.PRIME,
    },
    {
      key: 'rack_q7_a2',
      facId: facilityIds.q7,
      unitId: createdUnits['u_q7_wr1'],
      code: 'RACK-A02',
      aisle: 'A',
      bay: 2,
      zone: RackZoneEnum.STANDARD,
    },
    {
      key: 'rack_cg_a1',
      facId: facilityIds.hn_cg,
      unitId: createdUnits['u_cg_wr1'],
      code: 'RACK-HN-01',
      aisle: 'H1',
      bay: 1,
      zone: RackZoneEnum.STANDARD,
    },
  ];

  for (const rc of rackConfigs) {
    const rackDoc = await StorageRack.create({
      facilityId: rc.facId,
      storageUnitId: rc.unitId,
      rackCode: rc.code,
      aisle: rc.aisle,
      bay: rc.bay,
      zone: rc.zone,
      tierCount: 4,
      status: RackStatusEnum.AVAILABLE,
      notes: `Dãy kệ ${rc.code} chịu tải nặng 2.4 tấn`,
    });
    createdRacks[rc.key] = rackDoc._id;

    for (let t = 1; t <= 4; t++) {
      const tierCode = `${rc.code}-T0${t}`;
      const tierDoc = await RackTier.create({
        facilityId: rc.facId,
        storageUnitId: rc.unitId,
        storageRackId: rackDoc._id,
        tierNumber: t,
        tierCode,
        maxWeightKg: 600,
        dimensions: { length: 2.5, width: 1.2, height: 0.8 },
        volume: 2.4,
        status: RackTierStatusEnum.AVAILABLE,
      });
      createdTiers[`${rc.key}_t${t}`] = tierDoc._id;
    }
  }
  console.log(
    `   ✅ Đã tạo thành công ${rackConfigs.length} kệ và 12 tầng RackTier tương ứng.`
  );

  // =========================================================================
  // 10. CUSTOMER SKUS (DANH MỤC SẢN PHẨM KHÁCH HÀNG)
  // =========================================================================
  console.log(
    '\n📦 [11/20] Khởi tạo Danh mục SKU hàng hóa lưu kho (CustomerSkus) kèm ảnh sắc nét...'
  );

  const createdSkus: Record<string, mongoose.Types.ObjectId> = {};

  const skusData = [
    {
      key: 'fan',
      customerId: userIds.customer2,
      skuCode: 'SKU-ELEC-FAN-01',
      name: 'Quạt Cây Đứng Mitsubishi LV16',
      description:
        'Quạt đứng màu xám, kèm điều khiển từ xa, bọc màng co PE bảo vệ.',
      category: 'Điện gia dụng',
      barcode: '893601234001',
      uom: 'cây',
      dimensions: { length: 45, width: 40, height: 120 },
      weightKg: 6.5,
      imageUrl:
        'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600',
      status: CustomerSkuStatusEnum.ACTIVE,
    },
    {
      key: 'clothes_box',
      customerId: userIds.customer2,
      skuCode: 'SKU-FAS-BOX-CLOTHES',
      name: 'Thùng Quần Áo Mùa Đông & Chăn Lông Vũ',
      description:
        'Thùng carton 5 lớp dán kín miệng, kèm túi hút chân không chống ẩm mốc.',
      category: 'Thời trang & May mặc',
      barcode: '893601234002',
      uom: 'thùng',
      dimensions: { length: 60, width: 40, height: 40 },
      weightKg: 14.0,
      imageUrl:
        'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600',
      status: CustomerSkuStatusEnum.ACTIVE,
    },
    {
      key: 'hoodie',
      customerId: userIds.customer2,
      skuCode: 'SKU-FAS-HOODIE-M',
      name: 'Kiện Áo Nỉ Hoodie Streetwear (Size M)',
      description: 'Kiện 40 áo nỉ hoodie cotton dày 380gsm phân loại sẵn.',
      category: 'Thời trang & May mặc',
      barcode: '893520112240',
      uom: 'kiện',
      dimensions: { length: 60, width: 40, height: 35 },
      weightKg: 18.0,
      imageUrl:
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600',
      status: CustomerSkuStatusEnum.ACTIVE,
    },
    {
      key: 'speaker',
      customerId: userIds.customer2,
      skuCode: 'SKU-TECH-SPEAKER-BT',
      name: 'Thùng Loa Bluetooth Di Động JBL Charge 5',
      description:
        'Thùng 10 chiếc loa Bluetooth nguyên seal xuất xứ chính hãng.',
      category: 'Điện tử & Công nghệ',
      barcode: '893601234005',
      uom: 'thùng',
      dimensions: { length: 50, width: 30, height: 25 },
      weightKg: 12.0,
      imageUrl:
        'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600',
      status: CustomerSkuStatusEnum.ACTIVE,
    },
    {
      key: 'doc_tax',
      customerId: userIds.customer2,
      skuCode: 'SKU-DOC-TAX-2023',
      name: 'Thùng Hồ Sơ Quyết Toán Thuế & Báo Cáo Tài Chính 2023',
      description:
        'Chứng từ hóa đơn đỏ, sổ sách kế toán lưu trữ pháp lý 10 năm.',
      category: 'Hồ sơ & Tài liệu',
      barcode: '893850990011',
      uom: 'thùng',
      dimensions: { length: 45, width: 35, height: 30 },
      weightKg: 12.5,
      imageUrl:
        'https://images.unsplash.com/photo-1568667256549-094345857637?w=600',
      status: CustomerSkuStatusEnum.ACTIVE,
    },
  ];

  for (const sku of skusData) {
    const { key, ...skuFields } = sku;
    const doc = await CustomerSku.create(skuFields);
    createdSkus[key] = doc._id;
    console.log(`   + [SKU] ${sku.skuCode} - ${sku.name}`);
  }

  // =========================================================================
  // 11. RESERVATIONS & CONTRACTS
  // =========================================================================
  console.log(
    '\n📝 [12/20] Khởi tạo Đơn đặt chỗ (Reservations) & Hợp đồng thuê kho (Contracts) mẫu...'
  );

  const contract1Id = OID('664400000000000000000001');
  const offeringQ7WR =
    createdOfferingsMap[
      `${String(facilityIds.q7)}_${String(unitTypeIds.warehouse_rack)}`
    ];
  const unitQ7WR1 = createdUnits['u_q7_wr1'];

  await Contract.create({
    _id: contract1Id,
    contractCode: 'CTR-202610-0001',
    source: ContractSourceEnum.WALK_IN,
    customerId: userIds.customer2,
    facilityId: facilityIds.q7,
    storageUnitId: unitQ7WR1,
    facilityUnitTypeOfferingId: offeringQ7WR,
    assignedStaffId: userIds.staffQ7,
    rentalTargetType: RentalTargetTypeEnum.STORAGE_RACK,
    rentedRackIds: [createdRacks['rack_q7_a1']],
    startDate: new Date('2026-10-01T00:00:00Z'),
    endDate: new Date('2027-10-01T00:00:00Z'),
    actualCheckInDate: new Date('2026-10-01T08:30:00Z'),
    billingUnit: BillingUnitEnum.MONTH,
    rentalPrice: 10000,
    depositAmount: 10000,
    depositPaidAt: new Date('2026-10-01T08:00:00Z'),
    depositStatus: ContractDepositStatusEnum.HELD,
    firstPeriodPaidAt: new Date('2026-10-01T08:00:00Z'),
    totalPeriodicPrice: 10000,
    status: ContractStatusEnum.ACTIVE,
    termsAccepted: true,
    customerSigned: true,
    customerSignedAt: new Date('2026-10-01T08:15:00Z'),
    staffSigned: true,
    staffSignedAt: new Date('2026-10-01T08:20:00Z'),
    amenities: [
      {
        facilityAmenityOfferingId:
          createdAmenityOfferingsMap[
            `${String(facilityIds.q7)}_${String(amenityIds.pallet)}`
          ],
        amenityId: amenityIds.pallet,
        name: 'Pallet nhựa cách sàn chống ẩm 1m x 1m',
        quantity: 2,
        pricePerUnit: 5000,
        billingUnit: BillingUnitEnum.MONTH,
        totalPrice: 10000,
        addedAt: new Date('2026-10-01T00:00:00Z'),
      },
    ],
  });

  // Lưu ý: unit dạng warehouse_rack cho thuê từng kệ lẻ bên trong nên phòng kho vẫn AVAILABLE
  await StorageUnit.findByIdAndUpdate(unitQ7WR1, {
    status: StorageUnitStatusEnum.AVAILABLE,
  });
  await StorageRack.findByIdAndUpdate(createdRacks['rack_q7_a1'], {
    status: RackStatusEnum.RENTED,
    currentContractId: contract1Id,
    currentCustomerId: userIds.customer2,
  });

  const contract2Id = OID('664400000000000000000002');
  const offeringQ1CP =
    createdOfferingsMap[
      `${String(facilityIds.q1)}_${String(unitTypeIds.room_compact)}`
    ];
  const unitQ1RM1 = createdUnits['u_q1_rm1'];

  await Contract.create({
    _id: contract2Id,
    contractCode: 'CTR-202610-0002',
    source: ContractSourceEnum.RESERVATION,
    customerId: userIds.customer1,
    facilityId: facilityIds.q1,
    storageUnitId: unitQ1RM1,
    facilityUnitTypeOfferingId: offeringQ1CP,
    assignedStaffId: userIds.staffQ1,
    rentalTargetType: RentalTargetTypeEnum.STORAGE_UNIT,
    startDate: new Date('2026-10-15T00:00:00Z'),
    endDate: new Date('2027-01-15T00:00:00Z'),
    actualCheckInDate: new Date('2026-10-15T09:00:00Z'),
    billingUnit: BillingUnitEnum.MONTH,
    rentalPrice: 7700,
    depositAmount: 7700,
    depositPaidAt: new Date('2026-10-15T08:45:00Z'),
    depositStatus: ContractDepositStatusEnum.HELD,
    firstPeriodPaidAt: new Date('2026-10-15T08:45:00Z'),
    totalPeriodicPrice: 7700,
    status: ContractStatusEnum.ACTIVE,
    termsAccepted: true,
    customerSigned: true,
    customerSignedAt: new Date('2026-10-15T08:50:00Z'),
    staffSigned: true,
    staffSignedAt: new Date('2026-10-15T08:55:00Z'),
    amenities: [
      {
        facilityAmenityOfferingId:
          createdAmenityOfferingsMap[
            `${String(facilityIds.q1)}_${String(amenityIds.lock)}`
          ],
        amenityId: amenityIds.lock,
        name: 'Ổ khóa cơ đúc chống cắt Master Lock',
        quantity: 1,
        pricePerUnit: 5000,
        billingUnit: BillingUnitEnum.ONE_TIME,
        totalPrice: 5000,
        addedAt: new Date('2026-10-15T00:00:00Z'),
      },
    ],
  });
  await StorageUnit.findByIdAndUpdate(unitQ1RM1, {
    status: StorageUnitStatusEnum.OCCUPIED,
  });

  const reservation1Id = OID('664400000000000000000003');
  const offeringQ1LK =
    createdOfferingsMap[
      `${String(facilityIds.q1)}_${String(unitTypeIds.locker_sm)}`
    ];
  const unitQ1LK2 = createdUnits['u_q1_lk2'];

  await Reservation.create({
    _id: reservation1Id,
    reservationCode: 'RES-202610-0001',
    customerId: userIds.customer3,
    facilityId: facilityIds.q1,
    storageUnitId: unitQ1LK2,
    facilityUnitTypeOfferingId: offeringQ1LK,
    rentalTargetType: RentalTargetTypeEnum.STORAGE_UNIT,
    startDate: new Date('2026-11-01T00:00:00Z'),
    checkInDate: new Date('2026-11-01T09:00:00Z'),
    checkInTimeSlot: '09:00 - 11:00',
    rentalDuration: 1,
    billingUnit: BillingUnitEnum.MONTH,
    basePrice: 5500,
    depositAmount: 5500,
    totalAmount: 5500,
    paidAmount: 5500,
    paidAt: new Date('2026-10-28T14:30:00Z'),
    status: ReservationStatusEnum.CONFIRMED,
    refundStatus: RefundStatusEnum.NONE,
    termsAccepted: true,
    acceptedAt: new Date('2026-10-28T14:25:00Z'),
    amenities: [],
  });
  await StorageUnit.findByIdAndUpdate(unitQ1LK2, {
    status: StorageUnitStatusEnum.RESERVED,
  });

  const reservation2Id = OID('664400000000000000000004');
  const offeringCGST =
    createdOfferingsMap[
      `${String(facilityIds.hn_cg)}_${String(unitTypeIds.room_std)}`
    ];
  const unitCGRM1 = createdUnits['u_cg_rm1'];

  const reservation3Id = OID('664400000000000000000005');
  const offeringQ7ST =
    createdOfferingsMap[
      `${String(facilityIds.q7)}_${String(unitTypeIds.room_std)}`
    ];
  const unitQ7ST1 = createdUnits['u_q7_rm1'];

  await Reservation.create({
    _id: reservation3Id,
    reservationCode: 'RES-202611-0003',
    customerId: userIds.customer3,
    facilityId: facilityIds.q7,
    storageUnitId: unitQ7ST1,
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
    amenities: [],
  });

  await Reservation.create({
    _id: reservation2Id,
    reservationCode: 'RES-202610-0002',
    customerId: userIds.customer1,
    facilityId: facilityIds.hn_cg,
    storageUnitId: unitCGRM1,
    facilityUnitTypeOfferingId: offeringCGST,
    rentalTargetType: RentalTargetTypeEnum.STORAGE_UNIT,
    startDate: new Date('2026-11-05T00:00:00Z'),
    checkInDate: new Date('2026-11-05T13:00:00Z'),
    checkInTimeSlot: '13:00 - 15:00',
    rentalDuration: 1,
    billingUnit: BillingUnitEnum.MONTH,
    basePrice: 8000,
    depositAmount: 8000,
    totalAmount: 8000,
    status: ReservationStatusEnum.PENDING_PAYMENT,
    refundStatus: RefundStatusEnum.NONE,
    termsAccepted: true,
    acceptedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    amenities: [],
  });

  console.log(
    '   ✅ Đã tạo Contract 1 (Active, Kệ Kho), Contract 2 (Active, Phòng), Reservation 1 (Confirmed) và Reservation 2 (Pending).'
  );

  // =========================================================================
  // 12. CUSTOMER INVENTORIES, MOVEMENTS & REQUESTS
  // =========================================================================
  console.log(
    '\n📦 [13/20] Khởi tạo Tồn kho, Lịch sử chuyển dịch & Phiếu yêu cầu xuất nhập kho...'
  );

  const inventoryItems = [
    {
      skuId: createdSkus['fan'],
      qty: 12,
      rackTierId: createdTiers['rack_q7_a1_t1'],
    },
    {
      skuId: createdSkus['clothes_box'],
      qty: 25,
      rackTierId: createdTiers['rack_q7_a1_t2'],
    },
    {
      skuId: createdSkus['speaker'],
      qty: 10,
      rackTierId: createdTiers['rack_q7_a1_t3'],
    },
    {
      skuId: createdSkus['doc_tax'],
      qty: 18,
      rackTierId: createdTiers['rack_q7_a1_t4'],
    },
  ];

  let moveIdx = 1;
  for (const inv of inventoryItems) {
    const invDoc = await CustomerInventory.create({
      customerId: userIds.customer2,
      contractId: contract1Id,
      facilityId: facilityIds.q7,
      storageUnitId: unitQ7WR1,
      storageRackId: createdRacks['rack_q7_a1'],
      rackTierId: inv.rackTierId,
      skuId: inv.skuId,
      quantity: inv.qty,
      pendingOutboundQuantity: 0,
      status: InventoryItemStatusEnum.NORMAL,
      lastMovementAt: new Date('2026-10-02T10:00:00Z'),
      notes: 'Nhập kho ban đầu theo hợp đồng CTR-202610-0001',
    });

    await RackTier.findByIdAndUpdate(inv.rackTierId, {
      status: RackTierStatusEnum.OCCUPIED,
    });

    await InventoryMovement.create({
      movementCode: `MOV-202610-000${moveIdx++}`,
      type: MovementTypeEnum.IN,
      customerInventoryId: invDoc._id,
      customerId: userIds.customer2,
      contractId: contract1Id,
      facilityId: facilityIds.q7,
      storageUnitId: unitQ7WR1,
      skuId: inv.skuId,
      toRackTierId: inv.rackTierId,
      quantity: inv.qty,
      previousQuantity: 0,
      newQuantity: inv.qty,
      performedBy: userIds.staffQ7,
      reason: 'Nhập kho hàng mẫu đầu kỳ',
    });
  }

  await InventoryRequest.create({
    requestCode: 'REQ-IN-202610-0001',
    type: InventoryRequestTypeEnum.INBOUND,
    status: InventoryRequestStatusEnum.COMPLETED,
    customerId: userIds.customer2,
    contractId: contract1Id,
    facilityId: facilityIds.q7,
    storageUnitId: unitQ7WR1,
    items: [
      { skuId: createdSkus['fan'], quantity: 12, actualQuantity: 12 },
      { skuId: createdSkus['clothes_box'], quantity: 25, actualQuantity: 25 },
    ],
    isVerified: true,
    verifiedAt: new Date('2026-10-02T09:45:00Z'),
    verifiedBy: userIds.staffQ7,
    completedAt: new Date('2026-10-02T10:15:00Z'),
    completedBy: userIds.staffQ7,
    transporterInfo: {
      name: 'Nguyễn Văn Tài Xế',
      phoneNumber: '0912345678',
      vehiclePlate: '51C-888.99',
      deliveryCompany: 'Giao Hàng Nhanh',
    },
    staffNotes: 'Hàng hóa nguyên đai nguyên kiện, bốc dỡ vào kệ A01 an toàn.',
  });

  await InventoryRequest.create({
    requestCode: 'REQ-IN-202611-0002',
    type: InventoryRequestTypeEnum.INBOUND,
    status: InventoryRequestStatusEnum.PENDING,
    customerId: userIds.customer2,
    contractId: contract1Id,
    facilityId: facilityIds.q7,
    storageUnitId: unitQ7WR1,
    items: [
      { skuId: createdSkus['fan'], quantity: 15, actualQuantity: 0 },
      { skuId: createdSkus['clothes_box'], quantity: 20, actualQuantity: 0 },
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
  });

  await InventoryRequest.create({
    requestCode: 'REQ-OUT-202611-0002',
    type: InventoryRequestTypeEnum.OUTBOUND,
    status: InventoryRequestStatusEnum.PENDING,
    customerId: userIds.customer2,
    contractId: contract1Id,
    facilityId: facilityIds.q7,
    storageUnitId: unitQ7WR1,
    items: [{ skuId: createdSkus['fan'], quantity: 5 }],
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
  });

  await InventoryRequest.create({
    requestCode: 'REQ-OUT-202610-0001',
    type: InventoryRequestTypeEnum.OUTBOUND,
    status: InventoryRequestStatusEnum.PROCESSING,
    customerId: userIds.customer2,
    contractId: contract1Id,
    facilityId: facilityIds.q7,
    storageUnitId: unitQ7WR1,
    items: [{ skuId: createdSkus['fan'], quantity: 2 }],
    isVerified: false,
    staffNotes:
      'Khách đăng ký lấy 2 cây quạt sáng mai, nhân viên đang soạn hàng.',
  });
  console.log(
    '   ✅ Đã tạo tồn kho 4 mặt hàng, lịch sử dịch chuyển (Movements) và 2 phiếu xuất nhập kho (InventoryRequests).'
  );

  // =========================================================================
  // 13. PAYMENTS & TRANSACTIONS (MODULE PAYMENT)
  // =========================================================================
  console.log(
    '\n💳 [14/20] Khởi tạo Thanh toán & Giao dịch SePay (Payments & Transactions)...'
  );

  const pay1 = await Payment.create({
    paymentCode: 'PAY-202610-0001',
    purpose: PaymentPurposeEnum.CONTRACT_DEPOSIT,
    contractId: contract1Id,
    customerId: userIds.customer2,
    facilityId: facilityIds.q7,
    amount: 10000,
    paidAmount: 10000,
    overpaidAmount: 0,
    method: PaymentMethodEnum.SEPAY_QR,
    status: PaymentStatusEnum.PAID,
    paidAt: new Date('2026-10-01T08:00:00Z'),
    sepayTransactionId: 100001,
    referenceCode: 'MB-100001-CTR1',
  });
  await PaymentTransaction.create({
    sepayId: 100001,
    gateway: 'MBBank',
    transactionDate: '2026-10-01 08:00:15',
    accountNumber: '0071001234567',
    content: 'PAY 202610 0001 Coc hop dong',
    transferType: 'in',
    transferAmount: 10000,
    referenceCode: 'MB-100001-CTR1',
    result: PaymentTransactionResultEnum.MATCHED,
    matchedPaymentId: pay1._id,
  });

  const pay2 = await Payment.create({
    paymentCode: 'PAY-202610-0002',
    purpose: PaymentPurposeEnum.RENT_FIRST_PERIOD,
    contractId: contract1Id,
    customerId: userIds.customer2,
    facilityId: facilityIds.q7,
    amount: 10000,
    paidAmount: 10000,
    overpaidAmount: 0,
    method: PaymentMethodEnum.SEPAY_QR,
    status: PaymentStatusEnum.PAID,
    paidAt: new Date('2026-10-01T08:05:00Z'),
    sepayTransactionId: 100002,
    referenceCode: 'MB-100002-CTR1',
  });
  await PaymentTransaction.create({
    sepayId: 100002,
    gateway: 'MBBank',
    transactionDate: '2026-10-01 08:05:20',
    accountNumber: '0071001234567',
    content: 'PAY 202610 0002 Tien thue thang 1',
    transferType: 'in',
    transferAmount: 10000,
    referenceCode: 'MB-100002-CTR1',
    result: PaymentTransactionResultEnum.MATCHED,
    matchedPaymentId: pay2._id,
  });

  await Contract.findByIdAndUpdate(contract1Id, {
    depositPaymentId: pay1._id,
    firstPeriodPaymentId: pay2._id,
  });

  const pay3 = await Payment.create({
    paymentCode: 'PAY-202610-0003',
    purpose: PaymentPurposeEnum.CONTRACT_DEPOSIT,
    contractId: contract2Id,
    customerId: userIds.customer1,
    facilityId: facilityIds.q1,
    amount: 7700,
    paidAmount: 7700,
    overpaidAmount: 0,
    method: PaymentMethodEnum.SEPAY_QR,
    status: PaymentStatusEnum.PAID,
    paidAt: new Date('2026-10-15T08:45:00Z'),
    sepayTransactionId: 100003,
  });
  await Contract.findByIdAndUpdate(contract2Id, { depositPaymentId: pay3._id });

  const pay4 = await Payment.create({
    paymentCode: 'PAY-202610-0004',
    purpose: PaymentPurposeEnum.RESERVATION_DEPOSIT,
    reservationId: reservation1Id,
    customerId: userIds.customer3,
    facilityId: facilityIds.q1,
    amount: 5500,
    paidAmount: 5500,
    overpaidAmount: 0,
    method: PaymentMethodEnum.SEPAY_QR,
    status: PaymentStatusEnum.PAID,
    paidAt: new Date('2026-10-28T14:30:00Z'),
    sepayTransactionId: 100004,
  });
  await Reservation.findByIdAndUpdate(reservation1Id, { paymentId: pay4._id });

  const pay5 = await Payment.create({
    paymentCode: 'PAY-202610-0005',
    purpose: PaymentPurposeEnum.RESERVATION_DEPOSIT,
    reservationId: reservation2Id,
    customerId: userIds.customer1,
    facilityId: facilityIds.hn_cg,
    amount: 8000,
    paidAmount: 0,
    overpaidAmount: 0,
    method: PaymentMethodEnum.SEPAY_QR,
    status: PaymentStatusEnum.PENDING,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  await Reservation.findByIdAndUpdate(reservation2Id, { paymentId: pay5._id });

  console.log(
    '   ✅ Đã tạo 5 Payment và PaymentTransaction SePay liên kết hai chiều với Contract & Reservation.'
  );

  // =========================================================================
  // 14. REFUND REQUESTS (MODULE HOÀN TIỀN)
  // =========================================================================
  console.log(
    '\n💸 [15/20] Khởi tạo Yêu cầu hoàn tiền mẫu (RefundRequests)...'
  );
  await RefundRequest.create({
    refundCode: 'REF-202610-0001',
    facilityId: facilityIds.q1,
    customerId: userIds.customer1,
    amount: 5000,
    reason: RefundRequestReasonEnum.DEPOSIT_SETTLEMENT,
    status: RefundRequestStatusEnum.PENDING_APPROVAL,
    refundBankName: 'Vietcombank',
    refundAccountNumberMasked: '**** **** 9876',
    refundAccountHolder: 'NGUYEN VAN AN',
    requestedBy: userIds.customer1,
    requestedAt: new Date('2026-10-25T10:00:00Z'),
    note: 'Quyết toán tiền cọc thừa sau khi trả phòng kiểm kê an toàn.',
  });

  await RefundRequest.create({
    refundCode: 'REF-202610-0002',
    facilityId: facilityIds.q7,
    customerId: userIds.customer3,
    amount: 5500,
    reason: RefundRequestReasonEnum.CUSTOMER_CANCEL,
    status: RefundRequestStatusEnum.PAID,
    refundBankName: 'Techcombank',
    refundAccountNumberMasked: '**** **** 4321',
    refundAccountHolder: 'HOANG MAI LAN',
    requestedBy: userIds.customer3,
    requestedAt: new Date('2026-10-10T09:00:00Z'),
    approvedBy: userIds.managerQ7,
    approvedAt: new Date('2026-10-10T11:00:00Z'),
    paidBy: userIds.ops,
    paidAt: new Date('2026-10-11T14:00:00Z'),
    note: 'Khách hủy đơn đặt chỗ trước 48h theo chính sách hoàn tiền 100%.',
  });
  console.log(
    '   ✅ Đã tạo 2 yêu cầu hoàn tiền (1 Đang chờ duyệt, 1 Đã thanh toán).'
  );

  // =========================================================================
  // 15. INCIDENTS (MODULE BÁO CÁO SỰ CỐ)
  // =========================================================================
  console.log('\n⚠️ [16/20] Khởi tạo Báo cáo sự cố cơ sở & kho (Incidents)...');
  await Incident.create({
    incidentCode: 'INC-202610-0001',
    facilityId: facilityIds.q7,
    storageUnitId: unitQ7WR1,
    reporterId: userIds.staffQ7,
    reporterRole: RoleEnum.FACILITY_STAFF,
    category: IncidentCategoryEnum.ELECTRICAL,
    severity: IncidentSeverityEnum.LOW,
    title: 'Kiểm tra bảo dưỡng bóng đèn LED chiếu sáng Kệ A01',
    description:
      'Đèn LED chiếu sáng dãy A01 bị chập chờn, kỹ thuật đã kiểm tra và thay thế tăng phô mới.',
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
    ],
    status: IncidentStatusEnum.CLOSED,
    putUnitUnderMaintenance: false,
    requiresRelocation: false,
    closedAt: new Date('2026-10-15T15:00:00Z'),
  });

  await Incident.create({
    incidentCode: 'INC-202611-0003',
    facilityId: facilityIds.q7,
    storageUnitId: unitQ7WR1,
    reporterId: userIds.managerQ7,
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
  });

  await Incident.create({
    incidentCode: 'INC-202610-0002',
    facilityId: facilityIds.hn_hk,
    storageUnitId: createdUnits['u_hk_cl1'],
    reporterId: userIds.managerHN,
    reporterRole: RoleEnum.FACILITY_MANAGER,
    category: IncidentCategoryEnum.STRUCTURAL,
    severity: IncidentSeverityEnum.MEDIUM,
    title: 'Bảo dưỡng định kỳ hệ thống điều hòa ẩm kho mát HK-CL-201',
    description:
      'Kiểm tra máy nén và vệ sinh lưới lọc bụi định kỳ 6 tháng một lần theo tiêu chuẩn PCCC và kiểm soát nhiệt ẩm.',
    images: [
      'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=800',
    ],
    status: IncidentStatusEnum.IN_PROGRESS,
    assignedStaffId: userIds.staffQ1,
    putUnitUnderMaintenance: false,
    requiresRelocation: false,
  });
  console.log(
    '   ✅ Đã tạo 2 sự cố (1 Đã hoàn tất đóng hồ sơ, 1 Đang xử lý bảo dưỡng).'
  );

  // =========================================================================
  // 16. SUPPORT TICKETS (MODULE PHIẾU HỖ TRỢ KHÁCH HÀNG)
  // =========================================================================
  console.log(
    '\n🎫 [17/20] Khởi tạo Phiếu hỗ trợ khách hàng (SupportTickets)...'
  );
  await SupportTicket.create({
    ticketCode: 'TCK-202610-0001',
    customerId: userIds.customer1,
    facilityId: facilityIds.q1,
    contractId: contract2Id,
    category: SupportTicketCategoryEnum.GENERAL_INQUIRY,
    priority: SupportTicketPriorityEnum.MEDIUM,
    title: 'Tư vấn thủ tục gia hạn hợp đồng thuê phòng Q1',
    description:
      'Hợp đồng của tôi dự kiến hết hạn vào tháng 01/2027, tôi muốn hỏi thủ tục làm phụ lục gia hạn thêm 6 tháng?',
    attachments: [],
    status: SupportTicketStatusEnum.COMPLETED,
    assignedStaffId: userIds.staffQ1,
    staffResponse: {
      responseMessage:
        'Dạ chào bạn, thủ tục gia hạn được thực hiện trực tuyến ngay trên ứng dụng hoặc ký phụ lục tại quầy lễ tân Kho Q1 trước 7 ngày khi hợp đồng hết hạn ạ!',
      attachments: [],
      respondedBy: userIds.staffQ1,
      respondedAt: new Date('2026-10-18T10:00:00Z'),
    },
    completedAt: new Date('2026-10-18T10:05:00Z'),
  });

  await SupportTicket.create({
    ticketCode: 'TCK-202611-0003',
    customerId: userIds.customer2,
    facilityId: facilityIds.q7,
    contractId: contract1Id,
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
  });

  await SupportTicket.create({
    ticketCode: 'TCK-202610-0002',
    customerId: userIds.customer2,
    facilityId: facilityIds.q7,
    contractId: contract1Id,
    category: SupportTicketCategoryEnum.INVENTORY_MOVE_REQUEST,
    priority: SupportTicketPriorityEnum.HIGH,
    title: 'Đăng ký xuất kho 2 cây quạt đứng vào sáng mai',
    description:
      'Công ty chúng tôi cần lấy 2 cây quạt SKU-ELEC-FAN-01 tại Tầng 1 Kệ A01 giao cho đối tác sớm lúc 08:30.',
    attachments: [],
    status: SupportTicketStatusEnum.PENDING,
    assignedStaffId: userIds.staffQ7,
  });
  console.log(
    '   ✅ Đã tạo 2 phiếu hỗ trợ khách hàng (1 Đã giải đáp hoàn tất, 1 Đang chờ xử lý).'
  );

  // =========================================================================
  // 17. NOTIFICATIONS (MODULE THÔNG BÁO)
  // =========================================================================
  console.log('\n🔔 [18/20] Khởi tạo Thông báo người dùng (Notifications)...');
  const notificationsData = [
    {
      recipientId: userIds.customer2,
      facilityId: facilityIds.q7,
      title: 'Hợp đồng thuê kho đã kích hoạt thành công!',
      content:
        'Hợp đồng CTR-202610-0001 tại Kho Quận 7 đã có hiệu lực. Bạn có thể bắt đầu nhập hàng vào Kệ A01.',
      type: NotificationTypeEnum.CONTRACT,
      priority: NotificationPriorityEnum.HIGH,
      channels: [NotificationChannelEnum.IN_APP, NotificationChannelEnum.EMAIL],
      isRead: true,
      readAt: new Date('2026-10-01T08:30:00Z'),
    },
    {
      recipientId: userIds.customer2,
      facilityId: facilityIds.q7,
      title: 'Xác nhận nhập kho hàng hóa thành công',
      content:
        'Nhân viên đã tiếp nhận và xếp 4 mặt hàng vào đúng các tầng kệ theo biên bản REQ-IN-202610-0001.',
      type: NotificationTypeEnum.CUSTOMER_INVENTORY,
      priority: NotificationPriorityEnum.NORMAL,
      channels: [NotificationChannelEnum.IN_APP],
      isRead: false,
      readAt: null,
    },
    {
      recipientId: userIds.customer3,
      facilityId: facilityIds.q1,
      title: 'Đơn đặt chỗ RES-202610-0001 đã xác nhận',
      content:
        'Đơn đặt chỗ tủ Locker tại Kho Q1 đã được xác nhận thanh toán. Lịch check-in của bạn: 09:00 - 11:00 ngày 01/11/2026.',
      type: NotificationTypeEnum.RESERVATION,
      priority: NotificationPriorityEnum.HIGH,
      channels: [NotificationChannelEnum.IN_APP, NotificationChannelEnum.EMAIL],
      isRead: true,
      readAt: new Date('2026-10-28T15:00:00Z'),
    },
    {
      recipientId: userIds.staffQ1,
      facilityId: facilityIds.q1,
      title: 'Nhắc nhở tiếp đón khách check-in',
      content:
        'Có khách hàng đặt check-in nhận tủ Q1-LK-102 vào ca 09:00 - 11:00 ngày 01/11/2026.',
      type: NotificationTypeEnum.RESERVATION,
      priority: NotificationPriorityEnum.NORMAL,
      channels: [NotificationChannelEnum.IN_APP],
      isRead: false,
      readAt: null,
    },
    {
      recipientId: userIds.managerQ7,
      facilityId: facilityIds.q7,
      title: 'Hoàn tất nghiệm thu bảo dưỡng định kỳ',
      content:
        'Sự cố INC-202610-0001 kiểm tra chiếu sáng Kệ A01 đã được nhân viên kỹ thuật hoàn tất.',
      type: NotificationTypeEnum.INCIDENT,
      priority: NotificationPriorityEnum.LOW,
      channels: [NotificationChannelEnum.IN_APP],
      isRead: false,
      readAt: null,
    },
  ];

  for (const notif of notificationsData) {
    await Notification.create(notif);
  }
  console.log(
    `   ✅ Đã tạo thành công ${notificationsData.length} thông báo trong app cho các vai trò.`
  );

  // =========================================================================
  // 18. APPROVAL REQUESTS (MODULE PHÊ DUYỆT)
  // =========================================================================
  console.log('\n⚖️ [19/20] Khởi tạo Yêu cầu phê duyệt (ApprovalRequests)...');
  await ApprovalRequest.create({
    requesterId: userIds.managerQ1,
    facilityId: facilityIds.q1,
    targetType: ApprovalRequestTargetTypeEnum.FACILITY_UNIT_TYPE_OFFERING,
    action: ApprovalRequestActionEnum.UPDATE,
    targetId:
      createdOfferingsMap[
        `${String(facilityIds.q1)}_${String(unitTypeIds.climate_wine)}`
      ],
    payload: {
      proposedPrice: 7000,
      discountNote: 'Chương trình tri ân khách thuê kho mát dài hạn',
    },
    reason:
      'Đề xuất áp dụng bảng giá ưu đãi tháng cuối năm cho kho mát bảo quản rượu',
    status: ApprovalRequestStatusEnum.PENDING,
  });

  await ApprovalRequest.create({
    requesterId: userIds.managerQ7,
    facilityId: facilityIds.q7,
    targetType: ApprovalRequestTargetTypeEnum.FACILITY_AMENITY_OFFERING,
    action: ApprovalRequestActionEnum.UPDATE,
    targetId:
      createdAmenityOfferingsMap[
        `${String(facilityIds.q7)}_${String(amenityIds.pallet)}`
      ],
    payload: { newTotalQuantity: 100 },
    reason:
      'Kho Q7 nhu cầu pallet tăng cao mùa cao điểm, đề xuất tăng hạn mức tồn kho pallet lên 100 tấm',
    status: ApprovalRequestStatusEnum.APPROVED,
    approverId: userIds.ops,
    reviewedAt: new Date('2026-10-12T16:00:00Z'),
    reviewNotes:
      'Đồng ý duyệt tăng số lượng pallet để kịp đáp ứng nhu cầu logistics.',
  });
  console.log(
    '   ✅ Đã tạo 2 yêu cầu phê duyệt nghiệp vụ (1 Đang chờ duyệt, 1 Đã phê duyệt).'
  );

  // =========================================================================
  // 19. SIGNING AUTHORIZATIONS (MODULE ỦY QUYỀN KÝ KẾT)
  // =========================================================================
  console.log(
    '\n📜 [20/20] Khởi tạo Giấy ủy quyền ký kết (SigningAuthorizations)...'
  );
  await SigningAuthorization.create({
    legalEntityId,
    authorizedUserId: userIds.managerQ1,
    facilityIds: [facilityIds.q1, facilityIds.bt],
    authorizationNumber: 'UQ-2026-001/SSV',
    issuedDate: new Date('2026-01-01T00:00:00Z'),
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: new Date('2027-12-31T23:59:59Z'),
    documentUrl:
      'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800',
    status: 'active',
    notes:
      'Ủy quyền cho Giám đốc cơ sở Kho Q1 đại diện ký kết hợp đồng thuê kho và phụ lục.',
  });

  await SigningAuthorization.create({
    legalEntityId,
    authorizedUserId: userIds.managerQ7,
    facilityIds: [facilityIds.q7, facilityIds.tb],
    authorizationNumber: 'UQ-2026-002/SSV',
    issuedDate: new Date('2026-01-01T00:00:00Z'),
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: new Date('2027-12-31T23:59:59Z'),
    documentUrl:
      'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800',
    status: 'active',
    notes:
      'Ủy quyền cho Giám đốc cơ sở Kho Q7 đại diện ký kết hợp đồng kho logistics và kho cá nhân.',
  });
  console.log(
    '   ✅ Đã tạo 2 giấy ủy quyền ký hợp đồng pháp lý cho các Quản lý cơ sở.'
  );

  console.log(
    '\n=========================================================================='
  );
  console.log(
    '🎉 TOÀN BỘ 100% CÁC MODULE TRONG HỆ THỐNG ĐÃ ĐƯỢC SEED ĐỒNG BỘ HOÀN TOÀN!'
  );
  console.log(
    '=========================================================================='
  );
  console.log('📋 BẢNG THỐNG KÊ CHI TIẾT TỪNG MODULE:');
  console.log('   1.  LegalEntity:              1 Pháp nhân doanh nghiệp');
  console.log('   2.  ContractTemplate:         1 Mẫu hợp đồng chuẩn HTML');
  console.log(
    '   3.  Users & Profiles:         10 Tài khoản chuẩn 5 roles kèm avatar (Password123@)'
  );
  console.log(
    '   4.  Facilities:               6 Cơ sở có mã code, ảnh HD, giờ hoạt động 07:00-22:00'
  );
  console.log(
    '   5.  FacilityTimeSlots:        42 Khung giờ ca check-in (7 ca / cơ sở, sức chứa 2-4)'
  );
  console.log(
    '   6.  UnitTypes:                7 Loại kho đầy đủ kích thước, diện tích, thể tích, ảnh HD'
  );
  console.log(
    '   7.  Amenities:                7 Tiện ích dịch vụ đầy đủ hình ảnh và tags'
  );
  console.log(
    `   8.  FacilityUnitOfferings:    ${offeringCount} Bảng giá thuê kho niêm yết`
  );
  console.log('   9.  FacilityAmenityOfferings: 42 Bảng giá tiện ích đi kèm');
  console.log(
    `   10. StorageUnits:             ${unitsSeedPlan.length} Kho/Phòng thực tế kèm ảnh và phân tầng`
  );
  console.log(
    `   11. StorageRacks & Tiers:     ${rackConfigs.length} Kệ Selective & 12 Tầng RackTier chịu tải`
  );
  console.log(
    `   12. CustomerSkus:             ${skusData.length} SKU hàng hóa có ảnh minh họa & mã barcode`
  );
  console.log(
    '   13. Contracts:                2 Hợp đồng Active liên kết Kệ và Phòng'
  );
  console.log(
    '   14. Reservations:             2 Đơn đặt chỗ (1 Confirmed đã trả tiền, 1 Pending)'
  );
  console.log('   15. CustomerInventories:      4 Mặt hàng lưu kho thực tế');
  console.log(
    '   16. InventoryMovements:       4 Bản ghi lịch sử nhập hàng (IN)'
  );
  console.log(
    '   17. InventoryRequests:        2 Phiếu xuất/nhập kho (1 Inbound Completed, 1 Outbound Processing)'
  );
  console.log(
    '   18. Payments & Transactions:  5 Hóa đơn thanh toán & Giao dịch SePay QR'
  );
  console.log(
    '   19. RefundRequests:           2 Yêu cầu hoàn tiền (1 Pending, 1 Paid)'
  );
  console.log(
    '   20. Incidents:                2 Báo cáo sự cố bảo dưỡng kỹ thuật'
  );
  console.log('   21. SupportTickets:           2 Phiếu hỗ trợ khách hàng');
  console.log(
    '   22. Notifications:            5 Thông báo in-app cho các vai trò'
  );
  console.log('   23. ApprovalRequests:         2 Yêu cầu duyệt giá/kho');
  console.log(
    '   24. SigningAuthorizations:    2 Giấy ủy quyền ký kết hợp đồng pháp nhân'
  );
  console.log(
    '==========================================================================\n'
  );

  await mongoose.disconnect();
  console.log('Đã đóng kết nối MongoDB.');
}

runMasterSeed().catch((err) => {
  console.error('❌ Lỗi khi chạy Master Seed:', err);
  process.exit(1);
});
