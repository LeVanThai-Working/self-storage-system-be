import { FacilityController } from './facility.controller.ts';
import { Facility } from './facility.model.ts';
import { FacilityRepository } from './facility.repository.ts';
import { FacilityService } from './facility.service.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';
import { FacilityUnitTypeOffering } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { StorageUnit } from '../storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../facilityAmenityOffering/facilityAmenityOffering.repository.ts';

const facilityRepository = new FacilityRepository(Facility);

// UserRepository is required to validate managerId in assignManager
const userRepository = new UserRepository(User);

// Repositories required for Public Customer Aggregation APIs
const offeringRepository = new FacilityUnitTypeOfferingRepository(
  FacilityUnitTypeOffering
);
const storageUnitRepository = new StorageUnitRepository(StorageUnit);
const amenityOfferingRepository = new FacilityAmenityOfferingRepository(
  FacilityAmenityOffering
);

const facilityService = new FacilityService(
  facilityRepository,
  userRepository,
  offeringRepository,
  storageUnitRepository,
  amenityOfferingRepository
);

export const facilityController = new FacilityController(facilityService);
