import { ApprovalRequestController } from './approvalRequest.controller.ts';
import { ApprovalRequest } from './approvalRequest.model.ts';
import { ApprovalRequestRepository } from './approvalRequest.repository.ts';
import { ApprovalRequestService } from './approvalRequest.service.ts';
import { Facility } from '../facility/facility.model.ts';
import { FacilityRepository } from '../facility/facility.repository.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';
import { UnitType } from '../unitType/unitType.model.ts';
import { UnitTypeRepository } from '../unitType/unitType.repository.ts';
import { FacilityUnitTypeOffering } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Amenity } from '../amenity/amenity.model.ts';
import { AmenityRepository } from '../amenity/amenity.repository.ts';
import { FacilityAmenityOffering } from '../facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

const approvalRequestRepository = new ApprovalRequestRepository(
  ApprovalRequest
);
const facilityRepository = new FacilityRepository(Facility);
const userRepository = new UserRepository(User);
const unitTypeRepository = new UnitTypeRepository(UnitType);
const unitTypeOfferingRepository = new FacilityUnitTypeOfferingRepository(
  FacilityUnitTypeOffering
);
const amenityRepository = new AmenityRepository(Amenity);
const amenityOfferingRepository = new FacilityAmenityOfferingRepository(
  FacilityAmenityOffering
);

const approvalRequestService = new ApprovalRequestService(
  approvalRequestRepository,
  facilityRepository,
  userRepository,
  unitTypeRepository,
  unitTypeOfferingRepository,
  amenityRepository,
  amenityOfferingRepository,
  auditLogService
);

export const approvalRequestController = new ApprovalRequestController(
  approvalRequestService
);
export { approvalRequestRepository, approvalRequestService };
