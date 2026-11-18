import crypto from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { z } from 'zod';

const collectionBackupSchema = z.object({
  name: z.string().min(1),
  optionsEjson: z.string(),
  indexesEjson: z.string(),
  documents: z.array(z.string()),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const databaseBackupSchema = z.object({
  formatVersion: z.literal(1),
  database: z.string().min(1),
  capturedAt: z.string().datetime(),
  collections: z.array(collectionBackupSchema),
});
export type DatabaseBackup = z.infer<typeof databaseBackupSchema>;
type MongoClient = InstanceType<typeof mongoose.mongo.MongoClient>;
const { BSON } = mongoose.mongo;
const MAGIC = Buffer.from('SSM-BACKUP-1\n');
const SUPPORTED_OPTIONS = new Set([
  'validator',
  'validationLevel',
  'validationAction',
  'collation',
]);

function digest(documents: string[]): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(documents))
    .digest('hex');
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonical(item)])
    );
  }
  return value;
}

function normalizeMetadata(optionsEjson: string, indexesEjson: string): string {
  const options: unknown = BSON.EJSON.parse(optionsEjson);
  const indexes = z
    .array(z.record(z.string(), z.unknown()))
    .parse(BSON.EJSON.parse(indexesEjson));
  // Index key order is significant. Preserve it as ordered pairs, not sorted keys.
  const normalizedIndexes = indexes
    .sort((left, right) => String(left.name).localeCompare(String(right.name)))
    .map((index) => {
      const definition = { ...index };
      delete definition.ns;
      return {
        ...definition,
        key: Object.entries(z.record(z.string(), z.unknown()).parse(index.key)),
      };
    });
  return JSON.stringify(canonical({ options, indexes: normalizedIndexes }));
}

async function inspectMetadata(db: mongoose.mongo.Db) {
  const collections = await db
    .listCollections({}, { nameOnly: false })
    .toArray();
  const result = [];
  for (const collection of collections.sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    const options = collection.options ?? {};
    if (
      collection.type !== 'collection' ||
      collection.name.startsWith('system.') ||
      Object.keys(options).some((key) => !SUPPORTED_OPTIONS.has(key))
    ) {
      throw new Error(`Unsupported collection metadata: ${collection.name}`);
    }
    result.push({
      name: collection.name,
      optionsEjson: BSON.EJSON.stringify(options),
      indexesEjson: BSON.EJSON.stringify(
        await db.collection(collection.name).listIndexes().toArray()
      ),
    });
  }
  return result;
}

function metadataFingerprint(
  collections: Pick<
    DatabaseBackup['collections'][number],
    'name' | 'optionsEjson' | 'indexesEjson'
  >[]
): string {
  return JSON.stringify(
    collections.map((item) => [
      item.name,
      normalizeMetadata(item.optionsEjson, item.indexesEjson),
    ])
  );
}

export async function captureDatabase(
  client: MongoClient,
  database: string
): Promise<DatabaseBackup> {
  const db = client.db(database);
  const hello = await db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') {
    throw new Error(
      'A replica set is required for a consistent snapshot backup'
    );
  }
  const metadata = await inspectMetadata(db);
  const session = client.startSession();
  try {
    const snapshot = await session.withTransaction(
      async (): Promise<DatabaseBackup> => {
        const collections: DatabaseBackup['collections'] = [];
        for (const collection of metadata) {
          const documents: string[] = [];
          // Raw BSON avoids losing int64 precision, numeric types or binary subtypes.
          const cursor = db.collection(collection.name).find(
            {},
            {
              session,
              raw: true,
              sort: { _id: 1 },
              batchSize: 100,
            }
          );
          for await (const document of cursor) {
            if (!Buffer.isBuffer(document))
              throw new Error('Expected raw BSON');
            documents.push(document.toString('base64'));
          }
          collections.push({
            ...collection,
            documents,
            sha256: digest(documents),
          });
        }
        return {
          formatVersion: 1,
          database,
          capturedAt: new Date().toISOString(),
          collections,
        };
      },
      { readConcern: { level: 'snapshot' }, readPreference: 'primary' }
    );
    if (!snapshot) throw new Error('Snapshot was not captured');
    if (
      metadataFingerprint(metadata) !==
      metadataFingerprint(await inspectMetadata(db))
    ) {
      throw new Error(
        'Collection metadata changed during backup; retry preparation'
      );
    }
    return snapshot;
  } finally {
    await session.endSession();
  }
}

