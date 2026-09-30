import { StorageUnit } from './storageUnit.model.ts';
import { StorageUnitRepository } from './storageUnit.repository.ts';
import { StorageUnitService } from './storageUnit.service.ts';
import { StorageUnitController } from './storageUnit.controller.ts';
import { Facility } from '../facility/facility.model.ts';
import { FacilityRepository } from '../facility/facility.repository.ts';
import { UnitType } from '../unitType/unitType.model.ts';
import { UnitTypeRepository } from '../unitType/unitType.repository.ts';
import { FacilityUnitTypeOffering } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';

const storageUnitRepository = new StorageUnitRepository(StorageUnit);
const facilityRepository = new FacilityRepository(Facility);
const unitTypeRepository = new UnitTypeRepository(UnitType);
const offeringRepository = new FacilityUnitTypeOfferingRepository(
  FacilityUnitTypeOffering
);

const storageUnitService = new StorageUnitService(
  storageUnitRepository,
  facilityRepository,
  unitTypeRepository,
  offeringRepository
);

export const storageUnitController = new StorageUnitController(
  storageUnitService
);

export { storageUnitRepository, storageUnitService };
