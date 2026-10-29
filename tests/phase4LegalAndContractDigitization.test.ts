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
} from './helpers/auth.helper.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { Profile } from '../src/modules/profile/profile.model.ts';
import { ProfileRepository } from '../src/modules/profile/profile.repository.ts';
import { LegalEntity } from '../src/modules/legalEntity/legalEntity.model.ts';
import { LegalEntityRepository } from '../src/modules/legalEntity/legalEntity.repository.ts';
import { LegalEntityService } from '../src/modules/legalEntity/legalEntity.service.ts';
import { SigningAuthorization } from '../src/modules/signingAuthorization/signingAuthorization.model.ts';
import { SigningAuthorizationRepository } from '../src/modules/signingAuthorization/signingAuthorization.repository.ts';
import { SigningAuthorizationService } from '../src/modules/signingAuthorization/signingAuthorization.service.ts';
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
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { decryptText } from '../src/utils/encryption.util.ts';
import { contractConfig } from '../src/config/contract.config.ts';

describe('Phase 4: Legal Framework, Customer KYC, Digitized Paper Signing, PDF Preview & Walk-in', () => {
  let contractRepo: ContractRepository;
  let contractService: ContractService;
  let reservationRepo: ReservationRepository;
  let storageUnitRepo: StorageUnitRepository;
  let amenityOfferingRepo: FacilityAmenityOfferingRepository;
  let unitTypeOfferingRepo: FacilityUnitTypeOfferingRepository;
  let facilityRepo: FacilityRepository;
  let userRepo: UserRepository;
  let profileRepo: ProfileRepository;
  let legalEntityRepo: LegalEntityRepository;
  let legalEntityService: LegalEntityService;
  let signingAuthRepo: SigningAuthorizationRepository;
  let signingAuthService: SigningAuthorizationService;
  let contractTemplateRepo: ContractTemplateRepository;

  const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);
  const managerId = new Types.ObjectId(TEST_USERS.managerFacilityA.id);
  const staffId = new Types.ObjectId(TEST_USERS.staffFacilityA.id);
  const offeringId = new Types.ObjectId('65d000000000000000000099');

  let storageUnitId: Types.ObjectId;
  let unitTypeId: Types.ObjectId;
  let legalEntityId: Types.ObjectId;

  beforeAll(async () => {
    contractConfig.requireSignedContractScan = true;
    contractConfig.requireSigningAuthorization = true;

    await setupTestDB();

    contractRepo = new ContractRepository(Contract);
    reservationRepo = new ReservationRepository(Reservation);
    storageUnitRepo = new StorageUnitRepository(StorageUnit);
    amenityOfferingRepo = new FacilityAmenityOfferingRepository(
      FacilityAmenityOffering
    );
    unitTypeOfferingRepo = new FacilityUnitTypeOfferingRepository(
      FacilityUnitTypeOffering
    );
    facilityRepo = new FacilityRepository(Facility);
    userRepo = new UserRepository(User);
    profileRepo = new ProfileRepository(Profile);
    legalEntityRepo = new LegalEntityRepository(LegalEntity);
    legalEntityService = new LegalEntityService(legalEntityRepo);
    signingAuthRepo = new SigningAuthorizationRepository(SigningAuthorization);
    signingAuthService = new SigningAuthorizationService(
      signingAuthRepo,
      legalEntityRepo
    );
    contractTemplateRepo = new ContractTemplateRepository(ContractTemplate);

    contractService = new ContractService(
      contractRepo,
      reservationRepo,
      storageUnitRepo,
      amenityOfferingRepo,
      unitTypeOfferingRepo,
      facilityRepo,
      userRepo,
      undefined, // auditLogService
      undefined, // refundRequestService
      undefined, // customerInventoryRepository
      undefined, // incidentRepository
      undefined, // contractQueue
      undefined, // notificationService
      legalEntityRepo,
      signingAuthRepo,
      profileRepo,
      contractTemplateRepo
    );
  });

  afterAll(async () => {
    contractConfig.requireSignedContractScan = false;
    contractConfig.requireSigningAuthorization = false;

    await new Promise((resolve) => setTimeout(resolve, 100));
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    // 1. Seed Legal Entity (T4.1 / D12)
    const le = await LegalEntity.create({
      companyName: 'CÔNG TY CỔ PHẦN LƯU TRỮ THÔNG MINH VIỆT NAM',
      taxCode: '0108889999',
      registeredAddress: '123 Phố Huế, Quận Hai Bà Trưng, Hà Nội',
      legalRepresentative: {
        name: 'Trần Văn Giám Đốc',
        title: 'Tổng Giám Đốc',
        idNumber: '001088001234',
      },
      bankAccount: {
        bankName: 'Vietcombank',
        accountNumber: '998877665544',
        accountHolder: 'CONG TY CP LUU TRU THONG MINH VN',
      },
      phone: '02439998888',
      email: 'legal@smartstorage.vn',
      status: 'active',
    });
    legalEntityId = le._id;

    // 2. Seed Facility pointing to LegalEntity
    await Facility.create({
      _id: facilityId,
      name: 'Kho Hai Bà Trưng',
      city: 'Hà Nội',
      address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
      status: FacilityStatusEnum.ACTIVE,
      legalEntityId,
      operatingHours: {
        open: '08:00',
        close: '20:00',
      },
    });

    // 3. Seed UnitType & Offering
    const unitType = await UnitType.create({
      name: 'Kho Tiêu Chuẩn 5m2',
      category: UnitTypeCategoryEnum.SMALL,
      status: UnitTypeStatusEnum.ACTIVE,
      dimensions: {
        width: 2,
        length: 2.5,
        height: 2.5,
      },
      area: 5,
      volume: 12.5,
    });
    unitTypeId = unitType._id;

    await FacilityUnitTypeOffering.create({
      _id: offeringId,
      facilityId,
      unitTypeId,
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 1500000,
      depositMultiplier: 1,
      minRentalDays: 30,
      status: 'active',
    });

    // 4. Seed StorageUnit
    const unit = await StorageUnit.create({
      unitNumber: 'HBT-101',
      facilityId,
      unitTypeId,
      floor: 1,
      zone: 'A',
      status: StorageUnitStatusEnum.AVAILABLE,
    });
    storageUnitId = unit._id;
  });

  describe('T4.1 & D12: LegalEntity & SigningAuthorization Management', () => {
    it('creates legal entity and prevents duplicate taxCode', async () => {
      const created = await legalEntityService.createLegalEntity({
        companyName: 'Chi Nhánh Miền Nam SSM',
        taxCode: '0309991111',
        registeredAddress: '456 Nguyễn Huệ, Quận 1, TP.HCM',
        legalRepresentative: {
          name: 'Nguyễn Văn Đại Diện',
          title: 'Giám Đốc Chi Nhánh',
        },
        bankAccount: {
          bankName: 'BIDV',
          accountNumber: '1122334455',
          accountHolder: 'CHI NHANH MIEN NAM SSM',
        },
      });

      expect(created.id).toBeDefined();
      expect(created.taxCode).toBe('0309991111');

      // Duplicate tax code throws 400 MESSAGE_CODE_105
      await expect(
        legalEntityService.createLegalEntity({
          companyName: 'Trùng Mã Số Thuế',
          taxCode: '0309991111',
          registeredAddress: 'TP.HCM',
          legalRepresentative: { name: 'Người Khác', title: 'Giám Đốc' },
          bankAccount: {
            bankName: 'BIDV',
            accountNumber: '99',
            accountHolder: 'SSM',
          },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_105,
      });
    });

    it('creates and validates Manager signing authorization', async () => {
      const now = new Date();
      const validFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const validTo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const auth = await signingAuthService.createSigningAuthorization({
        legalEntityId: String(legalEntityId),
        authorizedUserId: String(managerId),
        facilityIds: [String(facilityId)],
        authorizationNumber: 'UQ-2026/01/SSM-HBT',
        issuedDate: validFrom,
        validFrom,
        validTo,
        documentUrl: 'https://cdn.storage.vn/authorizations/uq-2026-01.pdf',
        notes: 'Ủy quyền ký hợp đồng và bàn giao kho cơ sở Hai Bà Trưng',
      });

      expect(auth.id).toBeDefined();
      expect(auth.fileHash).toBeDefined();

      // Check valid authorization query
      const validAuth = await signingAuthService.findValidAuthorization(
        String(managerId),
        String(facilityId),
        now
      );
      expect(validAuth).not.toBeNull();
      expect(validAuth?.authorizationNumber).toBe('UQ-2026/01/SSM-HBT');

      // Revoking authorization invalidates it
      await signingAuthService.revokeSigningAuthorization(auth.id);
      const revokedAuth = await signingAuthService.findValidAuthorization(
        String(managerId),
        String(facilityId),
        now
      );
      expect(revokedAuth).toBeNull();
    });
  });

  describe('T4.2 & D10: Customer KYC & Age Verification (Age >= 18)', () => {
    it('rejects contract creation when customer is under 18 years old', async () => {
      // Create reservation for customer
      const resv = await Reservation.create({
        reservationCode: 'RES-UNDER18',
        customerId,
        facilityId,
        facilityUnitTypeOfferingId: offeringId,
        storageUnitId,
        startDate: new Date(),
        rentalDuration: 30,
        basePrice: 1500000,
        depositAmount: 1500000,
        totalPeriodicPrice: 1500000,
        totalAmount: 3000000,
        billingUnit: BillingUnitEnum.MONTH,
        status: 'confirmed',
        checkInDate: new Date(),
        actualArrivalTime: new Date(),
        checkInTimeSlot: '09:00 - 10:00',
        amenities: [],
      });

      // Upsert profile with underage birthdate (e.g. 16 years old in 2026)
      await profileRepo.upsertByUserId(String(customerId), {
        dateOfBirth: new Date('2010-05-15'),
        address: 'Hà Nội',
      });

      await expect(
        contractService.createContract(
          {
            source: ContractSourceEnum.RESERVATION,
            reservationId: String(resv._id),
          },
          String(staffId),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_430,
      });
    });

    it('allows contract creation when customer is at least 18 years old', async () => {
      const resv = await Reservation.create({
        reservationCode: 'RES-ADULT18',
        customerId,
        facilityId,
        facilityUnitTypeOfferingId: offeringId,
        storageUnitId,
        startDate: new Date(),
        rentalDuration: 30,
        basePrice: 1500000,
        depositAmount: 1500000,
        totalPeriodicPrice: 1500000,
        totalAmount: 3000000,
        billingUnit: BillingUnitEnum.MONTH,
        status: 'confirmed',
        checkInDate: new Date(),
        actualArrivalTime: new Date(),
        checkInTimeSlot: '09:00 - 10:00',
        amenities: [],
      });

      // Adult date of birth (e.g. 24 years old)
      await profileRepo.upsertByUserId(String(customerId), {
        dateOfBirth: new Date('2000-01-01'),
        address: 'Hà Nội',
        idCardLast4: '5678',
      });

      const contract = await contractService.createContract(
        {
          source: ContractSourceEnum.RESERVATION,
          reservationId: String(resv._id),
        },
        String(staffId),
        RoleEnum.FACILITY_STAFF
      );

      expect(contract.id).toBeDefined();
      expect(contract.status).toBe(ContractStatusEnum.DRAFT);
    });
  });

  describe('T4.3: Digitized Paper Contract Signing & Scan Upload Verification', () => {
    let draftContractId: string;

    beforeEach(async () => {
      // Setup active authorization for Manager
      const now = new Date();
      await SigningAuthorization.create({
        legalEntityId,
        authorizedUserId: managerId,
        facilityIds: [facilityId],
        authorizationNumber: 'UQ-2026-MNGR-A',
        issuedDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        validFrom: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        validTo: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        documentUrl: 'https://cdn.storage.vn/authorizations/uq-manager.pdf',
        fileHash: 'sha256-mock-hash-manager',
        status: 'active',
      });

      // Adult profile
      await profileRepo.upsertByUserId(String(customerId), {
        dateOfBirth: new Date('1998-05-20'),
        address: '789 Giải Phóng, Hà Nội',
        idCardLast4: '9999',
      });

      // Create draft contract
      const contract = await Contract.create({
        contractCode: 'CTR-DIGITIZE-01',
        source: ContractSourceEnum.WALK_IN,
        customerId,
        facilityId,
        storageUnitId,
        facilityUnitTypeOfferingId: offeringId,
        assignedStaffId: staffId,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-12-01'),
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1500000,
        depositAmount: 1500000,
        totalPeriodicPrice: 1500000,
        depositPaidAt: new Date(),
        firstPeriodPaidAt: new Date(),
        status: ContractStatusEnum.DRAFT,
        customerSigned: true,
        customerSignedAt: new Date(),
        staffSigned: false,
        termsAccepted: true,
      });
      draftContractId = String(contract._id);
    });

    it('rejects check-in if signed contract scan file is not uploaded', async () => {
      await expect(
        contractService.checkInContract(
          draftContractId,
          String(managerId),
          RoleEnum.FACILITY_MANAGER,
          {
            termsAccepted: true,
            signedContractFileUrls: [], // Missing scan files
          }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_432,
      });
    });

    it('rejects check-in if Manager has no active signing authorization', async () => {
      // Revoke Manager authorization
      await SigningAuthorization.updateMany(
        { authorizedUserId: managerId },
        { status: 'revoked' }
      );

      await expect(
        contractService.checkInContract(
          draftContractId,
          String(managerId),
          RoleEnum.FACILITY_MANAGER,
          {
            termsAccepted: true,
            signedContractFileUrls: [
              'https://cdn.storage.vn/contracts/signed-scan-page1.pdf',
            ],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_431,
      });
    });

    it('completes check-in with signed scan files & snapshots LegalEntity and Authorization', async () => {
      const activeContract = await contractService.checkInContract(
        draftContractId,
        String(managerId),
        RoleEnum.FACILITY_MANAGER,
        {
          termsAccepted: true,
          signedContractFileUrls: [
            'https://cdn.storage.vn/contracts/page1.pdf',
            'https://cdn.storage.vn/contracts/page2.pdf',
          ],
        }
      );

      expect(activeContract.status).toBe(ContractStatusEnum.ACTIVE);
      expect(activeContract.staffSigned).toBe(true);
      expect(activeContract.signedContractFiles).toHaveLength(2);
      expect(activeContract.signedContractFiles[0].fileHash).toBeDefined();

      // Verify legal entity snapshot
      expect(activeContract.legalEntitySnapshot).not.toBeNull();
      expect(activeContract.legalEntitySnapshot?.companyName).toContain(
        'LƯU TRỮ THÔNG MINH'
      );
      expect(activeContract.legalEntitySnapshot?.taxCode).toBe('0108889999');

      // Verify signing authorization snapshot
      expect(activeContract.signingAuthorizationSnapshot).not.toBeNull();
      expect(
        activeContract.signingAuthorizationSnapshot?.authorizationNumber
      ).toBe('UQ-2026-MNGR-A');
    });
  });

  describe('T4.4: Contract Draft PDF / Printable A4 Preview', () => {
    it('generates HTML and Buffer preview of draft contract with legal and customer data', async () => {
      const contract = await Contract.create({
        contractCode: 'CTR-PREVIEW-01',
        source: ContractSourceEnum.WALK_IN,
        customerId,
        facilityId,
        storageUnitId,
        facilityUnitTypeOfferingId: offeringId,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-12-01'),
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1500000,
        depositAmount: 1500000,
        totalPeriodicPrice: 1500000,
        status: ContractStatusEnum.DRAFT,
      });

      const preview = await contractService.getContractDraftPdf(
        String(contract._id),
        String(managerId),
        RoleEnum.FACILITY_MANAGER
      );

      expect(preview.contractCode).toBe('CTR-PREVIEW-01');
      expect(preview.html).toContain('HỢP ĐỒNG');
      expect(preview.html).toContain('CÔNG TY CỔ PHẦN LƯU TRỮ THÔNG MINH');
      expect(preview.html).toContain('CTR-PREVIEW-01');
      expect(preview.html).toContain('HBT-101');
      expect(preview.buffer).toBeInstanceOf(Buffer);
      expect(preview.buffer.length).toBeGreaterThan(0);
    });
  });

  describe('T4.5: Contract Addendum Digitized Signing & Scan Verification', () => {
    let activeContractId: string;
    let addendumId: string;

    beforeEach(async () => {
      // Active authorization for Manager
      const now = new Date();
      await SigningAuthorization.create({
        legalEntityId,
        authorizedUserId: managerId,
        facilityIds: [facilityId],
        authorizationNumber: 'UQ-2026-ADDENDUM',
        issuedDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        validFrom: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        validTo: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        documentUrl: 'https://cdn.storage.vn/authorizations/uq-addendum.pdf',
        fileHash: 'sha256-mock-hash-addendum',
        status: 'active',
      });

      const contract = await Contract.create({
        contractCode: 'CTR-ADDENDUM-01',
        source: ContractSourceEnum.WALK_IN,
        customerId,
        facilityId,
        storageUnitId,
        facilityUnitTypeOfferingId: offeringId,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-12-01'),
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1500000,
        depositAmount: 1500000,
        totalPeriodicPrice: 1500000,
        status: ContractStatusEnum.ACTIVE,
        customerSigned: true,
        staffSigned: true,
        addendums: [
          {
            _id: new Types.ObjectId(),
            addendumCode: 'ADD-01',
            type: ContractAddendumTypeEnum.RENEW,
            previousEndDate: new Date('2026-12-01'),
            newEndDate: new Date('2027-01-01'),
            amenities: [],
            totalPeriodicPrice: 1500000,
            damageFee: 0,
            status: ContractAddendumStatusEnum.DRAFT,
            requestedBy: customerId,
            requestedAt: new Date(),
            customerSigned: true,
            customerSignedAt: new Date(),
            staffSigned: false,
          },
        ],
      });
      activeContractId = String(contract._id);
      addendumId = String(contract.addendums[0]._id);
    });

    it('rejects staff signing of addendum if signed scan files are missing', async () => {
      await expect(
        contractService.staffSignAddendum(
          activeContractId,
          addendumId,
          String(managerId),
          RoleEnum.FACILITY_MANAGER,
          {
            termsAccepted: true,
            signedAddendumFileUrls: [], // Missing scan
          }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_433,
      });
    });

    it('successfully activates addendum when staff signs with scan files and valid authorization', async () => {
      const updated = await contractService.staffSignAddendum(
        activeContractId,
        addendumId,
        String(managerId),
        RoleEnum.FACILITY_MANAGER,
        {
          termsAccepted: true,
          signedAddendumFileUrls: [
            'https://cdn.storage.vn/addendums/addendum-scan-page1.pdf',
          ],
        }
      );

      const targetAddendum = updated.addendums.find((a) => a.id === addendumId);
      expect(targetAddendum?.status).toBe(ContractAddendumStatusEnum.ACTIVE);
      expect(targetAddendum?.staffSigned).toBe(true);
      expect(targetAddendum?.signedAddendumFiles).toHaveLength(1);
      expect(targetAddendum?.signedAddendumFiles[0].fileHash).toBeDefined();
      expect(new Date(updated.endDate).getTime()).toBe(
        new Date('2027-01-01').getTime()
      );
    });
  });

  describe('T4.6: Walk-in Contract Workflow with Inline KYC', () => {
    it('creates Customer user, encrypts CCCD, locks storage unit and creates DRAFT contract', async () => {
      const walkInRequest = {
        facilityId: String(facilityId),
        storageUnitId: String(storageUnitId),
        facilityUnitTypeOfferingId: String(offeringId),
        startDate: '2026-11-15T00:00:00.000Z',
        endDate: '2026-12-15T00:00:00.000Z',
        billingUnit: BillingUnitEnum.MONTH,
        customerName: 'Hoàng Thị Khách Vãng Lai',
        customerEmail: 'hoangthi.walkin@example.com',
        customerPhone: '0988776655',
        dateOfBirth: '1995-08-20T00:00:00.000Z',
        address: '99 Cầu Giấy, Hà Nội',
        idCardNumber: '001195009876',
        idCardFrontPhotoUrl: 'https://cdn.storage.vn/kyc/cccd-front.jpg',
        idCardBackPhotoUrl: 'https://cdn.storage.vn/kyc/cccd-back.jpg',
        notes: 'Khách đến quầy thuê trực tiếp 1 tháng',
      };

      const contract = await contractService.createWalkInContract(
        walkInRequest,
        String(staffId),
        RoleEnum.FACILITY_STAFF
      );

      expect(contract.id).toBeDefined();
      expect(contract.source).toBe(ContractSourceEnum.WALK_IN);
      expect(contract.status).toBe(ContractStatusEnum.DRAFT);
      expect(contract.rentalPrice).toBe(1500000);
      expect(contract.depositAmount).toBe(1500000);

      // Verify customer snapshot
      expect(contract.customerSnapshot).not.toBeNull();
      expect(contract.customerSnapshot?.name).toBe('Hoàng Thị Khách Vãng Lai');
      expect(contract.customerSnapshot?.idCardNumberMasked).toBe('****9876');

      // Verify Customer user was created in DB
      const createdUser = await userRepo.findByEmail(
        'hoangthi.walkin@example.com'
      );
      expect(createdUser).not.toBeNull();
      expect(createdUser?.role).toBe(RoleEnum.CUSTOMER);

      // Verify Profile has AES-256-GCM encrypted CCCD
      const createdProfile = await profileRepo.findByUserId(
        String(createdUser?._id)
      );
      expect(createdProfile).not.toBeNull();
      expect(createdProfile?.idCardLast4).toBe('9876');
      expect(createdProfile?.encryptedIdCardNumber).toBeDefined();
      const decryptedCccd = decryptText(createdProfile!.encryptedIdCardNumber!);
      expect(decryptedCccd).toBe('001195009876');

      // Verify StorageUnit was transitioned to RESERVED
      const updatedUnit = await storageUnitRepo.findById(String(storageUnitId));
      expect(updatedUnit?.status).toBe(StorageUnitStatusEnum.RESERVED);
    });

    it('rejects walk-in contract when customer age is under 18', async () => {
      const walkInUnderage = {
        facilityId: String(facilityId),
        storageUnitId: String(storageUnitId),
        facilityUnitTypeOfferingId: String(offeringId),
        startDate: '2026-11-15T00:00:00.000Z',
        endDate: '2026-12-15T00:00:00.000Z',
        billingUnit: BillingUnitEnum.MONTH,
        customerName: 'Trẻ Vị Thành Niên',
        customerEmail: 'underage@example.com',
        customerPhone: '0911223344',
        dateOfBirth: '2012-01-01T00:00:00.000Z', // 14 years old
        idCardNumber: '001212001234',
      };

      await expect(
        contractService.createWalkInContract(
          walkInUnderage,
          String(staffId),
          RoleEnum.FACILITY_STAFF
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_430,
      });
    });
  });
});
