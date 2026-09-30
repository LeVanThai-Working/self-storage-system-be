import { FacilityAmenityOfferingController } from './facilityAmenityOffering.controller.ts';
import { FacilityAmenityOffering } from './facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from './facilityAmenityOffering.repository.ts';
import { FacilityAmenityOfferingService } from './facilityAmenityOffering.service.ts';
import { Facility } from '../facility/facility.model.ts';
import { FacilityRepository } from '../facility/facility.repository.ts';
import { Amenity } from '../amenity/amenity.model.ts';
import { AmenityRepository } from '../amenity/amenity.repository.ts';

export const facilityAmenityOfferingRepository =
  new FacilityAmenityOfferingRepository(FacilityAmenityOffering);

const facilityRepository = new FacilityRepository(Facility);
const amenityRepository = new AmenityRepository(Amenity);

export const facilityAmenityOfferingService =
  new FacilityAmenityOfferingService(
    facilityAmenityOfferingRepository,
    facilityRepository,
    amenityRepository
  );

export const facilityAmenityOfferingController =
  new FacilityAmenityOfferingController(facilityAmenityOfferingService);
