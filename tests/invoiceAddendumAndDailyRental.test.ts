import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { Invoice } from '../src/modules/invoice/invoice.model.ts';
import { InvoiceRepository } from '../src/modules/invoice/invoice.repository.ts';
import { InvoiceService } from '../src/modules/invoice/invoice.service.ts';
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
import { LegalEntity } from '../src/modules/legalEntity/legalEntity.model.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { SigningAuthorization } from '../src/modules/signingAuthorization/signingAuthorization.model.ts';
import { SigningAuthorizationRepository } from '../src/modules/signingAuthorization/signingAuthorization.repository.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  BillingUnitEnum,
} from '../src/common/enums/billing.enum.ts';
import {
  RoleEnum,
  UserStatusEnum,
  AuthProviderEnum,
} from '../src/common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  ContractStatusEnum,
  ContractSourceEnum,
  ContractAddendumTypeEnum,
  ContractAddendumStatusEnum,
} from '../src/common/enums/contract.enum.ts';

describe('billing/T3.3 & T3.4: Addendum Integration & Daily Rental Cycle Tests', () => {
  let invoiceRepo: InvoiceRepository;
  let contractRepo: ContractRepository;
  let reservationRepo: ReservationRepository;
  let storageUnitRepo: StorageUnitRepository;
  let amenityOfferingRepo: FacilityAmenityOfferingRepository;
  let unitTypeOfferingRepo: FacilityUnitTypeOfferingRepository;
  let facilityRepo: FacilityRepository;
  let userRepo: UserRepository;
  let signingAuthRepo: SigningAuthorizationRepository;
  let invoiceService: InvoiceService;
  let contractService: ContractService;

  let customerUser: InstanceType<typeof User>;
  let managerUser: InstanceType<typeof User>;
  let facilityDoc: InstanceType<typeof Facility>;
  let unit1: InstanceType<typeof StorageUnit>;
  let unit2: InstanceType<typeof StorageUnit>;
  let offeringDoc: InstanceType<typeof FacilityUnitTypeOffering>;

  beforeAll(async () => {
    await setupTestDB();

    invoiceRepo = new InvoiceRepository(Invoice);
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
    signingAuthRepo = new SigningAuthorizationRepository(SigningAuthorization);

    invoiceService = new InvoiceService(
      invoiceRepo,
      contractRepo,
      userRepo,
      undefined,
      undefined,
      undefined
    );

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
      undefined,
      signingAuthRepo,
      undefined,
      undefined,
      undefined
    );

    contractService.setInvoiceService(invoiceService);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const legalEntity = await LegalEntity.create({
      companyName: 'CONG TY TNHH HE THONG LUU TRU THONG MINH SSM',
      taxCode: '0109998888',
      registeredAddress: '123 Ba Trieu, Ha Noi',
      legalRepresentative: {
        name: 'Nguyen Van A',
        title: 'Giam Doc',
        idNumber: '001099000001',
      },
      bankAccount: {
        bankName: 'MB Bank',
        accountNumber: '0988888888',
        accountHolder: 'CONG TY TNHH HE THONG LUU TRU THONG MINH SSM',
      },
      phone: '0243999999',
      email: 'legal@smartstorage.vn',
      status: 'active',
    });

    facilityDoc = await Facility.create({
      facilityCode: 'FAC-CYCLE-01',
      name: 'Kho Chu Kỳ SSM',
      address: 'Hà Nội',
      city: 'Hà Nội',
      status: FacilityStatusEnum.ACTIVE,
      legalEntityId: legalEntity._id,
    });

    unit1 = await StorageUnit.create({
      unitNumber: 'U-CYC-101',
      facilityId: facilityDoc._id,
      unitTypeId: new Types.ObjectId(),
      status: StorageUnitStatusEnum.AVAILABLE,
      billingUnit: BillingUnitEnum.DAY,
    });

    unit2 = await StorageUnit.create({
      unitNumber: 'U-CYC-102',
      facilityId: facilityDoc._id,
      unitTypeId: new Types.ObjectId(),
      status: StorageUnitStatusEnum.AVAILABLE,
      billingUnit: BillingUnitEnum.MONTH,
    });

    offeringDoc = await FacilityUnitTypeOffering.create({
      facilityId: facilityDoc._id,
      unitTypeId: new Types.ObjectId(),
      billingUnit: BillingUnitEnum.DAY,
      pricePerUnit: 50000,
      depositMultiplier: 1,
      minRentalDays: 1,
      status: 'active',
    });

    customerUser = await User.create({
      name: 'Khách Hàng Chu Kỳ',
      email: 'customer.cycle@example.com',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      password: 'password123',
    });

    managerUser = await User.create({
      name: 'Quản Lý Cơ Sở Chu Kỳ',
      email: 'manager.cycle@example.com',
      role: RoleEnum.FACILITY_MANAGER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      assignedFacilityId: facilityDoc._id,
      password: 'password123',
    });

    await SigningAuthorization.create({
      legalEntityId: legalEntity._id,
      authorizedUserId: managerUser._id,
      facilityIds: [facilityDoc._id],
      authorizationNumber: 'AUTH-2026-999',
      issuedDate: new Date('2026-01-01'),
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2027-01-01'),
      documentUrl: 'https://example.com/auth.pdf',
      fileHash: 'sha256-mock-hash-manager',
      status: 'active',
    });
  });

  describe('T3.4: Daily Rental Duration Billing Logic', () => {
    it('1. charges full package for rentalDuration <= 14 days without underbilling', async () => {
      const startDate = new Date('2026-11-01T00:00:00Z');
      const endDate = new Date('2026-11-11T00:00:00Z'); // 10 days
      const durationDays = 10;
      const dailyPrice = 50000;

      const contract = await Contract.create({
        contractCode: 'CTR-DAY-10D',
        source: ContractSourceEnum.WALK_IN,
        customerId: customerUser._id,
        facilityId: facilityDoc._id,
        storageUnitId: unit1._id,
        facilityUnitTypeOfferingId: offeringDoc._id,
        billingUnit: BillingUnitEnum.DAY,
        rentalPrice: dailyPrice,
        depositAmount: dailyPrice,
        totalPeriodicPrice: dailyPrice * durationDays, // 500,000 VND
        status: ContractStatusEnum.DRAFT,
        termsAccepted: true,
        startDate,
        endDate,
      });

      const inv = await invoiceService.generateFirstPeriodInvoice(contract);

      expect(inv.totalAmount).toBe(500000);
      expect(inv.items.length).toBe(1);
      expect(inv.items[0].quantity).toBe(10);
      expect(inv.items[0].unitPrice).toBe(50000);
      expect(inv.items[0].amount).toBe(500000);
    });

    it('2. breaks rentalDuration > 14 days into 7-day cycles', async () => {
      const startDate = new Date('2026-11-01T00:00:00Z');
      const endDate = new Date('2026-11-22T00:00:00Z'); // 21 days
      const dailyPrice = 50000;

      const contract = await Contract.create({
        contractCode: 'CTR-DAY-21D',
        source: ContractSourceEnum.WALK_IN,
        customerId: customerUser._id,
        facilityId: facilityDoc._id,
        storageUnitId: unit1._id,
        facilityUnitTypeOfferingId: offeringDoc._id,
        billingUnit: BillingUnitEnum.DAY,
        rentalPrice: dailyPrice,
        depositAmount: dailyPrice,
        totalPeriodicPrice: dailyPrice * 7, // 350,000 VND per 7-day cycle
        status: ContractStatusEnum.ACTIVE,
        termsAccepted: true,
        startDate,
        endDate,
      });

      const inv1 = await invoiceService.generateFirstPeriodInvoice(contract);
      expect(inv1.totalAmount).toBe(350000);
      expect(inv1.items[0].quantity).toBe(7);
      expect(inv1.billingPeriodIndex).toBe(1);

      const inv2 = await invoiceService.generateRecurringInvoice(contract, 2);
      expect(inv2.totalAmount).toBe(350000);
      expect(inv2.items[0].quantity).toBe(7);
      expect(inv2.billingPeriodIndex).toBe(2);
    });
  });

  describe('T3.3: Addendum Integration (RENEW & UNIT_CHANGE pro-rata)', () => {
    it('1. RENEW addendum extends contract endDate and enables continuing invoice generation', async () => {
      const startDate = new Date('2026-10-01T00:00:00Z');
      const originalEndDate = new Date('2026-11-01T00:00:00Z');
      const extendedEndDate = new Date('2026-12-01T00:00:00Z');

      const contract = await Contract.create({
        contractCode: 'CTR-RENEW-01',
        source: ContractSourceEnum.WALK_IN,
        customerId: customerUser._id,
        facilityId: facilityDoc._id,
        storageUnitId: unit2._id,
        facilityUnitTypeOfferingId: offeringDoc._id,
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1500000,
        depositAmount: 1500000,
        totalPeriodicPrice: 1500000,
        status: ContractStatusEnum.ACTIVE,
        termsAccepted: true,
        startDate,
        endDate: originalEndDate,
        addendums: [
          {
            _id: new Types.ObjectId(),
            addendumCode: 'ADD-RENEW-01',
            type: ContractAddendumTypeEnum.RENEW,
            previousEndDate: originalEndDate,
            newEndDate: extendedEndDate,
            status: ContractAddendumStatusEnum.DRAFT,
            requestedBy: customerUser._id,
            requestedAt: new Date(),
            customerSigned: true,
            customerSignedAt: new Date(),
            staffSigned: false,
            amenities: [],
            totalPeriodicPrice: 1500000,
            damageFee: 0,
          },
        ],
      });

      const addendumId = String(contract.addendums![0]._id);

      const updated = await contractService.staffSignAddendum(
        String(contract._id),
        addendumId,
        String(managerUser._id),
        RoleEnum.FACILITY_MANAGER,
        {
          termsAccepted: true,
          signedAddendumFileUrls: ['https://example.com/scan-renew.pdf'],
        }
      );

      expect(updated.endDate).toBe(extendedEndDate.toISOString());
      expect(updated.status).toBe(ContractStatusEnum.ACTIVE);

      const invPeriod2 = await invoiceService.generateRecurringInvoice(
        (await Contract.findById(contract._id))!,
        2
      );
      expect(invPeriod2.billingPeriodIndex).toBe(2);
      expect(invPeriod2.totalAmount).toBe(1500000);
    });

    it('2. UNIT_CHANGE upgrade generates pro-rata INCIDENTAL invoice and updates contract rate', async () => {
      const startDate = new Date('2026-11-01T00:00:00Z');
      const endDate = new Date('2026-12-01T00:00:00Z'); // 30 days

      const targetUnit = await StorageUnit.create({
        unitNumber: 'U-CYC-TARGET-UPGRADE',
        facilityId: facilityDoc._id,
        unitTypeId: new Types.ObjectId(),
        status: StorageUnitStatusEnum.RESERVED,
        billingUnit: BillingUnitEnum.MONTH,
      });

      const contract = await Contract.create({
        contractCode: 'CTR-UPGRADE-01',
        source: ContractSourceEnum.WALK_IN,
        customerId: customerUser._id,
        facilityId: facilityDoc._id,
        storageUnitId: unit2._id,
        facilityUnitTypeOfferingId: offeringDoc._id,
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1200000, // 40,000 VND / day
        depositAmount: 1200000,
        totalPeriodicPrice: 1200000,
        status: ContractStatusEnum.ACTIVE,
        termsAccepted: true,
        startDate,
        endDate,
        addendums: [
          {
            _id: new Types.ObjectId(),
            addendumCode: 'ADD-UPGRADE-01',
            type: ContractAddendumTypeEnum.UNIT_CHANGE,
            previousStorageUnitId: unit2._id,
            newStorageUnitId: targetUnit._id,
            status: ContractAddendumStatusEnum.DRAFT,
            requestedBy: customerUser._id,
            requestedAt: new Date(),
            customerSigned: true,
            customerSignedAt: new Date(),
            staffSigned: false,
            amenities: [],
            totalPeriodicPrice: 1800000, // 60,000 VND / day -> diff 20,000 / day
            damageFee: 0,
          },
        ],
      });

      const addendumId = String(contract.addendums![0]._id);

      const updated = await contractService.staffSignAddendum(
        String(contract._id),
        addendumId,
        String(managerUser._id),
        RoleEnum.FACILITY_MANAGER,
        {
          termsAccepted: true,
          signedAddendumFileUrls: ['https://example.com/scan-upgrade.pdf'],
        }
      );

      expect(updated.storageUnitId).toBe(String(targetUnit._id));

      const invoices = await Invoice.find({
        contractId: contract._id,
        type: InvoiceTypeEnum.INCIDENTAL,
      });

      expect(invoices.length).toBe(1);
      const incidentalInv = invoices[0];
      expect(incidentalInv.status).toBe(InvoiceStatusEnum.ISSUED);
      expect(incidentalInv.totalAmount).toBeGreaterThan(0);
      expect(incidentalInv.items[0].name).toContain('ADD-UPGRADE-01');

      const contractDoc = await Contract.findById(contract._id);
      expect(contractDoc?.rentalPrice).toBe(1800000);
      expect(contractDoc?.totalPeriodicPrice).toBe(1800000);
    });
  });
});
