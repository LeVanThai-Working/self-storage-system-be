import { ReservationController } from './reservation.controller.ts';
import { Reservation } from './reservation.model.ts';
import { ReservationRepository } from './reservation.repository.ts';
import { ReservationService } from './reservation.service.ts';
import { Facility } from '../facility/facility.model.ts';
import { FacilityRepository } from '../facility/facility.repository.ts';
import { FacilityUnitTypeOffering } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { FacilityAmenityOffering } from '../facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { StorageUnit } from '../storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

const reservationRepository = new ReservationRepository(Reservation);
const facilityRepository = new FacilityRepository(Facility);
const offeringRepository = new FacilityUnitTypeOfferingRepository(
  FacilityUnitTypeOffering
);
const amenityOfferingRepository = new FacilityAmenityOfferingRepository(
  FacilityAmenityOffering
);
const storageUnitRepository = new StorageUnitRepository(StorageUnit);
const userRepository = new UserRepository(User);

export const reservationService = new ReservationService(
  reservationRepository,
  facilityRepository,
  offeringRepository,
  amenityOfferingRepository,
  storageUnitRepository,
  userRepository,
  auditLogService
);

export const reservationController = new ReservationController(
  reservationService
);
