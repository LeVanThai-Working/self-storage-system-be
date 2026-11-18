import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User } from '../../src/modules/user/user.model.ts';
import { Profile } from '../../src/modules/profile/profile.model.ts';
import { Facility } from '../../src/modules/facility/facility.model.ts';
import { AuditLog } from '../../src/modules/auditLog/auditLog.model.ts';
import {
  AuthProviderEnum,
  RoleEnum,
  UserStatusEnum,
  GenderEnum,
} from '../../src/common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../../src/common/enums/facility.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
  AuditStatusEnum,
} from '../../src/common/enums/auditLog.enum.ts';
import type { DatabaseBackup } from './backup.ts';

type MongoClient = InstanceType<typeof mongoose.mongo.MongoClient>;
type Document = mongoose.mongo.Document;
export const SEED_PASSWORD = 'Password123@';
const CHECKPOINT_ID = 'module-seed-v1:2';
type Checkpoint = {
  _id: string;
  status: 'seeded' | 'complete';
  backupStem: string;
  oldUserIds: string[];
  createdAt: Date;
  completedAt?: Date;
  cleanup?: { queuesCleared: number; authKeysDeleted: number };
};
export type AccountFacilityFixture = {
  users: Document[];
  profiles: Document[];
  facilities: Document[];
};

export function parseAccountFacilityArgs(
  args: string[]
): { apply: false } | { apply: true; database: string } {
  const flags = new Set<string>();
  let database: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flags.has(flag)) throw new Error('Duplicate seed argument');
    flags.add(flag);
    if (flag === '--milestone') {
      if (args[++i] !== '2')
        throw new Error('Only milestone 2 is supported here');
    } else if (flag === '--database') {
      database = args[++i];
      if (!database || database.startsWith('--'))
        throw new Error('Database name is required');
    } else if (!['--reset', '--apply', '--dry-run'].includes(flag)) {
      throw new Error('Unknown milestone 2 argument');
    }
  }
  if (!flags.has('--milestone'))
    throw new Error('Explicit milestone 2 is required');
  if (flags.has('--apply') || flags.has('--reset')) {
    if (
      !flags.has('--apply') ||
      !flags.has('--reset') ||
      !database ||
      flags.has('--dry-run')
    ) {
      throw new Error('Use --milestone 2 --reset --apply --database <name>');
    }
    return { apply: true, database };
  }
  return { apply: false };
}

function oid(key: string) {
  return new mongoose.Types.ObjectId(
    crypto
      .createHash('sha256')
      .update(`module-seed-v1:${key}`)
      .digest('hex')
      .slice(0, 24)
  );
}

export function seedAccountName(login: string): string {
  if (login === 'admin') return 'Quản trị viên hệ thống';
  if (login === 'ops') return 'Quản lý vận hành';
  const staff = /^nv([1-5])q([1-5])$/.exec(login);
  if (staff) return `Nhân viên ${staff[1]} Quận ${staff[2]}`;
  const manager = /^qlq([1-5])$/.exec(login);
  if (manager) return `Quản lý Quận ${manager[1]}`;
  const customer = /^kh([1-5])$/.exec(login);
  if (customer) return `Khách hàng ${customer[1]}`;
  throw new Error('UNKNOWN_SEED_ACCOUNT');
}

