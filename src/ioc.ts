import type { IocContainer } from '@tsoa/runtime';
import { UserController } from './modules/user/user.controller.ts';
import { userController } from './modules/user/user.container.ts';
import { AuthController } from './modules/auth/auth.controller.ts';
import { authController } from './modules/auth/auth.container.ts';
import { ProfileController } from './modules/profile/profile.controller.ts';
import { profileController } from './modules/profile/profile.container.ts';
import { FacilityController } from './modules/facility/facility.controller.ts';
import { facilityController } from './modules/facility/facility.container.ts';
import { UnitTypeController } from './modules/unitType/unitType.controller.ts';
import { unitTypeController } from './modules/unitType/unitType.container.ts';
import { FacilityUnitTypeOfferingController } from './modules/facilityUnitTypeOffering/facilityUnitTypeOffering.controller.ts';
import { facilityUnitTypeOfferingController } from './modules/facilityUnitTypeOffering/facilityUnitTypeOffering.container.ts';
import { StorageUnitController } from './modules/storageUnit/storageUnit.controller.ts';
import { storageUnitController } from './modules/storageUnit/storageUnit.container.ts';

export const iocContainer: IocContainer = {
  get: <T>(controller: unknown): T => {
    if (controller === UserController) {
      return userController as unknown as T;
    }
    if (controller === AuthController) {
      return authController as unknown as T;
    }
    if (controller === ProfileController) {
      return profileController as unknown as T;
    }
    if (controller === FacilityController) {
      return facilityController as unknown as T;
    }
    if (controller === UnitTypeController) {
      return unitTypeController as unknown as T;
    }
    if (controller === FacilityUnitTypeOfferingController) {
      return facilityUnitTypeOfferingController as unknown as T;
    }
    if (controller === StorageUnitController) {
      return storageUnitController as unknown as T;
    }
    throw new Error(
      `Controller not found in iocContainer: ${String(controller)}`
    );
  },
};
