import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
import type { Request as ExpressRequest } from 'express';
import { ContractController } from '../src/modules/contract/contract.controller.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { StorageRackRepository } from '../src/modules/storageRack/storageRack.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { Profile } from '../src/modules/profile/profile.model.ts';
import { ProfileRepository } from '../src/modules/profile/profile.repository.ts';
import { LegalEntity } from '../src/modules/legalEntity/legalEntity.model.ts';
import { LegalEntityRepository } from '../src/modules/legalEntity/legalEntity.repository.ts';
import { SigningAuthorization } from '../src/modules/signingAuthorization/signingAuthorization.model.ts';
import { SigningAuthorizationRepository } from '../src/modules/signingAuthorization/signingAuthorization.repository.ts';
import { ContractTemplate } from '../src/modules/contractTemplate/contractTemplate.model.ts';
import { ContractTemplateRepository } from '../src/modules/contractTemplate/contractTemplate.repository.ts';
import {
  ContractAddendumStatusEnum,
  ContractAddendumTypeEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  RackStatusEnum,
  RackZoneEnum,
} from '../src/common/enums/storageRack.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { AppError } from '../src/common/errors/appError.error.ts';
import { RentalTargetTypeEnum } from '../src/common/enums/rental.enum.ts';

describe('booking/T4.5: Contract Addendum Draft PDF Export & 2-Layer RBAC', () => {
  let contractService: ContractService;

  const facilityAId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const facilityBId = new Types.ObjectId(TEST_FACILITY_B_ID);
  const customer1Id = new Types.ObjectId(TEST_USERS.customer1.id);
  const customer2Id = new Types.ObjectId(TEST_USERS.customer2.id);
  const staffAId = new Types.ObjectId(TEST_USERS.staffFacilityA.id);
  const staffBId = new Types.ObjectId(TEST_USERS.staffFacilityB.id);
  const managerAId = new Types.ObjectId(TEST_USERS.managerFacilityA.id);
  const managerBId = new Types.ObjectId(TEST_USERS.managerFacilityB.id);
  const opsId = new Types.ObjectId(TEST_USERS.opsManager.id);
  const adminId = new Types.ObjectId(TEST_USERS.systemAdmin.id);
  const offeringId = new Types.ObjectId('65d000000000000000000099');

  let unitA1Id: Types.ObjectId;
  let unitA2Id: Types.ObjectId;
  let rackA1Id: Types.ObjectId;
  let rackA2Id: Types.ObjectId;
  let legalEntityId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();

    const contractRepo = new ContractRepository(Contract);
    const reservationRepo = new ReservationRepository(Reservation);
    const storageUnitRepo = new StorageUnitRepository(StorageUnit);
    const amenityOfferingRepo = new FacilityAmenityOfferingRepository(
      FacilityAmenityOffering
    );
    const unitTypeOfferingRepo = new FacilityUnitTypeOfferingRepository(
      FacilityUnitTypeOffering
    );
    const facilityRepo = new FacilityRepository(Facility);
    const userRepo = new UserRepository(User);
    const legalEntityRepo = new LegalEntityRepository(LegalEntity);
    const signingAuthRepo = new SigningAuthorizationRepository(
      SigningAuthorization
    );
    const profileRepo = new ProfileRepository(Profile);
    const contractTemplateRepo = new ContractTemplateRepository(
      ContractTemplate
    );
    const storageRackRepo = new StorageRackRepository(StorageRack);

    contractService = new ContractService(
      contractRepo,
      reservationRepo,
      storageUnitRepo,
      amenityOfferingRepo,
      unitTypeOfferingRepo,
      facilityRepo,
      userRepo,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      legalEntityRepo,
      signingAuthRepo,
      profileRepo,
      contractTemplateRepo,
      storageRackRepo
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    const le = await LegalEntity.create({
      companyName: 'CÔNG TY CỔ PHẦN LƯU TRỮ THÔNG MINH VIỆT NAM',
      taxCode: '0108889999',
      registeredAddress: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
      legalRepresentative: {
        name: 'Trần Văn Giám Đốc',
        title: 'Tổng Giám Đốc',
      },
      bankAccount: {
        bankName: 'Vietcombank',
        accountNumber: '998877665544',
        accountHolder: 'CONG TY CP LUU TRU THONG MINH VN',
      },
      status: 'active',
    });
    legalEntityId = le._id;

    await Facility.create({
      _id: facilityAId,
      name: 'Kho Hai Bà Trưng',
      city: 'Hà Nội',
      address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
      status: FacilityStatusEnum.ACTIVE,
      legalEntityId,
      operatingHours: { open: '08:00', close: '20:00' },
    });

    await Facility.create({
      _id: facilityBId,
      name: 'Kho Cầu Giấy',
      city: 'Hà Nội',
      address: '99 Cầu Giấy, Hà Nội',
      status: FacilityStatusEnum.ACTIVE,
      legalEntityId,
      operatingHours: { open: '08:00', close: '20:00' },
    });

    const unitType = await UnitType.create({
      name: 'Kho Tiêu Chuẩn 5m2',
      category: UnitTypeCategoryEnum.SMALL,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: { width: 2, length: 2.5, height: 2.5 },
      area: 5,
      volume: 12.5,
    });

    await FacilityUnitTypeOffering.create({
      _id: offeringId,
      facilityId: facilityAId,
      unitTypeId: unitType._id,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 1500000,
      depositMultiplier: 1,
      minRentalDays: 30,
      status: 'active',
    });

    const unit1 = await StorageUnit.create({
      unitNumber: 'HBT-101',
      facilityId: facilityAId,
      unitTypeId: unitType._id,
      floor: 1,
      zone: 'A',
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    unitA1Id = unit1._id;

    const unit2 = await StorageUnit.create({
      unitNumber: 'HBT-202',
      facilityId: facilityAId,
      unitTypeId: unitType._id,
      floor: 2,
      zone: 'B',
      status: StorageUnitStatusEnum.RESERVED,
    });
    unitA2Id = unit2._id;

    const rack1 = await StorageRack.create({
      facilityId: facilityAId,
      storageUnitId: unitA1Id,
      rackCode: 'R-A1',
      aisle: 'A',
      bay: 1,
      zone: RackZoneEnum.STANDARD,
      tierCount: 3,
      status: RackStatusEnum.RENTED,
    });
    rackA1Id = rack1._id;

    const rack2 = await StorageRack.create({
      facilityId: facilityAId,
      storageUnitId: unitA1Id,
      rackCode: 'R-B2',
      aisle: 'B',
      bay: 2,
      zone: RackZoneEnum.PRIME,
      tierCount: 3,
      status: RackStatusEnum.RESERVED,
    });
    rackA2Id = rack2._id;

    await Profile.create({
      userId: customer1Id,
      address: '45 Bà Triệu, Hoàn Kiếm, Hà Nội',
      idCardLast4: '5678',
      dateOfBirth: new Date('1995-05-20T00:00:00.000Z'),
    });

    const now = new Date();
    await SigningAuthorization.create({
      legalEntityId,
      facilityIds: [facilityAId],
      authorizedUserId: managerAId,
      authorizationNumber: 'UQ-2026-ADD-01',
      issuedDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      validFrom: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      validTo: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      documentUrl: 'https://cdn.storage.vn/auth/uq-2026-add-01.pdf',
      status: 'active',
    });
  });

  it('exports printable A4 HTML & Buffer for RENEW addendum in DRAFT status', async () => {
    const addendumId = new Types.ObjectId();
    const prevEnd = new Date('2026-11-30T16:59:59.000Z');
    const nextEnd = new Date('2027-02-28T16:59:59.000Z');

    const contract = await Contract.create({
      contractCode: 'CTR-ADD-RENEW-01',
      source: ContractSourceEnum.WALK_IN,
      customerId: customer1Id,
      facilityId: facilityAId,
      storageUnitId: unitA1Id,
      facilityUnitTypeOfferingId: offeringId,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: prevEnd,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1500000,
      depositAmount: 1500000,
      totalPeriodicPrice: 1800000,
      status: ContractStatusEnum.ACTIVE,
      customerSnapshot: {
        customerId: customer1Id,
        name: 'Customer One',
        email: 'customer1@test.com',
        phoneNumber: '0901234567',
        address: '45 Bà Triệu, Hoàn Kiếm, Hà Nội',
        idCardNumberMasked: '****5678',
      },
      addendums: [
        {
          _id: addendumId,
          addendumCode: 'ADD-20261112-1001',
          type: ContractAddendumTypeEnum.RENEW,
          previousEndDate: prevEnd,
          newEndDate: nextEnd,
          amenities: [
            {
              facilityAmenityOfferingId: new Types.ObjectId(),
              amenityId: new Types.ObjectId(),
              name: 'Khóa từ thông minh',
              quantity: 1,
              pricePerUnit: 300000,
              billingUnit: BillingUnitEnum.MONTH,
              totalPrice: 300000,
              addedAt: new Date(),
            },
          ],
          totalPeriodicPrice: 1800000,
          damageFee: 0,
          status: ContractAddendumStatusEnum.DRAFT,
          requestedBy: customer1Id,
          requestedAt: new Date(),
          customerSigned: false,
          staffSigned: false,
          notes: 'Gia hạn thêm 3 tháng',
        },
      ],
    });

    const preview = await contractService.getAddendumDraftPdf(
      String(contract._id),
      String(addendumId),
      String(managerAId),
      RoleEnum.FACILITY_MANAGER
    );

    expect(preview.contractCode).toBe('CTR-ADD-RENEW-01');
    expect(preview.addendumCode).toBe('ADD-20261112-1001');
    expect(preview.html).toContain('PHỤ LỤC HỢP ĐỒNG');
    expect(preview.html).toContain('ADD-20261112-1001');
    expect(preview.html).toContain('CTR-ADD-RENEW-01');
    expect(preview.html).toContain(
      'CÔNG TY CỔ PHẦN LƯU TRỮ THÔNG MINH VIỆT NAM'
    );
    expect(preview.html).toContain('UQ-2026-ADD-01');
    expect(preview.html).toContain('****5678');
    expect(preview.html).toContain('Gia hạn thời hạn thuê');
    expect(preview.html).toContain('Khóa từ thông minh');
    expect(preview.html).toContain('1.800.000');
    expect(preview.html).toContain('DRAFT');
    expect(preview.buffer).toBeInstanceOf(Buffer);
    expect(preview.buffer.length).toBeGreaterThan(0);
  });

  it('exports printable A4 HTML for UNIT_CHANGE addendum showing old and new storage units', async () => {
    const addendumId = new Types.ObjectId();

    const contract = await Contract.create({
      contractCode: 'CTR-ADD-UNIT-02',
      source: ContractSourceEnum.RESERVATION,
      customerId: customer1Id,
      facilityId: facilityAId,
      storageUnitId: unitA1Id,
      facilityUnitTypeOfferingId: offeringId,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T16:59:59.000Z'),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1500000,
      depositAmount: 1500000,
      totalPeriodicPrice: 1500000,
      status: ContractStatusEnum.ACTIVE,
      addendums: [
        {
          _id: addendumId,
          addendumCode: 'ADD-20261112-2002',
          type: ContractAddendumTypeEnum.UNIT_CHANGE,
          previousStorageUnitId: unitA1Id,
          newStorageUnitId: unitA2Id,
          amenities: [],
          totalPeriodicPrice: 2200000,
          damageFee: 0,
          status: ContractAddendumStatusEnum.DRAFT,
          requestedBy: managerAId,
          requestedAt: new Date(),
          customerSigned: false,
          staffSigned: false,
        },
      ],
    });

    const preview = await contractService.getAddendumDraftPdf(
      String(contract._id),
      String(addendumId),
      String(customer1Id),
      RoleEnum.CUSTOMER
    );

    expect(preview.html).toContain('Thay đổi phòng kho');
    expect(preview.html).toContain('HBT-101');
    expect(preview.html).toContain('HBT-202');
    expect(preview.html).toContain('2.200.000');
  });

  it('exports printable A4 HTML for RACK_CHANGE addendum showing old and new racks and ACTIVE snapshot', async () => {
    const addendumId = new Types.ObjectId();

    const contract = await Contract.create({
      contractCode: 'CTR-ADD-RACK-03',
      source: ContractSourceEnum.WALK_IN,
      customerId: customer1Id,
      facilityId: facilityAId,
      storageUnitId: unitA1Id,
      rentalTargetType: RentalTargetTypeEnum.STORAGE_RACK,
      rentedRackIds: [rackA2Id],
      facilityUnitTypeOfferingId: offeringId,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T16:59:59.000Z'),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1200000,
      depositAmount: 1200000,
      totalPeriodicPrice: 1500000,
      status: ContractStatusEnum.ACTIVE,
      addendums: [
        {
          _id: addendumId,
          addendumCode: 'ADD-20261112-3003',
          type: ContractAddendumTypeEnum.RACK_CHANGE,
          previousRackId: rackA1Id,
          newRackId: rackA2Id,
          amenities: [],
          totalPeriodicPrice: 1500000,
          damageFee: 0,
          status: ContractAddendumStatusEnum.ACTIVE,
          requestedBy: managerAId,
          requestedAt: new Date(),
          customerSigned: true,
          customerSignedAt: new Date(),
          staffSigned: true,
          staffSignedAt: new Date(),
          completedAt: new Date(),
          signingAuthorizationSnapshot: {
            authorizationId: new Types.ObjectId(),
            authorizedUserId: managerAId,
            authorizationNumber: 'UQ-SNAPSHOT-RACK-99',
            issuedDate: new Date(),
            validFrom: new Date(),
            validTo: new Date(Date.now() + 86400000),
            documentUrl: 'https://cdn.storage.vn/auth/uq-snapshot.pdf',
          },
        },
      ],
    });

    const preview = await contractService.getAddendumDraftPdf(
      String(contract._id),
      String(addendumId),
      String(customer1Id),
      RoleEnum.CUSTOMER
    );

    expect(preview.html).toContain('Chuyển đổi kệ lưu trữ');
    expect(preview.html).toContain('R-A1');
    expect(preview.html).toContain('R-B2');
    expect(preview.html).toContain('HBT-101');
    expect(preview.html).toContain('UQ-SNAPSHOT-RACK-99');
    expect(preview.html).toContain('ĐÃ CÓ HIỆU LỰC');
  });

  it('enforces 2-layer RBAC scoping (Rule 14) and throws 404 when contract or addendum is missing', async () => {
    const addendumId = new Types.ObjectId();

    const contract = await Contract.create({
      contractCode: 'CTR-ADD-RBAC-04',
      source: ContractSourceEnum.WALK_IN,
      customerId: customer1Id,
      facilityId: facilityAId,
      storageUnitId: unitA1Id,
      facilityUnitTypeOfferingId: offeringId,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T16:59:59.000Z'),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1500000,
      depositAmount: 1500000,
      totalPeriodicPrice: 1500000,
      status: ContractStatusEnum.ACTIVE,
      addendums: [
        {
          _id: addendumId,
          addendumCode: 'ADD-20261112-4004',
          type: ContractAddendumTypeEnum.RENEW,
          previousEndDate: new Date('2026-12-31T16:59:59.000Z'),
          newEndDate: new Date('2027-01-31T16:59:59.000Z'),
          amenities: [],
          totalPeriodicPrice: 1500000,
          damageFee: 0,
          status: ContractAddendumStatusEnum.DRAFT,
          requestedBy: customer1Id,
          requestedAt: new Date(),
          customerSigned: false,
          staffSigned: false,
        },
      ],
    });

    const getPdf = (
      uid: string,
      role: string,
      cId = String(contract._id),
      aId = String(addendumId)
    ) => contractService.getAddendumDraftPdf(cId, aId, uid, role);

    // Allowed: owner customer, same-facility staff & manager, ops, admin
    await expect(
      getPdf(String(customer1Id), RoleEnum.CUSTOMER)
    ).resolves.toMatchObject({
      addendumCode: 'ADD-20261112-4004',
    });
    await expect(
      getPdf(String(staffAId), RoleEnum.FACILITY_STAFF)
    ).resolves.toMatchObject({
      addendumCode: 'ADD-20261112-4004',
    });
    await expect(
      getPdf(String(managerAId), RoleEnum.FACILITY_MANAGER)
    ).resolves.toMatchObject({
      addendumCode: 'ADD-20261112-4004',
    });
    await expect(
      getPdf(String(opsId), RoleEnum.BUSINESS_OPS_MANAGER)
    ).resolves.toMatchObject({
      addendumCode: 'ADD-20261112-4004',
    });
    await expect(
      getPdf(String(adminId), RoleEnum.SYSTEM_ADMIN)
    ).resolves.toMatchObject({
      addendumCode: 'ADD-20261112-4004',
    });

    // Denied: other customer (403 MESSAGE_CODE_103)
    await expect(
      getPdf(String(customer2Id), RoleEnum.CUSTOMER)
    ).rejects.toMatchObject({
      statusCode: 403,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
    });

    // Denied: cross-facility staff & manager (403)
    await expect(
      getPdf(String(staffBId), RoleEnum.FACILITY_STAFF)
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      getPdf(String(staffBId), RoleEnum.FACILITY_STAFF)
    ).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(
      getPdf(String(managerBId), RoleEnum.FACILITY_MANAGER)
    ).rejects.toMatchObject({
      statusCode: 403,
    });

    // 404: missing contract (MESSAGE_CODE_400) & missing addendum (MESSAGE_CODE_409)
    await expect(
      getPdf(
        String(opsId),
        RoleEnum.BUSINESS_OPS_MANAGER,
        String(new Types.ObjectId())
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_400,
    });
    await expect(
      getPdf(
        String(opsId),
        RoleEnum.BUSINESS_OPS_MANAGER,
        String(contract._id),
        String(new Types.ObjectId())
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_409,
    });
  });

  it('returns ApiResponse payload from ContractController.getAddendumDraftPdf and rejects missing caller with 401', async () => {
    const addendumId = new Types.ObjectId();
    const contract = await Contract.create({
      contractCode: 'CTR-ADD-CTRL-05',
      source: ContractSourceEnum.WALK_IN,
      customerId: customer1Id,
      facilityId: facilityAId,
      storageUnitId: unitA1Id,
      facilityUnitTypeOfferingId: offeringId,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T16:59:59.000Z'),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1500000,
      depositAmount: 1500000,
      totalPeriodicPrice: 1500000,
      status: ContractStatusEnum.ACTIVE,
      addendums: [
        {
          _id: addendumId,
          addendumCode: 'ADD-20261112-5005',
          type: ContractAddendumTypeEnum.RENEW,
          previousEndDate: new Date('2026-12-31T16:59:59.000Z'),
          newEndDate: new Date('2027-02-28T16:59:59.000Z'),
          amenities: [],
          totalPeriodicPrice: 1500000,
          damageFee: 0,
          status: ContractAddendumStatusEnum.DRAFT,
          requestedBy: customer1Id,
          requestedAt: new Date(),
          customerSigned: false,
          staffSigned: false,
        },
      ],
    });

    const controller = new ContractController(contractService);
    const validReq = {
      user: { _id: String(customer1Id), role: RoleEnum.CUSTOMER },
      headers: {},
      body: {},
      query: {},
    } as unknown as ExpressRequest;

    const response = await controller.getAddendumDraftPdf(
      validReq,
      String(contract._id),
      String(addendumId)
    );

    expect(response.success).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_001);
    expect(response.data?.contractCode).toBe('CTR-ADD-CTRL-05');
    expect(response.data?.addendumCode).toBe('ADD-20261112-5005');
    expect(response.data?.html).toContain('PHỤ LỤC HỢP ĐỒNG');

    const unauthReq = {
      headers: {},
      body: {},
      query: {},
    } as unknown as ExpressRequest;

    await expect(
      controller.getAddendumDraftPdf(
        unauthReq,
        String(contract._id),
        String(addendumId)
      )
    ).rejects.toMatchObject({
      statusCode: 401,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_102,
    });
  });
});
