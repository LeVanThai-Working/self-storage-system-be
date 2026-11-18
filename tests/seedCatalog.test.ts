import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildAccountFacility } from '../scripts/seed/account-facility.ts';
import {
  applyCatalog,
  buildCatalog,
  completeCatalog,
  ensureCatalogIndexes,
  parseCatalogArgs,
  verifyCatalog,
} from '../scripts/seed/catalog.ts';

describe('milestone 3: catalogs and full account names without resetting', () => {
  let server: MongoMemoryReplSet;
  let client: InstanceType<typeof mongoose.mongo.MongoClient>;
  let base: Awaited<ReturnType<typeof buildAccountFacility>>;
  let catalog: Awaited<ReturnType<typeof buildCatalog>>;
  const database = 'seed_catalog_test';
  beforeAll(async () => {
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    client = await new mongoose.mongo.MongoClient(server.getUri()).connect();
    base = await buildAccountFacility();
    catalog = await buildCatalog(base.facilities);
  });
  afterAll(async () => {
    await client?.close();
    await server?.stop();
  });
  beforeEach(async () => {
    const db = client.db(database);
    await db.dropDatabase();
    await db
      .collection('users')
      .insertMany(
        base.users.map((user) => ({ ...user, name: user.email.split('@')[0] }))
      );
    await db.collection('profiles').insertMany(base.profiles);
    await db.collection('facilities').insertMany(base.facilities);
    await db
      .collection<{ _id: string; status: string }>('seedmilestones')
      .insertOne({ _id: 'module-seed-v1:2', status: 'complete' });
    await ensureCatalogIndexes(db);
  });
  it('has a dry-run default, requires explicit database for apply and rejects reset', () => {
    expect(parseCatalogArgs(['--milestone', '3'])).toEqual({ apply: false });
    expect(
      parseCatalogArgs(['--milestone', '3', '--apply', '--database', database])
    ).toEqual({ apply: true, database });
    for (const args of [
      ['--milestone', '3', '--reset'],
      ['--milestone', '3', '--apply'],
      ['--milestone', '3', '--apply', '--dry-run', '--database', database],
      ['--milestone', '4'],
    ])
      expect(() => parseCatalogArgs(args)).toThrow();
  });
  it('builds the approved catalog, prices, capacities and ten-rack/four-tier defaults', () => {
    expect(
      Object.fromEntries(
        Object.entries(catalog).map(([name, items]) => [name, items.length])
      )
    ).toEqual({
      unittypes: 4,
      amenities: 5,
      facilityunittypeofferings: 20,
      facilityamenityofferings: 25,
      facilitytimeslots: 35,
    });
    expect(
      catalog.unittypes.find((row) => row.category === 'warehouse_rack')
        ?.defaultRackConfig
    ).toMatchObject({ rackCount: 10, tiersPerRack: 4 });
    expect(
      catalog.facilityunittypeofferings.find((row) => row.rackZonePricing)
        ?.rackZonePricing
    ).toEqual({ ECONOMY: 5000, STANDARD: 8000, PRIME: 10000 });
    expect(
      catalog.facilitytimeslots.slice(0, 7).map((row) => row.maxCapacity)
    ).toEqual([4, 4, 3, 4, 4, 3, 2]);
  });
  it('requires milestone 2 before changing account names or adding data', async () => {
    await client.db(database).collection('seedmilestones').deleteMany({});
    await expect(
      applyCatalog(client, database, catalog, 'test-backup')
    ).rejects.toThrow(/MILESTONE_2/);
    expect(
      await client.db(database).collection('unittypes').countDocuments()
    ).toBe(0);
  });
  it('expands all 37 names and creates all catalog links without changing login or assignments', async () => {
    const db = client.db(database);
    const before = await db
      .collection('users')
      .findOne({ email: 'nv1q1@example.com' });
    expect(
      await applyCatalog(client, database, catalog, 'test-backup')
    ).toMatchObject({ alreadyApplied: false, namesUpdated: 37 });
    const after = await db
      .collection('users')
      .findOne({ email: 'nv1q1@example.com' });
    expect(after?.name).toBe('Nhân viên 1 Quận 1');
    for (const field of [
      '_id',
      'email',
      'password',
      'role',
      'assignedFacilityId',
    ])
      expect(after?.[field]).toEqual(before?.[field]);
    expect(
      (await db.collection('users').findOne({ email: 'qlq1@example.com' }))
        ?.name
    ).toBe('Quản lý Quận 1');
    expect(
      (await db.collection('users').findOne({ email: 'kh1@example.com' }))?.name
    ).toBe('Khách hàng 1');
    expect(await verifyCatalog(db)).toMatchObject({
      unittypes: 4,
      amenities: 5,
      facilityunittypeofferings: 20,
      facilityamenityofferings: 25,
      facilitytimeslots: 35,
    });
    expect(await db.collection('storageunits').countDocuments()).toBe(0);
    expect(await db.collection('contracts').countDocuments()).toBe(0);
  });
  it('rolls back account renaming and all inserted rows if a unique index rejects the fixture', async () => {
    const invalid = {
      ...catalog,
      amenities: catalog.amenities.map((row) => ({ ...row })),
    };
    invalid.amenities[1].name = invalid.amenities[0].name;
    await expect(
      applyCatalog(client, database, invalid, 'test-backup')
    ).rejects.toThrow();
    expect(
      (
        await client
          .db(database)
          .collection('users')
          .findOne({ email: 'nv1q1@example.com' })
      )?.name
    ).toBe('nv1q1');
    expect(
      await client.db(database).collection('unittypes').countDocuments()
    ).toBe(0);
  });
  it('refuses to overwrite untracked existing catalog data', async () => {
    await client
      .db(database)
      .collection('amenities')
      .insertOne({ name: 'Dữ liệu tự tạo' });
    await expect(
      applyCatalog(client, database, catalog, 'test-backup')
    ).rejects.toThrow(/NOT_EMPTY/);
    expect(
      await client.db(database).collection('amenities').countDocuments()
    ).toBe(1);
  });
  it('reruns preserve manual changes and later module data', async () => {
    const db = client.db(database);
    await applyCatalog(client, database, catalog, 'test-backup');
    await completeCatalog(client, database);
    await db
      .collection('facilityunittypeofferings')
      .updateOne(
        { _id: catalog.facilityunittypeofferings[0]._id },
        { $set: { pricePerUnit: 12345 } }
      );
    await db.collection('contracts').insertOne({ keep: true });
    expect(
      await applyCatalog(client, database, catalog, 'test-backup')
    ).toMatchObject({ alreadyApplied: true });
    expect(
      (
        await db
          .collection('facilityunittypeofferings')
          .findOne({ _id: catalog.facilityunittypeofferings[0]._id })
      )?.pricePerUnit
    ).toBe(12345);
    expect(await db.collection('contracts').countDocuments()).toBe(1);
  });
  it('creates a valid unique active timeslot index, allowing a soft-deleted duplicate', async () => {
    const db = client.db(database);
    await applyCatalog(client, database, catalog, 'test-backup');
    const slot = catalog.facilitytimeslots[0];
    await expect(
      db
        .collection('facilitytimeslots')
        .insertOne({ ...slot, _id: new mongoose.Types.ObjectId() })
    ).rejects.toThrow();
    await db.collection('facilitytimeslots').insertOne({
      ...slot,
      _id: new mongoose.Types.ObjectId(),
      deleted: true,
    });
  });
});
