import { ContractController } from './contract.controller.ts';
import { Contract } from './contract.model.ts';
import { ContractRepository } from './contract.repository.ts';
import { ContractService } from './contract.service.ts';
import { Reservation } from '../reservation/reservation.model.ts';
import { ReservationRepository } from '../reservation/reservation.repository.ts';
import { StorageUnit } from '../storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Facility } from '../facility/facility.model.ts';
import { FacilityRepository } from '../facility/facility.repository.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';
import { CustomerInventory } from '../customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../customerInventory/customerInventory.repository.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';
import { refundRequestService } from '../refundRequest/refundRequest.container.ts';

export const contractRepository = new ContractRepository(Contract);
const reservationRepository = new ReservationRepository(Reservation);
const storageUnitRepository = new StorageUnitRepository(StorageUnit);
const amenityOfferingRepository = new FacilityAmenityOfferingRepository(
  FacilityAmenityOffering
);
const unitTypeOfferingRepository = new FacilityUnitTypeOfferingRepository(
  FacilityUnitTypeOffering
);
const facilityRepository = new FacilityRepository(Facility);
const userRepository = new UserRepository(User);
const customerInventoryRepository = new CustomerInventoryRepository(
  CustomerInventory
);

export const contractService = new ContractService(
  contractRepository,
  reservationRepository,
  storageUnitRepository,
  amenityOfferingRepository,
  unitTypeOfferingRepository,
  facilityRepository,
  userRepository,
  auditLogService,
  refundRequestService,
  customerInventoryRepository
);

export const contractController = new ContractController(contractService);
