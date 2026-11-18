import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { buildAccountFacility } from '../scripts/seed/account-facility.ts';
import { buildCatalog } from '../scripts/seed/catalog.ts';
import { buildStorageLayout } from '../scripts/seed/storage-layout.ts';
import { LegalEntity } from '../src/modules/legalEntity/legalEntity.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { Invoice } from '../src/modules/invoice/invoice.model.ts';
import { InvoiceRepository } from '../src/modules/invoice/invoice.repository.ts';
import { InvoiceService } from '../src/modules/invoice/invoice.service.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import {
  applyContractsFinance,
  buildContractsFinance,
  ensureFinanceIndexes,
  loadFinanceFoundation,
  parseFinanceArgs,
  runContractsFinance,
  verifyContractsFinance,
  validateReservationTransfers,
} from '../scripts/seed/contracts-finance.ts';
import {
  checkRenderFinanceReadiness,
  cloudinaryFinanceProvider,
  financeDocument,
  prepareFinanceAssets,
  renderSeedDocument,
  verifyFinanceAsset,
  type FinanceAsset,
} from '../scripts/seed/finance-assets.ts';

const referenceDate = new Date('2026-11-18T08:00:00Z');
const database = 'seed_contracts_finance_test';

it('treats nested Cloudinary SDK 404 as a missing seed asset and propagates other failures', async () => {
  vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'seed-test');
  vi.stubEnv('CLOUDINARY_API_KEY', 'seed-test');
  vi.stubEnv('CLOUDINARY_API_SECRET', 'seed-test');
  const lookup = vi.spyOn(cloudinary.api, 'resource');
  try {
    const provider = cloudinaryFinanceProvider();
    lookup.mockRejectedValue({ error: { http_code: 404 } });
    await expect(provider.lookup('missing')).resolves.toBeNull();
    lookup.mockRejectedValue({ http_code: 404 });
    await expect(provider.lookup('missing')).resolves.toBeNull();
    lookup.mockRejectedValue({ error: { http_code: 401 } });
    await expect(provider.lookup('missing')).rejects.toThrow(
      'FINANCE_ASSET_LOOKUP_FAILED'
    );
  } finally {
    lookup.mockRestore();
    vi.unstubAllEnvs();
  }
});

