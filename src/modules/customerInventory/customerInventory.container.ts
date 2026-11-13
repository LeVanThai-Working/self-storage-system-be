import { CustomerInventory } from './customerInventory.model.ts';
import { InventoryMovement } from './inventoryMovement.model.ts';
import {
  AccessSchedule,
  AccessScheduleStaffLock,
} from './accessSchedule.model.ts';
import { CustomerInventoryRepository } from './customerInventory.repository.ts';
import { InventoryMovementRepository } from './inventoryMovement.repository.ts';
import { AccessScheduleRepository } from './accessSchedule.repository.ts';
import { CustomerInventoryService } from './customerInventory.service.ts';
import { CustomerInventoryController } from './customerInventory.controller.ts';
import { AccessScheduleService } from './accessSchedule.service.ts';
import { AccessScheduleController } from './accessSchedule.controller.ts';
import { contractRepository } from '../contract/contract.container.ts';
import { facilityRepository } from '../facility/facility.container.ts';
import { facilityTimeSlotRepository } from '../facilityTimeSlot/facilityTimeSlot.container.ts';
import { CustomerSku } from '../customerSku/customerSku.model.ts';
import { CustomerSkuRepository } from '../customerSku/customerSku.repository.ts';
import {
  storageRackRepository,
  rackTierRepository,
} from '../storageRack/storageRack.container.ts';
import { storageUnitRepository } from '../storageUnit/storageUnit.container.ts';
import { userRepository } from '../user/user.container.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';
import { Incident } from '../incident/incident.model.ts';
import { IncidentRepository } from '../incident/incident.repository.ts';
import { notificationService } from '../notification/notification.container.ts';

const customerSkuRepository = new CustomerSkuRepository(CustomerSku);
const incidentRepository = new IncidentRepository(Incident);

export const customerInventoryRepository = new CustomerInventoryRepository(
  CustomerInventory
);
export const inventoryMovementRepository = new InventoryMovementRepository(
  InventoryMovement
);
export const accessScheduleRepository = new AccessScheduleRepository(
  AccessSchedule,
  AccessScheduleStaffLock
);

export const customerInventoryService = new CustomerInventoryService(
  customerInventoryRepository,
  inventoryMovementRepository,
  contractRepository,
  customerSkuRepository,
  storageRackRepository,
  rackTierRepository,
  storageUnitRepository,
  auditLogService,
  userRepository,
  incidentRepository,
  notificationService
);

export const accessScheduleService = new AccessScheduleService(
  accessScheduleRepository,
  contractRepository,
  facilityRepository,
  facilityTimeSlotRepository,
  storageRackRepository,
  userRepository,
  auditLogService,
  notificationService
);

export const customerInventoryController = new CustomerInventoryController(
  customerInventoryService
);

export const accessScheduleController = new AccessScheduleController(
  accessScheduleService
);
