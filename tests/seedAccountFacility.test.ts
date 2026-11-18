import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  applyAccountFacility,
  buildAccountFacility,
  completeAccountFacility,
  ensureAccountFacilityIndexes,
  parseAccountFacilityArgs,
  verifyAccountFacility,
} from '../scripts/seed/account-facility.ts';
import { captureDatabase } from '../scripts/seed/backup.ts';
import {
  clearOldSessions,
  findStaleSessionOwners,
} from '../scripts/seed/runtime.ts';

describe('milestone 2: atomic account/facility reset', () => {
  let server: MongoMemoryReplSet;
  let client: InstanceType<typeof mongoose.mongo.MongoClient>;
  let fixtures: Awaited<ReturnType<typeof buildAccountFacility>>;
  const database = 'seed_account_facility_test';
  beforeAll(async () => {
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    client = await new mongoose.mongo.MongoClient(server.getUri()).connect();
    fixtures = await buildAccountFacility();
  });
  afterAll(async () => {
    await client?.close();
    await server?.stop();
  });
  beforeEach(async () => {
    const db = client.db(database);
    await db.dropDatabase();
    for (const name of [
      'users',
      'profiles',
      'facilities',
      'auditlogs',
      'contracts',
      'seedmilestones',
    ])
      await db.createCollection(name);
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').insertOne({ email: 'old@example.com' });
    await db.collection('contracts').insertOne({ legacy: true });
  });
  it('requires explicit reset, apply and a database name', () => {
    expect(parseAccountFacilityArgs(['--milestone', '2'])).toEqual({
      apply: false,
    });
    expect(
      parseAccountFacilityArgs([
        '--milestone',
        '2',
        '--reset',
        '--apply',
        '--database',
        database,
      ])
    ).toEqual({ apply: true, database });
    for (const args of [
      ['--milestone', '2', '--apply'],
      ['--milestone', '2', '--reset'],
      ['--milestone', '2', '--reset', '--apply'],
      [
        '--milestone',
        '2',
        '--reset',
        '--apply',
        '--dry-run',
        '--database',
        database,
      ],
      ['--milestone', '3'],
    ])
      expect(() => parseAccountFacilityArgs(args)).toThrow();
  });
  it('creates exactly the approved accounts, profiles and facility assignments', () => {
    expect(fixtures.users).toHaveLength(37);
    expect(fixtures.profiles).toHaveLength(37);
    expect(fixtures.facilities).toHaveLength(5);
    expect(
      fixtures.users.filter((user) => user.role === 'facility_staff')
    ).toHaveLength(25);
    expect(
      fixtures.users.find((user) => user.email === 'nv5q5@example.com')?.name
    ).toBe('Nhân viên 5 Quận 5');
  });
  it('resets old business data while preserving indexes and validating the new module', async () => {
    await client.db(database).collection('seedmilestones').drop();
    const snapshot = await captureDatabase(client, database);
    expect(
      await applyAccountFacility(client, snapshot, fixtures, 'test-backup')
    ).toMatchObject({ alreadyApplied: false });
    expect(await verifyAccountFacility(client.db(database))).toMatchObject({
      users: 37,
      profiles: 37,
      facilities: 5,
    });
    expect(
      await client.db(database).collection('contracts').countDocuments()
    ).toBe(0);
    expect(
      (
        await client.db(database).collection('users').listIndexes().toArray()
      ).some((index) => index.unique)
    ).toBe(true);
    expect(
      await client.db(database).collection('auditlogs').countDocuments()
    ).toBeGreaterThanOrEqual(80);
    await ensureAccountFacilityIndexes(client.db(database));
    const uniqueIndexes = await client
      .db(database)
      .collection('facilities')
      .listIndexes()
      .toArray();
    expect(uniqueIndexes.find((index) => index.name === 'code_1')?.unique).toBe(
      true
    );
    const facility = await client
      .db(database)
      .collection('facilities')
      .findOne({ code: 'Q1' });
    await expect(
      client
        .db(database)
        .collection('facilities')
        .insertOne({ ...facility, _id: new mongoose.Types.ObjectId() })
    ).rejects.toThrow();
    await client
      .db(database)
      .collection('facilities')
      .insertOne({
        ...facility,
        _id: new mongoose.Types.ObjectId(),
        deleted: true,
      });
  });
  it('rolls back deletions if a seeded account violates a unique index', async () => {
    const snapshot = await captureDatabase(client, database);
    const invalid = {
      ...fixtures,
      users: fixtures.users.map((user) => ({ ...user })),
    };
    invalid.users[1].email = invalid.users[0].email;
    await expect(
      applyAccountFacility(client, snapshot, invalid, 'test-backup')
    ).rejects.toThrow();
    expect(
      await client
        .db(database)
        .collection('users')
        .findOne({ email: 'old@example.com' })
    ).toBeTruthy();
    expect(
      await client.db(database).collection('contracts').countDocuments()
    ).toBe(1);
    expect(
      await client.db(database).collection('seedmilestones').countDocuments()
    ).toBe(0);
  });
  it('refuses a stale backup without deleting anything', async () => {
    const snapshot = await captureDatabase(client, database);
    await client
      .db(database)
      .collection('contracts')
      .insertOne({ changed: true });
    await expect(
      applyAccountFacility(client, snapshot, fixtures, 'test-backup')
    ).rejects.toThrow(/changed/i);
    expect(await client.db(database).collection('users').countDocuments()).toBe(
      1
    );
    expect(
      await client.db(database).collection('contracts').countDocuments()
    ).toBe(2);
  });
  it('reruns preserve later data and resume only pending cleanup', async () => {
    const snapshot = await captureDatabase(client, database);
    await applyAccountFacility(client, snapshot, fixtures, 'test-backup');
    await client.db(database).collection('contracts').insertOne({ keep: true });
    expect(
      await applyAccountFacility(client, snapshot, fixtures, 'test-backup')
    ).toMatchObject({ alreadyApplied: true, cleanupRequired: true });
    await completeAccountFacility(client, database, {
      queuesCleared: 5,
      authKeysDeleted: 0,
    });
    expect(
      await applyAccountFacility(client, snapshot, fixtures, 'test-backup')
    ).toMatchObject({ alreadyApplied: true, cleanupRequired: false });
    expect(
      await client.db(database).collection('contracts').countDocuments()
    ).toBe(1);
  });
  it('clears only removed-user sessions, including orphan refresh records', async () => {
    const strings = new Map([
      [
        'rt:old',
        JSON.stringify({ userId: 'old-user', familyId: 'old-family' }),
      ],
      [
        'rt:orphan',
        JSON.stringify({ userId: 'old-user', familyId: 'orphan-family' }),
      ],
      [
        'rt:keep',
        JSON.stringify({ userId: 'other-user', familyId: 'keep-family' }),
      ],
      ['unrelated-cache', 'keep'],
    ]);
    const sets = new Map<string, string[]>([
      ['user_families:old-user', ['old-family']],
      ['family:old-family', ['old']],
      ['family:orphan-family', ['orphan']],
      ['family:keep-family', ['keep']],
    ]);
    const store = {
      async smembers(key: string) {
        return sets.get(key) ?? [];
      },
      async get(key: string) {
        return strings.get(key) ?? null;
      },
      async scan(): Promise<[string, string[]]> {
        return [
          '0',
          [...strings.keys()].filter((key) => key.startsWith('rt:')),
        ];
      },
      async del(...keys: string[]) {
        let removed = 0;
        for (const key of keys) {
          if (strings.delete(key)) removed++;
          if (sets.delete(key)) removed++;
        }
        return removed;
      },
    };
    expect(await clearOldSessions(store, ['old-user'])).toBe(5);
    expect(strings.has('rt:old')).toBe(false);
    expect(strings.has('rt:orphan')).toBe(false);
    expect(strings.has('rt:keep')).toBe(true);
    expect(sets.has('family:keep-family')).toBe(true);
    expect(strings.get('unrelated-cache')).toBe('keep');
  });
  it('discovers orphan owners when MongoDB was already dropped, retaining valid users', async () => {
    const oldId = '111111111111111111111111';
    const validId = '222222222222222222222222';
    const store = {
      async smembers() {
        return [];
      },
      async get(key: string) {
        return JSON.stringify({
          userId: key === 'rt:old' ? oldId : validId,
          familyId: 'demo-family',
        });
      },
      async scan(
        _cursor: string,
        _match: 'MATCH',
        pattern: string
      ): Promise<[string, string[]]> {
        return [
          '0',
          pattern === 'rt:*'
            ? ['rt:old', 'rt:valid']
            : [`user_families:${oldId}`, `user_families:${validId}`],
        ];
      },
      async del() {
        return 0;
      },
    };
    expect(await findStaleSessionOwners(store, [validId])).toEqual([oldId]);
  });
});