export async function buildAccountFacility(): Promise<AccountFacilityFixture> {
  const now = new Date();
  const password = await bcrypt.hash(SEED_PASSWORD, 10);
  const users: Document[] = [];
  const profiles: Document[] = [];
  const facilities: Document[] = [];
  const descriptors: { name: string; role: RoleEnum; district?: number }[] = [
    { name: 'admin', role: RoleEnum.SYSTEM_ADMIN },
    { name: 'ops', role: RoleEnum.BUSINESS_OPS_MANAGER },
  ];
  for (let district = 1; district <= 5; district++) {
    descriptors.push({
      name: `qlq${district}`,
      role: RoleEnum.FACILITY_MANAGER,
      district,
    });
    for (let staff = 1; staff <= 5; staff++)
      descriptors.push({
        name: `nv${staff}q${district}`,
        role: RoleEnum.FACILITY_STAFF,
        district,
      });
    descriptors.push({ name: `kh${district}`, role: RoleEnum.CUSTOMER });
    const facility = new Facility({
      _id: oid(`facility:Q${district}`),
      code: `Q${district}`,
      name: `Kho Quận ${district}`,
      address: `${100 + district} Đường Kho Mẫu, Quận ${district}, TP.HCM`,
      city: 'TP.HCM',
      phone: `0280000000${district}`,
      email: `khoq${district}@example.com`,
      description: `Cơ sở demo Quận ${district}; địa chỉ và liên hệ giả lập.`,
      status: FacilityStatusEnum.ACTIVE,
      managerId: oid(`user:qlq${district}`),
      operatingHours: { open: '07:00', close: '21:00' },
      createdAt: now,
      updatedAt: now,
    });
    await facility.validate();
    facilities.push(facility.toObject());
  }
  for (const [index, descriptor] of descriptors.entries()) {
    const user = new User({
      _id: oid(`user:${descriptor.name}`),
      name: seedAccountName(descriptor.name),
      email: `${descriptor.name}@example.com`,
      password,
      phoneNumber: `09${String(index + 1).padStart(8, '0')}`,
      role: descriptor.role,
      authProvider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
      assignedFacilityId: descriptor.district
        ? oid(`facility:Q${descriptor.district}`)
        : undefined,
      createdAt: now,
      updatedAt: now,
    });
    await user.validate();
    users.push(user.toObject());
    const profile = new Profile({
      _id: oid(`profile:${descriptor.name}`),
      userId: user._id,
      dateOfBirth: new Date('1990-01-01T00:00:00+07:00'),
      gender: GenderEnum.OTHER,
      address: descriptor.district
        ? `Địa chỉ demo Quận ${descriptor.district}, TP.HCM`
        : 'Địa chỉ demo TP.HCM',
      createdAt: now,
      updatedAt: now,
    });
    await profile.validate();
    profiles.push(profile.toObject());
  }
  return { users, profiles, facilities };
}

export async function audit(
  action: AuditActionEnum,
  resourceType: AuditResourceEnum,
  resourceId: string,
  metadata: Document,
  milestone = 2
) {
  const log = new AuditLog({
    actorId: null,
    actorRole: 'SYSTEM',
    action,
    resourceType,
    resourceId,
    status: AuditStatusEnum.SUCCESS,
    metadata: { actor: 'SYSTEM', milestone, ...metadata },
    createdAt: new Date(),
  });
  await log.validate();
  return log.toObject();
}

export async function expandSeedAccountNames(
  db: mongoose.mongo.Db,
  session: mongoose.mongo.ClientSession
) {
  const logs: Document[] = [];
  let matched = 0;
  for (const user of await db
    .collection('users')
    .find({}, { session })
    .toArray()) {
    if (typeof user.email !== 'string' || !user.email.endsWith('@example.com'))
      continue;
    const login = user.email.slice(0, -'@example.com'.length);
    if (String(user._id) !== String(oid(`user:${login}`))) continue;
    const name = seedAccountName(login);
    matched++;
    if (user.name === name) continue;
    const updated = await db
      .collection('users')
      .updateOne(
        { _id: user._id, email: user.email, name: user.name },
        { $set: { name, updatedAt: new Date() } },
        { session }
      );
    if (updated.matchedCount !== 1) throw new Error('SEED_ACCOUNT_CHANGED');
    logs.push(
      await audit(
        AuditActionEnum.UPDATE,
        AuditResourceEnum.USER,
        String(user._id),
        {
          operation: 'expand-seed-display-name',
          beforeName: user.name,
          afterName: name,
        },
        3
      )
    );
  }
  if (matched !== 37) throw new Error('SEED_ACCOUNTS_MISSING');
  if (logs.length)
    await db.collection('auditlogs').insertMany(logs, { session });
  return logs.length;
}

export async function readAccountFacilityCheckpoint(db: mongoose.mongo.Db) {
  return db
    .collection<Checkpoint>('seedmilestones')
    .findOne({ _id: CHECKPOINT_ID });
}

