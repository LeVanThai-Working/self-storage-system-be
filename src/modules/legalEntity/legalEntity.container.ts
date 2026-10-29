import { LegalEntity } from './legalEntity.model.ts';
import { LegalEntityRepository } from './legalEntity.repository.ts';
import { LegalEntityService } from './legalEntity.service.ts';
import { LegalEntityController } from './legalEntity.controller.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

export const legalEntityRepository = new LegalEntityRepository(LegalEntity);
export const legalEntityService = new LegalEntityService(
  legalEntityRepository,
  auditLogService
);
export const legalEntityController = new LegalEntityController(
  legalEntityService
);
