import { CustomerSku } from './customerSku.model.ts';
import { CustomerSkuRepository } from './customerSku.repository.ts';
import { CustomerSkuService } from './customerSku.service.ts';
import { CustomerSkuController } from './customerSku.controller.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';
import { customerInventoryRepository } from '../customerInventory/customerInventory.container.ts';
import { contractRepository } from '../contract/contract.container.ts';
import { userRepository } from '../user/user.container.ts';

export const customerSkuRepository = new CustomerSkuRepository(CustomerSku);
export const customerSkuService = new CustomerSkuService(
  customerSkuRepository,
  auditLogService,
  customerInventoryRepository,
  contractRepository,
  userRepository
);
export const customerSkuController = new CustomerSkuController(
  customerSkuService
);
