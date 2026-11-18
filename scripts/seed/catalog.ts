import crypto from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { UnitType } from '../../src/modules/unitType/unitType.model.ts';
import { Amenity } from '../../src/modules/amenity/amenity.model.ts';
import { FacilityUnitTypeOffering } from '../../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityAmenityOffering } from '../../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityTimeSlot } from '../../src/modules/facilityTimeSlot/facilityTimeSlot.model.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../../src/common/enums/unitType.enum.ts';
import {
  AmenityTypeEnum,
  AmenityStatusEnum,
} from '../../src/common/enums/amenity.enum.ts';
import { BillingUnitEnum } from '../../src/common/enums/billing.enum.ts';
import { FacilityStatusEnum } from '../../src/common/enums/facility.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../../src/common/enums/facilityUnitTypeOffering.enum.ts';
import { FacilityAmenityOfferingStatusEnum } from '../../src/common/enums/facilityAmenityOffering.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../src/common/enums/auditLog.enum.ts';
import {
  audit,
  expandSeedAccountNames,
  readAccountFacilityCheckpoint,
} from './account-facility.ts';
import {
  captureDatabase,
  readEncryptedBackup,
  restoreAndVerifyBackup,
  writeEncryptedBackup,
} from './backup.ts';

type Document = mongoose.mongo.Document;
type MongoClient = InstanceType<typeof mongoose.mongo.MongoClient>;
const CHECKPOINT_ID = 'module-seed-v1:3';
type Checkpoint = {
  _id: string;
  status: 'seeded' | 'complete';
  backupStem: string;
  namesUpdated: number;
  createdAt: Date;
  completedAt?: Date;
};
const MODEL_GROUPS = [
  ['unittypes', UnitType, AuditResourceEnum.UNIT_TYPE],
  ['amenities', Amenity, AuditResourceEnum.AMENITY],
  [
    'facilityunittypeofferings',
    FacilityUnitTypeOffering,
    AuditResourceEnum.FACILITY_UNIT_TYPE_OFFERING,
  ],
  [
    'facilityamenityofferings',
    FacilityAmenityOffering,
    AuditResourceEnum.FACILITY_AMENITY_OFFERING,
  ],
  ['facilitytimeslots', FacilityTimeSlot, AuditResourceEnum.FACILITY],
] as const;
type CollectionName = (typeof MODEL_GROUPS)[number][0];
export type CatalogFixture = Record<CollectionName, Document[]>;
export const CATALOG_COUNTS = {
  unittypes: 4,
  amenities: 5,
  facilityunittypeofferings: 20,
  facilityamenityofferings: 25,
  facilitytimeslots: 35,
} as const;
const UNIT_TYPES = [
  {
    category: UnitTypeCategoryEnum.LOCKER,
    name: 'Tủ lưu trữ cá nhân 1 m²',
    dimensions: { length: 1, width: 1, height: 1 },
    price: 5000,
  },
  {
    category: UnitTypeCategoryEnum.SMALL,
    name: 'Phòng kho nhỏ 5 m²',
    dimensions: { length: 2, width: 2.5, height: 2.7 },
    price: 8000,
  },
  {
    category: UnitTypeCategoryEnum.LARGE,
    name: 'Phòng kho lớn 10,05 m²',
    dimensions: { length: 3, width: 3.35, height: 3 },
    price: 10000,
  },
  {
    category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
    name: 'Kho kệ hàng 100 m²',
    dimensions: { length: 16, width: 6.25, height: 5.5 },
    price: 10000,
  },
] as const;
const AMENITIES = [
  {
    key: 'air-conditioner',
    name: 'Máy lạnh',
    type: AmenityTypeEnum.PHYSICAL,
    price: 8000,
    billing: BillingUnitEnum.MONTH,
    quantity: 20,
  },
  {
    key: 'camera',
    name: 'Camera giám sát',
    type: AmenityTypeEnum.PHYSICAL,
    price: 5000,
    billing: BillingUnitEnum.MONTH,
    quantity: 20,
  },
  {
    key: 'carton',
    name: 'Thùng carton',
    type: AmenityTypeEnum.PHYSICAL,
    price: 5000,
    billing: BillingUnitEnum.ONE_TIME,
    quantity: 200,
  },
  {
    key: 'lock',
    name: 'Ổ khóa',
    type: AmenityTypeEnum.PHYSICAL,
    price: 5000,
    billing: BillingUnitEnum.ONE_TIME,
    quantity: 100,
  },
  {
    key: 'porter',
    name: 'Dịch vụ bốc xếp',
    type: AmenityTypeEnum.SERVICE,
    price: 10000,
    billing: BillingUnitEnum.ONE_TIME,
    quantity: null,
  },
] as const;
const SLOT_CAPACITIES = [4, 4, 3, 4, 4, 3, 2] as const;
const ZONE_PRICES = { ECONOMY: 5000, STANDARD: 8000, PRIME: 10000 } as const;

