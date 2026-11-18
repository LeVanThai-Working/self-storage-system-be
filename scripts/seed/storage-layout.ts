import crypto from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { StorageUnit } from '../../src/modules/storageUnit/storageUnit.model.ts';
import { StorageRack } from '../../src/modules/storageRack/storageRack.model.ts';
import { RackTier } from '../../src/modules/storageRack/rackTier.model.ts';
import { StorageUnitStatusEnum } from '../../src/common/enums/storageUnit.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
  RackZoneEnum,
} from '../../src/common/enums/storageRack.enum.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../../src/common/enums/unitType.enum.ts';
import { FacilityStatusEnum } from '../../src/common/enums/facility.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../../src/common/enums/facilityUnitTypeOffering.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../src/common/enums/auditLog.enum.ts';
import { audit } from './account-facility.ts';
import { readCatalogCheckpoint } from './catalog.ts';
import {
  captureDatabase,
  readEncryptedBackup,
  restoreAndVerifyBackup,
  writeEncryptedBackup,
} from './backup.ts';

type Document = mongoose.mongo.Document;
type MongoClient = InstanceType<typeof mongoose.mongo.MongoClient>;
const CHECKPOINT_ID = 'module-seed-v1:4';
type Checkpoint = {
  _id: string;
  status: 'seeded' | 'complete';
  backupStem: string;
  createdAt: Date;
  completedAt?: Date;
};
const GROUPS = [
  ['storageunits', StorageUnit, AuditResourceEnum.STORAGE_UNIT],
  ['storageracks', StorageRack, AuditResourceEnum.STORAGE_RACK],
  ['racktiers', RackTier, AuditResourceEnum.RACK_TIER],
] as const;
type CollectionName = (typeof GROUPS)[number][0];
export type StorageLayoutFixture = Record<CollectionName, Document[]>;
const COUNTS = { storageunits: 95, storageracks: 50, racktiers: 200 } as const;
const ROOM_TYPES = [
  {
    category: UnitTypeCategoryEnum.LOCKER,
    prefix: 'TU',
    label: 'Tủ lưu trữ cá nhân',
    zone: 'Khu tủ lưu trữ',
  },
  {
    category: UnitTypeCategoryEnum.SMALL,
    prefix: 'NHO',
    label: 'Phòng kho nhỏ',
    zone: 'Khu phòng kho nhỏ',
  },
  {
    category: UnitTypeCategoryEnum.LARGE,
    prefix: 'LON',
    label: 'Phòng kho lớn',
    zone: 'Khu phòng kho lớn',
  },
] as const;

function oid(key: string) {
  return new mongoose.Types.ObjectId(
    crypto
      .createHash('sha256')
      .update(`module-seed-v1:${key}`)
      .digest('hex')
      .slice(0, 24)
  );
}

export function parseStorageLayoutArgs(
  args: string[]
): { apply: false } | { apply: true; database: string } {
  const flags = new Set<string>();
  let database: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flags.has(flag)) throw new Error('DUPLICATE_LAYOUT_ARGUMENT');
    flags.add(flag);
    if (flag === '--milestone') {
      if (args[++i] !== '4') throw new Error('MILESTONE_4_REQUIRED');
    } else if (flag === '--database') {
      database = args[++i];
      if (!database || database.startsWith('--'))
        throw new Error('DATABASE_NAME_REQUIRED');
    } else if (!['--apply', '--dry-run'].includes(flag))
      throw new Error('INVALID_LAYOUT_ARGUMENT');
  }
  if (!flags.has('--milestone')) throw new Error('MILESTONE_4_REQUIRED');
  if (flags.has('--apply')) {
    if (!database || flags.has('--dry-run'))
      throw new Error('APPLY_REQUIRES_DATABASE');
    return { apply: true, database };
  }
  return { apply: false };
}

