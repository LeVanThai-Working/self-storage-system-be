import { describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import type { Request } from 'express';
import { FacilityManagerService } from '../src/modules/facilityManager/facilityManager.service.ts';
import { FacilityManagerController } from '../src/modules/facilityManager/facilityManager.controller.ts';
import type { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import type { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import type { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import type { UserRepository } from '../src/modules/user/user.repository.ts';
import { RoleEnum, UserStatusEnum } from '../src/common/enums/user.enum.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';

function fixture(role: RoleEnum = RoleEnum.FACILITY_STAFF) {
  const facilityId = new Types.ObjectId();
  const otherFacilityId = new Types.ObjectId();
  const caller = {
    _id: new Types.ObjectId(),
    role,
    status: UserStatusEnum.ACTIVE,
    assignedFacilityId: facilityId as Types.ObjectId | null,
    deleted: false,
  };
  const facility = {
    _id: facilityId,
    name: 'Q7 Facility',
    address: 'Q7',
    city: 'HCM',
    status: FacilityStatusEnum.ACTIVE,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const facilities = {
    findById: vi.fn().mockResolvedValue(facility),
    findByManagerId: vi
      .fn()
      .mockResolvedValue({ ...facility, _id: otherFacilityId }),
  };
  const users = { findById: vi.fn().mockResolvedValue(caller) };
  const storageUnits = {
    countUnitsByStatusGrouped: vi.fn().mockResolvedValue({ available: 2 }),
  };
  const amenities = {
    getOfferingSummaryByFacilityId: vi.fn().mockResolvedValue({
      totalOfferings: 0,
      totalQuantity: 0,
      inUseQuantity: 0,
      availableQuantity: 0,
      outOfStockOfferingsCount: 0,
    }),
  };
  const service = new FacilityManagerService(
    facilities as unknown as FacilityRepository,
    storageUnits as unknown as StorageUnitRepository,
    amenities as unknown as FacilityAmenityOfferingRepository,
    users as unknown as UserRepository
  );
  return {
    caller,
    facility,
    facilityId,
    otherFacilityId,
    facilities,
    users,
    service,
  };
}

describe('GET /my-facility staff access', () => {
  it('staff reads only the database-assigned facility, ignoring a requested facility', async () => {
    const { service, caller, facilityId, otherFacilityId, facilities } =
      fixture();
    const controller = new FacilityManagerController(service);
    const response = await controller.getMyFacility({
      user: { _id: caller._id },
      query: { facilityId: String(otherFacilityId) },
    } as unknown as Request);
    expect(response.data.id).toBe(String(facilityId));
    expect(facilities.findById).toHaveBeenCalledWith(String(facilityId));
    expect(facilities.findByManagerId).not.toHaveBeenCalled();
  });

  it('does not use manager fallback when staff has no assigned facility', async () => {
    const { service, caller, facilities } = fixture();
    caller.assignedFacilityId = null;
    await expect(
      service.getMyFacility(String(caller._id))
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(facilities.findByManagerId).not.toHaveBeenCalled();
    expect(facilities.findById).not.toHaveBeenCalled();
  });

  it('does not fall back to another facility when the staff assignment is missing', async () => {
    const { service, caller, facilities } = fixture();
    facilities.findById.mockResolvedValue(null);
    await expect(
      service.getMyFacility(String(caller._id))
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(facilities.findByManagerId).not.toHaveBeenCalled();
  });

  it('rejects deleted assigned facilities', async () => {
    const { service, caller, facility } = fixture();
    facility.deleted = true;
    await expect(
      service.getMyFacility(String(caller._id))
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('does not grant staff manager dashboard or staff-directory permissions', async () => {
    const { service, caller } = fixture();
    await expect(
      service.getMyFacilityDashboard(String(caller._id))
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      service.getMyFacilityStaffs(String(caller._id), {
        page: 1,
        limit: 10,
      } as Parameters<FacilityManagerService['getMyFacilityStaffs']>[1])
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('preserves manager assignment and managerId fallback behavior', async () => {
    const { service, caller, facilityId, otherFacilityId } = fixture(
      RoleEnum.FACILITY_MANAGER
    );
    expect((await service.getMyFacility(String(caller._id))).id).toBe(
      String(facilityId)
    );
    const dashboard = await service.getMyFacilityDashboard(String(caller._id));
    expect(dashboard.facility.id).toBe(String(facilityId));
    expect(dashboard.storageUnits.available).toBe(2);
    caller.assignedFacilityId = null;
    expect((await service.getMyFacility(String(caller._id))).id).toBe(
      String(otherFacilityId)
    );
  });

  it.each([
    RoleEnum.CUSTOMER,
    RoleEnum.SYSTEM_ADMIN,
    RoleEnum.BUSINESS_OPS_MANAGER,
  ])('preserves denial for non-facility role %s', async (role) => {
    const { service, caller } = fixture(role);
    await expect(
      service.getMyFacility(String(caller._id))
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects inactive staff', async () => {
    const { service, caller } = fixture();
    caller.status = UserStatusEnum.INACTIVE;
    await expect(
      service.getMyFacility(String(caller._id))
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
