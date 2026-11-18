import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { Contract } from '../../src/modules/contract/contract.model.ts';
import { Reservation } from '../../src/modules/reservation/reservation.model.ts';
import { ReservationStatusEnum } from '../../src/common/enums/reservation.enum.ts';
import {
  buildReservationPolicySnapshot,
  getReservationConfig,
} from '../../src/config/reservation.config.ts';
import { Invoice } from '../../src/modules/invoice/invoice.model.ts';
import { Payment } from '../../src/modules/payment/payment.model.ts';
import { RefundRequest } from '../../src/modules/refundRequest/refundRequest.model.ts';
import { ContractTemplate } from '../../src/modules/contractTemplate/contractTemplate.model.ts';
import { SigningAuthorization } from '../../src/modules/signingAuthorization/signingAuthorization.model.ts';
import {
  ContractStatusEnum,
  ContractSourceEnum,
  ContractDepositStatusEnum,
} from '../../src/common/enums/contract.enum.ts';
import {
  BillingUnitEnum,
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
} from '../../src/common/enums/billing.enum.ts';
import {
  PaymentPurposeEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from '../../src/common/enums/payment.enum.ts';
import {
  RefundRequestReasonEnum,
  RefundRequestStatusEnum,
} from '../../src/common/enums/refundRequest.enum.ts';
import { StorageUnitStatusEnum } from '../../src/common/enums/storageUnit.enum.ts';
import { RackStatusEnum } from '../../src/common/enums/storageRack.enum.ts';
import { RentalTargetTypeEnum } from '../../src/common/enums/rental.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../src/common/enums/auditLog.enum.ts';
import { RoleEnum, UserStatusEnum } from '../../src/common/enums/user.enum.ts';
import { UnitTypeCategoryEnum } from '../../src/common/enums/unitType.enum.ts';
import { AmenityTypeEnum } from '../../src/common/enums/amenity.enum.ts';
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
import {
  checkRenderFinanceReadiness,
  cloudinaryFinanceProvider,
  financeDocument,
  prepareFinanceAssets,
  sha256,
  type FinanceAssetMap,
  type FinanceDocument,
} from './finance-assets.ts';

type Document = mongoose.mongo.Document;
type Db = mongoose.mongo.Db;
type Client = InstanceType<typeof mongoose.mongo.MongoClient>;
type Session = mongoose.mongo.ClientSession;
export const FINANCE_CHECKPOINT_ID = 'module-seed-v1:5';
const NOTE = 'DỮ LIỆU SEED M5 — giao dịch mô phỏng, không thu/chuyển tiền thật';
const FOUNDATION_NAMES = [
  'users',
  'profiles',
  'facilities',
  'unittypes',
  'amenities',
  'facilityunittypeofferings',
  'facilityamenityofferings',
  'storageunits',
  'storageracks',
  'racktiers',
  'legalentities',
  'facilitytimeslots',
] as const;
export type FinanceFoundation = Record<
  (typeof FOUNDATION_NAMES)[number],
  Document[]
>;
const GROUPS = [
  ['contracttemplates', ContractTemplate, AuditResourceEnum.CONTRACT_TEMPLATE],
  [
    'signingauthorizations',
    SigningAuthorization,
    AuditResourceEnum.SIGNING_AUTHORIZATION,
  ],
  ['reservations', Reservation, AuditResourceEnum.RESERVATION],
  ['contracts', Contract, AuditResourceEnum.CONTRACT],
  ['invoices', Invoice, AuditResourceEnum.INVOICE],
  ['payments', Payment, AuditResourceEnum.PAYMENT],
  ['refundrequests', RefundRequest, AuditResourceEnum.REFUND_REQUEST],
] as const;
type Collection = (typeof GROUPS)[number][0];
type ResourceUpdate = {
  collection:
    'facilities' | 'storageunits' | 'storageracks' | 'facilityamenityofferings';
  id: mongoose.Types.ObjectId;
  before: Document;
  set: Document;
  resource: AuditResourceEnum;
};
export type FinanceFixture = {
  sourceHash: string;
  rows: Record<Collection, Document[]>;
  updates: ResourceUpdate[];
  documents: FinanceDocument[];
  assetsReady: boolean;
  referenceDate: Date;
  summary: {
    rentalAndAmenities: number;
    depositsCollected: number;
    depositsRefunded: number;
    depositsHeld: number;
  };
};
type Checkpoint = {
  _id: string;
  status: 'complete';
  backupStem: string;
  completedAt: Date;
  ids: Record<Collection, mongoose.Types.ObjectId[]>;
  hashes: Record<Collection, string>;
  resources: Pick<ResourceUpdate, 'collection' | 'id' | 'set'>[];
  summary: FinanceFixture['summary'];
};
const EXPECTED_COUNTS = {
  contracttemplates: 1,
  signingauthorizations: 4,
  reservations: 16,
  contracts: 32,
  invoices: 160,
  payments: 176,
  refundrequests: 16,
} as const;
const AMENITIES = {
  air: {
    name: 'Máy lạnh',
    price: 8000,
    billing: BillingUnitEnum.MONTH,
    physical: true,
  },
  camera: {
    name: 'Camera giám sát',
    price: 5000,
    billing: BillingUnitEnum.MONTH,
    physical: true,
  },
  carton: {
    name: 'Thùng carton',
    price: 5000,
    billing: BillingUnitEnum.ONE_TIME,
    physical: true,
  },
  lock: {
    name: 'Ổ khóa',
    price: 5000,
    billing: BillingUnitEnum.ONE_TIME,
    physical: true,
  },
  porter: {
    name: 'Dịch vụ bốc xếp',
    price: 10000,
    billing: BillingUnitEnum.ONE_TIME,
    physical: false,
  },
} as const;
type AmenityKey = keyof typeof AMENITIES;
const CASES: {
  suffix: string;
  category: UnitTypeCategoryEnum;
  start: string;
  cycles: number;
  rent: number;
  racks: string[];
  amenities: Partial<Record<AmenityKey, number>>;
}[] = [
  {
    suffix: 'TU-101',
    category: UnitTypeCategoryEnum.LOCKER,
    start: '2026-04-01',
    cycles: 3,
    rent: 5000,
    racks: [],
    amenities: {},
  },
  {
    suffix: 'NHO-101',
    category: UnitTypeCategoryEnum.SMALL,
    start: '2026-04-01',
    cycles: 3,
    rent: 8000,
    racks: [],
    amenities: { camera: 1, lock: 1 },
  },
  {
    suffix: 'LON-101',
    category: UnitTypeCategoryEnum.LARGE,
    start: '2026-05-01',
    cycles: 3,
    rent: 10000,
    racks: [],
    amenities: { air: 1, camera: 1, carton: 2, porter: 1 },
  },
  {
    suffix: 'KHO-01',
    category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
    start: '2026-05-01',
    cycles: 3,
    rent: 5000,
    racks: ['R01'],
    amenities: { camera: 1, carton: 2 },
  },
  {
    suffix: 'TU-201',
    category: UnitTypeCategoryEnum.LOCKER,
    start: '2026-06-01',
    cycles: 6,
    rent: 5000,
    racks: [],
    amenities: { lock: 1 },
  },
  {
    suffix: 'NHO-201',
    category: UnitTypeCategoryEnum.SMALL,
    start: '2026-06-01',
    cycles: 6,
    rent: 8000,
    racks: [],
    amenities: { air: 1 },
  },
  {
    suffix: 'LON-201',
    category: UnitTypeCategoryEnum.LARGE,
    start: '2026-06-01',
    cycles: 6,
    rent: 10000,
    racks: [],
    amenities: { air: 1, camera: 1 },
  },
  {
    suffix: 'KHO-01',
    category: UnitTypeCategoryEnum.WAREHOUSE_RACK,
    start: '2026-06-01',
    cycles: 6,
    rent: 18000,
    racks: ['R05', 'R09'],
    amenities: { camera: 1, carton: 4, porter: 1 },
  },
];

function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof mongoose.Types.ObjectId) return String(value);
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => [key, canonical(v)])
    );
  return value;
}
const hash = (value: unknown) => sha256(JSON.stringify(canonical(value)));
const hashRows = (rows: Document[]) =>
  hash([...rows].sort((a, b) => String(a._id).localeCompare(String(b._id))));