export async function buildStorageLayout(
  facilities: Document[],
  types: Document[]
): Promise<StorageLayoutFixture> {
  if (facilities.length !== 5 || types.length !== 4)
    throw new Error('LAYOUT_FOUNDATION_INVALID');
  const byCategory = new Map<string, Document>();
  for (const category of Object.values(UnitTypeCategoryEnum)) {
    const matching = types.filter(
      (row) =>
        row.category === category &&
        !row.deleted &&
        row.status === UnitTypeStatusEnum.ACTIVE
    );
    if (matching.length !== 1) throw new Error('LAYOUT_UNIT_TYPES_INVALID');
    byCategory.set(category, matching[0]);
  }
  const warehouseType = byCategory.get(UnitTypeCategoryEnum.WAREHOUSE_RACK)!;
  const config = warehouseType.defaultRackConfig;
  if (
    !config ||
    config.rackCount !== 10 ||
    config.tiersPerRack !== 4 ||
    config.tierDimensions?.length !== 2.5 ||
    config.tierDimensions?.width !== 1.2 ||
    config.tierDimensions?.height !== 0.9 ||
    config.tierMaxWeightKg !== 800
  )
    throw new Error('LAYOUT_RACK_CONFIG_CHANGED');
  const result: StorageLayoutFixture = {
    storageunits: [],
    storageracks: [],
    racktiers: [],
  };
  const now = new Date();
  for (let district = 1; district <= 5; district++) {
    const matching = facilities.filter(
      (row) =>
        row.code === `Q${district}` &&
        !row.deleted &&
        row.status === FacilityStatusEnum.ACTIVE
    );
    if (matching.length !== 1) throw new Error('LAYOUT_FACILITIES_INVALID');
    const facility = matching[0];
    for (const room of ROOM_TYPES) {
      for (const floor of [1, 2])
        for (let sequence = 1; sequence <= 3; sequence++) {
          const unitNumber = `${facility.code}-${room.prefix}-${floor}${String(sequence).padStart(2, '0')}`;
          const row = new StorageUnit({
            _id: oid(`storage-unit:${unitNumber}`),
            facilityId: facility._id,
            unitTypeId: byCategory.get(room.category)!._id,
            unitNumber,
            floor,
            zone: room.zone,
            status: StorageUnitStatusEnum.AVAILABLE,
            notes: `${room.label} số ${String(sequence).padStart(2, '0')}, tầng ${floor}, Quận ${district}`,
            createdAt: now,
            updatedAt: now,
          });
          await row.validate();
          result.storageunits.push(row.toObject());
        }
    }
    const warehouseNumber = `${facility.code}-KHO-01`;
    const warehouse = new StorageUnit({
      _id: oid(`storage-unit:${warehouseNumber}`),
      facilityId: facility._id,
      unitTypeId: warehouseType._id,
      unitNumber: warehouseNumber,
      floor: 1,
      zone: 'Khu kho kệ',
      status: StorageUnitStatusEnum.AVAILABLE,
      notes: `Kho kệ hàng Quận ${district}`,
      createdAt: now,
      updatedAt: now,
    });
    await warehouse.validate();
    result.storageunits.push(warehouse.toObject());
    for (let index = 1; index <= 10; index++) {
      const rackCode = `${facility.code}-R${String(index).padStart(2, '0')}`;
      const zone =
        index <= 4
          ? RackZoneEnum.ECONOMY
          : index <= 8
            ? RackZoneEnum.STANDARD
            : RackZoneEnum.PRIME;
      const aisle = index <= 4 ? 'A' : index <= 8 ? 'B' : 'C';
      const bay = index <= 4 ? index : index <= 8 ? index - 4 : index - 8;
      const name = `Kệ ${String(index).padStart(2, '0')} Quận ${district}`;
      const rack = new StorageRack({
        _id: oid(`storage-rack:${rackCode}`),
        facilityId: facility._id,
        storageUnitId: warehouse._id,
        rackCode,
        name,
        zone,
        aisle,
        bay,
        tierCount: 4,
        customPrice: null,
        currentContractId: null,
        currentCustomerId: null,
        status: RackStatusEnum.AVAILABLE,
        createdAt: now,
        updatedAt: now,
      });
      await rack.validate();
      result.storageracks.push(rack.toObject());
      for (let tierNumber = 1; tierNumber <= 4; tierNumber++) {
        const tierCode = `${rackCode}-T${String(tierNumber).padStart(2, '0')}`;
        const tier = new RackTier({
          _id: oid(`rack-tier:${tierCode}`),
          facilityId: facility._id,
          storageUnitId: warehouse._id,
          storageRackId: rack._id,
          tierNumber,
          tierCode,
          maxWeightKg: 800,
          dimensions: config.tierDimensions,
          volume: 2.7,
          status: RackTierStatusEnum.AVAILABLE,
          notes: `Tầng ${tierNumber} của ${name.toLowerCase()}`,
          createdAt: now,
          updatedAt: now,
        });
        await tier.validate();
        result.racktiers.push(tier.toObject());
      }
    }
  }
  return result;
}

export async function ensureStorageLayoutIndexes(db: mongoose.mongo.Db) {
  for (const [, model] of GROUPS)
    for (const [key, options] of model.schema.indexes()) {
      await db.command({
        createIndexes: model.collection.name,
        indexes: [
          {
            key,
            ...options,
            name:
              options.name ??
              Object.entries(key)
                .map(([field, direction]) => `${field}_${direction}`)
                .join('_'),
          },
        ],
      });
    }
}

