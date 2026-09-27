import { UnitTypeController } from './unitType.controller.ts';
import { UnitType } from './unitType.model.ts';
import { UnitTypeRepository } from './unitType.repository.ts';
import { UnitTypeService } from './unitType.service.ts';

const unitTypeRepository = new UnitTypeRepository(UnitType);
const unitTypeService = new UnitTypeService(unitTypeRepository);

export const unitTypeController = new UnitTypeController(unitTypeService);