const sameId = (a: unknown, b: unknown) => String(a) === String(b);
const oid = (key: string) =>
  new mongoose.Types.ObjectId(
    sha256(`${FINANCE_CHECKPOINT_ID}:${key}`).slice(0, 24)
  );
const clockOn = (day: Date | string, time: string) =>
  new Date(`${getVNDateString(day)}T${time}:00+07:00`);
function one(
  rows: Document[],
  predicate: (row: Document) => boolean,
  reason: string
): Document {
  const found = rows.filter(predicate);
  if (found.length !== 1) throw new Error(reason);
  return found[0];
}
const live = (row: Document) =>
  !row.deleted && row.status === UserStatusEnum.ACTIVE;
async function validated<T extends mongoose.Document>(
  row: T
): Promise<Document> {
  await row.validate();
  return row.toObject();
}

export function parseFinanceArgs(
  args: string[]
): { apply: false } | { apply: true; database: string } {
  const flags = new Set<string>();
  let database: string | undefined;
  for (let n = 0; n < args.length; n++) {
    const flag = args[n];
    if (flags.has(flag)) throw new Error('DUPLICATE_FINANCE_ARGUMENT');
    flags.add(flag);
    if (flag === '--milestone') {
      if (args[++n] !== '5') throw new Error('MILESTONE_5_REQUIRED');
    } else if (flag === '--database') {
      database = args[++n];
      if (!database || database.startsWith('--'))
        throw new Error('DATABASE_NAME_REQUIRED');
    } else if (!['--apply', '--dry-run'].includes(flag))
      throw new Error('INVALID_FINANCE_ARGUMENT');
  }
  if (!flags.has('--milestone')) throw new Error('MILESTONE_5_REQUIRED');
  if (flags.has('--apply')) {
    if (!database || flags.has('--dry-run'))
      throw new Error('APPLY_REQUIRES_DATABASE');
    return { apply: true, database };
  }
  return { apply: false };
}

export async function loadFinanceFoundation(
  db: Db,
  session?: Session
): Promise<FinanceFoundation> {
  const result = {} as FinanceFoundation;
  for (const name of FOUNDATION_NAMES)
    result[name] = await db
      .collection(name)
      .find({}, { session })
      .sort({ _id: 1 })
      .toArray();
  return result;
}

