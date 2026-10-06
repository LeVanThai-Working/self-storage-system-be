import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { RoleEnum, UserStatusEnum } from '../../common/enums/user.enum.ts';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import type { FacilityAmenityOfferingRepository } from '../facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { IFacility } from '../facility/facility.model.ts';
import {
  facilityResponseSchema,
  type FacilityResponse,
} from '../facility/schemas/facility.response.schema.ts';
import {
  userListResponseSchema,
  type UserResponse,
} from '../user/schemas/user.response.schema.ts';
import {
  myFacilityDashboardResponseSchema,
  type MyFacilityDashboardResponse,
} from './schemas/facilityManager.response.schema.ts';
import type { FacilityStaffQuery } from './schemas/facilityManager.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

export class FacilityManagerService {
  constructor(
    private readonly facilityRepository: FacilityRepository,
    private readonly storageUnitRepository: StorageUnitRepository,
    private readonly facilityAmenityOfferingRepository: FacilityAmenityOfferingRepository,
    private readonly userRepository: UserRepository
  ) {}

  private formatFacility(facility: unknown): unknown {
    if (!facility) return facility;
    const doc = facility as {
      toObject?: (options?: unknown) => Record<string, unknown>;
      _id?: unknown;
      id?: string;
      managerId?: unknown;
    };
    const obj =
      typeof doc.toObject === 'function'
        ? doc.toObject({ virtuals: true })
        : { ...doc };
    if (!obj.id && obj._id) {
      obj.id = String(obj._id);
    }
    if (obj.managerId) {
      obj.managerId = String(obj.managerId);
    }
    return obj;
  }

  private formatUser(user: unknown): unknown {
    if (!user) return user;
    const doc = user as {
      toObject?: (options?: unknown) => Record<string, unknown>;
      _id?: unknown;
      id?: string;
    };
    const obj =
      typeof doc.toObject === 'function'
        ? doc.toObject({ virtuals: true })
        : { ...doc };
    if (!obj.id && obj._id) {
      obj.id = String(obj._id);
    }
    return obj;
  }

  private async getFacilityForManager(userId: string): Promise<IFacility> {
    const caller = await this.userRepository.findById(userId);
    if (!caller) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
    }

    if (caller.status !== UserStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['User Account']);
    }

    if (caller.role !== RoleEnum.FACILITY_MANAGER) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
        'Facility Manager',
      ]);
    }

    let facility: IFacility | null = null;
    if (caller.assignedFacilityId) {
      facility = await this.facilityRepository.findById(
        String(caller.assignedFacilityId)
      );
    }

    if (!facility) {
      facility = await this.facilityRepository.findByManagerId(userId);
    }

    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Assigned Facility',
      ]);
    }

    return facility;
  }

  async getMyFacility(userId: string): Promise<FacilityResponse> {
    const facility = await this.getFacilityForManager(userId);
    return validateResponse(
      facilityResponseSchema,
      this.formatFacility(facility)
    );
  }

  async getMyFacilityDashboard(
    userId: string
  ): Promise<MyFacilityDashboardResponse> {
    const facility = await this.getFacilityForManager(userId);
    const facilityId = facility._id.toString();

    const [storageUnitsByStatus, amenitySummary] = await Promise.all([
      this.storageUnitRepository.countUnitsByStatusGrouped(facilityId),
      this.facilityAmenityOfferingRepository.getOfferingSummaryByFacilityId(
        facilityId
      ),
    ]);

    const available =
      storageUnitsByStatus[StorageUnitStatusEnum.AVAILABLE] || 0;
    const underMaintenance =
      storageUnitsByStatus[StorageUnitStatusEnum.UNDER_MAINTENANCE] || 0;
    const occupied = storageUnitsByStatus[StorageUnitStatusEnum.OCCUPIED] || 0;
    const reserved = storageUnitsByStatus[StorageUnitStatusEnum.RESERVED] || 0;
    const inactive = storageUnitsByStatus[StorageUnitStatusEnum.INACTIVE] || 0;
    const total = available + underMaintenance + occupied + reserved + inactive;

    const occupancyRate =
      total > 0
        ? Number((((occupied + reserved) / total) * 100).toFixed(2))
        : 0;

    const dashboardData: MyFacilityDashboardResponse = {
      facility: {
        id: facilityId,
        name: facility.name,
        address: facility.address,
        city: facility.city,
        status: facility.status,
        phone: facility.phone ?? null,
        email: facility.email ?? null,
      },
      storageUnits: {
        total,
        available,
        underMaintenance,
        occupied,
        reserved,
        inactive,
        occupancyRate,
      },
      amenities: {
        totalOfferings: amenitySummary.totalOfferings,
        totalQuantity: amenitySummary.totalQuantity,
        inUseQuantity: amenitySummary.inUseQuantity,
        availableQuantity: amenitySummary.availableQuantity,
        outOfStockOfferingsCount: amenitySummary.outOfStockOfferingsCount,
      },
    };

    return validateResponse(myFacilityDashboardResponseSchema, dashboardData);
  }

  async getMyFacilityStaffs(
    userId: string,
    query: FacilityStaffQuery
  ): Promise<PaginatedData<UserResponse>> {
    const facility = await this.getFacilityForManager(userId);
    const facilityId = facility._id.toString();

    const result = await this.userRepository.findStaffsByFacilityId(
      facilityId,
      query
    );
    const formattedItems = result.items.map((u) => this.formatUser(u));
    const validatedItems = validateResponse(
      userListResponseSchema,
      formattedItems
    );

    return {
      items: validatedItems,
      pagination: result.pagination,
    };
  }
}
