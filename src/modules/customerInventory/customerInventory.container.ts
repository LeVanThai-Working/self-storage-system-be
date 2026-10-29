import { CustomerInventory } from './customerInventory.model.ts';
import { InventoryMovement } from './inventoryMovement.model.ts';
import { InventoryRequest } from './inventoryRequest.model.ts';
import { CustomerInventoryRepository } from './customerInventory.repository.ts';
import { InventoryMovementRepository } from './inventoryMovement.repository.ts';
import { InventoryRequestRepository } from './inventoryRequest.repository.ts';
import { CustomerInventoryService } from './customerInventory.service.ts';
import { CustomerInventoryController } from './customerInventory.controller.ts';
import { InventoryRequestService } from './inventoryRequest.service.ts';
import { InventoryRequestController } from './inventoryRequest.controller.ts';
import { contractRepository } from '../contract/contract.container.ts';
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
export const inventoryRequestRepository = new InventoryRequestRepository(
  InventoryRequest
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

export const inventoryRequestService = new InventoryRequestService(
  inventoryRequestRepository,
  customerInventoryRepository,
  inventoryMovementRepository,
  contractRepository,
  storageRackRepository,
  rackTierRepository,
  storageUnitRepository,
  userRepository,
  auditLogService,
  notificationService
);

export const customerInventoryController = new CustomerInventoryController(
  customerInventoryService
);

export const inventoryRequestController = new InventoryRequestController(
  inventoryRequestService
);