export async function buildContractsFinance(
  f: FinanceFoundation,
  now: Date,
  assets: FinanceAssetMap = {}
): Promise<FinanceFixture> {
  if (now < startOfDayVN('2026-06-01') || now > endOfDayVN('2026-11-27'))
    throw new Error('FINANCE_REFERENCE_DATE_OUTSIDE_ACTIVE_WINDOW');
  const result: FinanceFixture = {
    sourceHash: hash(f),
    rows: {
      contracttemplates: [],
      signingauthorizations: [],
      reservations: [],
      contracts: [],
      invoices: [],
      payments: [],
      refundrequests: [],
    },
    updates: [],
    documents: [],
    assetsReady: true,
    referenceDate: now,
    summary: {
      rentalAndAmenities: 0,
      depositsCollected: 0,
      depositsRefunded: 0,
      depositsHeld: 0,
    },
  };
  const legal = one(
    f.legalentities,
    (r) => live(r) && r.companyName === 'Công Ty TNHH Storage Hub',
    'FINANCE_EXISTING_LEGAL_ENTITY_REQUIRED'
  );
  const reservationConfig = getReservationConfig();
  if (
    reservationConfig.holdMinutes <= 0 ||
    reservationConfig.maxAdvanceDays < 3
  )
    throw new Error('FINANCE_RESERVATION_POLICY_INVALID');
  const templateId = oid('template');
  result.rows.contracttemplates.push(
    await validated(
      new ContractTemplate({
        _id: templateId,
        templateCode: 'SEED-M5-STORAGE-2026',
        version: '1.0.0',
        title: 'Hợp đồng lưu trữ mẫu Milestone 5',
        contentHtml:
          '<article><h1>DỮ LIỆU SEED — KHÔNG CÓ GIÁ TRỊ GIAO DỊCH</h1><p>Mẫu kiểm tra hợp đồng thuê phòng hoặc kệ lưu trữ, thanh toán theo kỳ 30 ngày, thu cọc một kỳ tiền thuê, tiện ích theo kỳ hoặc một lần. Các bên xác nhận nhận kho và quyết toán trả kho theo dữ liệu của từng hợp đồng.</p></article>',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
    )
  );
  function document(key: string, title: string, lines: string[]) {
    const spec = financeDocument(key, title, lines);
    result.documents.push(spec);
    const asset = assets[key];
    if (
      !asset ||
      asset.key !== key ||
      asset.sourceHash !== spec.sourceHash ||
      asset.publicId !== spec.publicId ||
      !/^[a-f0-9]{64}$/.test(asset.fileHash) ||
      !Number.isFinite(Date.parse(asset.verifiedAt)) ||
      !/^https:\/\/res\.cloudinary\.com\//.test(asset.url)
    ) {
      result.assetsReady = false;
      return { url: `pending:${key}`, fileHash: null, uploadedAt: now };
    }
    return {
      url: asset.url,
      fileHash: sha256(asset.url),
      uploadedAt: new Date(asset.uploadedAt),
    };
  }
  function update(
    collection: ResourceUpdate['collection'],
    before: Document,
    set: Document,
    resource: AuditResourceEnum
  ) {
    if (
      result.updates.some(
        (u) => u.collection === collection && sameId(u.id, before._id)
      )
    )
      throw new Error('FINANCE_DUPLICATE_RESOURCE_UPDATE');
    result.updates.push({
      collection,
      id: before._id,
      before,
      set: { ...set, updatedAt: now },
      resource,
    });
  }
  for (let district = 2; district <= 5; district++) {
    const code = `Q${district}`;
    const facility = one(
      f.facilities,
      (r) => r.code === code && live(r),
      'FINANCE_FACILITY_REQUIRED'
    );
    if (facility.legalEntityId && !sameId(facility.legalEntityId, legal._id))
      throw new Error('FINANCE_FACILITY_LEGAL_CONFLICT');
    const actor = (email: string, role: RoleEnum) =>
      one(
        f.users,
        (r) =>
          r.email === email &&
          live(r) &&
          r.role === role &&
          (role === RoleEnum.CUSTOMER ||
            sameId(r.assignedFacilityId, facility._id)),
        'FINANCE_ACTOR_ASSIGNMENT_INVALID'
      );
    const customer = actor(`kh${district}@example.com`, RoleEnum.CUSTOMER);
    const manager = actor(
      `qlq${district}@example.com`,
      RoleEnum.FACILITY_MANAGER
    );
    const staff = actor(`nv1q${district}@example.com`, RoleEnum.FACILITY_STAFF);
    const inspector = actor(
      `nv2q${district}@example.com`,
      RoleEnum.FACILITY_STAFF
    );
    const cashier = actor(
      `nv3q${district}@example.com`,
      RoleEnum.FACILITY_STAFF
    );
    const profile = one(
      f.profiles,
      (r) => sameId(r.userId, customer._id) && !r.deleted,
      'FINANCE_CUSTOMER_PROFILE_REQUIRED'
    );
    const authDocument = document(
      `authorization-${code}`,
      'VĂN BẢN ỦY QUYỀN KÝ MÔ PHỎNG',
      [
        `Số: SEED-M5-UQ-${code}`,
        `Pháp nhân: ${legal.companyName}`,
        `Người nhận: Quản lý Quận ${district}`,
        `Phạm vi: cơ sở Quận ${district}`,
        'Hiệu lực: 01/01/2026 đến 31/12/2026',
        'Chỉ dùng kiểm tra dữ liệu; không phải văn bản ủy quyền thật.',
      ]
    );
    const auth = await validated(
      new SigningAuthorization({
        _id: oid(`authorization:${code}`),
        legalEntityId: legal._id,
        authorizedUserId: manager._id,
        facilityIds: [facility._id],
        authorizationNumber: `SEED-M5-UQ-${code}`,
        issuedDate: startOfDayVN('2026-01-01'),
        validFrom: startOfDayVN('2026-01-01'),
        validTo: endOfDayVN('2026-12-31'),
        documentUrl: authDocument.url,
        fileHash: authDocument.fileHash,
        status: 'active',
        notes: NOTE,
        createdAt: now,
        updatedAt: now,
      })
    );
    result.rows.signingauthorizations.push(auth);
    update(
      'facilities',
      facility,
      { legalEntityId: legal._id },
      AuditResourceEnum.FACILITY
    );
    const usage = new Map<string, { offering: Document; quantity: number }>();
    const slot = one(
      f.facilitytimeslots,
      (r) =>
        sameId(r.facilityId, facility._id) &&
        !r.deleted &&
        r.isActive &&
        r.startTime === '09:00' &&
        r.endTime === '11:00',
      'FINANCE_RESERVATION_SLOT_REQUIRED'
    );
    if (slot.maxCapacity < 2)
      throw new Error('FINANCE_RESERVATION_SLOT_CAPACITY_INVALID');
    for (const [index, item] of CASES.entries()) {
      const contractCode = `SEED-M5-${code}-${String(index + 1).padStart(2, '0')}`;
      const contractId = oid(contractCode),
        start = startOfDayVN(item.start),
        end = endOfDayVN(addDays(start, item.cycles * 30 - 1));
      const completed = item.cycles === 3;
      // Each facility: two room and two rack reservations; two completed and two active contracts.
      const viaReservation = [0, 3, 6, 7].includes(index);
      const reservationId = viaReservation
        ? oid(`${contractCode}:reservation`)
        : null;
      const bookedAt = clockOn(addDays(start, -3), '08:00');
      const draft = clockOn(addDays(start, -1), '09:00'),
        signed = clockOn(addDays(start, -1), '10:00');
      const depositPaidAt = viaReservation
          ? new Date(
              bookedAt.getTime() +
                Math.min(5 * 60000, reservationConfig.holdMinutes * 30000)
            )
          : clockOn(addDays(start, -1), '10:15'),
        firstPaidAt = clockOn(addDays(start, -1), '10:30');
      const checkIn = clockOn(start, '09:00'),
        checkOut = completed ? clockOn(end, '16:00') : null;
      const unit = one(
        f.storageunits,
        (r) =>
          r.unitNumber === `${code}-${item.suffix}` &&
          sameId(r.facilityId, facility._id) &&
          !r.deleted,
        'FINANCE_UNIT_REQUIRED'
      );
      if (unit.status !== StorageUnitStatusEnum.AVAILABLE)
        throw new Error('FINANCE_UNIT_UNAVAILABLE');
      const type = one(
        f.unittypes,
        (r) =>
          sameId(r._id, unit.unitTypeId) &&
          r.category === item.category &&
          live(r),
        'FINANCE_UNIT_TYPE_MISMATCH'
      );
      if (item.racks.length && unit.floor !== 1)
        throw new Error('FINANCE_WAREHOUSE_FLOOR_INVALID');
      const offer = one(
        f.facilityunittypeofferings,
        (r) =>
          sameId(r.facilityId, facility._id) &&
          sameId(r.unitTypeId, type._id) &&
          live(r),
        'FINANCE_UNIT_OFFERING_REQUIRED'
      );
      if (
        offer.billingUnit !== BillingUnitEnum.MONTH ||
        offer.depositMultiplier !== 1 ||
        offer.minRentalDays !== 30
      )
        throw new Error('FINANCE_PRICE_CONFIG_CHANGED');
      const racks = item.racks.map((suffix) =>
        one(
          f.storageracks,
          (r) =>
            r.rackCode === `${code}-${suffix}` &&
            sameId(r.facilityId, facility._id) &&
            sameId(r.storageUnitId, unit._id) &&
            !r.deleted,
          'FINANCE_RACK_REQUIRED'
        )
      );
      for (const rack of racks)
        if (
          rack.status !== RackStatusEnum.AVAILABLE ||
          rack.currentContractId ||
          rack.currentCustomerId ||
          rack.customPrice !== null
        )
          throw new Error('FINANCE_RACK_UNAVAILABLE_OR_PRICE_CHANGED');
      const rent = racks.length
        ? racks.reduce(
            (sum, r) => sum + (offer.rackZonePricing?.[r.zone] ?? NaN),
            0
          )
        : offer.pricePerUnit;
      if (rent !== item.rent) throw new Error('FINANCE_RENTAL_PRICE_CHANGED');
      const amenities: Document[] = [];
      for (const [key, quantity] of Object.entries(item.amenities) as [
        AmenityKey,
        number,
      ][]) {
        const spec = AMENITIES[key];
        const amenity = one(
          f.amenities,
          (r) =>
            r.name === spec.name &&
            live(r) &&
            r.type ===
              (spec.physical
                ? AmenityTypeEnum.PHYSICAL
                : AmenityTypeEnum.SERVICE),
          'FINANCE_AMENITY_REQUIRED'
        );
        const offering = one(
          f.facilityamenityofferings,
          (r) =>
            sameId(r.facilityId, facility._id) &&
            sameId(r.amenityId, amenity._id) &&
            live(r),
          'FINANCE_AMENITY_OFFERING_REQUIRED'
        );
        if (
          offering.pricePerUnit !== spec.price ||
          offering.billingUnit !== spec.billing
        )
          throw new Error('FINANCE_AMENITY_PRICE_CHANGED');
        amenities.push({
          facilityAmenityOfferingId: offering._id,
          amenityId: amenity._id,
          name: spec.name,
          quantity,
          pricePerUnit: spec.price,
          billingUnit: spec.billing,
          totalPrice: quantity * spec.price,
          addedAt: draft,
        });
        if (!completed && spec.physical) {
          const previous = usage.get(String(offering._id));
          usage.set(String(offering._id), {
            offering,
            quantity: (previous?.quantity ?? 0) + quantity,
          });
        }
      }
      const recurring =
        rent +
        amenities
          .filter((a) => a.billingUnit !== BillingUnitEnum.ONE_TIME)
          .reduce((sum, a) => sum + a.totalPrice, 0);
      const signedDocument = document(
        `contract-${contractCode}`,
        'HỢP ĐỒNG LƯU TRỮ MÔ PHỎNG',
        [
          `Mã: ${contractCode}`,
          `Nguồn: ${viaReservation ? `${contractCode}-RES` : 'Khách vãng lai tại quầy'}`,
          `Cơ sở: Quận ${district} — Khách hàng ${district}`,
          `Tài nguyên: ${unit.unitNumber}${racks.length ? ' / ' + racks.map((r) => r.rackCode).join(', ') : ''}`,
          `Thời hạn: ${getVNDateString(start)} đến ${getVNDateString(end)}`,
          `Số kỳ 30 ngày: ${item.cycles}`,
          `Tiền thuê: ${rent.toLocaleString('vi-VN')}đ/kỳ; tiền cọc: ${rent.toLocaleString('vi-VN')}đ`,
          `Thu định kỳ gồm tiện ích: ${recurring.toLocaleString('vi-VN')}đ`,
          ...amenities.map(
            (a) =>
              `${a.name} ×${a.quantity}: ${a.totalPrice.toLocaleString('vi-VN')}đ / ${a.billingUnit === BillingUnitEnum.ONE_TIME ? 'một lần' : 'kỳ'}`
          ),
          `Hai bên ký mô phỏng: Khách hàng ${district}, Quản lý Quận ${district}`,
        ]
      );
      const contract = await validated(
        new Contract({
          _id: contractId,
          contractCode,
          source: viaReservation
            ? ContractSourceEnum.RESERVATION
            : ContractSourceEnum.WALK_IN,
          reservationId,
          customerId: customer._id,
          facilityId: facility._id,
          storageUnitId: unit._id,
          rentalTargetType: racks.length
            ? RentalTargetTypeEnum.STORAGE_RACK
            : RentalTargetTypeEnum.STORAGE_UNIT,
          rentedRackIds: racks.map((r) => r._id),
          facilityUnitTypeOfferingId: offer._id,
          assignedStaffId: staff._id,
          startDate: start,
          endDate: end,
          actualCheckInDate: checkIn,
          actualCheckOutDate: checkOut,
          billingUnit: BillingUnitEnum.MONTH,
          rentalPrice: rent,
          depositAmount: rent,
          depositPaidAt,
          depositPaymentId: oid(`${contractCode}:deposit`),
          firstPeriodPaidAt: firstPaidAt,
          firstPeriodPaymentId: oid(`${contractCode}:payment:1`),
          totalPeriodicPrice: recurring,
          amenities,
          status: completed
            ? ContractStatusEnum.COMPLETED
            : ContractStatusEnum.ACTIVE,
          termsAccepted: true,
          customerSigned: true,
          customerSignedAt: signed,
          staffSigned: true,
          staffSignedAt: checkIn,
          earlyCheckIn: viaReservation ? false : null,
          outOfSlot: viaReservation ? false : null,
          inspectedBy: completed ? inspector._id : null,
          depositStatus: completed
            ? ContractDepositStatusEnum.REFUNDED
            : ContractDepositStatusEnum.HELD,
          refundAmount: completed ? rent : 0,
          settlementConfirmedAt: completed ? clockOn(end, '16:15') : null,
          inspectionNotes: completed
            ? 'Nghiệm thu mẫu: không có hư hại, không quá hạn.'
            : null,
          signedContractFiles: [signedDocument],
          legalEntitySnapshot: { ...legal, legalEntityId: legal._id },
          customerSnapshot: {
            customerId: customer._id,
            name: customer.name,
            email: customer.email,
            phoneNumber: customer.phoneNumber,
            dateOfBirth: profile.dateOfBirth ?? null,
            address: profile.address ?? null,
            idCardNumberMasked: profile.idCardLast4
              ? `****${profile.idCardLast4}`
              : null,
            signedAt: signed,
          },
          signingAuthorizationSnapshot: { ...auth, authorizationId: auth._id },
          templateVersionId: templateId,
          notes: NOTE,
          createdAt: draft,
          updatedAt: checkOut ?? checkIn,
        })
      );
      if (viaReservation)
        result.rows.reservations.push(
          await validated(
            new Reservation({
              _id: reservationId,
              reservationCode: `${contractCode}-RES`,
              customerId: customer._id,
              facilityId: facility._id,
              facilityUnitTypeOfferingId: offer._id,
              storageUnitId: unit._id,
              rentalTargetType: contract.rentalTargetType,
              rentedRackIds: contract.rentedRackIds,
              startDate: start,
              checkInDate: start,
              checkInTimeSlot: `${slot.startTime} - ${slot.endTime}`,
              rentalDuration: item.cycles * 30,
              billingUnit: BillingUnitEnum.MONTH,
              basePrice: rent,
              depositAmount: rent,
              totalAmount: rent,
              amenities,
              status: ReservationStatusEnum.COMPLETED,
              paidAt: depositPaidAt,
              paidAmount: rent,
              paymentId: contract.depositPaymentId,
              confirmedBy: manager._id,
              confirmedAt: clockOn(bookedAt, '09:00'),
              assignedStaffId: staff._id,
              assignedStaffAt: clockOn(draft, '08:30'),
              arrivedAt: clockOn(start, '08:55'),
              arrivedBy: staff._id,
              termsAccepted: true,
              policyVersion: reservationConfig.policyVersion,
              policySnapshot: buildReservationPolicySnapshot(reservationConfig),
              acceptedAt: bookedAt,
              earlyCheckIn: false,
              outOfSlot: false,
              notes: NOTE,
              createdAt: bookedAt,
              updatedAt: checkIn,
            })
          )
        );
      result.rows.contracts.push(contract);
      result.rows.payments.push(
        await validated(
          new Payment({
            _id: contract.depositPaymentId,
            paymentCode: `${contractCode}-DEP`,
            purpose: viaReservation
              ? PaymentPurposeEnum.RESERVATION_DEPOSIT
              : PaymentPurposeEnum.CONTRACT_DEPOSIT,
            contractId: viaReservation ? null : contractId,
            reservationId,
            customerId: customer._id,
            facilityId: facility._id,
            amount: rent,
            paidAmount: rent,
            method: PaymentMethodEnum.CASH,
            status: PaymentStatusEnum.PAID,
            paidAt: depositPaidAt,
            confirmedAt: depositPaidAt,
            confirmedBy: staff._id,
            note: NOTE,
            createdAt: viaReservation ? bookedAt : draft,
            updatedAt: depositPaidAt,
          })
        )
      );
      for (let cycle = 1; cycle <= item.cycles; cycle++) {
        const periodStart = startOfDayVN(addDays(start, (cycle - 1) * 30)),
          periodEnd = endOfDayVN(addDays(periodStart, 29));
        const invoiceId = oid(`${contractCode}:invoice:${cycle}`),
          paymentId = oid(`${contractCode}:payment:${cycle}`);
        const paidAt =
          cycle === 1
            ? firstPaidAt
            : clockOn(addDays(periodStart, -1), '10:30');
        const issuedAt =
          cycle === 1 ? draft : clockOn(addDays(periodStart, -7), '09:00');
        const items = [
          {
            name: `Tiền thuê kỳ ${cycle} (${contractCode})`,
            quantity: 1,
            unitPrice: rent,
            amount: rent,
            itemType: InvoiceItemTypeEnum.RENT,
          },
          ...amenities
            .filter(
              (a) => cycle === 1 || a.billingUnit !== BillingUnitEnum.ONE_TIME
            )
            .map((a) => ({
              name: a.name,
              quantity: a.quantity,
              unitPrice: a.pricePerUnit,
              amount: a.totalPrice,
              itemType: InvoiceItemTypeEnum.AMENITY,
            })),
        ];
        const amount = items.reduce((sum, line) => sum + line.amount, 0);
        result.rows.invoices.push(
          await validated(
            new Invoice({
              _id: invoiceId,
              invoiceCode: `${contractCode}-INV-${cycle}`,
              contractId,
              customerId: customer._id,
              facilityId: facility._id,
              type:
                cycle === 1
                  ? InvoiceTypeEnum.FIRST_PERIOD
                  : InvoiceTypeEnum.RECURRING,
              status: InvoiceStatusEnum.PAID,
              billingPeriodIndex: cycle,
              periodStartDate: periodStart,
              periodEndDate: periodEnd,
              dueDate: startOfDayVN(periodStart),
              items,
              subtotal: amount,
              totalAmount: amount,
              paidAmount: amount,
              paidAt,
              paymentId,
              paymentMethod: PaymentMethodEnum.CASH,
              issuedAt,
              createdBy: staff._id,
              confirmedBy: staff._id,
              confirmedAt: paidAt,
              notes: NOTE,
              createdAt: issuedAt,
              updatedAt: paidAt,
            })
          )
        );
        result.rows.payments.push(
          await validated(
            new Payment({
              _id: paymentId,
              paymentCode: `${contractCode}-PAY-${cycle}`,
              purpose:
                cycle === 1
                  ? PaymentPurposeEnum.RENT_FIRST_PERIOD
                  : PaymentPurposeEnum.INVOICE_PAYMENT,
              contractId,
              invoiceId,
              customerId: customer._id,
              facilityId: facility._id,
              amount,
              paidAmount: amount,
              method: PaymentMethodEnum.CASH,
              status: PaymentStatusEnum.PAID,
              paidAt,
              confirmedAt: paidAt,
              confirmedBy: staff._id,
              note: NOTE,
              createdAt: issuedAt,
              updatedAt: paidAt,
            })
          )
        );
      }
      if (completed) {
        result.rows.invoices.push(
          await validated(
            new Invoice({
              _id: oid(`${contractCode}:settlement`),
              invoiceCode: `${contractCode}-SET`,
              contractId,
              customerId: customer._id,
              facilityId: facility._id,
              type: InvoiceTypeEnum.CHECK_OUT_SETTLEMENT,
              status: InvoiceStatusEnum.PAID,
              billingPeriodIndex: 1,
              periodStartDate: startOfDayVN(end),
              periodEndDate: end,
              dueDate: startOfDayVN(end),
              items: [
                {
                  name: 'Quyết toán hoàn tất hợp đồng thuê kho',
                  quantity: 1,
                  unitPrice: 0,
                  amount: 0,
                  itemType: InvoiceItemTypeEnum.DISCOUNT,
                },
              ],
              subtotal: 0,
              totalAmount: 0,
              paidAmount: 0,
              paidAt: checkOut,
              issuedAt: checkOut,
              notes: NOTE,
              createdAt: checkOut,
              updatedAt: checkOut,
            })
          )
        );
        const receipt = document(
          `refund-${contractCode}`,
          'CHỨNG TỪ HOÀN CỌC MÔ PHỎNG',
          [
            `Mã: ${contractCode}-REF`,
            `Khách hàng ${district} — cơ sở Quận ${district}`,
            `Hoàn cọc: ${rent.toLocaleString('vi-VN')}đ`,
            `Ngày: ${getVNDateString(end)}`,
            `Đề nghị: Nhân viên 2 Quận ${district}`,
            `Duyệt: Quản lý Quận ${district}`,
            `Xác nhận: Nhân viên 3 Quận ${district}`,
            'Không phát sinh giao dịch ngân hàng thật.',
          ]
        );
        result.rows.refundrequests.push(
          await validated(
            new RefundRequest({
              _id: oid(`${contractCode}:refund`),
              refundCode: `${contractCode}-REF`,
              contractId,
              paymentId: contract.depositPaymentId,
              facilityId: facility._id,
              customerId: customer._id,
              amount: rent,
              reason: RefundRequestReasonEnum.DEPOSIT_SETTLEMENT,
              status: RefundRequestStatusEnum.PAID,
              referenceCode: `SEED-REF-${code}-${index + 1}`,
              proofImageUrl: receipt.url,
              note: NOTE,
              requestedBy: inspector._id,
              requestedAt: clockOn(end, '16:05'),
              approvedBy: manager._id,
              approvedAt: clockOn(end, '16:30'),
              paidBy: cashier._id,
              paidAt: clockOn(end, '17:00'),
              createdAt: clockOn(end, '16:05'),
              updatedAt: clockOn(end, '17:00'),
            })
          )
        );
      }
      if (!racks.length)
        update(
          'storageunits',
          unit,
          {
            status: completed
              ? StorageUnitStatusEnum.UNDER_MAINTENANCE
              : StorageUnitStatusEnum.OCCUPIED,
          },
          AuditResourceEnum.STORAGE_UNIT
        );
      else if (!completed)
        for (const rack of racks)
          update(
            'storageracks',
            rack,
            {
              status: RackStatusEnum.RENTED,
              currentContractId: contractId,
              currentCustomerId: customer._id,
            },
            AuditResourceEnum.STORAGE_RACK
          );
    }
    for (const { offering, quantity } of usage.values()) {
      if (
        !Number.isInteger(offering.inUseQuantity) ||
        offering.inUseQuantity < 0 ||
        (offering.totalQuantity !== null &&
          offering.inUseQuantity + quantity > offering.totalQuantity)
      )
        throw new Error('FINANCE_AMENITY_STOCK_INSUFFICIENT');
      update(
        'facilityamenityofferings',
        offering,
        { inUseQuantity: offering.inUseQuantity + quantity },
        AuditResourceEnum.FACILITY_AMENITY_OFFERING
      );
    }
  }
  validateReservationTransfers(result);
  result.summary = {
    rentalAndAmenities: result.rows.invoices.reduce(
      (s, r) => s + r.totalAmount,
      0
    ),
    depositsCollected: result.rows.payments
      .filter((p) =>
        [
          PaymentPurposeEnum.CONTRACT_DEPOSIT,
          PaymentPurposeEnum.RESERVATION_DEPOSIT,
        ].includes(p.purpose)
      )
      .reduce((s, r) => s + r.paidAmount, 0),
    depositsRefunded: result.rows.refundrequests.reduce(
      (s, r) => s + r.amount,
      0
    ),
    depositsHeld: result.rows.contracts
      .filter((c) => c.status === ContractStatusEnum.ACTIVE)
      .reduce((s, r) => s + r.depositAmount, 0),
  };
  if (
    hash(result.summary) !==
    hash({
      rentalAndAmenities: 2500000,
      depositsCollected: 276000,
      depositsRefunded: 112000,
      depositsHeld: 164000,
    })
  )
    throw new Error('FINANCE_TOTALS_MISMATCH');
  for (const [name] of GROUPS)
    if (result.rows[name].length !== EXPECTED_COUNTS[name])
      throw new Error('FINANCE_FIXTURE_COUNT_MISMATCH');
  return result;
}

export function validateReservationTransfers(fixture: FinanceFixture) {
  const reservations = fixture.rows.reservations;
  const contracts = fixture.rows.contracts;
  const deposits = fixture.rows.payments.filter((p) =>
    [
      PaymentPurposeEnum.CONTRACT_DEPOSIT,
      PaymentPurposeEnum.RESERVATION_DEPOSIT,
    ].includes(p.purpose)
  );
  const fail = () => {
    throw new Error('FINANCE_RESERVATION_DEPOSIT_LINK_INVALID');
  };
  if (
    reservations.length !== 16 ||
    contracts.filter((c) => c.source === ContractSourceEnum.RESERVATION)
      .length !== 16 ||
    deposits.length !== 32 ||
    new Set(contracts.map((c) => String(c.depositPaymentId))).size !== 32
  )
    fail();
  for (const c of contracts) {
    const payments = deposits.filter((p) => sameId(p._id, c.depositPaymentId));
    if (payments.length !== 1) fail();
    const p = payments[0];
    if (
      p.amount !== c.depositAmount ||
      p.paidAmount !== c.depositAmount ||
      p.status !== PaymentStatusEnum.PAID ||
      !sameId(p.customerId, c.customerId) ||
      !sameId(p.facilityId, c.facilityId) ||
      hash(p.paidAt) !== hash(c.depositPaidAt)
    )
      fail();
    if (c.source === ContractSourceEnum.RESERVATION) {
      const linked = reservations.filter((r) => sameId(r._id, c.reservationId));
      if (linked.length !== 1) fail();
      const r = linked[0];
      if (
        p.purpose !== PaymentPurposeEnum.RESERVATION_DEPOSIT ||
        p.contractId !== null ||
        !sameId(p.reservationId, r._id) ||
        !sameId(r.paymentId, p._id) ||
        r.status !== ReservationStatusEnum.COMPLETED ||
        r.depositAmount !== c.depositAmount ||
        r.paidAmount !== c.depositAmount ||
        hash(r.paidAt) !== hash(c.depositPaidAt) ||
        hash(r.startDate) !== hash(c.startDate) ||
        c.endDate.getTime() + 1 - r.startDate.getTime() !==
          r.rentalDuration * 86400000 ||
        hash(r.rentedRackIds) !== hash(c.rentedRackIds)
      )
        fail();
      for (const field of [
        'customerId',
        'facilityId',
        'storageUnitId',
        'facilityUnitTypeOfferingId',
      ])
        if (!sameId(r[field], c[field])) fail();
    } else if (
      c.source !== ContractSourceEnum.WALK_IN ||
      c.reservationId !== null ||
      p.reservationId !== null ||
      p.purpose !== PaymentPurposeEnum.CONTRACT_DEPOSIT ||
      !sameId(p.contractId, c._id)
    )
      fail();
  }
  if (
    new Set(
      contracts
        .filter((c) => c.source === ContractSourceEnum.RESERVATION)
        .map((c) => String(c.reservationId))
    ).size !== 16
  )
    fail();
}

async function assertBookingAvailability(
  db: Db,
  contracts: Document[],
  session?: Session
) {
  for (const contract of contracts) {
    const target = contract.rentedRackIds.length
      ? { rentedRackIds: { $in: contract.rentedRackIds } }
      : { storageUnitId: contract.storageUnitId };
    if (
      await db.collection('reservations').findOne(
        {
          ...target,
          deleted: { $ne: true },
          status: {
            $in: [
              ReservationStatusEnum.PENDING_PAYMENT,
              ReservationStatusEnum.PAYMENT_SUCCESSFUL,
              ReservationStatusEnum.CONFIRMED,
              ReservationStatusEnum.OVERDUE,
            ],
          },
        },
        { session }
      )
    )
      throw new Error('FINANCE_EXISTING_RESERVATION_CONFLICT');
    if (
      await db.collection('contracts').findOne(
        {
          ...target,
          deleted: { $ne: true },
          status: { $ne: ContractStatusEnum.CANCELLED },
          startDate: { $lte: contract.endDate },
          endDate: { $gte: contract.startDate },
        },
        { session }
      )
    )
      throw new Error('FINANCE_EXISTING_CONTRACT_CONFLICT');
  }
}

export async function ensureFinanceIndexes(db: Db) {
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
                .map(([field, direction]) => `${field}_${direction}`)
                .join('_'),
          },
        ],
      });
}