/** Raw inserts bypass Mongoose auto-indexing; a dropped/empty DB needs these too. */
export async function ensureAccountFacilityIndexes(db: mongoose.mongo.Db) {
  for (const model of [User, Profile, Facility, AuditLog]) {
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
                .map(([field, order]) => `${field}_${order}`)
                .join('_'),
          },
        ],
      });
    }
  }
}

export async function verifyAccountFacility(db: mongoose.mongo.Db) {
  const [users, profiles, facilities] = await Promise.all([
    db.collection('users').find({}).toArray(),
    db.collection('profiles').find({}).toArray(),
    db.collection('facilities').find({}).sort({ code: 1 }).toArray(),
  ]);
  if (users.length !== 37 || profiles.length !== 37 || facilities.length !== 5)
    throw new Error('Account/facility totals do not match the approved seed');
  const roleCounts: Record<string, number> = {};
  for (const user of users) {
    roleCounts[user.role] = (roleCounts[user.role] ?? 0) + 1;
    if (
      user.deleted ||
      user.status !== UserStatusEnum.ACTIVE ||
      user.authProvider !== AuthProviderEnum.LOCAL ||
      !user.isEmailVerified ||
      typeof user.password !== 'string' ||
      !(await bcrypt.compare(SEED_PASSWORD, user.password))
    )
      throw new Error('Seeded account login properties are invalid');
    if (
      profiles.filter(
        (profile) =>
          String(profile.userId) === String(user._id) && !profile.deleted
      ).length !== 1
    )
      throw new Error('Profile/user link is invalid');
  }
  const expectedRoles = {
    [RoleEnum.SYSTEM_ADMIN]: 1,
    [RoleEnum.BUSINESS_OPS_MANAGER]: 1,
    [RoleEnum.FACILITY_MANAGER]: 5,
    [RoleEnum.FACILITY_STAFF]: 25,
    [RoleEnum.CUSTOMER]: 5,
  };
  for (const [role, count] of Object.entries(expectedRoles))
    if (roleCounts[role] !== count)
      throw new Error('Seeded account roles are invalid');
  for (let district = 1; district <= 5; district++) {
    const facility = facilities.find((item) => item.code === `Q${district}`);
    const manager = users.find(
      (user) => user.email === `qlq${district}@example.com`
    );
    if (
      !facility ||
      !manager ||
      facility.deleted ||
      facility.status !== FacilityStatusEnum.ACTIVE ||
      String(facility.managerId) !== String(manager._id) ||
      String(manager.assignedFacilityId) !== String(facility._id)
    )
      throw new Error('Manager/facility link is invalid');
    const staff = users.filter(
      (user) =>
        user.role === RoleEnum.FACILITY_STAFF &&
        String(user.assignedFacilityId) === String(facility._id)
    );
    if (
      staff.length !== 5 ||
      staff.some(
        (user) =>
          !new RegExp(`^nv[1-5]q${district}@example\\.com$`).test(user.email)
      )
    )
      throw new Error('Staff/facility link is invalid');
  }
  if (
    users.some(
      (user) =>
        ![RoleEnum.FACILITY_MANAGER, RoleEnum.FACILITY_STAFF].includes(
          user.role
        ) && user.assignedFacilityId
    )
  )
    throw new Error(
      'Global account/customer must not have a facility assignment'
    );
  return {
    users: users.length,
    profiles: profiles.length,
    facilities: facilities.length,
    roleCounts,
    facilityAssignments: facilities.map((facility) => ({
      code: facility.code,
      name: facility.name,
      managerEmail: users.find(
        (user) => String(user._id) === String(facility.managerId)
      )?.email,
      staffCount: users.filter(
        (user) =>
          user.role === RoleEnum.FACILITY_STAFF &&
          String(user.assignedFacilityId) === String(facility._id)
      ).length,
    })),
  };
}

