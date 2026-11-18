import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  captureDatabase,
  readEncryptedBackup,
  restoreAndVerifyBackup,
  summarizeBackup,
  writeEncryptedBackup,
} from '../scripts/seed/backup.ts';
import { parsePreparationArgs } from '../scripts/seed-milestones.ts';
import { SEED_MILESTONES } from '../scripts/seed/manifest.ts';

describe('milestone 1: read-only preparation and recoverable backup', () => {
  let server: MongoMemoryReplSet;
  let client: InstanceType<typeof mongoose.mongo.MongoClient>;
  let directory: string;

  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'seed-backup-test-'));
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    client = await new mongoose.mongo.MongoClient(server.getUri()).connect();
    const db = client.db('source_seed_test');
    await db.createCollection('empty');
    await db.createCollection('users', {
      validator: { email: { $type: 'string' } },
      validationLevel: 'strict',
    });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').insertOne({
      _id: new mongoose.Types.ObjectId(),
      email: 'private@example.com',
      createdAt: new Date('2026-04-01T00:00:00+07:00'),
      exactLong: mongoose.mongo.BSON.Long.fromString('9007199254740993'),
      exactDouble: new mongoose.mongo.BSON.Double(1),
      amount: mongoose.mongo.BSON.Decimal128.fromString('123.45'),
      binary: new mongoose.mongo.BSON.Binary(Buffer.from([1, 2, 3]), 0),
    });
  });

  afterAll(async () => {
    await client?.close();
    await server?.stop();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it('defaults to inspect and rejects reset, apply and future milestones', () => {
    expect(parsePreparationArgs([])).toEqual({ mode: 'inspect' });
    expect(parsePreparationArgs(['--milestone', '1', '--dry-run'])).toEqual({
      mode: 'inspect',
    });
    for (const args of [
      ['--apply'],
      ['--reset'],
      ['--milestone', '2'],
      ['--backup', '--dry-run'],
      ['--verify-backup'],
      ['--unknown'],
    ]) {
      expect(() => parsePreparationArgs(args)).toThrow();
    }
  });

  it('retains the approved module checkpoints and ten racks per warehouse', () => {
    expect(SEED_MILESTONES.map((item) => item.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(SEED_MILESTONES[1].expected).toMatchObject({
      users: 37,
      profiles: 37,
      facilities: 5,
    });
    expect(SEED_MILESTONES[3].expected).toMatchObject({
      storageunits: 95,
      storageracks: 50,
      racktiers: 200,
    });
  });

  it('captures empty collections, metadata and documents without changing source', async () => {
    const snapshot = await captureDatabase(client, 'source_seed_test');
    expect(summarizeBackup(snapshot)).toMatchObject({
      database: 'source_seed_test',
      totalCollections: 2,
      totalDocuments: 1,
    });
    expect(
      snapshot.collections.find((item) => item.name === 'empty')?.documents
    ).toHaveLength(0);
    expect(
      await client.db('source_seed_test').collection('users').countDocuments()
    ).toBe(1);
    expect(
      await client.db('source_seed_test').listCollections().toArray()
    ).toHaveLength(2);
  });

  it('encrypts on disk, reads back identically and rejects corrupted ciphertext', async () => {
    const snapshot = await captureDatabase(client, 'source_seed_test');
    const files = await writeEncryptedBackup(snapshot, directory);
    expect(await readEncryptedBackup(files.stem)).toEqual(snapshot);
    const encrypted = await readFile(files.backupPath);
    expect(encrypted.toString('utf8')).not.toContain('private@example.com');
    const corrupted = Buffer.from(encrypted);
    corrupted[corrupted.length - 1] ^= 1;
    await writeFile(files.backupPath, corrupted);
    await expect(readEncryptedBackup(files.stem)).rejects.toThrow();
  });

  it('rejects a changed document checksum before restoring', async () => {
    const snapshot = await captureDatabase(client, 'source_seed_test');
    snapshot.collections[0].sha256 = '0'.repeat(64);
    await expect(restoreAndVerifyBackup(snapshot)).rejects.toThrow(/checksum/i);
  });

  it('restores into an isolated replica set and matches BSON, indexes and options', async () => {
    const snapshot = await captureDatabase(client, 'source_seed_test');
    expect(await restoreAndVerifyBackup(snapshot)).toMatchObject({
      verified: true,
      totalCollections: 2,
      totalDocuments: 1,
    });
    expect(
      await client.db('source_seed_test').collection('users').countDocuments()
    ).toBe(1);
  });

  it('fails explicitly for unsupported views instead of omitting their metadata', async () => {
    const db = client.db('unsupported_seed_test');
    await db.createCollection('users');
    await db.createCollection('user_view', { viewOn: 'users', pipeline: [] });
    await expect(captureDatabase(client, db.databaseName)).rejects.toThrow(
      /unsupported/i
    );
  });
});
