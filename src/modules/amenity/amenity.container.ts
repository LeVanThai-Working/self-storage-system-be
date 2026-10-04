import { Amenity } from './amenity.model.ts';
import { AmenityRepository } from './amenity.repository.ts';
import { AmenityService } from './amenity.service.ts';
import { AmenityController } from './amenity.controller.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

export const amenityRepository = new AmenityRepository(Amenity);
export const amenityService = new AmenityService(
  amenityRepository,
  auditLogService
);
export const amenityController = new AmenityController(amenityService);
