import { Amenity } from './amenity.model.ts';
import { AmenityRepository } from './amenity.repository.ts';
import { AmenityService } from './amenity.service.ts';
import { AmenityController } from './amenity.controller.ts';

export const amenityRepository = new AmenityRepository(Amenity);
export const amenityService = new AmenityService(amenityRepository);
export const amenityController = new AmenityController(amenityService);