function oid(key: string) {
  return new mongoose.Types.ObjectId(
    crypto
      .createHash('sha256')
      .update(`module-seed-v1:${key}`)
      .digest('hex')
      .slice(0, 24)
  );
}

export function parseCatalogArgs(
  args: string[]
): { apply: false } | { apply: true; database: string } {
  const flags = new Set<string>();
  let database: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flags.has(flag)) throw new Error('DUPLICATE_CATALOG_ARGUMENT');
    flags.add(flag);
    if (flag === '--milestone') {
      if (args[++i] !== '3') throw new Error('MILESTONE_3_REQUIRED');
    } else if (flag === '--database') {
      database = args[++i];
      if (!database || database.startsWith('--'))
        throw new Error('DATABASE_NAME_REQUIRED');
    } else if (!['--apply', '--dry-run'].includes(flag))
      throw new Error('INVALID_CATALOG_ARGUMENT');
  }
  if (!flags.has('--milestone')) throw new Error('MILESTONE_3_REQUIRED');
  if (flags.has('--apply')) {
    if (!database || flags.has('--dry-run'))
      throw new Error('APPLY_REQUIRES_DATABASE');
    return { apply: true, database };
  }
  return { apply: false };
}

function assertFacilities(facilities: Document[]) {
  if (facilities.length !== 5) throw new Error('FIVE_FACILITIES_REQUIRED');
  for (let district = 1; district <= 5; district++) {
    if (
      facilities.filter(
        (row) =>
          row.code === `Q${district}` &&
          !row.deleted &&
          row.status === FacilityStatusEnum.ACTIVE
      ).length !== 1
    )
      throw new Error('FACILITY_ASSIGNMENTS_INVALID');
  }
}

export async function buildCatalog(
  facilities: Document[]
): Promise<CatalogFixture> {
  assertFacilities(facilities);
  const now = new Date();
  const result: CatalogFixture = {
    unittypes: [],
    amenities: [],
    facilityunittypeofferings: [],
    facilityamenityofferings: [],
    facilitytimeslots: [],
  };
  for (const item of UNIT_TYPES) {
    const { length, width, height } = item.dimensions;
    const rack = item.category === UnitTypeCategoryEnum.WAREHOUSE_RACK;
    const row = new UnitType({
      _id: oid(`unit-type:${item.category}`),
      name: item.name,
      category: item.category,
      dimensions: item.dimensions,
      area: Math.round(length * width * 1e6) / 1e6,
      volume: Math.round(length * width * height * 1e6) / 1e6,
      description: rack
        ? 'Kho dùng chung cho thuê từng kệ, khách hàng tự quản lý hàng hóa.'
        : `Không gian lưu trữ thuộc loại ${item.name.toLowerCase()}.`,
      features: rack
        ? ['10 kệ, mỗi kệ 4 tầng', 'Khách hàng tự quản lý hàng hóa']
        : ['Không gian lưu trữ riêng', 'Có thể đăng ký tiện ích bổ sung'],
      status: UnitTypeStatusEnum.ACTIVE,
      defaultRackConfig: rack
        ? {
            rackCount: 10,
            tiersPerRack: 4,
            tierDimensions: { length: 2.5, width: 1.2, height: 0.9 },
            tierMaxWeightKg: 800,
          }
        : undefined,
      createdAt: now,
      updatedAt: now,
    });
    await row.validate();
    result.unittypes.push(row.toObject());
  }
  for (const item of AMENITIES) {
    const row = new Amenity({
      _id: oid(`amenity:${item.key}`),
      name: item.name,
      type: item.type,
      status: AmenityStatusEnum.ACTIVE,
      description: `${item.name} phục vụ khách hàng lưu trữ.`,
      createdAt: now,
      updatedAt: now,
    });
    await row.validate();
    result.amenities.push(row.toObject());
  }
  for (const facility of [...facilities].sort((a, b) =>
    a.code.localeCompare(b.code)
  )) {
    for (const item of UNIT_TYPES) {
      const row = new FacilityUnitTypeOffering({
        _id: oid(`unit-offering:${facility.code}:${item.category}`),
        facilityId: facility._id,
        unitTypeId: oid(`unit-type:${item.category}`),
        billingUnit: BillingUnitEnum.MONTH,
        pricePerUnit: item.price,
        depositMultiplier: 1,
        minRentalDays: 30,
        rackZonePricing:
          item.category === UnitTypeCategoryEnum.WAREHOUSE_RACK
            ? ZONE_PRICES
            : undefined,
        status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
        notes: 'Giá thử nghiệm theo kế hoạch seed đã duyệt.',
        createdAt: now,
        updatedAt: now,
      });
      await row.validate();
      result.facilityunittypeofferings.push(row.toObject());
    }
    for (const item of AMENITIES) {
      const row = new FacilityAmenityOffering({
        _id: oid(`amenity-offering:${facility.code}:${item.key}`),
        facilityId: facility._id,
        amenityId: oid(`amenity:${item.key}`),
        billingUnit: item.billing,
        pricePerUnit: item.price,
        totalQuantity: item.quantity,
        inUseQuantity: 0,
        status: FacilityAmenityOfferingStatusEnum.ACTIVE,
        createdAt: now,
        updatedAt: now,
      });
      await row.validate();
      result.facilityamenityofferings.push(row.toObject());
    }
    for (const [index, capacity] of SLOT_CAPACITIES.entries()) {
      const start = `${String(7 + index * 2).padStart(2, '0')}:00`;
      const end = `${String(9 + index * 2).padStart(2, '0')}:00`;
      const row = new FacilityTimeSlot({
        _id: oid(`timeslot:${facility.code}:${start}`),
        facilityId: facility._id,
        slotName: `${start} - ${end}`,
        startTime: start,
        endTime: end,
        maxCapacity: capacity,
        isActive: true,
        notes: 'Sức chứa tính theo số lịch hẹn, không theo số người.',
        createdAt: now,
        updatedAt: now,
      });
      await row.validate();
      result.facilitytimeslots.push(row.toObject());
    }
  }
  return result;
}