function checkpoint(db: Db, session?: Session) {
  return db
    .collection<Checkpoint>('seedmilestones')
    .findOne({ _id: FINANCE_CHECKPOINT_ID }, { session });
}

export async function applyContractsFinance(
  client: Client,
  database: string,
  fixture: FinanceFixture,
  backupStem: string,
  now = new Date()
) {
  const db = client.db(database),
    session = client.startSession();
  try {
    const result = await session.withTransaction(
      async () => {
        const previous = await checkpoint(db, session);
        if (previous)
          return { alreadyApplied: true, backupStem: previous.backupStem };
        if (
          !(await db
            .collection<{ _id: string; status: string }>('seedmilestones')
            .findOne(
              { _id: 'module-seed-v1:4', status: 'complete' },
              { session }
            ))
        )
          throw new Error('MILESTONE_4_REQUIRED');
        if (!fixture.assetsReady)
          throw new Error('FINANCE_VERIFIED_ASSETS_REQUIRED');
        validateReservationTransfers(fixture);
        if (now < startOfDayVN('2026-06-01') || now > endOfDayVN('2026-11-27'))
          throw new Error('FINANCE_REFERENCE_DATE_OUTSIDE_ACTIVE_WINDOW');
        if (
          hash(await loadFinanceFoundation(db, session)) !== fixture.sourceHash
        )
          throw new Error('FINANCE_FOUNDATION_CHANGED');
        await assertBookingAvailability(db, fixture.rows.contracts, session);
        const logs: Document[] = [];
        for (const update of fixture.updates) {
          const changed = await db
            .collection(update.collection)
            .updateOne(update.before, { $set: update.set }, { session });
          if (changed.matchedCount !== 1)
            throw new Error('FINANCE_RESOURCE_CONFLICT');
          logs.push(
            await audit(
              AuditActionEnum.UPDATE,
              update.resource,
              String(update.id),
              {
                operation: 'seed-contracts-finance',
                simulated: true,
                collection: update.collection,
              },
              5
            )
          );
        }
        const ids = {} as Checkpoint['ids'],
          hashes = {} as Checkpoint['hashes'];
        for (const [name, , resource] of GROUPS) {
          await db.collection(name).insertMany(fixture.rows[name], { session });
          ids[name] = fixture.rows[name].map((row) => row._id);
          hashes[name] = hashRows(fixture.rows[name]);
          for (const row of fixture.rows[name])
            logs.push(
              await audit(
                AuditActionEnum.CREATE,
                resource,
                String(row._id),
                {
                  operation: 'seed-contracts-finance',
                  simulated: true,
                  collection: name,
                },
                5
              )
            );
        }
        logs.push(
          await audit(
            AuditActionEnum.CREATE,
            AuditResourceEnum.CONTRACT,
            FINANCE_CHECKPOINT_ID,
            {
              operation: 'seed-contracts-finance-complete',
              simulated: true,
              counts: EXPECTED_COUNTS,
            },
            5
          )
        );
        await db.collection('auditlogs').insertMany(logs, { session });
        await db.collection<Checkpoint>('seedmilestones').insertOne(
          {
            _id: FINANCE_CHECKPOINT_ID,
            status: 'complete',
            backupStem,
            completedAt: new Date(),
            ids,
            hashes,
            resources: fixture.updates.map(({ collection, id, set }) => ({
              collection,
              id,
              set,
            })),
            summary: fixture.summary,
          },
          { session }
        );
        await verifyContractsFinance(db, true, session);
        return { alreadyApplied: false, backupStem };
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }
    );
    if (!result) throw new Error('FINANCE_TRANSACTION_INCOMPLETE');
    return result;
  } finally {
    await session.endSession();
  }
}

