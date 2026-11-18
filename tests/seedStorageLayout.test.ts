import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildAccountFacility } from '../scripts/seed/account-facility.ts';
import { buildCatalog } from '../scripts/seed/catalog.ts';
import {
  applyStorageLayout,
  buildStorageLayout,
  completeStorageLayout,
  ensureStorageLayoutIndexes,
  parseStorageLayoutArgs,
  verifyStorageLayout,
} from '../scripts/seed/storage-layout.ts';

describe('milestone 4: physical units, racks and tiers', () => {
  let server: MongoMemoryReplSet;
  let client: InstanceType<typeof mongoose.mongo.MongoClient>;
  let base: Awaited<ReturnType<typeof buildAccountFacility>>;
  let catalog: Awaited<ReturnType<typeof buildCatalog>>;
  let layout: Awaited<ReturnType<typeof buildStorageLayout>>;
  const database = 'seed_storage_layout_test';
  beforeAll(async () => {
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    client = await new mongoose.mongo.MongoClient(server.getUri()).connect();
    base = await buildAccountFacility();
    catalog = await buildCatalog(base.facilities);
    layout = await buildStorageLayout(base.facilities, catalog.unittypes);
  });
  afterAll(async () => {
    await client?.close();
    await server?.stop();
  });
  beforeEach(async () => {
    const db = client.db(database);
    await db.dropDatabase();
    await db.collection('users').insertMany(base.users);
    await db.collection('profiles').insertMany(base.profiles);
    await db.collection('facilities').insertMany(base.facilities);
    for (const [name, rows] of Object.entries(catalog))
      await db.collection(name).insertMany(rows);
    await db
      .collection<{ _id: string; status: string }>('seedmilestones')
      .insertOne({ _id: 'module-seed-v1:3', status: 'complete' });
    await ensureStorageLayoutIndexes(db);
  });
  it('requires explicit database for apply and never accepts reset', () => {
    expect(parseStorageLayoutArgs(['--milestone', '4'])).toEqual({
      apply: false,
    });
    expect(
      parseStorageLayoutArgs([
        '--milestone',
        '4',
        '--apply',
        '--database',
        database,
      ])
    ).toEqual({ apply: true, database });
    for (const args of [
      ['--milestone', '4', '--reset'],
      ['--milestone', '4', '--apply'],
      ['--milestone', '4', '--apply', '--dry-run', '--database', database],
      ['--milestone', '5'],
    ])
      expect(() => parseStorageLayoutArgs(args)).toThrow();
  });
  it('builds 95 units, 50 racks and 200 tiers with warehouse floor 1', () => {
    expect(layout.storageunits).toHaveLength(95);
    expect(layout.storageracks).toHaveLength(50);
    expect(layout.racktiers).toHaveLength(200);
    expect(
      layout.storageunits.filter((row) => row.floor === null)
    ).toHaveLength(0);
    expect(layout.storageunits.filter((row) => row.floor === 1)).toHaveLength(
      50
    );
    expect(layout.storageunits.filter((row) => row.floor === 2)).toHaveLength(
      45
    );
    expect(
      layout.storageracks.filter((row) => row.zone === 'ECONOMY')
    ).toHaveLength(20);
    expect(
      layout.storageracks.filter((row) => row.zone === 'STANDARD')
    ).toHaveLength(20);
    expect(
      layout.storageracks.filter((row) => row.zone === 'PRIME')
    ).toHaveLength(10);
    expect(
      layout.storageracks.find((row) => row.rackCode === 'Q1-R01')?.name
    ).toBe('Kệ 01 Quận 1');
    expect(
      layout.racktiers.every(
        (row) => row.volume === 2.7 && row.maxWeightKg === 800
      )
    ).toBe(true);
  });
  it('requires milestone 3 and refuses preexisting untracked unit data', async () => {
    const db = client.db(database);
    await db.collection('seedmilestones').deleteMany({});
    await expect(
      applyStorageLayout(client, database, layout, 'test-backup')
    ).rejects.toThrow(/MILESTONE_3/);
    await db
      .collection<{ _id: string; status: string }>('seedmilestones')
      .insertOne({ _id: 'module-seed-v1:3', status: 'complete' });
    await db.collection('storageunits').insertOne({ unitNumber: 'MANUAL' });
    await expect(
      applyStorageLayout(client, database, layout, 'test-backup')
    ).rejects.toThrow(/NOT_EMPTY/);
    expect(await db.collection('storageunits').countDocuments()).toBe(1);
  });
  it('creates correct links and leaves account/catalog data unchanged', async () => {
    const db = client.db(database);
    const before = await db.collection('users').find({}).toArray();
    expect(
      await applyStorageLayout(client, database, layout, 'test-backup')
    ).toMatchObject({ alreadyApplied: false });
    expect(await verifyStorageLayout(db, true)).toMatchObject({
      storageunits: 95,
      storageracks: 50,
      racktiers: 200,
      warehouseFloorOne: 5,
    });
    expect(await db.collection('users').find({}).toArray()).toEqual(before);
    expect(
      await db.collection('facilityunittypeofferings').countDocuments()
    ).toBe(20);
    expect(await db.collection('contracts').countDocuments()).toBe(0);
    expect(await db.collection('auditlogs').countDocuments()).toBe(345);
  });
  it('preserves unit type dimensions edited after milestone 3', async () => {
    const db = client.db(database);
    const large = catalog.unittypes.find((row) => row.category === 'large')!;
    await db
      .collection('unittypes')
      .updateOne(
        { _id: large._id },
        { $set: { area: 10.2, volume: 30.6, 'dimensions.width': 3.4 } }
      );
    await applyStorageLayout(client, database, layout, 'test-backup');
    expect(await verifyStorageLayout(db, true)).toMatchObject({
      storageunits: 95,
    });
    expect(
      (await db.collection('unittypes').findOne({ _id: large._id }))?.area
    ).toBe(10.2);
  });
  it('rolls back every insert when a duplicate rack coordinate is encountered', async () => {
    const invalid = {
      ...layout,
      storageracks: layout.storageracks.map((row) => ({ ...row })),
    };
    invalid.storageracks[1].aisle = invalid.storageracks[0].aisle;
    invalid.storageracks[1].bay = invalid.storageracks[0].bay;
    await expect(
      applyStorageLayout(client, database, invalid, 'test-backup')
    ).rejects.toThrow();
    for (const name of [
      'storageunits',
      'storageracks',
      'racktiers',
      'auditlogs',
    ])
      expect(await client.db(database).collection(name).countDocuments()).toBe(
        0
      );
  });
  it('reruns preserve rented rack state and later contract records', async () => {
    const db = client.db(database);
    await applyStorageLayout(client, database, layout, 'test-backup');
    await completeStorageLayout(client, database);
    const contractId = new mongoose.Types.ObjectId();
    await db.collection('contracts').insertOne({ _id: contractId });
    await db
      .collection('storageracks')
      .updateOne(
        { _id: layout.storageracks[0]._id },
        { $set: { status: 'rented', currentContractId: contractId } }
      );
    expect(
      await applyStorageLayout(client, database, layout, 'test-backup')
    ).toMatchObject({ alreadyApplied: true });
    expect(
      (
        await db
          .collection('storageracks')
          .findOne({ _id: layout.storageracks[0]._id })
      )?.status
    ).toBe('rented');
    expect(await verifyStorageLayout(db)).toMatchObject({
      storageunits: 95,
      storageracks: 50,
      racktiers: 200,
    });
  });
  it('enforces unique active room numbers and tier numbers while allowing soft-deleted rows', async () => {
    const db = client.db(database);
    await applyStorageLayout(client, database, layout, 'test-backup');
    await expect(
      db.collection('storageunits').insertOne({
        ...layout.storageunits[0],
        _id: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
    await expect(
      db.collection('racktiers').insertOne({
        ...layout.racktiers[0],
        _id: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
    await db.collection('storageunits').insertOne({
      ...layout.storageunits[0],
      _id: new mongoose.Types.ObjectId(),
      deleted: true,
    });
    await db.collection('racktiers').insertOne({
      ...layout.racktiers[0],
      _id: new mongoose.Types.ObjectId(),
      deleted: true,
    });
  });
});