function readCheckpoint(db: mongoose.mongo.Db) {
  return db
    .collection<Checkpoint>('seedmilestones')
    .findOne({ _id: CHECKPOINT_ID });
}

export async function applyStorageLayout(
  client: MongoClient,
  database: string,
  fixture: StorageLayoutFixture,
  backupStem: string
) {
  const db = client.db(database);
  const session = client.startSession();
  try {
    const result = await session.withTransaction(
      async () => {
        const previous = await db
          .collection<Checkpoint>('seedmilestones')
          .findOne({ _id: CHECKPOINT_ID }, { session });
        if (previous)
          return { alreadyApplied: true, backupStem: previous.backupStem };
        const prerequisite = await db
          .collection<{ _id: string; status: string }>('seedmilestones')
          .findOne(
            { _id: 'module-seed-v1:3', status: 'complete' },
            { session }
          );
        if (!prerequisite) throw new Error('MILESTONE_3_REQUIRED');
        const facilities = await db
          .collection('facilities')
          .find({}, { session })
          .toArray();
        const types = await db
          .collection('unittypes')
          .find({}, { session })
          .toArray();
        await buildStorageLayout(facilities, types);
        const offers = await db
          .collection('facilityunittypeofferings')
          .find(
            {
              status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
              deleted: { $ne: true },
            },
            { session }
          )
          .toArray();
        for (const facility of facilities)
          for (const type of types) {
            if (
              !offers.some(
                (offer) =>
                  String(offer.facilityId) === String(facility._id) &&
                  String(offer.unitTypeId) === String(type._id)
              )
            )
              throw new Error('LAYOUT_OFFERING_MISSING');
          }
        for (const [name] of GROUPS)
          if (await db.collection(name).countDocuments({}, { session }))
            throw new Error('LAYOUT_NOT_EMPTY');
        const logs = [];
        for (const [name, , resource] of GROUPS) {
          await db.collection(name).insertMany(fixture[name], { session });
          for (const row of fixture[name])
            logs.push(
              await audit(
                AuditActionEnum.CREATE,
                resource,
                String(row._id),
                { operation: 'seed-storage-layout', collection: name },
                4
              )
            );
        }
        await db.collection('auditlogs').insertMany(logs, { session });
        await db.collection<Checkpoint>('seedmilestones').insertOne(
          {
            _id: CHECKPOINT_ID,
            status: 'seeded',
            backupStem,
            createdAt: new Date(),
          },
          { session }
        );
        return { alreadyApplied: false, backupStem };
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }
    );
    if (!result) throw new Error('LAYOUT_TRANSACTION_INCOMPLETE');
    return result;
  } finally {
    await session.endSession();
  }
}

export async function verifyStorageLayout(
  db: mongoose.mongo.Db,
  initial = false
) {
  const facilities = await db.collection('facilities').find({}).toArray();
  const expected = await buildStorageLayout(
    facilities,
    await db.collection('unittypes').find({}).toArray()
  );
  const counts: Partial<Record<CollectionName, number>> = {};
  const rows: StorageLayoutFixture = {
    storageunits: [],
    storageracks: [],
    racktiers: [],
  };
  for (const [name] of GROUPS) {
    rows[name] = await db.collection(name).find({}).toArray();
    if (rows[name].length !== COUNTS[name])
      throw new Error('LAYOUT_COUNT_MISMATCH');
    for (const planned of expected[name]) {
      const row = rows[name].find(
        (item) => String(item._id) === String(planned._id)
      );
      if (!row || row.deleted) throw new Error('LAYOUT_RECORD_MISSING');
      for (const field of [
        'unitNumber',
        'floor',
        'zone',
        'rackCode',
        'name',
        'aisle',
        'bay',
        'tierCount',
        'tierNumber',
        'tierCode',
        'maxWeightKg',
        'volume',
      ]) {
        if (planned[field] !== undefined && row[field] !== planned[field])
          throw new Error('LAYOUT_FIELD_MISMATCH');
      }
      for (const field of [
        'facilityId',
        'unitTypeId',
        'storageUnitId',
        'storageRackId',
      ])
        if (planned[field] && String(row[field]) !== String(planned[field]))
          throw new Error('LAYOUT_REFERENCE_MISMATCH');
      if (
        planned.dimensions &&
        JSON.stringify(row.dimensions) !== JSON.stringify(planned.dimensions)
      )
        throw new Error('LAYOUT_DIMENSIONS_MISMATCH');
      if (
        initial &&
        (row.status !== planned.status ||
          ['currentContractId', 'currentCustomerId', 'customPrice'].some(
            (field) => planned[field] === null && row[field] !== null
          ))
      )
        throw new Error('LAYOUT_INITIAL_STATE_MISMATCH');
    }
    counts[name] = rows[name].length;
  }
  return {
    ...counts,
    warehouseFloorOne: rows.storageunits.filter(
      (row) => String(row.unitNumber).endsWith('-KHO-01') && row.floor === 1
    ).length,
    perFacility: facilities
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((facility) => ({
        code: facility.code,
        units: rows.storageunits.filter(
          (row) => String(row.facilityId) === String(facility._id)
        ).length,
        racks: rows.storageracks.filter(
          (row) => String(row.facilityId) === String(facility._id)
        ).length,
        tiers: rows.racktiers.filter(
          (row) => String(row.facilityId) === String(facility._id)
        ).length,
        zones: Object.fromEntries(
          Object.values(RackZoneEnum).map((zone) => [
            zone,
            rows.storageracks.filter(
              (row) =>
                String(row.facilityId) === String(facility._id) &&
                row.zone === zone
            ).length,
          ])
        ),
      })),
  };
}

