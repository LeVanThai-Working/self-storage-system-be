import { Incident } from './incident.model.ts';
import { IncidentRepository } from './incident.repository.ts';
import { IncidentService } from './incident.service.ts';
import { IncidentController } from './incident.controller.ts';
import { storageUnitRepository } from '../storageUnit/storageUnit.container.ts';
import { contractRepository } from '../contract/contract.container.ts';
import { userRepository } from '../user/user.container.ts';
import { notificationService } from '../notification/notification.container.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';
import { CustomerInventory } from '../customerInventory/customerInventory.model.ts';
import { CustomerInventoryRepository } from '../customerInventory/customerInventory.repository.ts';

const incidentRepository = new IncidentRepository(Incident);
const customerInventoryRepository = new CustomerInventoryRepository(
  CustomerInventory
);

export const incidentService = new IncidentService(
  incidentRepository,
  storageUnitRepository,
  contractRepository,
  userRepository,
  notificationService,
  auditLogService,
  customerInventoryRepository
);

export const incidentController = new IncidentController(incidentService);
export { incidentRepository };
