import { describe, expect, it, vi } from 'vitest';
import { FacilityService } from '../src/modules/facility/facility.service.ts';
import type { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import type { UserRepository } from '../src/modules/user/user.repository.ts';
import type { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import type { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';

describe('Customer facility catalog', () => {
  it('excludes deleted, missing and inactive unit types while preserving active offerings', async () => {
    const facility = {
      _id: 'facility',
      name: 'Current facility',
      address: 'Address',
      city: 'City',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const unitType = {
      _id: 'active-type',
      name: 'Standard room',
      category: 'small',
      area: 5,
      volume: 15,
      dimensions: { length: 2, width: 2.5, height: 3 },
      status: 'active',
      deleted: false,
    };
    const offering = {
      _id: 'offering',
      unitTypeId: unitType,
      pricePerUnit: 100,
      depositMultiplier: 1,
      billingUnit: 'month',
      minRentalDays: 1,
      status: 'active',
    };
    const facilityRepo = { findById: vi.fn().mockResolvedValue(facility) };
    const offeringRepo = {
      findAll: vi.fn().mockResolvedValue({
        items: [
          offering,
          {
            ...offering,
            _id: 'deleted',
            unitTypeId: { ...unitType, name: 'Old freezer', deleted: true },
          },
          {
            ...offering,
            _id: 'inactive',
            unitTypeId: { ...unitType, status: 'inactive' },
          },
          { ...offering, _id: 'missing', unitTypeId: null },
        ],
      }),
    };
    const storageRepo = {
      countAvailableUnitsGroupedByUnitType: vi
        .fn()
        .mockResolvedValue({ 'active-type': 3 }),
    };
    const service = new FacilityService(
      facilityRepo as unknown as FacilityRepository,
      {} as UserRepository,
      offeringRepo as unknown as FacilityUnitTypeOfferingRepository,
      storageRepo as unknown as StorageUnitRepository
    );
    const result = await service.getPublicFacilityDetail('facility');
    expect(result.unitTypeOfferings).toHaveLength(1);
    expect(result.unitTypeOfferings[0].unitType.name).toBe('Standard room');
    expect(result.unitTypeOfferings[0].availableUnitsCount).toBe(3);
  });
});
