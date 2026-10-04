import { FacilityController } from './facility.controller.ts';
import { Facility } from './facility.model.ts';
import { FacilityRepository } from './facility.repository.ts';
import { FacilityService } from './facility.service.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

const facilityRepository = new FacilityRepository(Facility);

// UserRepository is required to validate managerId in assignManager
const userRepository = new UserRepository(User);

const facilityService = new FacilityService(
  facilityRepository,
  userRepository,
  auditLogService
);

export const facilityController = new FacilityController(facilityService);
