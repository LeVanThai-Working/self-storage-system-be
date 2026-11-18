import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { ValidationService } from '@tsoa/runtime';
import type { FieldErrors, TsoaRoute } from '@tsoa/runtime';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { StorageUnitService } from '../src/modules/storageUnit/storageUnit.service.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { UnitTypeRepository } from '../src/modules/unitType/unitType.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../src/modules/customerInventory/customerInventory.repository.ts';
import {
  createStorageUnitSchema,
  updateStorageUnitSchema,
} from '../src/modules/storageUnit/schemas/storageUnit.request.schema.ts';
import {
  UnitTypeCategoryEnum,
  UnitTypeStatusEnum,
} from '../src/common/enums/unitType.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { FacilityUnitTypeOfferingStatusEnum } from '../src/common/enums/facilityUnitTypeOffering.enum.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
import { contractResponseSchema } from '../src/modules/contract/schemas/contract.response.schema.ts';
import { reservationResponseSchema } from '../src/modules/reservation/schemas/reservation.response.schema.ts';
import { storageRackResponseSchema } from '../src/modules/storageRack/schemas/storageRack.response.schema.ts';
import { storageUnitRefSchema } from '../src/modules/incident/schemas/incident.response.schema.ts';
import { inventoryStorageUnitSummarySchema } from '../src/modules/customerInventory/schemas/customerInventory.response.schema.ts';

