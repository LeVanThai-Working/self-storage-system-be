import mongoose from 'mongoose';
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
import {
  buildContractsFinance,
  loadFinanceFoundation,
} from '../scripts/seed/contracts-finance.ts';
import { LegalEntity } from '../src/modules/legalEntity/legalEntity.model.ts';
import { CustomerSku } from '../src/modules/customerSku/customerSku.model.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerSkuRepository } from '../src/modules/customerSku/customerSku.repository.ts';
import { CustomerSkuService } from '../src/modules/customerSku/customerSku.service.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import { CustomerInventoryService } from '../src/modules/customerInventory/customerInventory.service.ts';
import { InventoryMovement } from '../src/modules/customerInventory/inventoryMovement.model.ts';
import { InventoryMovementRepository } from '../src/modules/customerInventory/inventoryMovement.repository.ts';
import {
  AccessSchedule,
  AccessScheduleStaffLock,
} from '../src/modules/customerInventory/accessSchedule.model.ts';
import { AccessScheduleRepository } from '../src/modules/customerInventory/accessSchedule.repository.ts';
import { AccessScheduleService } from '../src/modules/customerInventory/accessSchedule.service.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { StorageRackRepository } from '../src/modules/storageRack/storageRack.repository.ts';
import { RackTier } from '../src/modules/storageRack/rackTier.model.ts';
import { RackTierRepository } from '../src/modules/storageRack/rackTier.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { FacilityTimeSlot } from '../src/modules/facilityTimeSlot/facilityTimeSlot.model.ts';
import { FacilityTimeSlotRepository } from '../src/modules/facilityTimeSlot/facilityTimeSlot.repository.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { accessScheduleQuerySchema } from '../src/modules/customerInventory/schemas/accessSchedule.request.schema.ts';
import { inventoryMovementQuerySchema } from '../src/modules/customerInventory/schemas/customerInventory.request.schema.ts';
import {
  applyAccessInventory,
  buildAccessInventory,
  ensureAccessInventoryIndexes,
  loadAccessInventoryFoundation,
  parseAccessInventoryArgs,
  runAccessInventory,
  validateAccessInventoryLedger,
  verifyAccessInventory,
} from '../scripts/seed/access-inventory.ts';

