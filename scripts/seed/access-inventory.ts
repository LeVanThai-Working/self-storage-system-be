import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { AccessSchedule } from '../../src/modules/customerInventory/accessSchedule.model.ts';
import { CustomerSku } from '../../src/modules/customerSku/customerSku.model.ts';
import { CustomerInventory } from '../../src/modules/customerInventory/customerInventory.model.ts';
import { InventoryMovement } from '../../src/modules/customerInventory/inventoryMovement.model.ts';
import {
  AccessScheduleStatusEnum,
  InventoryItemStatusEnum,
  MovementTypeEnum,
} from '../../src/common/enums/customerInventory.enum.ts';
import { CustomerSkuStatusEnum } from '../../src/common/enums/customerSku.enum.ts';
import { ContractStatusEnum } from '../../src/common/enums/contract.enum.ts';
import {
  RackStatusEnum,
  RackTierStatusEnum,
} from '../../src/common/enums/storageRack.enum.ts';
import { RentalTargetTypeEnum } from '../../src/common/enums/rental.enum.ts';
import { RoleEnum, UserStatusEnum } from '../../src/common/enums/user.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../src/common/enums/auditLog.enum.ts';
import { ACCESS_SCHEDULE_CONFIG } from '../../src/config/accessSchedule.config.ts';
import {
  addDays,
  endOfDayVN,
  getVNDateString,
  startOfDayVN,
} from '../../src/utils/date.util.ts';
import { audit } from './account-facility.ts';
import {
  captureDatabase,
  readEncryptedBackup,
  restoreAndVerifyBackup,
  writeEncryptedBackup,
} from './backup.ts';

type Doc = mongoose.mongo.Document;
type Db = mongoose.mongo.Db;
type Client = InstanceType<typeof mongoose.mongo.MongoClient>;
type Session = mongoose.mongo.ClientSession;
const CHECKPOINT = 'module-seed-v1:6';
const NOTE = 'DỮ LIỆU SEED M6 — lịch sử mô phỏng, khách tự quản hàng hóa';
const SOURCES = [
  'seedmilestones',
  'users',
  'facilities',
  'contracts',
  'storageunits',
  'storageracks',
  'racktiers',
  'facilitytimeslots',
  'accessschedules',
  'customerskus',
  'customerinventories',
  'inventorymovements',
] as const;
export type AccessInventoryFoundation = Record<(typeof SOURCES)[number], Doc[]>;
const GROUPS = [
  ['customerskus', CustomerSku, AuditResourceEnum.CUSTOMER_SKU],
  ['accessschedules', AccessSchedule, AuditResourceEnum.ACCESS_SCHEDULE],
  [
    'customerinventories',
    CustomerInventory,
    AuditResourceEnum.CUSTOMER_INVENTORY,
  ],
  [
    'inventorymovements',
    InventoryMovement,
    AuditResourceEnum.INVENTORY_MOVEMENT,
  ],
] as const;
type Collection = (typeof GROUPS)[number][0];
const COUNTS = {
  customerskus: 8,
  accessschedules: 24,
  customerinventories: 24,
  inventorymovements: 36,
} as const;
export type AccessInventoryFixture = {
  sourceHash: string;
  rows: Record<Collection, Doc[]>;
  tierUpdates: { id: mongoose.Types.ObjectId; before: Doc; set: Doc }[];
  summary: {
    inbound: number;
    outbound: number;
    remaining: number;
    occupiedTiers: number;
  };
};
type Marker = {
  _id: string;
  status: 'complete';
  backupStem: string;
  completedAt: Date;
  ids: Record<Collection, mongoose.Types.ObjectId[]>;
  hashes: Record<Collection, string>;
  tiers: { id: mongoose.Types.ObjectId; set: Doc }[];
  summary: AccessInventoryFixture['summary'];
};
function canonical(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v instanceof mongoose.Types.ObjectId) return String(v);
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => [k, canonical(x)])
    );
  return v;
}
const hash = (v: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(v)))
    .digest('hex');
const hashRows = (rows: Doc[]) =>
  hash([...rows].sort((a, b) => String(a._id).localeCompare(String(b._id))));
const same = (a: unknown, b: unknown) => String(a) === String(b);
const oid = (key: string) =>
  new mongoose.Types.ObjectId(hash(`${CHECKPOINT}:${key}`).slice(0, 24));