describe('Every StorageUnit has a positive integer floor', () => {
  it('accepts numeric floors and rejects null in generated route validation and OpenAPI', () => {
    const source = ts.createSourceFile(
      'routes.ts',
      readFileSync(new URL('../src/routes/routes.ts', import.meta.url), 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    const declaration = source.statements
      .filter(ts.isVariableStatement)
      .flatMap((statement) => statement.declarationList.declarations)
      .find((declaration) => declaration.name.getText(source) === 'models');
    expect(declaration?.initializer).toBeDefined();
    const models = runInNewContext(
      `(${declaration!.initializer!.getText(source)})`
    ) as TsoaRoute.Models;
    const validator = new ValidationService(models, {
      noImplicitAdditionalProperties: 'throw-on-extras',
      bodyCoercion: true,
    });
    for (const ref of [
      'CreateStorageUnitRequest',
      'UpdateStorageUnitRequest',
    ]) {
      const errors: FieldErrors = {};
      const result: unknown = validator.ValidateParam(
        { ref, required: true },
        {
          ...(ref === 'CreateStorageUnitRequest'
            ? {
                facilityId: '123456789012345678901234',
                unitTypeId: '123456789012345678901235',
                unitNumber: 'Q1-KHO-TEST',
              }
            : {}),
          floor: 1,
        },
        'requestBody',
        errors,
        true
      );
      expect(errors).toEqual({});
      expect(result).toMatchObject({ floor: 1 });
      const invalidErrors: FieldErrors = {};
      validator.ValidateParam(
        { ref, required: true },
        { ...(result as Record<string, unknown>), floor: null },
        'requestBody',
        invalidErrors,
        true
      );
      expect(Object.keys(invalidErrors).length).toBeGreaterThan(0);
    }
    type SpecSchema = {
      $ref?: string;
      properties?: { floor?: { nullable?: boolean; type?: string } };
    };
    const spec = JSON.parse(
      readFileSync(
        new URL('../src/config/swagger.json', import.meta.url),
        'utf8'
      )
    ) as {
      components: {
        schemas: Record<string, SpecSchema>;
      };
    };
    for (const name of [
      'CreateStorageUnitRequest',
      'UpdateStorageUnitRequest',
      'StorageUnitResponse',
    ]) {
      const schema = spec.components.schemas[name]!;
      const resolved = schema.$ref
        ? spec.components.schemas[schema.$ref.split('/').at(-1)!]
        : schema;
      expect(resolved?.properties?.floor?.nullable).not.toBe(true);
      expect(['integer', 'number']).toContain(
        resolved?.properties?.floor?.type
      );
    }
  });
  let service: StorageUnitService;
  const facilityId = new mongoose.Types.ObjectId();
  const warehouseType = new mongoose.Types.ObjectId();
  const roomType = new mongoose.Types.ObjectId();
  beforeAll(async () => {
    await setupTestDB();
    service = new StorageUnitService(
      new StorageUnitRepository(StorageUnit),
      new FacilityRepository(Facility),
      new UnitTypeRepository(UnitType),
      new FacilityUnitTypeOfferingRepository(FacilityUnitTypeOffering),
      new CustomerInventoryRepository(CustomerInventory)
    );
  });
  afterAll(teardownTestDB);
  beforeEach(async () => {
    await clearTestDB();
    await Facility.create({
      _id: facilityId,
      name: 'Kho Quận 1',
      code: 'Q1',
      address: 'Địa chỉ mẫu',
      city: 'TP.HCM',
      status: FacilityStatusEnum.ACTIVE,
    });
    for (const [id, category] of [
      [warehouseType, UnitTypeCategoryEnum.WAREHOUSE_RACK],
      [roomType, UnitTypeCategoryEnum.SMALL],
    ] as const) {
      await UnitType.create({
        _id: id,
        name: category,
        category,
        dimensions: { length: 2, width: 2, height: 3 },
        area: 4,
        volume: 12,
        status: UnitTypeStatusEnum.ACTIVE,
      });
      await FacilityUnitTypeOffering.create({
        facilityId,
        unitTypeId: id,
        billingUnit: BillingUnitEnum.MONTH,
        pricePerUnit: 5000,
        status: FacilityUnitTypeOfferingStatusEnum.ACTIVE,
      });
    }
  });
  const input = (
    type: mongoose.Types.ObjectId,
    extra: Record<string, unknown> = {}
  ) =>
    createStorageUnitSchema.parse({
      facilityId: String(facilityId),
      unitTypeId: String(type),
      unitNumber: 'TEST-01',
      ...extra,
    });
  it('defaults a warehouse to floor 1 and reads it through list/detail/available/map', async () => {
    const row = await service.createStorageUnit(input(warehouseType));
    expect(row.floor).toBe(1);
    expect((await StorageUnit.findById(row.id))?.floor).toBe(1);
    expect((await service.getStorageUnitById(row.id)).floor).toBe(1);
    expect((await service.getStorageUnits()).items[0].floor).toBe(1);
    expect((await service.getAvailableUnits(String(facilityId)))[0].floor).toBe(
      1
    );
    expect(
      (await service.getFacilityMapLayout(String(facilityId)))[0].floor
    ).toBe(1);
  });
  it('accepts an explicit warehouse floor of 1', async () => {
    expect(
      (await service.createStorageUnit(input(warehouseType, { floor: 1 })))
        .floor
    ).toBe(1);
  });
  it('rejects null and invalid floors for both categories before persistence', async () => {
    for (const type of [warehouseType, roomType])
      for (const floor of [null, 0, -1, 1.5])
        expect(() => input(type, { floor })).toThrow();
    expect(await StorageUnit.countDocuments()).toBe(0);
  });
  it('defaults ordinary rooms to floor 1 and rejects invalid floors at the model layer', async () => {
    expect((await service.createStorageUnit(input(roomType))).floor).toBe(1);
    for (const floor of [null, 0, -1, 1.5])
      await expect(
        new StorageUnit({
          facilityId,
          unitTypeId: warehouseType,
          unitNumber: 'BAD',
          floor,
        }).validate()
      ).rejects.toThrow();
  });
  it('preserves a positive floor when a room changes to warehouse', async () => {
    const row = await service.createStorageUnit(input(roomType, { floor: 2 }));
    expect(
      (
        await service.updateStorageUnit(
          row.id,
          updateStorageUnitSchema.parse({ unitTypeId: String(warehouseType) })
        )
      ).floor
    ).toBe(2);
  });
  it('preserves floor when warehouse changes to ordinary room without an explicit floor', async () => {
    const row = await service.createStorageUnit(
      input(warehouseType, { floor: 1 })
    );
    expect(
      (
        await service.updateStorageUnit(
          row.id,
          updateStorageUnitSchema.parse({ unitTypeId: String(roomType) })
        )
      ).floor
    ).toBe(1);
    expect((await StorageUnit.findById(row.id))?.unitTypeId.toString()).toBe(
      String(roomType)
    );
    expect(
      (
        await service.updateStorageUnit(
          row.id,
          updateStorageUnitSchema.parse({
            unitTypeId: String(roomType),
            floor: 2,
          })
        )
      ).floor
    ).toBe(2);
  });
  it('enforces floor rules on updates without changing unit type', async () => {
    const warehouse = await service.createStorageUnit(
      input(warehouseType, { floor: 1 })
    );
    expect(
      (await service.updateStorageUnit(warehouse.id, { floor: 2 })).floor
    ).toBe(2);
    expect(
      (
        await service.updateStorageUnit(warehouse.id, {
          notes: 'Giữ tầng hiện tại',
        })
      ).floor
    ).toBe(2);
    const room = await service.createStorageUnit(
      input(roomType, { unitNumber: 'ROOM', floor: 2 })
    );
    expect(() => updateStorageUnitSchema.parse({ floor: null })).toThrow();
    expect(
      (await service.updateStorageUnit(room.id, { notes: 'Đã kiểm tra' })).floor
    ).toBe(2);
  });
  it('requires numeric floors in nested contract, reservation, rack, incident and inventory responses', () => {
    const snapshot = {
      id: String(new mongoose.Types.ObjectId()),
      unitNumber: 'Q1-KHO-01',
      floor: 1,
      zone: 'Khu kho kệ',
      status: 'available',
    };
    for (const schema of [
      contractResponseSchema.pick({ storageUnit: true }),
      reservationResponseSchema.pick({ storageUnit: true }),
      storageRackResponseSchema.pick({ storageUnit: true }),
    ]) {
      expect(schema.parse({ storageUnit: snapshot }).storageUnit?.floor).toBe(
        1
      );
      expect(
        schema.safeParse({ storageUnit: { ...snapshot, floor: null } }).success
      ).toBe(false);
    }
    for (const schema of [
      storageUnitRefSchema,
      inventoryStorageUnitSummarySchema,
    ]) {
      expect(schema.parse(snapshot).floor).toBe(1);
      expect(schema.safeParse({ ...snapshot, floor: null }).success).toBe(
        false
      );
    }
  });
  it('preserves warehouse floor 1 in contract/reservation snapshot formatters', () => {
    const storageUnitId = {
      _id: new mongoose.Types.ObjectId(),
      unitNumber: 'Q1-KHO-01',
      floor: 1,
      status: 'available',
    };
    const data = {
      _id: new mongoose.Types.ObjectId(),
      storageUnitId,
      amenities: [],
      addendums: [],
      renewals: [],
      signatureHistory: [],
      startDate: new Date('2026-06-01T00:00:00+07:00'),
      endDate: new Date('2026-12-01T00:00:00+07:00'),
      checkInDate: new Date('2026-06-01T00:00:00+07:00'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const contract = Object.create(ContractService.prototype) as {
      formatContract(value: unknown): { storageUnit: { floor: number | null } };
    };
    const reservation = Object.create(ReservationService.prototype) as {
      formatReservation(value: unknown): {
        storageUnit: { floor: number | null };
      };
    };
    expect(contract.formatContract(data).storageUnit.floor).toBe(1);
    expect(reservation.formatReservation(data).storageUnit.floor).toBe(1);
  });
});
