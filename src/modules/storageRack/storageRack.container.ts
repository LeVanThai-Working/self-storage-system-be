import { StorageRack } from './storageRack.model.ts';
import { RackTier } from './rackTier.model.ts';
import { StorageRackRepository } from './storageRack.repository.ts';
import { RackTierRepository } from './rackTier.repository.ts';
import { StorageRackService } from './storageRack.service.ts';
import { StorageRackController } from './storageRack.controller.ts';
import { StorageUnit } from '../storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import { facilityRepository } from '../facility/facility.container.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

const storageRackRepository = new StorageRackRepository(StorageRack);
const rackTierRepository = new RackTierRepository(RackTier);
const storageUnitRepository = new StorageUnitRepository(StorageUnit);

const storageRackService = new StorageRackService(
  storageRackRepository,
  rackTierRepository,
  storageUnitRepository,
  facilityRepository,
  auditLogService
);

export const storageRackController = new StorageRackController(
  storageRackService
);

export { storageRackRepository, rackTierRepository, storageRackService };