describe('milestone 5: approved historical contracts and finance', () => {
  let server: MongoMemoryReplSet;
  let client: InstanceType<typeof mongoose.mongo.MongoClient>;
  let base: Awaited<ReturnType<typeof buildAccountFacility>>;
  let catalog: Awaited<ReturnType<typeof buildCatalog>>;
  let layout: Awaited<ReturnType<typeof buildStorageLayout>>;
  beforeAll(async () => {
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    client = await new mongoose.mongo.MongoClient(server.getUri()).connect();
    await mongoose.connect(server.getUri(database), {
      autoIndex: false,
      autoCreate: false,
    });
    base = await buildAccountFacility();
    catalog = await buildCatalog(base.facilities);
    layout = await buildStorageLayout(base.facilities, catalog.unittypes);
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await client?.close();
    await server?.stop();
  });
  beforeEach(async () => {
    const db = client.db(database);
    await db.dropDatabase();
    for (const [name, rows] of Object.entries({
      ...base,
      ...catalog,
      ...layout,
    }))
      await db.collection(name).insertMany(rows);
    const legal = new LegalEntity({
      companyName: 'Công Ty TNHH Storage Hub',
      taxCode: '0000000000',
      registeredAddress: 'Địa chỉ mẫu',
      legalRepresentative: { name: 'Đại diện mẫu', title: 'Giám đốc' },
      bankAccount: {
        bankName: 'Ngân hàng mẫu',
        accountNumber: '0000000000',
        accountHolder: 'DỮ LIỆU SEED',
      },
    });
    await legal.validate();
    await db.collection('legalentities').insertOne(legal.toObject());
    await db
      .collection<{ _id: string; status: string }>('seedmilestones')
      .insertOne({ _id: 'module-seed-v1:4', status: 'complete' });
    await ensureFinanceIndexes(db);
  });
  async function fixture() {
    const foundation = await loadFinanceFoundation(client.db(database));
    const preview = await buildContractsFinance(foundation, referenceDate);
    const assets: Record<string, FinanceAsset> = {};
    for (const spec of preview.documents)
      assets[spec.key] = {
        key: spec.key,
        sourceHash: spec.sourceHash,
        url: `https://res.cloudinary.com/seed-test/image/upload/${spec.key}.png`,
        publicId: spec.publicId,
        fileHash: 'a'.repeat(64),
        uploadedAt: referenceDate.toISOString(),
        verifiedAt: referenceDate.toISOString(),
      };
    return buildContractsFinance(foundation, referenceDate, assets);
  }
  it('requires an explicit database, rejects reset and bypass flags', () => {
    expect(parseFinanceArgs(['--milestone', '5'])).toEqual({ apply: false });
    expect(
      parseFinanceArgs(['--milestone', '5', '--apply', '--database', database])
    ).toEqual({ apply: true, database });
    for (const args of [
      ['--milestone', '5', '--reset'],
      ['--milestone', '5', '--apply'],
      ['--milestone', '5', '--skip-render-check'],
      ['--milestone', '4'],
      ['--milestone', '5', '--apply', '--dry-run', '--database', database],
    ])
      expect(() => parseFinanceArgs(args)).toThrow();
  });
  it('runs the real runner in dry-run and blocks apply before backup/upload or source mutation when Render is stale', async () => {
    const db = client.db(database);
    const before = await db.listCollections().toArray();
    vi.stubEnv('MONGODB_URI', server.getUri(database));
    vi.setSystemTime(referenceDate);
    const logged = vi.spyOn(console, 'log').mockImplementation(() => {});
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 500 }));
    try {
      await runContractsFinance(['--milestone', '5', '--dry-run']);
      const report = JSON.parse(logged.mock.calls[0][0] as string) as {
        dryRun: boolean;
        render: { ready: boolean };
      };
      expect(report).toMatchObject({ dryRun: true, render: { ready: false } });
      network.mockResolvedValue(new Response('{}', { status: 500 }));
      await expect(
        runContractsFinance([
          '--milestone',
          '5',
          '--apply',
          '--database',
          database,
        ])
      ).rejects.toThrow(/FINANCE_RENDER_NOT_READY/);
      expect(await db.listCollections().toArray()).toEqual(before);
      expect(await db.collection('contracts').countDocuments()).toBe(0);
      expect(await db.collection('auditlogs').countDocuments()).toBe(0);
      expect(await db.collection('seedmilestones').countDocuments()).toBe(1);
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
      vi.useRealTimers();
    }
  });
  it('builds exactly 32 contracts, 160 invoices, 176 payments, 16 refunds and 52 documents', async () => {
    const f = await fixture();
    expect(f.rows.reservations).toHaveLength(16);
    expect(f.rows.contracts).toHaveLength(32);
    expect(f.rows.invoices).toHaveLength(160);
    expect(f.rows.payments).toHaveLength(176);
    expect(f.rows.refundrequests).toHaveLength(16);
    expect(f.rows.contracttemplates).toHaveLength(1);
    expect(f.rows.signingauthorizations).toHaveLength(4);
    expect(f.documents).toHaveLength(52);
    expect(f.summary).toMatchObject({
      rentalAndAmenities: 2500000,
      depositsCollected: 276000,
      depositsRefunded: 112000,
      depositsHeld: 164000,
    });
    const q1 = base.facilities.find((f) => f.code === 'Q1')!._id;
    expect(
      f.rows.contracts.some((c) => String(c.facilityId) === String(q1))
    ).toBe(false);
    expect(f.updates.some((u) => String(u.id) === String(q1))).toBe(false);
  });
  it('creates four completed reservations per facility and transfers each deposit exactly once to its contract', async () => {
    const f = await fixture();
    expect(
      f.rows.contracts.filter((c) => c.source === 'reservation')
    ).toHaveLength(16);
    expect(f.rows.contracts.filter((c) => c.source === 'walk_in')).toHaveLength(
      16
    );
    expect(
      f.rows.payments.filter((p) => p.purpose === 'reservation_deposit')
    ).toHaveLength(16);
    expect(
      f.rows.payments.filter((p) => p.purpose === 'contract_deposit')
    ).toHaveLength(16);
    for (const district of [2, 3, 4, 5]) {
      const reservations = f.rows.reservations.filter((r) =>
        r.reservationCode.includes(`-Q${district}-`)
      );
      expect(reservations).toHaveLength(4);
      expect(
        reservations.filter((r) => r.rentalTargetType === 'storage_rack')
      ).toHaveLength(2);
      for (const r of reservations) {
        expect(r.status).toBe('completed');
        const contracts = f.rows.contracts.filter(
          (c) => String(c.reservationId) === String(r._id)
        );
        expect(contracts).toHaveLength(1);
        const c = contracts[0];
        const deposits = f.rows.payments.filter(
          (p) => String(p._id) === String(r.paymentId)
        );
        expect(deposits).toHaveLength(1);
        expect(String(c.depositPaymentId)).toBe(String(r.paymentId));
        expect(deposits[0]).toMatchObject({
          purpose: 'reservation_deposit',
          amount: r.depositAmount,
          paidAmount: r.depositAmount,
          contractId: null,
        });
        expect(String(deposits[0].reservationId)).toBe(String(r._id));
        expect(c.depositAmount).toBe(r.depositAmount);
        expect(c.depositPaidAt).toEqual(r.paidAt);
        expect(r.paidAt.getTime()).toBeLessThan(c.createdAt.getTime());
        expect(r.arrivedAt.getTime()).toBeLessThanOrEqual(
          c.actualCheckInDate.getTime()
        );
        expect(r.checkInTimeSlot).toBe('09:00 - 11:00');
        expect(c.endDate.getTime() + 1 - r.startDate.getTime()).toBe(
          r.rentalDuration * 86400000
        );
      }
    }
    expect(
      f.rows.payments
        .filter((p) =>
          ['reservation_deposit', 'contract_deposit'].includes(p.purpose)
        )
        .reduce((sum, p) => sum + p.amount, 0)
    ).toBe(276000);
  });
  it('uses inclusive Vietnam dates, six adjacent 30-day cycles and one-time charges only in period 1', async () => {
    const f = await fixture();
    const c = f.rows.contracts.find((c) => c.contractCode === 'SEED-M5-Q2-08')!;
    expect(c.endDate.toISOString()).toBe('2026-11-27T16:59:59.999Z');
    expect(c.rentalPrice).toBe(18000);
    expect(c.totalPeriodicPrice).toBe(23000);
    const invoices = f.rows.invoices.filter(
      (i) => String(i.contractId) === String(c._id)
    );
    expect(invoices).toHaveLength(6);
    expect(invoices.map((i) => i.totalAmount)).toEqual([
      53000, 23000, 23000, 23000, 23000, 23000,
    ]);
    for (let n = 1; n < invoices.length; n++)
      expect(invoices[n].periodStartDate.getTime()).toBe(
        invoices[n - 1].periodEndDate.getTime() + 1
      );
    expect(invoices.at(-1)?.periodEndDate).toEqual(c.endDate);
    const payments = f.rows.payments.filter(
      (p) => String(p.contractId) === String(c._id)
    );
    expect(
      payments.every((p) => p.status === 'paid' && p.method === 'cash')
    ).toBe(true);
    expect(c.depositPaidAt.getTime()).toBeLessThan(
      c.actualCheckInDate.getTime()
    );
    expect(c.firstPeriodPaidAt.getTime()).toBeLessThan(
      c.actualCheckInDate.getTime()
    );
  });
  it('refuses stale dates, changed prices, occupied resources and missing prerequisites', async () => {
    const db = client.db(database);
    const foundation = await loadFinanceFoundation(db);
    await expect(
      buildContractsFinance(foundation, new Date('2026-11-28T00:00:00+07:00'))
    ).rejects.toThrow(/REFERENCE_DATE/);
    const q2 = foundation.facilities.find((row) => row.code === 'Q2')!;
    const offer = foundation.facilityunittypeofferings.find(
      (row) =>
        String(row.facilityId) === String(q2._id) && row.pricePerUnit === 5000
    )!;
    offer.pricePerUnit++;
    await expect(
      buildContractsFinance(foundation, referenceDate)
    ).rejects.toThrow(/PRICE/);
    const f = await fixture();
    await db
      .collection('storageunits')
      .updateOne(
        { _id: f.rows.contracts[0].storageUnitId },
        { $set: { status: 'occupied' } }
      );
    await expect(
      applyContractsFinance(client, database, f, 'test-backup', referenceDate)
    ).rejects.toThrow(/FOUNDATION_CHANGED/);
    expect(await db.collection('contracts').countDocuments()).toBe(0);
    await db.collection('seedmilestones').deleteMany({});
    await expect(
      applyContractsFinance(client, database, f, 'test-backup', referenceDate)
    ).rejects.toThrow(/MILESTONE_4/);
  });
  it('rejects missing assets before writing anything', async () => {
    const f = await buildContractsFinance(
      await loadFinanceFoundation(client.db(database)),
      referenceDate
    );
    await expect(
      applyContractsFinance(client, database, f, 'test-backup', referenceDate)
    ).rejects.toThrow(/ASSETS/);
    expect(
      await client.db(database).collection('contracts').countDocuments()
    ).toBe(0);
  });
  it('applies atomically, preserves existing and Q1 data and changes only approved resources', async () => {
    const db = client.db(database);
    const users = await db.collection('users').find({}).toArray();
    const q1 = base.facilities.find((f) => f.code === 'Q1')!;
    const q1Before = await db.collection('facilities').findOne({ _id: q1._id });
    await db
      .collection('contracts')
      .insertOne({ contractCode: 'MANUAL-Q1', facilityId: q1._id });
    await db.collection('reservations').insertOne({
      reservationCode: 'MANUAL-Q1-RES',
      facilityId: q1._id,
      status: 'confirmed',
    });
    const f = await fixture();
    const result = await applyContractsFinance(
      client,
      database,
      f,
      'test-backup',
      referenceDate
    );
    expect(result.alreadyApplied).toBe(false);
    expect(await verifyContractsFinance(db, true)).toMatchObject({
      reservations: 16,
      contracts: 32,
      invoices: 160,
      payments: 176,
      refundrequests: 16,
    });
    expect(await db.collection('users').find({}).toArray()).toEqual(users);
    expect(await db.collection('facilities').findOne({ _id: q1._id })).toEqual(
      q1Before
    );
    expect(await db.collection('contracts').countDocuments()).toBe(33);
    expect(await db.collection('reservations').countDocuments()).toBe(17);
    expect(
      await db
        .collection('reservations')
        .findOne({ reservationCode: 'MANUAL-Q1-RES' })
    ).toMatchObject({ status: 'confirmed', facilityId: q1._id });
    expect(
      await db.collection('storageunits').countDocuments({ status: 'occupied' })
    ).toBe(12);
    expect(
      await db
        .collection('storageunits')
        .countDocuments({ status: 'under_maintenance' })
    ).toBe(12);
    expect(
      await db.collection('storageracks').countDocuments({ status: 'rented' })
    ).toBe(8);
    expect(
      await db.collection('racktiers').countDocuments({ status: 'available' })
    ).toBe(200);
    const q2 = base.facilities.find((f) => f.code === 'Q2')!;
    const carton = catalog.amenities.find((a) => a.name === 'Thùng carton')!;
    expect(
      (
        await db
          .collection('facilityamenityofferings')
          .findOne({ facilityId: q2._id, amenityId: carton._id })
      )?.inUseQuantity
    ).toBe(4);
    expect(await db.collection('customerinventories').countDocuments()).toBe(0);
    expect(await db.collection('auditlogs').countDocuments()).toBe(458);
  });
  it('rolls back legal links, stock updates and all inserts on a late duplicate payment', async () => {
    const db = client.db(database);
    const f = await fixture();
    await db
      .collection('payments')
      .insertOne({ paymentCode: f.rows.payments.at(-1)!.paymentCode });
    await expect(
      applyContractsFinance(client, database, f, 'test-backup', referenceDate)
    ).rejects.toThrow();
    expect(await db.collection('contracts').countDocuments()).toBe(0);
    expect(await db.collection('reservations').countDocuments()).toBe(0);
    expect(await db.collection('invoices').countDocuments()).toBe(0);
    expect(await db.collection('contracttemplates').countDocuments()).toBe(0);
    expect(
      await db
        .collection('facilities')
        .countDocuments({ legalEntityId: { $ne: null } })
    ).toBe(0);
    expect(
      await db
        .collection('facilityamenityofferings')
        .countDocuments({ inUseQuantity: { $gt: 0 } })
    ).toBe(0);
    expect(await db.collection('auditlogs').countDocuments()).toBe(0);
  });
  it('refuses an overlapping manual contract even if a resource is incorrectly marked available', async () => {
    const db = client.db(database),
      f = await fixture();
    const c = f.rows.contracts[0];
    await db.collection('contracts').insertOne({
      contractCode: 'MANUAL-OVERLAP',
      storageUnitId: c.storageUnitId,
      startDate: c.startDate,
      endDate: c.endDate,
      status: 'active',
      deleted: false,
    });
    await expect(
      applyContractsFinance(client, database, f, 'test-backup', referenceDate)
    ).rejects.toThrow(/EXISTING_CONTRACT_CONFLICT/);
    expect(await db.collection('contracts').countDocuments()).toBe(1);
    expect(await db.collection('payments').countDocuments()).toBe(0);
  });
  it('reads seeded snapshots and invoices through real services and enforces customer/facility scoping', async () => {
    const f = await fixture();
    await applyContractsFinance(
      client,
      database,
      f,
      'test-backup',
      referenceDate
    );
    const contractRepo = new ContractRepository(Contract),
      userRepo = new UserRepository(User);
    const service = new ContractService(
      contractRepo,
      new ReservationRepository(Reservation),
      new StorageUnitRepository(StorageUnit),
      new FacilityAmenityOfferingRepository(FacilityAmenityOffering),
      new FacilityUnitTypeOfferingRepository(FacilityUnitTypeOffering),
      new FacilityRepository(Facility),
      userRepo
    );
    const invoices = new InvoiceService(
      new InvoiceRepository(Invoice),
      contractRepo,
      userRepo
    );
    const reservations = new ReservationService(
      new ReservationRepository(Reservation),
      new FacilityRepository(Facility),
      new FacilityUnitTypeOfferingRepository(FacilityUnitTypeOffering),
      new FacilityAmenityOfferingRepository(FacilityAmenityOffering),
      new StorageUnitRepository(StorageUnit),
      userRepo
    );
    const customer = base.users.find((u) => u.email === 'kh2@example.com')!;
    const other = base.users.find((u) => u.email === 'kh3@example.com')!;
    const staff = base.users.find((u) => u.email === 'nv1q2@example.com')!;
    const otherStaff = base.users.find((u) => u.email === 'nv1q3@example.com')!;
    const contract = f.rows.contracts.find(
      (c) => c.contractCode === 'SEED-M5-Q2-08'
    )!;
    const row = await service.getContractById(
      String(contract._id),
      String(customer._id),
      RoleEnum.CUSTOMER
    );
    expect(row.storageUnit?.floor).toBe(1);
    expect(row.signedContractFiles).toHaveLength(1);
    expect(row.legalEntitySnapshot?.companyName).toBe(
      'Công Ty TNHH Storage Hub'
    );
    const query = {
      page: 1,
      limit: 100,
      sortBy: 'createdAt' as const,
      sortOrder: 'asc' as const,
    };
    const reservation = await reservations.getReservationById(
      String(contract.reservationId),
      String(customer._id),
      RoleEnum.CUSTOMER
    );
    expect(reservation.status).toBe('completed');
    expect(reservation.storageUnit?.floor).toBe(1);
    for (const [user, role] of [
      [customer, RoleEnum.CUSTOMER],
      [staff, RoleEnum.FACILITY_STAFF],
    ] as const)
      expect(
        (await reservations.getReservations(query, String(user._id), role))
          .items
      ).toHaveLength(4);
    for (const [user, role] of [
      [other, RoleEnum.CUSTOMER],
      [otherStaff, RoleEnum.FACILITY_STAFF],
    ] as const)
      await expect(
        reservations.getReservationById(
          String(contract.reservationId),
          String(user._id),
          role
        )
      ).rejects.toMatchObject({ statusCode: 403 });
    expect(
      (
        await service.getContracts(
          query,
          String(customer._id),
          RoleEnum.CUSTOMER
        )
      ).items
    ).toHaveLength(8);
    expect(
      (
        await service.getContracts(
          query,
          String(staff._id),
          RoleEnum.FACILITY_STAFF
        )
      ).items
    ).toHaveLength(8);
    for (const [user, role] of [
      [other, RoleEnum.CUSTOMER],
      [otherStaff, RoleEnum.FACILITY_STAFF],
    ] as const)
      await expect(
        service.getContractById(String(contract._id), String(user._id), role)
      ).rejects.toMatchObject({ statusCode: 403 });
    const invoice = f.rows.invoices.find(
      (i) => String(i.contractId) === String(contract._id)
    )!;
    expect(
      (
        await invoices.getInvoiceById(
          String(invoice._id),
          String(customer._id),
          RoleEnum.CUSTOMER
        )
      ).totalAmount
    ).toBe(53000);
    await expect(
      invoices.getInvoiceById(
        String(invoice._id),
        String(otherStaff._id),
        RoleEnum.FACILITY_STAFF
      )
    ).rejects.toMatchObject({ statusCode: 403 });
    const view = await service.getContractDraftPdf(
      String(contract._id),
      String(customer._id),
      RoleEnum.CUSTOMER
    );
    expect(view.html).toContain('SEED-M5-Q2-08');
  });
  it('rejects broken or duplicated deposit transfers before any database mutation', async () => {
    const f = await fixture();
    const contract = f.rows.contracts.find((c) => c.source === 'reservation')!;
    const reservation = f.rows.reservations.find(
      (r) => String(r._id) === String(contract.reservationId)
    )!;
    reservation.paidAmount++;
    expect(() => validateReservationTransfers(f)).toThrow(
      /RESERVATION_DEPOSIT_LINK_INVALID/
    );
    await expect(
      applyContractsFinance(client, database, f, 'test-backup', referenceDate)
    ).rejects.toThrow(/RESERVATION_DEPOSIT_LINK_INVALID/);
    expect(
      await client.db(database).collection('reservations').countDocuments()
    ).toBe(0);
    expect(
      await client.db(database).collection('payments').countDocuments()
    ).toBe(0);
  });
  it('preserves active manual reservations and refuses their resources even if marked available', async () => {
    const db = client.db(database),
      f = await fixture();
    const contract = f.rows.contracts.find(
      (c) => c.rentedRackIds.length === 2
    )!;
    await db.collection('reservations').insertOne({
      reservationCode: 'MANUAL-RACK',
      rentedRackIds: [contract.rentedRackIds[0]],
      status: 'confirmed',
      deleted: false,
    });
    await expect(
      applyContractsFinance(client, database, f, 'test-backup', referenceDate)
    ).rejects.toThrow(/EXISTING_RESERVATION_CONFLICT/);
    expect(await db.collection('reservations').countDocuments()).toBe(1);
    expect(await db.collection('contracts').countDocuments()).toBe(0);
    expect(await db.collection('auditlogs').countDocuments()).toBe(0);
  });
  it('reruns preserve user edits, cancellations and new manual records, even after the active date expires', async () => {
    const db = client.db(database);
    const f = await fixture();
    await applyContractsFinance(
      client,
      database,
      f,
      'test-backup',
      referenceDate
    );
    const c = f.rows.contracts.find((c) => c.status === 'active')!;
    await db
      .collection('contracts')
      .updateOne(
        { _id: c._id },
        { $set: { status: 'cancelled', notes: 'Đã chỉnh thủ công' } }
      );
    const r = f.rows.signingauthorizations[0];
    const editedReservation = f.rows.reservations[0];
    await db
      .collection('reservations')
      .updateOne(
        { _id: editedReservation._id },
        { $set: { notes: 'Reservation đã chỉnh thủ công' } }
      );
    await db
      .collection('signingauthorizations')
      .updateOne({ _id: r._id }, { $set: { status: 'revoked' } });
    expect(
      await applyContractsFinance(
        client,
        database,
        f,
        'different-backup',
        new Date('2027-01-01')
      )
    ).toMatchObject({ alreadyApplied: true, backupStem: 'test-backup' });
    expect(
      (await db.collection('contracts').findOne({ _id: c._id }))?.notes
    ).toBe('Đã chỉnh thủ công');
    expect(
      (await db.collection('signingauthorizations').findOne({ _id: r._id }))
        ?.status
    ).toBe('revoked');
    expect(
      (
        await db
          .collection('reservations')
          .findOne({ _id: editedReservation._id })
      )?.notes
    ).toBe('Reservation đã chỉnh thủ công');
    expect(await verifyContractsFinance(db)).toMatchObject({
      contracts: 32,
      reservations: 16,
    });
  });
});