export async function verifyContractsFinance(
  db: Db,
  initial = false,
  session?: Session
) {
  const marker = await checkpoint(db, session);
  if (!marker) throw new Error('FINANCE_CHECKPOINT_MISSING');
  if (
    !marker.ids.reservations ||
    marker.ids.reservations.length !== EXPECTED_COUNTS.reservations
  )
    throw new Error('FINANCE_CHECKPOINT_RESERVATION_VERSION_MISMATCH');
  const counts: Partial<Record<Collection, number>> = {};
  for (const [name] of GROUPS) {
    const rows = await db
      .collection(name)
      .find({ _id: { $in: marker.ids[name] } }, { session })
      .toArray();
    if (rows.length !== EXPECTED_COUNTS[name])
      throw new Error('FINANCE_SEED_RECORD_MISSING');
    if (initial && hashRows(rows) !== marker.hashes[name])
      throw new Error('FINANCE_RECORD_MISMATCH');
    counts[name] = rows.length;
  }
  if (initial)
    for (const resource of marker.resources) {
      const row = await db
        .collection(resource.collection)
        .findOne({ _id: resource.id }, { session });
      if (
        !row ||
        Object.entries(resource.set).some(
          ([key, value]) => hash(row[key]) !== hash(value)
        )
      )
        throw new Error('FINANCE_RESOURCE_MISMATCH');
    }
  return {
    ...counts,
    initialTotals: marker.summary,
    completedAt: marker.completedAt,
  };
}