export async function ensureCatalogIndexes(db: mongoose.mongo.Db) {
  for (const [, model] of MODEL_GROUPS) {
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
}

export function readCatalogCheckpoint(db: mongoose.mongo.Db) {
  return db
    .collection<Checkpoint>('seedmilestones')
    .findOne({ _id: CHECKPOINT_ID });
}

export async function applyCatalog(
  client: MongoClient,
  database: string,
  fixtures: CatalogFixture,
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
          return {
            alreadyApplied: true,
            namesUpdated: previous.namesUpdated,
            backupStem: previous.backupStem,
          };
        const prerequisite = await db
          .collection<{ _id: string; status: string }>('seedmilestones')
          .findOne(
            { _id: 'module-seed-v1:2', status: 'complete' },
            { session }
          );
        if (!prerequisite) throw new Error('MILESTONE_2_REQUIRED');
        assertFacilities(
          await db.collection('facilities').find({}, { session }).toArray()
        );
        for (const [name] of MODEL_GROUPS)
          if (await db.collection(name).countDocuments({}, { session }))
            throw new Error('CATALOG_NOT_EMPTY');
        const namesUpdated = await expandSeedAccountNames(db, session);
        for (const [name, , resource] of MODEL_GROUPS) {
          await db.collection(name).insertMany(fixtures[name], { session });
          const logs = [];
          for (const row of fixtures[name])
            logs.push(
              await audit(
                AuditActionEnum.CREATE,
                resource,
                String(row._id),
                { operation: 'seed-catalog', collection: name },
                3
              )
            );
          await db.collection('auditlogs').insertMany(logs, { session });
        }
        await db.collection<Checkpoint>('seedmilestones').insertOne(
          {
            _id: CHECKPOINT_ID,
            status: 'seeded',
            namesUpdated,
            backupStem,
            createdAt: new Date(),
          },
          { session }
        );
        return { alreadyApplied: false, namesUpdated, backupStem };
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }
    );
    if (!result) throw new Error('CATALOG_TRANSACTION_INCOMPLETE');
    return result;
  } finally {
    await session.endSession();
  }
}