export async function applyAccountFacility(
  client: MongoClient,
  snapshot: DatabaseBackup,
  fixtures: AccountFacilityFixture,
  backupStem: string
) {
  const db = client.db(snapshot.database);
  const previous = await readAccountFacilityCheckpoint(db);
  if (previous)
    return {
      alreadyApplied: true,
      cleanupRequired: previous.status !== 'complete',
      oldUserIds: previous.oldUserIds,
      backupStem: previous.backupStem,
    };
  const currentNames = (
    await db.listCollections({}, { nameOnly: true }).toArray()
  )
    .map((item) => item.name)
    .sort();
  if (
    JSON.stringify(currentNames) !==
    JSON.stringify(snapshot.collections.map((item) => item.name).sort())
  )
    throw new Error('Collections changed after backup');
  const oldUserIds: string[] = [];
  const session = client.startSession();
  try {
    const result = await session.withTransaction(
      async () => {
        const checkpoint = await db
          .collection<Checkpoint>('seedmilestones')
          .findOne({ _id: CHECKPOINT_ID }, { session });
        if (checkpoint)
          return {
            alreadyApplied: true,
            cleanupRequired: checkpoint.status !== 'complete',
            oldUserIds: checkpoint.oldUserIds,
            backupStem: checkpoint.backupStem,
          };
        oldUserIds.length = 0;
        for (const collection of snapshot.collections) {
          const raw: string[] = [];
          for await (const document of db
            .collection(collection.name)
            .find(
              {},
              { session, raw: true, sort: { _id: 1 }, batchSize: 100 }
            )) {
            if (!Buffer.isBuffer(document))
              throw new Error('Expected raw BSON');
            raw.push(document.toString('base64'));
            if (collection.name === 'users')
              oldUserIds.push(
                String(mongoose.mongo.BSON.deserialize(document)._id)
              );
          }
          const sha256 = crypto
            .createHash('sha256')
            .update(JSON.stringify(raw))
            .digest('hex');
          if (sha256 !== collection.sha256)
            throw new Error(`Data changed after backup: ${collection.name}`);
          await db.collection(collection.name).deleteMany({}, { session });
        }
        const logs = [
          await audit(
            AuditActionEnum.DELETE,
            AuditResourceEnum.USER,
            db.databaseName,
            {
              operation: 'reset-application-data',
              backupStem,
              deletedCounts: Object.fromEntries(
                snapshot.collections.map((item) => [
                  item.name,
                  item.documents.length,
                ])
              ),
            }
          ),
        ];
        for (const [collection, records, resource] of [
          ['users', fixtures.users, AuditResourceEnum.USER],
          ['profiles', fixtures.profiles, AuditResourceEnum.PROFILE],
          ['facilities', fixtures.facilities, AuditResourceEnum.FACILITY],
        ] as const) {
          await db.collection(collection).insertMany(records, { session });
          for (const record of records)
            logs.push(
              await audit(
                AuditActionEnum.CREATE,
                resource,
                String(record._id),
                { operation: 'seed-account-facility' }
              )
            );
        }
        await db.collection('auditlogs').insertMany(logs, { session });
        await db.collection<Checkpoint>('seedmilestones').insertOne(
          {
            _id: CHECKPOINT_ID,
            status: 'seeded',
            backupStem,
            oldUserIds: [...oldUserIds],
            createdAt: new Date(),
          },
          { session }
        );
        return {
          alreadyApplied: false,
          cleanupRequired: true,
          oldUserIds: [...oldUserIds],
          backupStem,
        };
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }
    );
    if (!result) throw new Error('Seed transaction did not complete');
    return result;
  } finally {
    await session.endSession();
  }
}

export async function completeAccountFacility(
  client: MongoClient,
  database: string,
  cleanup: { queuesCleared: number; authKeysDeleted: number }
) {
  const db = client.db(database);
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await db
        .collection<Checkpoint>('seedmilestones')
        .updateOne(
          { _id: CHECKPOINT_ID, status: 'seeded' },
          { $set: { status: 'complete', cleanup, completedAt: new Date() } },
          { session }
        );
      if (updated.modifiedCount)
        await db
          .collection('auditlogs')
          .insertOne(
            await audit(
              AuditActionEnum.UPDATE,
              AuditResourceEnum.USER,
              CHECKPOINT_ID,
              { operation: 'seed-runtime-cleanup-complete', ...cleanup }
            ),
            { session }
          );
    });
  } finally {
    await session.endSession();
  }
}