const clock = (date: Date | string, time: string) =>
  new Date(`${getVNDateString(date)}T${time}:00+07:00`);
function one(rows: Doc[], predicate: (r: Doc) => boolean, message: string) {
  const matches = rows.filter(predicate);
  if (matches.length !== 1) throw new Error(message);
  return matches[0];
}
const active = (r: Doc) => !r.deleted && r.status === UserStatusEnum.ACTIVE;
async function validated<T extends mongoose.Document>(doc: T): Promise<Doc> {
  await doc.validate();
  return doc.toObject();
}
export function parseAccessInventoryArgs(args: string[]): {
  apply: boolean;
  database?: string;
} {
  let apply = false,
    dryRun = false,
    milestone = false,
    database: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--milestone' && !milestone && args[++i] === '6')
      milestone = true;
    else if (args[i] === '--apply' && !apply) apply = true;
    else if (args[i] === '--dry-run' && !dryRun) dryRun = true;
    else if (args[i] === '--database' && !database) {
      database = args[++i];
      if (!database || database.startsWith('--'))
        throw new Error('M6_ARGUMENT_INVALID');
    } else throw new Error('M6_ARGUMENT_INVALID');
  }
  if (
    !milestone ||
    (apply && dryRun) ||
    (apply && !database) ||
    (!apply && database)
  )
    throw new Error('M6_ARGUMENT_INVALID');
  return database ? { apply, database } : { apply };
}
export async function loadAccessInventoryFoundation(
  db: Db,
  session?: Session
): Promise<AccessInventoryFoundation> {
  const result = {} as AccessInventoryFoundation;
  for (const name of SOURCES)
    result[name] =
      name === 'seedmilestones'
        ? await db
            .collection<{ _id: string }>(name)
            .find({ _id: 'module-seed-v1:5' }, { session })
            .sort({ _id: 1 })
            .toArray()
        : await db
            .collection(name)
            .find({}, { session })
            .sort({ _id: 1 })
            .toArray();
  return result;
}
export async function buildAccessInventory(
  f: AccessInventoryFoundation,
  now: Date
): Promise<AccessInventoryFixture> {
  const m5 = f.seedmilestones.find(
    (m) => m._id === 'module-seed-v1:5' && m.status === 'complete'
  );
  if (
    !m5 ||
    !Array.isArray(m5.ids?.contracts) ||
    m5.ids.contracts.length !== 32
  )
    throw new Error('MILESTONE_5_REQUIRED');
  if (now < clock('2026-11-15', '10:30') || now > endOfDayVN('2026-11-27'))
    throw new Error('M6_REFERENCE_DATE_OUTSIDE_ACTIVE_WINDOW');
  if (ACCESS_SCHEDULE_CONFIG.GRACE_CHECKIN_MINUTES < 5)
    throw new Error('M6_CHECKIN_CONFIG_CHANGED');
  const result: AccessInventoryFixture = {
    sourceHash: hash(f),
    rows: {
      customerskus: [],
      accessschedules: [],
      customerinventories: [],
      inventorymovements: [],
    },
    tierUpdates: [],
    summary: { inbound: 80, outbound: 56, remaining: 24, occupiedTiers: 8 },
  };
  const seedContracts = new Set(m5.ids.contracts.map(String));
  for (let district = 2; district <= 5; district++) {
    const code = `Q${district}`;
    const facility = one(
      f.facilities,
      (r) => r.code === code && active(r),
      'M6_FACILITY_REQUIRED'
    );
    const customer = one(
      f.users,
      (r) =>
        r.email === `kh${district}@example.com` &&
        r.role === RoleEnum.CUSTOMER &&
        active(r),
      'M6_CUSTOMER_REQUIRED'
    );
    const manager = one(
      f.users,
      (r) =>
        r.email === `qlq${district}@example.com` &&
        r.role === RoleEnum.FACILITY_MANAGER &&
        same(r.assignedFacilityId, facility._id) &&
        same(facility.managerId, r._id) &&
        active(r),
      'M6_MANAGER_REQUIRED'
    );
    const unit = one(
      f.storageunits,
      (r) =>
        r.unitNumber === `${code}-KHO-01` &&
        same(r.facilityId, facility._id) &&
        !r.deleted,
      'M6_WAREHOUSE_REQUIRED'
    );
    if (unit.floor !== 1) throw new Error('M6_WAREHOUSE_FLOOR_INVALID');
    const slot = one(
      f.facilitytimeslots,
      (r) =>
        same(r.facilityId, facility._id) &&
        r.isActive &&
        !r.deleted &&
        r.startTime === '09:00' &&
        r.endTime === '11:00',
      'M6_SLOT_REQUIRED'
    );
    for (const completed of [true, false]) {
      const suffix = completed ? '04' : '08',
        base = `SEED-M6-${code}-${suffix}`;
      const contract = one(
        f.contracts,
        (r) =>
          r.contractCode === `SEED-M5-${code}-${suffix}` &&
          seedContracts.has(String(r._id)) &&
          !r.deleted,
        'M6_CONTRACT_REQUIRED'
      );
      if (
        !same(contract.customerId, customer._id) ||
        !same(contract.facilityId, facility._id) ||
        !same(contract.storageUnitId, unit._id) ||
        contract.rentalTargetType !== RentalTargetTypeEnum.STORAGE_RACK ||
        contract.status !==
          (completed
            ? ContractStatusEnum.COMPLETED
            : ContractStatusEnum.ACTIVE) ||
        getVNDateString(contract.startDate) !==
          (completed ? '2026-05-01' : '2026-06-01') ||
        getVNDateString(contract.endDate) !==
          (completed ? '2026-07-29' : '2026-11-27') ||
        !contract.actualCheckInDate ||
        (completed && !contract.actualCheckOutDate) ||
        (!completed && contract.actualCheckOutDate)
      )
        throw new Error('M6_CONTRACT_CHANGED');
      if (
        f.customerinventories.some(
          (r) => same(r.contractId, contract._id) && !r.deleted
        )
      )
        throw new Error('M6_EXISTING_STOCK_CONFLICT');
      const staffNumber = completed ? 1 : 2;
      const staff = one(
        f.users,
        (r) =>
          r.email === `nv${staffNumber}q${district}@example.com` &&
          r.role === RoleEnum.FACILITY_STAFF &&
          same(r.assignedFacilityId, facility._id) &&
          active(r),
        'M6_STAFF_REQUIRED'
      );
      const dates = completed
        ? ['2026-05-01', '2026-05-15', '2026-07-29']
        : ['2026-06-01', '2026-07-01', '2026-11-15'];
      const purposes = [
        'Nhập hàng',
        'Dời hàng',
        completed ? 'Xuất hết hàng' : 'Xuất một phần hàng',
      ];
      const schedules: Doc[] = [];
      for (let visit = 0; visit < 3; visit++) {
        const date = startOfDayVN(dates[visit]),
          checkIn = clock(date, '09:05'),
          checkOut = clock(date, '10:30');
        if (
          checkIn < contract.actualCheckInDate ||
          checkOut > contract.endDate ||
          (contract.actualCheckOutDate &&
            checkOut > contract.actualCheckOutDate) ||
          checkOut > now
        )
          throw new Error('M6_VISIT_OUTSIDE_CONTRACT');
        const scheduleCode = `${base}-AS-0${visit + 1}`;
        const s = await validated(
          new AccessSchedule({
            _id: oid(scheduleCode),
            scheduleCode,
            status: AccessScheduleStatusEnum.COMPLETED,
            customerId: customer._id,
            contractId: contract._id,
            facilityId: facility._id,
            timeSlotId: slot._id,
            scheduledDate: date,
            timeSlotSnapshot: {
              slotName: slot.slotName,
              startTime: slot.startTime,
              endTime: slot.endTime,
            },
            numberOfPeople: [5, 8, 10][visit],
            purpose: `${purposes[visit]} — Khách hàng ${district}, hợp đồng ${contract.contractCode}`,
            assignedStaffId: staff._id,
            assignedStaffNameSnapshot: staff.name,
            assignedBy: manager._id,
            assignedAt: clock(addDays(date, -1), '15:00'),
            assignmentVersion: 1,
            expiresAt: new Date(
              clock(date, slot.startTime).getTime() +
                ACCESS_SCHEDULE_CONFIG.GRACE_CHECKIN_MINUTES * 60000
            ),
            otpHash: null,
            otpEncrypted: null,
            checkedInAt: checkIn,
            checkedInBy: staff._id,
            checkedOutAt: checkOut,
            checkedOutBy: staff._id,
            staffNotes: NOTE,
            createdAt: clock(addDays(date, -1), '14:00'),
            updatedAt: checkOut,
          })
        );
        schedules.push(s);
        result.rows.accessschedules.push(s);
      }
      const skuCode = `SEED-M6-${code}-${completed ? 'HOSO' : 'GIADUNG'}`;
      const sku = await validated(
        new CustomerSku({
          _id: oid(skuCode),
          customerId: customer._id,
          skuCode,
          name: `Thùng ${completed ? 'hồ sơ' : 'đồ gia dụng'} Khách hàng ${district}`,
          category: completed ? 'Hồ sơ' : 'Đồ gia dụng',
          uom: 'thùng',
          dimensions: { length: 0.4, width: 0.3, height: 0.3 },
          volume: 0.036,
          weightKg: 5,
          status: CustomerSkuStatusEnum.ACTIVE,
          notes: NOTE,
          createdAt: clock(addDays(startOfDayVN(dates[0]), -2), '10:00'),
          updatedAt: clock(addDays(startOfDayVN(dates[0]), -2), '10:00'),
        })
      );
      if (
        f.customerskus.some(
          (r) =>
            same(r.customerId, customer._id) &&
            r.skuCode === skuCode &&
            !r.deleted
        )
      )
        throw new Error('M6_EXISTING_SKU_CONFLICT');
      result.rows.customerskus.push(sku);
      const rackSuffixes = completed ? ['R01'] : ['R05', 'R09'];
      if (contract.rentedRackIds.length !== rackSuffixes.length)
        throw new Error('M6_CONTRACT_RACKS_CHANGED');
      for (const [rackIndex, rackSuffix] of rackSuffixes.entries()) {
        const rack = one(
          f.storageracks,
          (r) =>
            r.rackCode === `${code}-${rackSuffix}` &&
            same(r.storageUnitId, unit._id) &&
            same(r.facilityId, facility._id) &&
            !r.deleted,
          'M6_RACK_REQUIRED'
        );
        if (
          !contract.rentedRackIds.some((id: unknown) => same(id, rack._id)) ||
          (completed
            ? rack.status !== RackStatusEnum.AVAILABLE ||
              rack.currentContractId ||
              rack.currentCustomerId
            : rack.status !== RackStatusEnum.RENTED ||
              !same(rack.currentContractId, contract._id) ||
              !same(rack.currentCustomerId, customer._id))
        )
          throw new Error('M6_RACK_OWNERSHIP_CHANGED');
        const tiers = [1, 2].map((number) =>
          one(
            f.racktiers,
            (r) =>
              same(r.storageRackId, rack._id) &&
              same(r.storageUnitId, unit._id) &&
              r.tierNumber === number &&
              !r.deleted,
            'M6_TIER_REQUIRED'
          )
        );
        for (const tier of tiers)
          if (
            tier.status !== RackTierStatusEnum.AVAILABLE ||
            f.customerinventories.some(
              (i) =>
                same(i.rackTierId, tier._id) &&
                !i.deleted &&
                (i.quantity > 0 || i.pendingOutboundQuantity > 0)
            )
          )
            throw new Error('M6_TIER_OR_STOCK_UNAVAILABLE');
        const quantity = completed ? 10 : 5,
          remaining = completed ? 0 : 3,
          out = completed ? 10 : 2;
        for (const tier of tiers)
          if (
            !Number.isFinite(tier.volume) ||
            tier.volume < quantity * sku.volume ||
            !Number.isFinite(tier.maxWeightKg) ||
            tier.maxWeightKg < quantity * sku.weightKg
          )
            throw new Error('M6_TIER_CAPACITY_INVALID');
        const times = dates.map((date) =>
          clock(date, rackIndex ? '09:20' : '09:15')
        );
        const common = {
          customerId: customer._id,
          contractId: contract._id,
          facilityId: facility._id,
          storageUnitId: unit._id,
          storageRackId: rack._id,
          skuId: sku._id,
          status: InventoryItemStatusEnum.NORMAL,
          pendingOutboundQuantity: 0,
          holdingReason: null,
          relatedIncidentId: null,
          notes: NOTE,
        };
        const source = await validated(
          new CustomerInventory({
            ...common,
            _id: oid(`${base}:${rackSuffix}:T01`),
            rackTierId: tiers[0]._id,
            quantity: 0,
            lastMovementAt: times[1],
            createdAt: times[0],
            updatedAt: times[1],
          })
        );
        const dest = await validated(
          new CustomerInventory({
            ...common,
            _id: oid(`${base}:${rackSuffix}:T02`),
            rackTierId: tiers[1]._id,
            quantity: remaining,
            lastMovementAt: times[2],
            createdAt: times[1],
            updatedAt: times[2],
          })
        );
        result.rows.customerinventories.push(source, dest);
        for (const [index, type] of [
          MovementTypeEnum.IN,
          MovementTypeEnum.MOVE,
          MovementTypeEnum.OUT,
        ].entries()) {
          const movementCode = `${base}-${rackSuffix}-${type.toUpperCase()}`;
          result.rows.inventorymovements.push(
            await validated(
              new InventoryMovement({
                _id: oid(movementCode),
                movementCode,
                type,
                customerInventoryId: index === 0 ? source._id : dest._id,
                customerId: customer._id,
                contractId: contract._id,
                facilityId: facility._id,
                storageUnitId: unit._id,
                skuId: sku._id,
                fromRackTierId:
                  index === 0 ? null : tiers[index === 1 ? 0 : 1]._id,
                toRackTierId: index === 2 ? null : tiers[index]._id,
                quantity: index === 2 ? out : quantity,
                previousQuantity: index === 0 ? 0 : quantity,
                newQuantity:
                  index === 0 ? quantity : index === 1 ? 0 : remaining,
                performedBy: customer._id,
                requestId: null,
                referenceCode:
                  index === 1 ? null : schedules[index].scheduleCode,
                notes: `${NOTE}; Access Schedule: ${schedules[index].scheduleCode}`,
                createdAt: times[index],
                updatedAt: times[index],
              })
            )
          );
        }
        if (!completed)
          result.tierUpdates.push({
            id: tiers[1]._id,
            before: tiers[1],
            set: { status: RackTierStatusEnum.OCCUPIED, updatedAt: now },
          });
      }
    }
  }
  // Historical visits are checked against manual visits as well as each other.
  const liveSchedules = [
    ...f.accessschedules.filter(
      (s) =>
        !s.deleted &&
        ![
          AccessScheduleStatusEnum.CANCELLED,
          AccessScheduleStatusEnum.EXPIRED,
          AccessScheduleStatusEnum.NO_SHOW,
        ].includes(s.status)
    ),
    ...result.rows.accessschedules,
  ];
  for (const s of result.rows.accessschedules) {
    const sameDay = liveSchedules.filter(
      (other) =>
        !same(other._id, s._id) &&
        same(other.facilityId, s.facilityId) &&
        other.scheduledDate &&
        getVNDateString(other.scheduledDate) ===
          getVNDateString(s.scheduledDate)
    );
    const overlaps = sameDay.filter(
      (other) =>
        other.timeSlotSnapshot?.startTime < s.timeSlotSnapshot.endTime &&
        other.timeSlotSnapshot?.endTime > s.timeSlotSnapshot.startTime
    );
    if (
      overlaps.some((other) => same(other.assignedStaffId, s.assignedStaffId))
    )
      throw new Error('M6_STAFF_SCHEDULE_CONFLICT');
    const slot = one(
      f.facilitytimeslots,
      (r) => same(r._id, s.timeSlotId),
      'M6_SLOT_REQUIRED'
    );
    if (
      sameDay.filter((other) => same(other.timeSlotId, s.timeSlotId)).length +
        1 >
      slot.maxCapacity
    )
      throw new Error('M6_SLOT_CAPACITY_CONFLICT');
  }
  validateAccessInventoryLedger(result);
  return result;
}