export async function completeStorageLayout(
  client: MongoClient,
  database: string
) {
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const db = client.db(database);
      const updated = await db
        .collection<Checkpoint>('seedmilestones')
        .updateOne(
          { _id: CHECKPOINT_ID, status: 'seeded' },
          { $set: { status: 'complete', completedAt: new Date() } },
          { session }
        );
      if (updated.modifiedCount)
        await db
          .collection('auditlogs')
          .insertOne(
            await audit(
              AuditActionEnum.UPDATE,
              AuditResourceEnum.STORAGE_UNIT,
              CHECKPOINT_ID,
              { operation: 'storage-layout-complete', counts: COUNTS },
              4
            ),
            { session }
          );
    });
  } finally {
    await session.endSession();
  }
}

export async function runStorageLayout(args: string[]) {
  const options = parseStorageLayoutArgs(args);
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_REQUIRED');
  const client = new mongoose.mongo.MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  try {
    await client.connect();
    const db = client.db();
    if (options.apply && db.databaseName !== options.database)
      throw new Error('DATABASE_NAME_MISMATCH');
    const marker = await readCheckpoint(db);
    if (!options.apply) {
      console.log(
        JSON.stringify(
          {
            milestone: 4,
            dryRun: true,
            database: db.databaseName,
            checkpointStatus: marker?.status ?? 'not-started',
            expected: COUNTS,
            warehouseFloor: 1,
            resetPerformed: false,
          },
          null,
          2
        )
      );
      return;
    }
    if ((await readCatalogCheckpoint(db))?.status !== 'complete')
      throw new Error('MILESTONE_3_REQUIRED');
    let result;
    if (marker)
      result = { alreadyApplied: true, backupStem: marker.backupStem };
    else {
      for (const [name] of GROUPS)
        if (await db.collection(name).countDocuments())
          throw new Error('LAYOUT_NOT_EMPTY');
      const fixture = await buildStorageLayout(
        await db.collection('facilities').find({}).toArray(),
        await db.collection('unittypes').find({}).toArray()
      );
      console.log(
        'Milestone 4: capturing and verifying backup; no database reset...'
      );
      const files = await writeEncryptedBackup(
        await captureDatabase(client, db.databaseName),
        path.resolve('.agents/memory/backups')
      );
      const verified = await restoreAndVerifyBackup(
        await readEncryptedBackup(files.stem)
      );
      await writeFile(
        `${files.stem}.verified.json`,
        JSON.stringify({ ...verified, purpose: 'before-milestone-4' }, null, 2),
        { flag: 'wx', mode: 0o600 }
      );
      console.log(
        JSON.stringify({ backupStem: files.stem, restoreVerified: true })
      );
      await ensureStorageLayoutIndexes(db);
      console.log(
        'Milestone 4: adding storage units, racks and tiers atomically...'
      );
      result = await applyStorageLayout(
        client,
        db.databaseName,
        fixture,
        files.stem
      );
    }
    await ensureStorageLayoutIndexes(db);
    const counts = await verifyStorageLayout(
      db,
      !marker || marker.status !== 'complete'
    );
    await completeStorageLayout(client, db.databaseName);
    const completed = await readCheckpoint(db);
    const report = {
      milestone: 4,
      database: db.databaseName,
      completedAt: completed?.completedAt,
      verifiedAt: new Date().toISOString(),
      resetPerformed: false,
      ...result,
      counts,
      next: 'STOP: review milestone 4; approve milestone 5 data plan before implementation',
    };
    await writeFile(
      `${result.backupStem}.milestone-4.json`,
      JSON.stringify(report, null, 2),
      { mode: 0o600 }
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}
