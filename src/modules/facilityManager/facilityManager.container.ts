import { FacilityManagerController } from './facilityManager.controller.ts';
import { FacilityManagerService } from './facilityManager.service.ts';
import { Facility } from '../facility/facility.model.ts';
import { FacilityRepository } from '../facility/facility.repository.ts';
import { StorageUnit } from '../storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';

const facilityRepository = new FacilityRepository(Facility);
const storageUnitRepository = new StorageUnitRepository(StorageUnit);
const facilityAmenityOfferingRepository = new FacilityAmenityOfferingRepository(
  FacilityAmenityOffering
);
const userRepository = new UserRepository(User);

const facilityManagerService = new FacilityManagerService(
  facilityRepository,
  storageUnitRepository,
  facilityAmenityOfferingRepository,
  userRepository
);

export const facilityManagerController = new FacilityManagerController(
  facilityManagerService
);
export { facilityManagerService };