export function validateAccessInventoryLedger(f: AccessInventoryFixture) {
  const fail = () => {
    throw new Error('M6_LEDGER_INVALID');
  };
  for (const [name] of GROUPS)
    if (
      f.rows[name].length !== COUNTS[name] ||
      new Set(f.rows[name].map((r) => String(r._id))).size !== COUNTS[name]
    )
      fail();
  const inventory = f.rows.customerinventories,
    movements = f.rows.inventorymovements,
    balances = new Map<string, number>();
  const position = (contract: unknown, sku: unknown, tier: unknown) =>
    `${String(contract)}:${String(sku)}:${String(tier)}`;
  const ordered = [...movements].sort(
    (a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.movementCode.localeCompare(b.movementCode)
  );
  for (const m of ordered) {
    if (
      !Number.isSafeInteger(m.quantity) ||
      m.quantity <= 0 ||
      !same(m.performedBy, m.customerId) ||
      m.requestId !== null
    )
      fail();
    const s = f.rows.accessschedules.find((s) =>
      m.notes.includes(s.scheduleCode)
    );
    if (
      !s ||
      !same(s.contractId, m.contractId) ||
      !same(s.customerId, m.customerId) ||
      !same(s.facilityId, m.facilityId) ||
      m.createdAt < s.checkedInAt ||
      m.createdAt > s.checkedOutAt
    )
      fail();
    const targetTier =
      m.type === MovementTypeEnum.IN ? m.toRackTierId : m.fromRackTierId;
    const key = position(m.contractId, m.skuId, targetTier),
      previous = balances.get(key) ?? 0;
    const delta = m.type === MovementTypeEnum.IN ? m.quantity : -m.quantity,
      next = previous + delta;
    if (
      !targetTier ||
      next < 0 ||
      m.previousQuantity !== previous ||
      m.newQuantity !== next
    )
      fail();
    if (
      ![
        MovementTypeEnum.IN,
        MovementTypeEnum.MOVE,
        MovementTypeEnum.OUT,
      ].includes(m.type)
    )
      fail();
    balances.set(key, next);
    if (m.type === MovementTypeEnum.MOVE) {
      if (!m.toRackTierId || same(m.toRackTierId, m.fromRackTierId)) fail();
      const dest = position(m.contractId, m.skuId, m.toRackTierId);
      balances.set(dest, (balances.get(dest) ?? 0) + m.quantity);
    }
    const referenced = inventory.find((i) =>
      same(i._id, m.customerInventoryId)
    );
    if (
      !referenced ||
      !same(
        referenced.rackTierId,
        m.type === MovementTypeEnum.OUT ? m.fromRackTierId : m.toRackTierId
      )
    )
      fail();
    for (const field of [
      'customerId',
      'facilityId',
      'storageUnitId',
      'contractId',
      'skuId',
    ])
      if (!same(referenced?.[field], m[field])) fail();
  }
  for (const i of inventory) {
    if (
      i.quantity !==
        (balances.get(position(i.contractId, i.skuId, i.rackTierId)) ?? 0) ||
      i.pendingOutboundQuantity !== 0 ||
      i.status !== InventoryItemStatusEnum.NORMAL
    )
      fail();
    if (
      !f.rows.customerskus.some(
        (s) => same(s._id, i.skuId) && same(s.customerId, i.customerId)
      )
    )
      fail();
  }
  for (const s of f.rows.accessschedules)
    if (
      s.status !== AccessScheduleStatusEnum.COMPLETED ||
      !same(s.assignedStaffId, s.checkedInBy) ||
      !same(s.assignedStaffId, s.checkedOutBy) ||
      s.otpHash !== null ||
      s.otpEncrypted !== null ||
      s.checkedInAt > s.expiresAt ||
      s.checkedOutAt < s.checkedInAt ||
      ![5, 8, 10].includes(s.numberOfPeople)
    )
      fail();
  const sum = (type: MovementTypeEnum) =>
    movements
      .filter((m) => m.type === type)
      .reduce((total, m) => total + m.quantity, 0);
  const remaining = inventory.reduce((total, i) => total + i.quantity, 0),
    positive = inventory.filter((i) => i.quantity > 0);
  if (
    sum(MovementTypeEnum.IN) !== 80 ||
    sum(MovementTypeEnum.OUT) !== 56 ||
    remaining !== 24 ||
    positive.length !== 8 ||
    positive.some((i) => i.quantity !== 3) ||
    f.tierUpdates.length !== 8 ||
    new Set(f.tierUpdates.map((t) => String(t.id))).size !== 8
  )
    fail();
  for (const i of positive)
    if (
      !f.tierUpdates.some(
        (t) =>
          same(t.id, i.rackTierId) &&
          t.set.status === RackTierStatusEnum.OCCUPIED
      )
    )
      fail();
  if (
    hash(f.summary) !==
    hash({ inbound: 80, outbound: 56, remaining: 24, occupiedTiers: 8 })
  )
    fail();
}

export async function ensureAccessInventoryIndexes(db: Db) {
  // Never drop an existing index; incompatible definitions fail before data writes.
  for (const [, model] of GROUPS)
    for (const [key, options] of model.schema.indexes())
      await db.command({
        createIndexes: model.collection.name,
        indexes: [
          {
            key,
            ...options,
            name:
              options.name ??
              Object.entries(key)
                .map(([k, d]) => `${k}_${d}`)
                .join('_'),
          },
        ],
      });
}
const marker = (db: Db, session?: Session) =>
  db
    .collection<Marker>('seedmilestones')
    .findOne({ _id: CHECKPOINT }, { session });
export async function verifyAccessInventory(
  db: Db,
  initial = false,
  session?: Session
) {
  const m = await marker(db, session);
  if (!m) throw new Error('M6_CHECKPOINT_MISSING');
  const counts: Partial<Record<Collection, number>> = {};
  for (const [name] of GROUPS) {
    if (m.ids[name]?.length !== COUNTS[name])
      throw new Error('M6_CHECKPOINT_INVALID');
    const rows = await db
      .collection(name)
      .find({ _id: { $in: m.ids[name] } }, { session })
      .toArray();
    if (rows.length !== COUNTS[name]) throw new Error('M6_RECORD_MISSING');
    if (initial && hashRows(rows) !== m.hashes[name])
      throw new Error('M6_RECORD_MISMATCH');
    counts[name] = rows.length;
  }
  if (initial)
    for (const t of m.tiers) {
      const row = await db
        .collection('racktiers')
        .findOne({ _id: t.id }, { session });
      if (
        !row ||
        Object.entries(t.set).some(([key, v]) => hash(row[key]) !== hash(v))
      )
        throw new Error('M6_TIER_MISMATCH');
    }
  return { ...counts, initialTotals: m.summary, completedAt: m.completedAt };
}
export async function applyAccessInventory(
  client: Client,
  database: string,
  fixture: AccessInventoryFixture,
  backupStem: string,
  now = new Date()
) {
  const db = client.db(database),
    session = client.startSession();
  try {
    const result = await session.withTransaction(
      async () => {
        const previous = await marker(db, session);
        if (previous) {
          await verifyAccessInventory(db, false, session);
          return { alreadyApplied: true, backupStem: previous.backupStem };
        }
        validateAccessInventoryLedger(fixture);
        if (
          hash(await loadAccessInventoryFoundation(db, session)) !==
          fixture.sourceHash
        )
          throw new Error('M6_FOUNDATION_CHANGED');
        // Rebuild from the transactional snapshot: validates source ownership, dates and workload again.
        const current = await buildAccessInventory(
          await loadAccessInventoryFoundation(db, session),
          now
        );
        for (const [name] of GROUPS)
          if (hashRows(current.rows[name]) !== hashRows(fixture.rows[name]))
            throw new Error('M6_FIXTURE_CHANGED');
        if (hash(current.tierUpdates) !== hash(fixture.tierUpdates))
          throw new Error('M6_FIXTURE_CHANGED');
        const logs: Doc[] = [],
          ids = {} as Marker['ids'],
          hashes = {} as Marker['hashes'];
        for (const t of fixture.tierUpdates) {
          const updated = await db
            .collection('racktiers')
            .updateOne(t.before, { $set: t.set }, { session });
          if (updated.matchedCount !== 1) throw new Error('M6_TIER_CONFLICT');
          logs.push(
            await audit(
              AuditActionEnum.UPDATE,
              AuditResourceEnum.RACK_TIER,
              String(t.id),
              { operation: 'seed-access-inventory', simulated: true },
              6
            )
          );
        }
        for (const [name, , resource] of GROUPS) {
          await db.collection(name).insertMany(fixture.rows[name], { session });
          ids[name] = fixture.rows[name].map((r) => r._id);
          hashes[name] = hashRows(fixture.rows[name]);
          for (const row of fixture.rows[name])
            logs.push(
              await audit(
                AuditActionEnum.CREATE,
                resource,
                String(row._id),
                {
                  operation: 'seed-access-inventory',
                  collection: name,
                  simulated: true,
                },
                6
              )
            );
        }
        logs.push(
          await audit(
            AuditActionEnum.CREATE,
            AuditResourceEnum.CUSTOMER_INVENTORY,
            CHECKPOINT,
            {
              operation: 'seed-access-inventory-complete',
              simulated: true,
              counts: COUNTS,
            },
            6
          )
        );
        await db.collection('auditlogs').insertMany(logs, { session });
        await db.collection<Marker>('seedmilestones').insertOne(
          {
            _id: CHECKPOINT,
            status: 'complete',
            backupStem,
            completedAt: new Date(),
            ids,
            hashes,
            tiers: fixture.tierUpdates.map(({ id, set }) => ({ id, set })),
            summary: fixture.summary,
          },
          { session }
        );
        await verifyAccessInventory(db, true, session);
        return { alreadyApplied: false, backupStem };
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }
    );
    if (!result) throw new Error('M6_TRANSACTION_INCOMPLETE');
    return result;
  } finally {
    await session.endSession();
  }
}
export async function runAccessInventory(args: string[]) {
  const options = parseAccessInventoryArgs(args);
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_REQUIRED');
  const client = new mongoose.mongo.MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  try {
    await client.connect();
    const db = client.db();
    if (options.apply && options.database !== db.databaseName)
      throw new Error('DATABASE_NAME_MISMATCH');
    const previous = await marker(db);
    if (previous) {
      console.log(
        JSON.stringify(
          {
            milestone: 6,
            dryRun: !options.apply,
            alreadyApplied: true,
            resetPerformed: false,
            ...(await verifyAccessInventory(db)),
            next: 'STOP: review milestone 6 before final reconciliation',
          },
          null,
          2
        )
      );
      return;
    }
    const preview = await buildAccessInventory(
      await loadAccessInventoryFoundation(db),
      new Date()
    );
    const description = {
      milestone: 6,
      database: db.databaseName,
      dryRun: !options.apply,
      resetPerformed: false,
      counts: COUNTS,
      totals: preview.summary,
      schedules: preview.rows.accessschedules.map((s) => ({
        code: s.scheduleCode,
        date: getVNDateString(s.scheduledDate),
        slot: s.timeSlotSnapshot,
        people: s.numberOfPeople,
        purpose: s.purpose,
        staff: s.assignedStaffNameSnapshot,
        status: s.status,
      })),
      skus: preview.rows.customerskus.map((s) => ({
        code: s.skuCode,
        name: s.name,
        uom: s.uom,
        dimensions: s.dimensions,
        volume: s.volume,
        weightKg: s.weightKg,
      })),
      inventory: preview.rows.customerinventories.map((i) => ({
        id: i._id,
        contractId: i.contractId,
        skuId: i.skuId,
        rackTierId: i.rackTierId,
        quantity: i.quantity,
      })),
      movements: preview.rows.inventorymovements.map((m) => ({
        code: m.movementCode,
        type: m.type,
        from: m.fromRackTierId,
        to: m.toRackTierId,
        quantity: m.quantity,
        previousQuantity: m.previousQuantity,
        newQuantity: m.newQuantity,
        at: m.createdAt,
        performedBy: m.performedBy,
        notes: m.notes,
      })),
      tierUpdates: preview.tierUpdates.map((t) => ({ id: t.id, ...t.set })),
      next: 'STOP: review milestone 6 before final reconciliation',
    };
    if (!options.apply) {
      console.log(JSON.stringify(description, null, 2));
      return;
    }
    console.log(
      'Milestone 6: backing up and verifying restore before writes...'
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
      JSON.stringify({ ...verified, purpose: 'before-milestone-6' }, null, 2),
      { flag: 'wx', mode: 0o600 }
    );
    const now = new Date(),
      fixture = await buildAccessInventory(
        await loadAccessInventoryFoundation(db),
        now
      );
    await ensureAccessInventoryIndexes(db);
    const result = await applyAccessInventory(
      client,
      db.databaseName,
      fixture,
      files.stem,
      now
    );
    const report = {
      ...description,
      dryRun: false,
      ...result,
      verified: await verifyAccessInventory(db, true),
    };
    await writeFile(
      `${files.stem}.milestone-6.json`,
      JSON.stringify(report, null, 2),
      { mode: 0o600 }
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}
