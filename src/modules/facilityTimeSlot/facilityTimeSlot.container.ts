import { FacilityTimeSlotController } from './facilityTimeSlot.controller.ts';
import { FacilityTimeSlot } from './facilityTimeSlot.model.ts';
import { FacilityTimeSlotRepository } from './facilityTimeSlot.repository.ts';
import { FacilityTimeSlotService } from './facilityTimeSlot.service.ts';
import { Facility } from '../facility/facility.model.ts';
import { FacilityRepository } from '../facility/facility.repository.ts';
import { Reservation } from '../reservation/reservation.model.ts';
import { ReservationRepository } from '../reservation/reservation.repository.ts';

export const facilityTimeSlotRepository = new FacilityTimeSlotRepository(
  FacilityTimeSlot
);
const facilityRepository = new FacilityRepository(Facility);
const reservationRepository = new ReservationRepository(Reservation);

export const facilityTimeSlotService = new FacilityTimeSlotService(
  facilityTimeSlotRepository,
  facilityRepository,
  reservationRepository
);

export const facilityTimeSlotController = new FacilityTimeSlotController(
  facilityTimeSlotService
);
