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
import { CustomerInventory } from '../customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../customerInventory/customerInventory.repository.ts';
import { Reservation } from '../reservation/reservation.model.ts';
import { ReservationRepository } from '../reservation/reservation.repository.ts';
import { Contract } from '../contract/contract.model.ts';
import { ContractRepository } from '../contract/contract.repository.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

const storageUnitRepository = new StorageUnitRepository(StorageUnit);
const facilityRepository = new FacilityRepository(Facility);
const unitTypeRepository = new UnitTypeRepository(UnitType);
const offeringRepository = new FacilityUnitTypeOfferingRepository(
  FacilityUnitTypeOffering
);
// Built from the model directly (not customerInventory.container) to avoid a circular import
const customerInventoryRepository = new CustomerInventoryRepository(
  CustomerInventory
);
const reservationRepository = new ReservationRepository(Reservation);
const contractRepository = new ContractRepository(Contract);

const storageUnitService = new StorageUnitService(
  storageUnitRepository,
  facilityRepository,
  unitTypeRepository,
  offeringRepository,
  customerInventoryRepository,
  auditLogService,
  reservationRepository,
  contractRepository
);

export const storageUnitController = new StorageUnitController(
  storageUnitService
);

export { storageUnitRepository, storageUnitService };
