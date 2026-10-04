import { FacilityUnitTypeOfferingController } from './facilityUnitTypeOffering.controller.ts';
import { FacilityUnitTypeOffering } from './facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from './facilityUnitTypeOffering.repository.ts';
import { FacilityUnitTypeOfferingService } from './facilityUnitTypeOffering.service.ts';
import { Facility } from '../facility/facility.model.ts';
import { FacilityRepository } from '../facility/facility.repository.ts';
import { UnitType } from '../unitType/unitType.model.ts';
import { UnitTypeRepository } from '../unitType/unitType.repository.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

const offeringRepository = new FacilityUnitTypeOfferingRepository(
  FacilityUnitTypeOffering
);

// Cross-module: required to validate that Facility and UnitType exist in createOffering
const facilityRepository = new FacilityRepository(Facility);
const unitTypeRepository = new UnitTypeRepository(UnitType);

const offeringService = new FacilityUnitTypeOfferingService(
  offeringRepository,
  facilityRepository,
  unitTypeRepository,
  auditLogService
);

export const facilityUnitTypeOfferingController =
  new FacilityUnitTypeOfferingController(offeringService);