const now = new Date('2026-11-18T12:00:00Z');
const database = 'seed_access_inventory_test';
describe('milestone 6: approved access and inventory history', () => {
  let server: MongoMemoryReplSet;
  let client: InstanceType<typeof mongoose.mongo.MongoClient>;
  let foundation: Record<string, mongoose.mongo.Document[]>;
  beforeAll(async () => {
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    client = await new mongoose.mongo.MongoClient(server.getUri()).connect();
    await mongoose.connect(server.getUri(database), {
      autoIndex: false,
      autoCreate: false,
    });
    const base = await buildAccountFacility(),
      catalog = await buildCatalog(base.facilities),
      layout = await buildStorageLayout(base.facilities, catalog.unittypes);
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
    foundation = {
      ...base,
      ...catalog,
      ...layout,
      legalentities: [legal.toObject()],
    };
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await client?.close();
    await server?.stop();
  });
  beforeEach(async () => {
    const db = client.db(database);
    await db.dropDatabase();
    for (const [name, rows] of Object.entries(foundation))
      await db.collection(name).insertMany(rows);
    const finance = await buildContractsFinance(
      await loadFinanceFoundation(db),
      now
    );
    for (const [name, rows] of Object.entries(finance.rows))
      await db.collection(name).insertMany(rows);
    for (const u of finance.updates)
      await db
        .collection(u.collection)
        .updateOne({ _id: u.id }, { $set: u.set });
    await db
      .collection<{
        _id: string;
        status: string;
        ids: { contracts: mongoose.Types.ObjectId[] };
      }>('seedmilestones')
      .insertOne({
        _id: 'module-seed-v1:5',
        status: 'complete',
        ids: { contracts: finance.rows.contracts.map((c) => c._id) },
      });
    await ensureAccessInventoryIndexes(db);
  });
  const fixture = async () =>
    buildAccessInventory(
      await loadAccessInventoryFoundation(client.db(database)),
      now
    );
  it('dry-run uses the real runner without mutating records or metadata', async () => {
    const db = client.db(database),
      before = await db.listCollections().toArray();
    vi.stubEnv('MONGODB_URI', server.getUri(database));
    vi.setSystemTime(now);
    const logged = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runAccessInventory(['--milestone', '6', '--dry-run']);
      expect(JSON.parse(logged.mock.calls[0][0] as string)).toMatchObject({
        dryRun: true,
        counts: { accessschedules: 24, inventorymovements: 36 },
      });
      expect(await db.listCollections().toArray()).toEqual(before);
      expect(await db.collection('customerinventories').countDocuments()).toBe(
        0
      );
      await expect(
        runAccessInventory([
          '--milestone',
          '6',
          '--apply',
          '--database',
          'wrong_database',
        ])
      ).rejects.toThrow('DATABASE_NAME_MISMATCH');
      expect(await db.collection('auditlogs').countDocuments()).toBe(0);
    } finally {
      logged.mockRestore();
      vi.unstubAllEnvs();
      vi.useRealTimers();
    }
  });
  it('blocks staff overlap and capacity conflicts with manual visits', async () => {
    const f = await fixture();
    const original = await loadAccessInventoryFoundation(client.db(database));
    original.accessschedules.push({
      ...f.rows.accessschedules[0],
      _id: new mongoose.Types.ObjectId(),
      scheduleCode: 'MANUAL',
    });
    await expect(buildAccessInventory(original, now)).rejects.toThrow(
      'M6_STAFF_SCHEDULE_CONFLICT'
    );
    const capacity = await loadAccessInventoryFoundation(client.db(database));
    capacity.facilitytimeslots.find(
      (s) => String(s._id) === String(f.rows.accessschedules[0].timeSlotId)
    )!.maxCapacity = 1;
    capacity.accessschedules.push({
      ...f.rows.accessschedules[0],
      _id: new mongoose.Types.ObjectId(),
      assignedStaffId: new mongoose.Types.ObjectId(),
    });
    await expect(buildAccessInventory(capacity, now)).rejects.toThrow(
      'M6_SLOT_CAPACITY_CONFLICT'
    );
  });
  it('reads visits, SKU, tree, locations and ledger through real services with customer and facility isolation', async () => {
    const db = client.db(database),
      f = await fixture();
    await applyAccessInventory(client, database, f, 'test-backup', now);
    const contracts = new ContractRepository(Contract),
      users = new UserRepository(User),
      racks = new StorageRackRepository(StorageRack),
      tiers = new RackTierRepository(RackTier),
      units = new StorageUnitRepository(StorageUnit),
      skuRepo = new CustomerSkuRepository(CustomerSku),
      inventoryRepo = new CustomerInventoryRepository(CustomerInventory);
    const inventory = new CustomerInventoryService(
      inventoryRepo,
      new InventoryMovementRepository(InventoryMovement),
      contracts,
      skuRepo,
      racks,
      tiers,
      units,
      undefined,
      users
    );
    const skus = new CustomerSkuService(
      skuRepo,
      undefined,
      inventoryRepo,
      contracts,
      users
    );
    const schedules = new AccessScheduleService(
      new AccessScheduleRepository(AccessSchedule, AccessScheduleStaffLock),
      contracts,
      new FacilityRepository(Facility),
      new FacilityTimeSlotRepository(FacilityTimeSlot),
      racks,
      users
    );
    const person = (email: string) =>
      foundation.users.find((u) => u.email === email)!;
    const customer = person('kh2@example.com'),
      other = person('kh3@example.com'),
      staff = person('nv1q2@example.com'),
      otherStaff = person('nv1q3@example.com');
    const caller = { id: String(customer._id), role: RoleEnum.CUSTOMER };
    const activeContract = await db
      .collection('contracts')
      .findOne({ contractCode: 'SEED-M5-Q2-08' });
    const sku = f.rows.customerskus.find(
      (s) => s.skuCode === 'SEED-M6-Q2-GIADUNG'
    )!;
    const item = f.rows.customerinventories.find(
      (i) => String(i.skuId) === String(sku._id) && i.quantity > 0
    )!;
    const visit = f.rows.accessschedules.find(
      (s) => s.scheduleCode === 'SEED-M6-Q2-08-AS-03'
    )!;
    expect((await skus.findById(String(sku._id), caller)).name).toBe(
      'Thùng đồ gia dụng Khách hàng 2'
    );
    expect(
      (await inventory.findInventoryById(String(item._id), caller)).quantity
    ).toBe(3);
    expect(
      (await inventory.getSkuLocations(String(sku._id), caller)).sku
        .totalQuantity
    ).toBe(6);
    expect(
      (
        await inventory.getStorageUnitTree(
          String(item.storageUnitId),
          caller,
          String(activeContract!._id)
        )
      ).summary.totalQuantity
    ).toBe(6);
    expect(
      (
        await inventory.findAllMovements(
          inventoryMovementQuerySchema.parse({ page: 1, limit: 100 }),
          caller
        )
      ).items
    ).toHaveLength(9);
    expect(
      (
        await schedules.getSchedules(
          accessScheduleQuerySchema.parse({ page: 1, limit: 100 }),
          { userId: caller.id, role: caller.role }
        )
      ).items
    ).toHaveLength(6);
    expect(
      (
        await schedules.getScheduleById(String(visit._id), {
          userId: caller.id,
          role: caller.role,
        })
      ).status
    ).toBe('completed');
    expect(
      (
        await inventory.findInventoryById(String(item._id), {
          id: String(staff._id),
          role: RoleEnum.FACILITY_STAFF,
        })
      ).quantity
    ).toBe(3);
    for (const [user, role] of [
      [other, RoleEnum.CUSTOMER],
      [otherStaff, RoleEnum.FACILITY_STAFF],
    ] as const) {
      await expect(
        skus.findById(String(sku._id), { id: String(user._id), role })
      ).rejects.toMatchObject({ statusCode: 403 });
      await expect(
        inventory.findInventoryById(String(item._id), {
          id: String(user._id),
          role,
        })
      ).rejects.toMatchObject({ statusCode: 403 });
      await expect(
        schedules.getScheduleById(String(visit._id), {
          userId: String(user._id),
          role,
        })
      ).rejects.toMatchObject({ statusCode: 403 });
    }
    await expect(
      inventory.stockIn(
        {
          contractId: String(activeContract!._id),
          skuId: String(sku._id),
          rackTierId: String(item.rackTierId),
          quantity: 1,
        },
        { id: String(staff._id), role: RoleEnum.FACILITY_STAFF }
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });
  it('requires explicit apply database and rejects reset, backup and bypass flags', () => {
    expect(parseAccessInventoryArgs(['--milestone', '6', '--dry-run'])).toEqual(
      { apply: false }
    );
    expect(
      parseAccessInventoryArgs([
        '--milestone',
        '6',
        '--apply',
        '--database',
        database,
      ])
    ).toEqual({ apply: true, database });
    for (const args of [
      ['--milestone', '6', '--apply'],
      ['--milestone', '6', '--reset'],
      ['--milestone', '5'],
      ['--milestone', '6', '--backup'],
      ['--milestone', '6', '--apply', '--dry-run', '--database', database],
    ])
      expect(() => parseAccessInventoryArgs(args)).toThrow();
  });
  it('builds 24 visits, 8 SKUs, 24 inventory positions and 36 balanced movements', async () => {
    const f = await fixture();
    expect(f.rows.accessschedules).toHaveLength(24);
    expect(f.rows.customerskus).toHaveLength(8);
    expect(f.rows.customerinventories).toHaveLength(24);
    expect(f.rows.inventorymovements).toHaveLength(36);
    expect(f.tierUpdates).toHaveLength(8);
    expect(f.summary).toEqual({
      inbound: 80,
      outbound: 56,
      remaining: 24,
      occupiedTiers: 8,
    });
    expect(
      f.rows.customerinventories.filter((i) => i.quantity === 3)
    ).toHaveLength(8);
    expect(
      f.rows.customerinventories.filter((i) => i.quantity === 0)
    ).toHaveLength(16);
    for (const type of ['in', 'move', 'out'])
      expect(
        f.rows.inventorymovements.filter((m) => m.type === type)
      ).toHaveLength(12);
    expect(
      new Set(f.rows.accessschedules.map((s) => s.numberOfPeople))
    ).toEqual(new Set([5, 8, 10]));
    for (const s of f.rows.accessschedules) {
      expect(s.status).toBe('completed');
      expect(s.otpHash).toBeNull();
      expect(s.otpEncrypted).toBeNull();
      expect(String(s.assignedStaffId)).toBe(String(s.checkedInBy));
      expect(String(s.checkedInBy)).toBe(String(s.checkedOutBy));
      expect(s.checkedInAt.getTime()).toBeLessThan(s.expiresAt.getTime());
    }
    expect(() => validateAccessInventoryLedger(f)).not.toThrow();
  });
  it('requires M5, unchanged contract dates, available tiers and no manual stock', async () => {
    const original = await loadAccessInventoryFoundation(client.db(database));
    const q1 = original.facilities.find((f) => f.code === 'Q1')!;
    const f = await fixture();
    expect(
      f.rows.accessschedules.some(
        (s) => String(s.facilityId) === String(q1._id)
      )
    ).toBe(false);
    const missing = { ...original, seedmilestones: [] };
    await expect(buildAccessInventory(missing, now)).rejects.toThrow(
      /MILESTONE_5_REQUIRED/
    );
    const active = original.contracts.find(
      (c) => c.contractCode === 'SEED-M5-Q2-08'
    )!;
    active.status = 'cancelled';
    await expect(buildAccessInventory(original, now)).rejects.toThrow(
      /CONTRACT/
    );
    const occupied = await loadAccessInventoryFoundation(client.db(database));
    occupied.racktiers.find(
      (t) => String(t._id) === String(f.tierUpdates[0].id)
    )!.status = 'occupied';
    await expect(buildAccessInventory(occupied, now)).rejects.toThrow(/TIER/);
    const manual = await loadAccessInventoryFoundation(client.db(database));
    manual.customerinventories.push({
      contractId: f.rows.customerinventories[0].contractId,
      quantity: 1,
    });
    await expect(buildAccessInventory(manual, now)).rejects.toThrow(/STOCK/);
  });
  it('rejects ledger corruption before mutations', async () => {
    const f = await fixture();
    f.rows.inventorymovements[0].newQuantity++;
    await expect(
      applyAccessInventory(client, database, f, 'test-backup', now)
    ).rejects.toThrow(/LEDGER/);
    expect(
      await client.db(database).collection('accessschedules').countDocuments()
    ).toBe(0);
  });
  it('applies atomically and preserves Q1, contracts, finance and all other records', async () => {
    const db = client.db(database),
      f = await fixture();
    const contracts = await db.collection('contracts').find({}).toArray(),
      payments = await db.collection('payments').find({}).toArray(),
      users = await db.collection('users').find({}).toArray();
    await db
      .collection('accessschedules')
      .insertOne({ scheduleCode: 'MANUAL-Q1', status: 'completed' });
    // Reload after the harmless manual record; source fingerprints include current data.
    const ready = await fixture();
    expect(
      await applyAccessInventory(client, database, ready, 'test-backup', now)
    ).toMatchObject({ alreadyApplied: false });
    expect(await verifyAccessInventory(db, true)).toMatchObject({
      accessschedules: 24,
      customerskus: 8,
      customerinventories: 24,
      inventorymovements: 36,
    });
    expect(await db.collection('contracts').find({}).toArray()).toEqual(
      contracts
    );
    expect(await db.collection('payments').find({}).toArray()).toEqual(
      payments
    );
    expect(await db.collection('users').find({}).toArray()).toEqual(users);
    expect(await db.collection('accessschedules').countDocuments()).toBe(25);
    expect(
      await db.collection('racktiers').countDocuments({ status: 'occupied' })
    ).toBe(8);
    expect(
      await db.collection('racktiers').countDocuments({ status: 'available' })
    ).toBe(192);
    expect(await db.collection('auditlogs').countDocuments()).toBe(101);
    expect(f.summary.remaining).toBe(24);
  });
  it('rolls back inserted rows and tiers when the last movement conflicts', async () => {
    const db = client.db(database),
      f = await fixture();
    await db.collection('inventorymovements').insertOne({
      movementCode: f.rows.inventorymovements.at(-1)!.movementCode,
    });
    const reloaded = await fixture();
    await expect(
      applyAccessInventory(client, database, reloaded, 'test-backup', now)
    ).rejects.toThrow();
    expect(await db.collection('accessschedules').countDocuments()).toBe(0);
    expect(await db.collection('customerskus').countDocuments()).toBe(0);
    expect(await db.collection('customerinventories').countDocuments()).toBe(0);
    expect(
      await db.collection('racktiers').countDocuments({ status: 'occupied' })
    ).toBe(0);
    expect(await db.collection('auditlogs').countDocuments()).toBe(0);
  });
  it('blocks concurrent resource changes and preserves edits on checkpoint rerun', async () => {
    const db = client.db(database),
      f = await fixture();
    await db
      .collection('racktiers')
      .updateOne(
        { _id: f.tierUpdates[0].id },
        { $set: { notes: 'Chỉnh thủ công' } }
      );
    await expect(
      applyAccessInventory(client, database, f, 'test-backup', now)
    ).rejects.toThrow(/FOUNDATION_CHANGED/);
    await applyAccessInventory(
      client,
      database,
      await fixture(),
      'test-backup',
      now
    );
    const item = f.rows.customerinventories.find((i) => i.quantity > 0)!;
    await db
      .collection('customerinventories')
      .updateOne(
        { _id: item._id },
        { $set: { quantity: 2, notes: 'Khách đã xuất thêm' } }
      );
    expect(
      await applyAccessInventory(
        client,
        database,
        f,
        'other',
        new Date('2027-01-01')
      )
    ).toMatchObject({ alreadyApplied: true });
    expect(
      (await db.collection('customerinventories').findOne({ _id: item._id }))
        ?.quantity
    ).toBe(2);
    expect(await verifyAccessInventory(db)).toMatchObject({
      customerinventories: 24,
    });
  });
  it('enforces SKU, barcode and inventory position uniqueness only for active records', async () => {
    const db = client.db(database),
      f = await fixture(),
      sku = f.rows.customerskus[0],
      inventory = f.rows.customerinventories[0];
    await db.collection('customerskus').insertOne(sku);
    await expect(
      db
        .collection('customerskus')
        .insertOne({ ...sku, _id: new mongoose.Types.ObjectId() })
    ).rejects.toMatchObject({ code: 11000 });
    await db
      .collection('customerskus')
      .insertOne({ ...sku, _id: new mongoose.Types.ObjectId(), deleted: true });
    await db.collection('customerskus').insertOne({
      ...sku,
      _id: new mongoose.Types.ObjectId(),
      skuCode: 'BARCODE-ONE',
      barcode: 'M6-TEST-BARCODE',
    });
    await expect(
      db.collection('customerskus').insertOne({
        ...sku,
        _id: new mongoose.Types.ObjectId(),
        skuCode: 'BARCODE-TWO',
        barcode: 'M6-TEST-BARCODE',
      })
    ).rejects.toMatchObject({ code: 11000 });
    await db.collection('customerskus').insertOne({
      ...sku,
      _id: new mongoose.Types.ObjectId(),
      skuCode: 'BARCODE-TWO',
      barcode: 'M6-TEST-BARCODE',
      deleted: true,
    });
    await db.collection('customerinventories').insertOne(inventory);
    await expect(
      db
        .collection('customerinventories')
        .insertOne({ ...inventory, _id: new mongoose.Types.ObjectId() })
    ).rejects.toMatchObject({ code: 11000 });
    await db.collection('customerinventories').insertOne({
      ...inventory,
      _id: new mongoose.Types.ObjectId(),
      deleted: true,
    });
    expect(
      CustomerSku.schema.indexes().filter(([, o]) => o.unique)
    ).toHaveLength(2);
    expect(CustomerInventory.schema.indexes().some(([, o]) => o.unique)).toBe(
      true
    );
  });
  it('two simultaneous apply attempts cannot duplicate inventory or audit', async () => {
    const f = await fixture();
    const results = await Promise.allSettled([
      applyAccessInventory(client, database, f, 'backup-one', now),
      applyAccessInventory(client, database, f, 'backup-two', now),
    ]);
    expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
    const db = client.db(database);
    expect(await verifyAccessInventory(db, true)).toMatchObject({
      customerinventories: 24,
      inventorymovements: 36,
    });
    expect(await db.collection('auditlogs').countDocuments()).toBe(101);
  });
});