describe('milestone 5 document and Render gates', () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6BkoAAAAASUVORK5CYII=',
    'base64'
  );
  const prefix = 'https://res.cloudinary.com/seed-test/image/upload/';
  const numericSwagger =
    'window.onload=function(){var options={"swaggerDoc":{"components":{"schemas":{"StorageUnitResponse":{"$ref":"#/components/schemas/Unit"},"Unit":{"properties":{"floor":{"type":"number"}}}}}}};};';
  it('requires all five deployed maps to contain their warehouse with floor 1', async () => {
    const facilities = [1, 2, 3, 4, 5].map((n) => ({
      code: `Q${n}`,
      id: String(n),
    }));
    const good = await checkRenderFinanceReadiness(
      async (url) =>
        url.endsWith('.js')
          ? new Response(numericSwagger)
          : new Response(
              JSON.stringify({
                success: true,
                data: [
                  {
                    unitNumber: `Q${url.split('/').at(-2)}-KHO-01`,
                    floor: 1,
                  },
                ],
              })
            ),
      facilities
    );
    expect(good.ready).toBe(true);
    const bad = await checkRenderFinanceReadiness(
      async (url) =>
        url.endsWith('.js')
          ? new Response(numericSwagger)
          : new Response('{}', { status: 500 }),
      facilities
    );
    expect(bad).toMatchObject({ ready: false, reason: 'Q1_MAP_HTTP_500' });
    expect(
      (
        await checkRenderFinanceReadiness(
          async () => new Response(numericSwagger),
          facilities.slice(0, 4)
        )
      ).ready
    ).toBe(false);
  });
  it('validates actual PNG bytes and refuses error pages, wrong hosts and invalid images', async () => {
    expect(
      await verifyFinanceAsset(
        `${prefix}sample.png`,
        prefix,
        async () =>
          new Response(png, { headers: { 'content-type': 'image/png' } })
      )
    ).toHaveLength(64);
    await expect(
      verifyFinanceAsset('https://example.com/file.png', prefix)
    ).rejects.toThrow(/URL_INVALID/);
    await expect(
      verifyFinanceAsset(
        `${prefix}sample.png`,
        prefix,
        async () =>
          new Response('<html>error</html>', {
            headers: { 'content-type': 'text/html' },
          })
      )
    ).rejects.toThrow(/NOT_PNG/);
    await expect(
      verifyFinanceAsset(
        `${prefix}sample.png`,
        prefix,
        async () =>
          new Response('invalid', { headers: { 'content-type': 'image/png' } })
      )
    ).rejects.toThrow(/INVALID_IMAGE/);
  });
  it('resumes document uploads from manifest, preserves checksums and recovers assets uploaded before a crash', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'seed-m5-assets-'));
    const manifest = path.join(directory, 'assets.json');
    const spec = financeDocument('sample', 'Tài liệu mẫu', ['Nội dung mẫu']);
    let uploads = 0;
    const provider = {
      securePrefix: prefix,
      lookup: async () => null as string | null,
      upload: async () => {
        uploads++;
        return `${prefix}sample.png`;
      },
    };
    const fetcher = async () =>
      new Response(png, { headers: { 'content-type': 'image/png' } });
    try {
      const first = await prepareFinanceAssets(
        [spec],
        manifest,
        provider,
        fetcher
      );
      expect(first.sample.sourceHash).toBe(spec.sourceHash);
      expect(uploads).toBe(1);
      await prepareFinanceAssets([spec], manifest, provider, fetcher);
      expect(uploads).toBe(1);
      expect(JSON.parse(await readFile(manifest, 'utf8'))).toHaveProperty(
        'sample.fileHash'
      );
      const other = financeDocument('recovered', 'Mẫu khác', []);
      await prepareFinanceAssets(
        [other],
        manifest,
        { ...provider, lookup: async () => `${prefix}recovered.png` },
        fetcher
      );
      expect(uploads).toBe(1);
      await expect(
        prepareFinanceAssets(
          [financeDocument('sample', 'Nội dung đã sửa', [])],
          manifest,
          provider,
          fetcher
        )
      ).rejects.toThrow(/CONTENT_CHANGED/);
      const changed = Buffer.from(png);
      changed[changed.length - 1] ^= 1;
      await expect(
        prepareFinanceAssets(
          [spec],
          manifest,
          provider,
          async () =>
            new Response(changed, { headers: { 'content-type': 'image/png' } })
        )
      ).rejects.toThrow(/CHECKSUM_CHANGED/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('escapes text in sample documents and marks them as seed', () => {
    const svg = renderSeedDocument({
      title: 'Mẫu <script>',
      lines: ['A & B', 'Giá 5.000đ'],
    });
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('A &amp; B');
    expect(svg).toContain('DỮ LIỆU SEED');
    expect(svg).not.toContain('<script>');
  });
  it('blocks a 500 response before any upload/apply, and rejects legacy null floors', async () => {
    const failed = await checkRenderFinanceReadiness(
      async () => new Response('{}', { status: 500 })
    );
    expect(failed.ready).toBe(false);
    const numeric = await checkRenderFinanceReadiness(async (input) =>
      String(input).endsWith('.js')
        ? new Response(
            'window.onload=function(){var options={"swaggerDoc":{"components":{"schemas":{"StorageUnitResponse":{"properties":{"floor":{"type":"number"}}}}}}};};'
          )
        : new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  unitNumber: `Q${String(input).includes('48fa6b') ? '1' : '2'}-KHO-01`,
                  floor: null,
                },
              ],
            })
          )
    );
    expect(numeric.ready).toBe(false);
  });
});
