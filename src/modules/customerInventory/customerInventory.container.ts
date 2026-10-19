import { CustomerInventory } from './customerInventory.model.ts';
import { InventoryMovement } from './inventoryMovement.model.ts';
import { CustomerInventoryRepository } from './customerInventory.repository.ts';
import { InventoryMovementRepository } from './inventoryMovement.repository.ts';
import { CustomerInventoryService } from './customerInventory.service.ts';
import { CustomerInventoryController } from './customerInventory.controller.ts';
import { contractRepository } from '../contract/contract.container.ts';
import { CustomerSku } from '../customerSku/customerSku.model.ts';
import { CustomerSkuRepository } from '../customerSku/customerSku.repository.ts';
import {
  storageRackRepository,
  rackTierRepository,
} from '../storageRack/storageRack.container.ts';
import { storageUnitRepository } from '../storageUnit/storageUnit.container.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

const customerSkuRepository = new CustomerSkuRepository(CustomerSku);

export const customerInventoryRepository = new CustomerInventoryRepository(
  CustomerInventory
);
export const inventoryMovementRepository = new InventoryMovementRepository(
  InventoryMovement
);

export const customerInventoryService = new CustomerInventoryService(
  customerInventoryRepository,
  inventoryMovementRepository,
  contractRepository,
  customerSkuRepository,
  storageRackRepository,
  rackTierRepository,
  storageUnitRepository,
  auditLogService
);

export const customerInventoryController = new CustomerInventoryController(
  customerInventoryService
);