export async function runContractsFinance(args: string[]) {
  const options = parseFinanceArgs(args);
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_REQUIRED');
  const client = new mongoose.mongo.MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  try {
    await client.connect();
    const db = client.db();
    if (options.apply && db.databaseName !== options.database)
      throw new Error('DATABASE_NAME_MISMATCH');
    const marker = await checkpoint(db);
    if (marker) {
      console.log(
        JSON.stringify(
          {
            milestone: 5,
            dryRun: !options.apply,
            alreadyApplied: true,
            resetPerformed: false,
            ...(await verifyContractsFinance(db)),
            next: 'STOP: review milestone 5 before planning milestone 6',
          },
          null,
          2
        )
      );
      return;
    }
    if (
      !(await db
        .collection<{ _id: string; status: string }>('seedmilestones')
        .findOne({ _id: 'module-seed-v1:4', status: 'complete' }))
    )
      throw new Error('MILESTONE_4_REQUIRED');
    const now = new Date(),
      foundation = await loadFinanceFoundation(db);
    const preview = await buildContractsFinance(foundation, now);
    await assertBookingAvailability(db, preview.rows.contracts);
    const readiness = await checkRenderFinanceReadiness(
      fetch,
      foundation.facilities
        .filter((f) => /^Q[1-5]$/.test(f.code))
        .map((f) => ({ code: f.code, id: String(f._id) }))
    );
    const description = {
      milestone: 5,
      database: db.databaseName,
      dryRun: !options.apply,
      resetPerformed: false,
      counts: EXPECTED_COUNTS,
      documents: preview.documents.length,
      totals: preview.summary,
      render: readiness,
      contracts: preview.rows.contracts.map((c) => ({
        code: c.contractCode,
        source: c.source,
        reservation: c.reservationId ? `${c.contractCode}-RES` : null,
        start: getVNDateString(c.startDate),
        end: getVNDateString(c.endDate),
        status: c.status,
        rent: c.rentalPrice,
        periodic: c.totalPeriodicPrice,
        deposit: c.depositAmount,
        unit: foundation.storageunits.find((r) =>
          sameId(r._id, c.storageUnitId)
        )?.unitNumber,
        racks: foundation.storageracks
          .filter((r) =>
            c.rentedRackIds.some((id: unknown) => sameId(id, r._id))
          )
          .map((r) => r.rackCode),
        amenities: c.amenities.map((a: Document) => ({
          name: a.name,
          quantity: a.quantity,
          billingUnit: a.billingUnit,
          pricePerUnit: a.pricePerUnit,
          totalPrice: a.totalPrice,
        })),
        firstInvoice: preview.rows.invoices.find(
          (i) =>
            sameId(i.contractId, c._id) &&
            i.type === InvoiceTypeEnum.FIRST_PERIOD
        )?.totalAmount,
        fullRentalAndAmenities: preview.rows.invoices
          .filter((i) => sameId(i.contractId, c._id))
          .reduce((sum, i) => sum + i.totalAmount, 0),
      })),
      resourceUpdates: preview.updates.map((u) => ({
        collection: u.collection,
        id: String(u.id),
        ...u.set,
      })),
      next: 'STOP: review milestone 5 before planning milestone 6',
    };
    if (!options.apply) {
      console.log(JSON.stringify(description, null, 2));
      return;
    }
    if (!readiness.ready)
      throw new Error(`FINANCE_RENDER_NOT_READY:${readiness.reason}`);
    const files = await writeEncryptedBackup(
      await captureDatabase(client, db.databaseName),
      path.resolve('.agents/memory/backups')
    );
    const verified = await restoreAndVerifyBackup(
      await readEncryptedBackup(files.stem)
    );
    await writeFile(
      `${files.stem}.verified.json`,
      JSON.stringify({ ...verified, purpose: 'before-milestone-5' }, null, 2),
      { flag: 'wx', mode: 0o600 }
    );
    const manifestFile = path.resolve('.agents/memory/seed-m5-assets.json');
    const assets = await prepareFinanceAssets(
      preview.documents,
      manifestFile,
      cloudinaryFinanceProvider()
    );
    // Revalidate current data after external uploads; the transaction still checks this fingerprint.
    const fixture = await buildContractsFinance(
      await loadFinanceFoundation(db),
      new Date(),
      assets
    );
    await ensureFinanceIndexes(db);
    const result = await applyContractsFinance(
      client,
      db.databaseName,
      fixture,
      files.stem
    );
    const report = {
      ...description,
      dryRun: false,
      ...result,
      verified: await verifyContractsFinance(db, true),
      backupStem: files.stem,
      assetManifest: manifestFile,
    };
    await writeFile(
      `${files.stem}.milestone-5.json`,
      JSON.stringify(report, null, 2),
      { mode: 0o600 }
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}
