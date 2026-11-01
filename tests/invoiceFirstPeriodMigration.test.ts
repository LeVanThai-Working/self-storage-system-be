import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { Invoice } from '../src/modules/invoice/invoice.model.ts';
import { User } from '../src/modules/user/user.model.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { runMigrateContractFirstPeriodInvoices } from '../scripts/migrate-contract-first-period-invoices.ts';
import {
  BillingUnitEnum,
  InvoiceStatusEnum,
  InvoiceTypeEnum,
} from '../src/common/enums/billing.enum.ts';
import {
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import {
  RoleEnum,
  UserStatusEnum,
  AuthProviderEnum,
} from '../src/common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';

describe('billing/T4.2: Migration Script — Backfill Contract First Period Invoices', () => {
  let customerUser: InstanceType<typeof User>;
  let facilityDoc: InstanceType<typeof Facility>;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    customerUser = await User.create({
      name: 'Khách Hàng Lịch Sử',
      email: 'customer.legacy@example.com',
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      authProvider: AuthProviderEnum.LOCAL,
      password: 'password123',
    });

    facilityDoc = await Facility.create({
      facilityCode: 'FAC-MIG-01',
      name: 'Kho Di Trú SSM',
      address: 'Hà Nội',
      city: 'Hà Nội',
      status: FacilityStatusEnum.ACTIVE,
    });
  });

  it('1. successfully backfills FIRST_PERIOD PAID invoice for legacy active contract', async () => {
    const paidDate = new Date('2026-09-01T08:00:00Z');
    const paymentId = new Types.ObjectId();

    const contract = await Contract.create({
      contractCode: 'CTR-LEGACY-01',
      source: ContractSourceEnum.WALK_IN,
      customerId: customerUser._id,
      facilityId: facilityDoc._id,
      storageUnitId: new Types.ObjectId(),
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1500000,
      depositAmount: 1500000,
      totalPeriodicPrice: 1700000,
      status: ContractStatusEnum.ACTIVE,
      termsAccepted: true,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-01'),
      firstPeriodPaidAt: paidDate,
      firstPeriodPaymentId: paymentId,
      amenities: [
        {
          facilityAmenityOfferingId: new Types.ObjectId(),
          amenityId: new Types.ObjectId(),
          name: 'Bảo quản điều hòa',
          quantity: 1,
          pricePerUnit: 200000,
          totalPrice: 200000,
          billingUnit: BillingUnitEnum.MONTH,
        },
      ],
    });

    const result = await runMigrateContractFirstPeriodInvoices(undefined, {
      isDryRun: false,
    });

    expect(result.scannedContracts).toBe(1);
    expect(result.migratedInvoices).toBe(1);
    expect(result.skippedContracts).toBe(0);

    const invoices = await Invoice.find({ contractId: contract._id });
    expect(invoices.length).toBe(1);

    const inv = invoices[0];
    expect(inv.type).toBe(InvoiceTypeEnum.FIRST_PERIOD);
    expect(inv.status).toBe(InvoiceStatusEnum.PAID);
    expect(inv.billingPeriodIndex).toBe(1);
    expect(inv.totalAmount).toBe(1700000);
    expect(inv.paidAmount).toBe(1700000);
    expect(inv.paidAt?.toISOString()).toBe(paidDate.toISOString());
    expect(String(inv.paymentId)).toBe(String(paymentId));
    expect(inv.items.length).toBe(2);
    expect(inv.items[0].unitPrice).toBe(1500000);
    expect(inv.items[1].unitPrice).toBe(200000);
    expect(inv.invoiceCode).toMatch(/^INV-MIG-/);
  });

  it('2. supports dry-run mode without persisting invoices to database', async () => {
    await Contract.create({
      contractCode: 'CTR-LEGACY-DRY',
      source: ContractSourceEnum.WALK_IN,
      customerId: customerUser._id,
      facilityId: facilityDoc._id,
      storageUnitId: new Types.ObjectId(),
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1000000,
      depositAmount: 1000000,
      totalPeriodicPrice: 1000000,
      status: ContractStatusEnum.ACTIVE,
      termsAccepted: true,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-11-01'),
      firstPeriodPaidAt: new Date('2026-10-01T10:00:00Z'),
    });

    const result = await runMigrateContractFirstPeriodInvoices(undefined, {
      isDryRun: true,
    });

    expect(result.scannedContracts).toBe(1);
    expect(result.migratedInvoices).toBe(1);

    const count = await Invoice.countDocuments();
    expect(count).toBe(0);
  });

  it('3. is idempotent: running migration repeatedly does not create duplicate invoices', async () => {
    await Contract.create({
      contractCode: 'CTR-LEGACY-IDEMPOTENT',
      source: ContractSourceEnum.WALK_IN,
      customerId: customerUser._id,
      facilityId: facilityDoc._id,
      storageUnitId: new Types.ObjectId(),
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 2000000,
      depositAmount: 2000000,
      totalPeriodicPrice: 2000000,
      status: ContractStatusEnum.ACTIVE,
      termsAccepted: true,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-11-01'),
      firstPeriodPaidAt: new Date('2026-08-01T09:00:00Z'),
    });

    // Run 1
    const run1 = await runMigrateContractFirstPeriodInvoices(undefined, {
      isDryRun: false,
    });
    expect(run1.migratedInvoices).toBe(1);
    expect(run1.skippedContracts).toBe(0);

    // Run 2 on same data
    const run2 = await runMigrateContractFirstPeriodInvoices(undefined, {
      isDryRun: false,
    });
    expect(run2.scannedContracts).toBe(1);
    expect(run2.migratedInvoices).toBe(0);
    expect(run2.skippedContracts).toBe(1);

    const count = await Invoice.countDocuments();
    expect(count).toBe(1);
  });

  it('4. ignores contracts without firstPeriodPaidAt', async () => {
    await Contract.create({
      contractCode: 'CTR-DRAFT-UNPAID',
      source: ContractSourceEnum.WALK_IN,
      customerId: customerUser._id,
      facilityId: facilityDoc._id,
      storageUnitId: new Types.ObjectId(),
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1200000,
      depositAmount: 1200000,
      totalPeriodicPrice: 1200000,
      status: ContractStatusEnum.DRAFT,
      termsAccepted: false,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-12-01'),
      firstPeriodPaidAt: null,
    });

    const result = await runMigrateContractFirstPeriodInvoices(undefined, {
      isDryRun: false,
    });

    expect(result.scannedContracts).toBe(0);
    expect(result.migratedInvoices).toBe(0);
    const count = await Invoice.countDocuments();
    expect(count).toBe(0);
  });

  it('5. handles rollback: removes backfilled invoices and unsets backfill flags', async () => {
    await Contract.create({
      contractCode: 'CTR-ROLLBACK-TEST',
      source: ContractSourceEnum.WALK_IN,
      customerId: customerUser._id,
      facilityId: facilityDoc._id,
      storageUnitId: new Types.ObjectId(),
      facilityUnitTypeOfferingId: new Types.ObjectId(),
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1000000,
      depositAmount: 1000000,
      totalPeriodicPrice: 1000000,
      status: ContractStatusEnum.ACTIVE,
      termsAccepted: true,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-08-01'),
      firstPeriodPaidAt: new Date('2026-07-01T08:00:00Z'),
    });

    await runMigrateContractFirstPeriodInvoices(undefined, { isDryRun: false });
    expect(await Invoice.countDocuments()).toBe(1);

    const rollbackResult = await runMigrateContractFirstPeriodInvoices(
      undefined,
      {
        isRollback: true,
        isDryRun: false,
      }
    );

    expect(rollbackResult.migratedInvoices).toBe(1);
    expect(await Invoice.countDocuments()).toBe(0);

    const contract = await Contract.findOne({
      contractCode: 'CTR-ROLLBACK-TEST',
    });
    expect(
      (contract as unknown as { t42BackfilledAt?: Date }).t42BackfilledAt
    ).toBeUndefined();
  });
});