export function summarizeBackup(snapshot: DatabaseBackup) {
  return {
    database: snapshot.database,
    capturedAt: snapshot.capturedAt,
    totalCollections: snapshot.collections.length,
    totalDocuments: snapshot.collections.reduce(
      (sum, item) => sum + item.documents.length,
      0
    ),
    collections: snapshot.collections.map((item) => ({
      name: item.name,
      documents: item.documents.length,
      sha256: item.sha256,
    })),
  };
}

function validateBackup(value: unknown): DatabaseBackup {
  const snapshot = databaseBackupSchema.parse(value);
  if (
    new Set(snapshot.collections.map((item) => item.name)).size !==
    snapshot.collections.length
  ) {
    throw new Error('Duplicate collection names in backup');
  }
  for (const collection of snapshot.collections) {
    if (collection.sha256 !== digest(collection.documents)) {
      throw new Error(`Backup checksum mismatch: ${collection.name}`);
    }
  }
  return snapshot;
}

export async function writeEncryptedBackup(
  snapshot: DatabaseBackup,
  directory: string
) {
  validateBackup(snapshot);
  await mkdir(directory, { recursive: true });
  const stem = path.join(
    directory,
    `seed-m1-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`
  );
  const keyPath = `${stem}.key`;
  const backupPath = `${stem}.bson.enc`;
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(MAGIC);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(snapshot), 'utf8'),
    cipher.final(),
  ]);
  await writeFile(keyPath, key, { flag: 'wx', mode: 0o600 });
  await writeFile(
    backupPath,
    Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]),
    {
      flag: 'wx',
      mode: 0o600,
    }
  );
  if (
    JSON.stringify(await readEncryptedBackup(stem)) !== JSON.stringify(snapshot)
  ) {
    throw new Error('Encrypted backup read-back mismatch');
  }
  return { stem, backupPath, keyPath };
}

export async function readEncryptedBackup(
  stem: string
): Promise<DatabaseBackup> {
  const encrypted = await readFile(`${stem}.bson.enc`);
  if (
    !encrypted.subarray(0, MAGIC.length).equals(MAGIC) ||
    encrypted.length < MAGIC.length + 28
  ) {
    throw new Error('Invalid encrypted backup format');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    await readFile(`${stem}.key`),
    encrypted.subarray(MAGIC.length, MAGIC.length + 12)
  );
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(encrypted.subarray(MAGIC.length + 12, MAGIC.length + 28));
  const plaintext = Buffer.concat([
    decipher.update(encrypted.subarray(MAGIC.length + 28)),
    decipher.final(),
  ]);
  return validateBackup(JSON.parse(plaintext.toString('utf8')));
}

/** No target URI is accepted: verification writes only to a new local replica set. */
export async function restoreAndVerifyBackup(input: DatabaseBackup) {
  const snapshot = validateBackup(input);
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  const server = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ args: ['--setParameter', 'ttlMonitorEnabled=false'] }],
  });
  const client = new mongoose.mongo.MongoClient(server.getUri());
  try {
    await client.connect();
    const db = client.db(
      `seed_restore_${crypto.randomBytes(8).toString('hex')}`
    );
    for (const collection of snapshot.collections) {
      const options = BSON.EJSON.parse(collection.optionsEjson);
      await db.createCollection(collection.name, options);
      for (
        let offset = 0;
        offset < collection.documents.length;
        offset += 100
      ) {
        const documents = collection.documents
          .slice(offset, offset + 100)
          .map((encoded) =>
            BSON.deserialize(Buffer.from(encoded, 'base64'), {
              promoteValues: false,
              promoteLongs: false,
              bsonRegExp: true,
            })
          );
        await db
          .collection(collection.name)
          .insertMany(documents, { bypassDocumentValidation: true });
      }
      const indexes = z
        .array(z.record(z.string(), z.unknown()))
        .parse(BSON.EJSON.parse(collection.indexesEjson));
      for (const index of indexes) {
        if (index.name === '_id_') continue;
        // listIndexes includes server fields that createIndexes does not accept.
        const definition = { ...index };
        delete definition.ns;
        await db.command({
          createIndexes: collection.name,
          indexes: [definition],
        });
      }
    }
    const restored = await captureDatabase(client, db.databaseName);
    if (
      metadataFingerprint(snapshot.collections) !==
      metadataFingerprint(restored.collections)
    ) {
      throw new Error(
        'Restored collection options or indexes differ from backup'
      );
    }
    for (let i = 0; i < snapshot.collections.length; i++) {
      if (snapshot.collections[i].sha256 !== restored.collections[i].sha256) {
        throw new Error(
          `Restored BSON checksum mismatch: ${snapshot.collections[i].name}`
        );
      }
    }
    return {
      verified: true as const,
      verifiedAt: new Date().toISOString(),
      ...summarizeBackup(snapshot),
    };
  } finally {
    await client.close();
    await server.stop();
  }
}
