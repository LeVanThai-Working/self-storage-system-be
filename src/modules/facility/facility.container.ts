import { FacilityController } from './facility.controller.ts';
import { Facility } from './facility.model.ts';
import { FacilityRepository } from './facility.repository.ts';
import { FacilityService } from './facility.service.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';

const facilityRepository = new FacilityRepository(Facility);

// UserRepository cần thiết để validate managerId trong assignManager
const userRepository = new UserRepository(User);

const facilityService = new FacilityService(facilityRepository, userRepository);

export const facilityController = new FacilityController(facilityService);
