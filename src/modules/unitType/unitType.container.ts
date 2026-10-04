import { UnitTypeController } from './unitType.controller.ts';
import { UnitType } from './unitType.model.ts';
import { UnitTypeRepository } from './unitType.repository.ts';
import { UnitTypeService } from './unitType.service.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

const unitTypeRepository = new UnitTypeRepository(UnitType);
const unitTypeService = new UnitTypeService(
  unitTypeRepository,
  auditLogService
);

export const unitTypeController = new UnitTypeController(unitTypeService);