export async function verifyCatalog(db: mongoose.mongo.Db) {
  const facilities = await db.collection('facilities').find({}).toArray();
  const expected = await buildCatalog(facilities);
  const counts: Partial<Record<CollectionName, number>> = {};
  for (const [name] of MODEL_GROUPS) {
    const rows = await db.collection(name).find({}).toArray();
    if (rows.length !== CATALOG_COUNTS[name])
      throw new Error('CATALOG_COUNT_MISMATCH');
    for (const planned of expected[name]) {
      const row = rows.find((item) => String(item._id) === String(planned._id));
      if (!row || row.deleted) throw new Error('CATALOG_RECORD_MISSING');
      for (const field of [
        'name',
        'category',
        'type',
        'status',
        'billingUnit',
        'pricePerUnit',
        'depositMultiplier',
        'minRentalDays',
        'totalQuantity',
        'inUseQuantity',
        'slotName',
        'startTime',
        'endTime',
        'maxCapacity',
        'isActive',
        'area',
        'volume',
      ]) {
        if (planned[field] !== undefined && row[field] !== planned[field])
          throw new Error('CATALOG_FIELD_MISMATCH');
      }
      for (const field of ['facilityId', 'unitTypeId', 'amenityId'])
        if (planned[field] && String(row[field]) !== String(planned[field]))
          throw new Error('CATALOG_REFERENCE_MISMATCH');
      for (const field of [
        'rackZonePricing',
        'dimensions',
        'defaultRackConfig',
      ]) {
        if (
          planned[field] &&
          JSON.stringify(row[field]) !== JSON.stringify(planned[field])
        )
          throw new Error('CATALOG_CONFIGURATION_MISMATCH');
      }
    }
    counts[name] = rows.length;
  }
  return {
    ...counts,
    facilityCodes: facilities.map((row) => row.code).sort(),
    unitTypeNames: expected.unittypes.map((row) => row.name),
    amenityNames: expected.amenities.map((row) => row.name),
  };
}

export async function completeCatalog(client: MongoClient, database: string) {
  const db = client.db(database);
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
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
              AuditResourceEnum.UNIT_TYPE,
              CHECKPOINT_ID,
              { operation: 'catalog-seed-complete', counts: CATALOG_COUNTS },
              3
            ),
            { session }
          );
    });
  } finally {
    await session.endSession();
  }
}

export async function runCatalog(args: string[]) {
  const options = parseCatalogArgs(args);
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_REQUIRED');
  const client = new mongoose.mongo.MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  try {
    await client.connect();
    const db = client.db();
    if (options.apply && db.databaseName !== options.database)
      throw new Error('DATABASE_NAME_MISMATCH');
    const checkpoint = await readCatalogCheckpoint(db);
    if (!options.apply) {
      console.log(
        JSON.stringify(
          {
            milestone: 3,
            dryRun: true,
            database: db.databaseName,
            checkpointStatus: checkpoint?.status ?? 'not-started',
            expected: CATALOG_COUNTS,
            renameAccounts: 37,
            resetPerformed: false,
          },
          null,
          2
        )
      );
      return;
    }
    if ((await readAccountFacilityCheckpoint(db))?.status !== 'complete')
      throw new Error('MILESTONE_2_REQUIRED');
    let result;
    if (checkpoint)
      result = {
        alreadyApplied: true,
        namesUpdated: checkpoint.namesUpdated,
        backupStem: checkpoint.backupStem,
      };
    else {
      const fixtures = await buildCatalog(
        await db.collection('facilities').find({}).toArray()
      );
      for (const [name] of MODEL_GROUPS)
        if (await db.collection(name).countDocuments())
          throw new Error('CATALOG_NOT_EMPTY');
      console.log(
        'Milestone 3: capturing and verifying backup; no database reset...'
      );
      const snapshot = await captureDatabase(client, db.databaseName);
      const files = await writeEncryptedBackup(
        snapshot,
        path.resolve('.agents/memory/backups')
      );
      const verified = await restoreAndVerifyBackup(
        await readEncryptedBackup(files.stem)
      );
      await writeFile(
        `${files.stem}.verified.json`,
        JSON.stringify({ ...verified, purpose: 'before-milestone-3' }, null, 2),
        { flag: 'wx', mode: 0o600 }
      );
      console.log(
        JSON.stringify({ backupStem: files.stem, restoreVerified: true })
      );
      await ensureCatalogIndexes(db);
      console.log(
        'Milestone 3: expanding account names and adding catalog records atomically...'
      );
      result = await applyCatalog(
        client,
        db.databaseName,
        fixtures,
        files.stem
      );
    }
    await ensureCatalogIndexes(db);
    const counts = await verifyCatalog(db);
    await completeCatalog(client, db.databaseName);
    const report = {
      milestone: 3,
      database: db.databaseName,
      completedAt: new Date().toISOString(),
      resetPerformed: false,
      ...result,
      counts,
      next: 'STOP: wait for user review before milestone 4',
    };
    await writeFile(
      `${result.backupStem}.milestone-3.json`,
      JSON.stringify(report, null, 2),
      { mode: 0o600 }
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}
